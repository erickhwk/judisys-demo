// Pedidos de crédito (RF-29, SDD §7.5): registrar e decidir habilitações, divergências e
// impugnações, cada operação numa transação, com permissão (INV-02) e log por registro (INV-01).
//
// - Antes da relação do AJ publicada: divergência (credor da lista) e habilitação (requerente fora
//   da lista); acolher atualiza o valor e a classe na relação do AJ (CRD-03, CRD-05).
// - Depois: só impugnação (art. 8º, CRD-10); acolher atualiza o valor e a classe no QGC, e a
//   relação do AJ fica intacta (CRD-04, CRD-06).
// - Requerente fora da lista só vira credor ao acolher; rejeitar só muda o status (CRD-07).
import { somenteDigitos } from '../../regras/documentos'
import { type Fase, fasesDoTipo, type TipoProcesso } from '../../regras/fases'
import { CLASSES_FALENCIA, CLASSES_RJ, type Classe } from '../../regras/qgc'
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import { AVISO_DOCUMENTO_EXISTENTE, type ContextoGravacao, criarRepositorio } from '../repositorio'
import type { Novo, Tipos } from '../schemas'
import { buscarOuFalhar, ErroRegra, exigirPermissao } from './comum'

type Pedido = Tipos['pedidosDeCredito']
type Credor = Tipos['credores']
type TipoPedido = Pedido['tipo']

const TABELAS_PEDIDOS: Tabela[] = [
  'pedidosDeCredito',
  'credores',
  'processos',
  'marcosDeFase',
  'logs',
]

/**
 * Fase a partir da qual a relação do AJ está publicada (art. 7º, §2º): na RJ, o marco "Relação do
 * AJ publicada"; na falência, que não tem esse marco, "Quadro de credores" (mesma leitura do seed).
 */
export const FASE_RELACAO_AJ: Readonly<Record<TipoProcesso, Fase>> = {
  rj: 'relacao-aj-publicada',
  falencia: 'quadro-credores',
}

/**
 * A relação do AJ já foi publicada: algum marco do processo está nessa fase ou depois dela.
 * Conta pelos marcos, e não pela fase atual, para que a RJ convolada ou com desistência depois da
 * relação continue publicada; marco pulado (T-28) não conta, mas a fase posterior sim.
 */
export function relacaoAjPublicada(
  tipo: TipoProcesso,
  marcos: readonly Pick<Tipos['marcosDeFase'], 'fase'>[],
): boolean {
  const ordem = fasesDoTipo(tipo)
  const limite = ordem.indexOf(FASE_RELACAO_AJ[tipo])
  // As finais alternativas da RJ vêm depois de "encerrada" na ordem, mas saem de qualquer fase:
  // sozinhas não dizem nada sobre a relação.
  const sequencia = tipo === 'rj' ? ordem.slice(0, ordem.indexOf('encerrada') + 1) : ordem
  return marcos.some((marco) => {
    const posicao = sequencia.indexOf(marco.fase as Fase)
    return posicao !== -1 && posicao >= limite
  })
}

/**
 * Tipos que o formulário oferece (CRD-10): depois da relação do AJ, só impugnação; antes,
 * divergência para quem está na lista e habilitação para quem está fora dela.
 */
export function tiposDePedidoPermitidos(publicada: boolean, credorNaLista: boolean): TipoPedido[] {
  if (publicada) return ['impugnacao']
  return credorNaLista ? ['divergencia'] : ['habilitacao']
}

export const ROTULOS_TIPO_PEDIDO: Readonly<Record<TipoPedido, string>> = {
  habilitacao: 'Habilitação',
  divergencia: 'Divergência',
  impugnacao: 'Impugnação',
}

export const ROTULOS_STATUS_PEDIDO: Readonly<Record<Pedido['status'], string>> = {
  pendente: 'Pendente',
  acolhido: 'Acolhido',
  rejeitado: 'Rejeitado',
}

export const ERRO_PEDIDO_JA_DECIDIDO = 'Este pedido já foi decidido.'
export const ERRO_SO_REJEITAR_DEPOIS_DA_RELACAO =
  'A relação do AJ já foi publicada: divergência e habilitação pendentes só podem ser rejeitadas.'
export const ERRO_SO_IMPUGNACAO =
  'A relação do AJ já foi publicada: o pedido agora é impugnação (art. 8º).'
export const ERRO_SO_ANTES_DA_RELACAO =
  'A relação do AJ ainda não foi publicada: o pedido é divergência ou habilitação.'
export const ERRO_TIPO_PARA_CREDOR = 'Habilitação é para quem não está na lista de credores.'
export const ERRO_TIPO_PARA_REQUERENTE = 'Divergência é para credor que já está na lista.'
export const ERRO_CREDOR_DE_OUTRO_PROCESSO = 'O credor não pertence a este processo.'
export const ERRO_CLASSE_DO_TIPO = 'Esta classe não existe neste tipo de processo.'
// A mensagem mora no repositório, que também recusa o documento repetido no cadastro (AJ-04).
export { AVISO_DOCUMENTO_EXISTENTE }

/** Credor do processo com este CPF/CNPJ (CRD-08), comparando só os dígitos. */
export function credorComDocumento(armazenamento: Armazenamento) {
  return async (processoId: Id, documento: string): Promise<Credor | undefined> => {
    const digitos = somenteDigitos(documento)
    if (!digitos) return undefined
    const credores = await armazenamento.porIndice<Credor>('credores', 'documento', digitos)
    return credores.find((credor) => credor.processoId === processoId)
  }
}

const CLASSES_DO_TIPO: Readonly<Record<TipoProcesso, readonly Classe[]>> = {
  rj: CLASSES_RJ,
  falencia: CLASSES_FALENCIA,
}

async function situacaoDoProcesso(armazenamento: Armazenamento, processoId: Id) {
  const processo = await buscarOuFalhar(armazenamento, 'processos', processoId)
  const marcos = await armazenamento.porIndice<Tipos['marcosDeFase']>(
    'marcosDeFase',
    'processoId',
    processoId,
  )
  return { tipo: processo.tipo, publicada: relacaoAjPublicada(processo.tipo, marcos) }
}

/** O que a tela informa ao registrar; `status` é sempre `pendente`. */
export type NovoPedido = Omit<Novo<Pedido>, 'status'>

/**
 * Registra o pedido como pendente (RF-29). Recusa o tipo que a fase não permite (CRD-10), credor
 * de outro processo e requerente cujo CPF/CNPJ já é de um credor do processo (CRD-08: a tela
 * avisa antes e oferece vincular, ou seja, registrar com `credorId`).
 */
export function registrarPedido(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoPedidos = criarRepositorio(armazenamento, 'pedidosDeCredito', contexto)
  const porDocumento = credorComDocumento(armazenamento)

  return async (dados: NovoPedido): Promise<Pedido> => {
    exigirPermissao(contexto, 'credores')
    return armazenamento.transacao(TABELAS_PEDIDOS, async () => {
      const { tipo, publicada } = await situacaoDoProcesso(armazenamento, dados.processoId)
      // O schema da coleção aceita as classes dos dois tipos; a do pedido tem de ser do processo.
      if (!CLASSES_DO_TIPO[tipo].includes(dados.classePedida)) {
        throw new ErroRegra(ERRO_CLASSE_DO_TIPO)
      }
      const naLista = Boolean(dados.credorId)
      if (publicada && dados.tipo !== 'impugnacao') throw new ErroRegra(ERRO_SO_IMPUGNACAO)
      if (!publicada && dados.tipo === 'impugnacao') throw new ErroRegra(ERRO_SO_ANTES_DA_RELACAO)
      if (!tiposDePedidoPermitidos(publicada, naLista).includes(dados.tipo)) {
        throw new ErroRegra(naLista ? ERRO_TIPO_PARA_CREDOR : ERRO_TIPO_PARA_REQUERENTE)
      }

      if (dados.credorId) {
        const credor = await buscarOuFalhar(armazenamento, 'credores', dados.credorId)
        if (credor.processoId !== dados.processoId) {
          throw new ErroRegra(ERRO_CREDOR_DE_OUTRO_PROCESSO)
        }
        // Pedido do credor da lista não guarda requerente: o credor já tem nome e documento.
        const { requerente: _requerente, ...semRequerente } = dados
        return repoPedidos.criar({ ...semRequerente, status: 'pendente' })
      }

      const existente = dados.requerente
        ? await porDocumento(dados.processoId, dados.requerente.documento)
        : undefined
      if (existente) {
        throw new ErroRegra(AVISO_DOCUMENTO_EXISTENTE, [
          { colecao: 'credores', id: existente.id, rotulo: existente.nome },
        ])
      }
      return repoPedidos.criar({ ...dados, status: 'pendente' })
    })
  }
}

export type Decisao = 'acolhido' | 'rejeitado'

export interface ResultadoDecisao {
  pedido: Pedido
  /** Credor atualizado ou criado ao acolher; ausente ao rejeitar. */
  credor?: Credor
  /** O credor nasceu do pedido (requerente fora da lista, CRD-05, CRD-06). */
  credorCriado: boolean
}

/**
 * Decide o pedido pendente (RF-29) numa transação. Rejeitar só muda o status (CRD-07). Acolher:
 * - divergência ou habilitação: valor e classe pedidos na relação do AJ (CRD-03);
 * - impugnação: valor e classe pedidos no QGC, relação do AJ intacta (CRD-04);
 * - requerente fora da lista: cria o credor (devedor 0; AJ = pedido, ou AJ 0 e QGC = pedido na
 *   impugnação) e liga o pedido a ele (CRD-05, CRD-06). Se, até a decisão, o CPF/CNPJ passou a
 *   ser de um credor do processo, o pedido vale para esse credor, sem criar outro.
 * Pedido já decidido é recusado (CRD-09). Cada gravação tem seu log (credor e pedido).
 */
export function decidirPedido(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoPedidos = criarRepositorio(armazenamento, 'pedidosDeCredito', contexto)
  const repoCredores = criarRepositorio(armazenamento, 'credores', contexto)
  const porDocumento = credorComDocumento(armazenamento)

  return async (pedidoId: Id, decisao: Decisao): Promise<ResultadoDecisao> => {
    exigirPermissao(contexto, 'credores')
    return armazenamento.transacao(TABELAS_PEDIDOS, async () => {
      const pedido = await buscarOuFalhar(armazenamento, 'pedidosDeCredito', pedidoId)
      if (pedido.status !== 'pendente') throw new ErroRegra(ERRO_PEDIDO_JA_DECIDIDO)

      if (decisao === 'rejeitado') {
        return {
          pedido: await repoPedidos.atualizar(pedidoId, { status: 'rejeitado' }),
          credorCriado: false,
        }
      }
      // Depois da relação do AJ publicada, ela não muda (CRD-04, art. 8º, T-39): divergência e
      // habilitação que ficaram pendentes só podem ser rejeitadas.
      if (pedido.tipo !== 'impugnacao') {
        const { publicada } = await situacaoDoProcesso(armazenamento, pedido.processoId)
        if (publicada) throw new ErroRegra(ERRO_SO_REJEITAR_DEPOIS_DA_RELACAO)
      }

      let credor = pedido.credorId
        ? await buscarOuFalhar(armazenamento, 'credores', pedido.credorId)
        : pedido.requerente && (await porDocumento(pedido.processoId, pedido.requerente.documento))
      let credorCriado = false

      if (credor) {
        credor = await repoCredores.atualizar(credor.id, valoresAcolhidos(pedido))
      } else {
        if (!pedido.requerente) throw new ErroRegra('Pedido sem credor e sem requerente.')
        credor = await repoCredores.criar({
          processoId: pedido.processoId,
          nome: pedido.requerente.nome,
          documento: pedido.requerente.documento,
          classe: pedido.classePedida,
          natureza: '',
          valorDevedor: 0,
          ...(pedido.tipo === 'impugnacao'
            ? { valorAj: 0, valorQgc: pedido.valorPedido }
            : { valorAj: pedido.valorPedido, valorQgc: null }),
        })
        credorCriado = true
      }

      const atualizado = await repoPedidos.atualizar(pedidoId, {
        status: 'acolhido',
        credorId: credor.id,
      })
      return { pedido: atualizado, credor, credorCriado }
    })
  }
}

/** Campos do credor que o pedido acolhido muda: classe e a relação do tipo do pedido. */
function valoresAcolhidos(pedido: Pedido): Partial<Novo<Credor>> {
  return pedido.tipo === 'impugnacao'
    ? { classe: pedido.classePedida, valorQgc: pedido.valorPedido }
    : { classe: pedido.classePedida, valorAj: pedido.valorPedido }
}
