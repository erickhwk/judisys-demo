// Exclusões com cascata ou bloqueio (T-23). O `excluir` genérico do repositório apaga só o
// registro; aqui ficam as regras de processo, empresa, credor e usuário, cada uma numa transação.
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import { type ContextoGravacao, criarRepositorio } from '../repositorio'
import { CAMPOS_REGISTRO, type Tipos } from '../schemas'
import { buscarOuFalhar, ErroRegra, exigirPermissao, gravarLogDireto, type Vinculo } from './comum'

type Processo = Tipos['processos']

// ---------------------------------------------------------------------------------------------
// Processo: cascata com um log

/** Tabelas que a exclusão do processo esvazia, na ordem da contagem. */
const TABELAS_CASCATA = [
  'processoEmpresas',
  'marcosDeFase',
  'prazos',
  'credores',
  'pedidosDeCredito',
  'agcs',
  'presencas',
  'votos',
  'informes',
  'arquivos',
] as const satisfies readonly Tabela[]

type TabelaCascata = (typeof TABELAS_CASCATA)[number]

/** Quantos registros de cada coleção saem com o processo (só as que têm algum). */
export type ContagemCascata = Partial<Record<TabelaCascata, number>>

/** Prefixo do campo das contagens no log da exclusão (`cascata.credores`: de 55 para 0). */
export const PREFIXO_CASCATA = 'cascata.'

type Cascata = { [K in TabelaCascata]: Id[] }

async function coletarCascata(armazenamento: Armazenamento, processoId: Id): Promise<Cascata> {
  const ids = (linhas: { id: Id }[]) => linhas.map((linha) => linha.id)
  const doProcesso = <K extends Tabela>(tabela: K) =>
    armazenamento.porIndice<Tipos[K]>(tabela, 'processoId', processoId)

  const agcs = await doProcesso('agcs')
  const presencas: Id[] = []
  const votos: Id[] = []
  for (const agc of agcs) {
    presencas.push(...ids(await armazenamento.porIndice('presencas', 'agcId', agc.id)))
    votos.push(...ids(await armazenamento.porIndice('votos', 'agcId', agc.id)))
  }
  const informes = await doProcesso('informes')
  // Uploads dos informes (SDD §5.4): o conteúdo fica em `arquivos` e sairia órfão.
  const arquivos = informes.flatMap((informe) =>
    informe.anexos.flatMap((anexo) => (anexo.origem === 'local' ? [anexo.arquivoId] : [])),
  )
  return {
    processoEmpresas: ids(await doProcesso('processoEmpresas')),
    marcosDeFase: ids(await doProcesso('marcosDeFase')),
    prazos: ids(await doProcesso('prazos')),
    credores: ids(await doProcesso('credores')),
    pedidosDeCredito: ids(await doProcesso('pedidosDeCredito')),
    agcs: ids(agcs),
    presencas,
    votos,
    informes: ids(informes),
    arquivos,
  }
}

function contar(cascata: Cascata): ContagemCascata {
  return Object.fromEntries(
    TABELAS_CASCATA.filter((tabela) => cascata[tabela].length > 0).map((tabela) => [
      tabela,
      cascata[tabela].length,
    ]),
  )
}

/** O que sairia com o processo, para a confirmação (PRC-13). Só lê. */
export function contarExclusaoProcesso(armazenamento: Armazenamento) {
  return async (processoId: Id): Promise<ContagemCascata> => {
    await buscarOuFalhar(armazenamento, 'processos', processoId)
    return contar(await coletarCascata(armazenamento, processoId))
  }
}

/**
 * Exclui o processo e, em cascata, vínculos com empresas, marcos, prazos, credores, pedidos,
 * AGCs com presenças e votos, informes e seus uploads, numa transação (T-23, PRC-13). Grava
 * **um** log, do processo, com os campos dele e uma mudança `cascata.<coleção>` por coleção
 * esvaziada. Os logs antigos ficam (LOG-03). Devolve a contagem.
 */
export function excluirProcesso(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  return async (processoId: Id): Promise<ContagemCascata> => {
    exigirPermissao(contexto, 'processos')
    const carimbo = contexto.agora()
    return armazenamento.transacao(['processos', ...TABELAS_CASCATA, 'logs'], async () => {
      const processo = await buscarOuFalhar(armazenamento, 'processos', processoId)
      const cascata = await coletarCascata(armazenamento, processoId)
      for (const tabela of TABELAS_CASCATA) {
        for (const id of cascata[tabela]) await armazenamento.delete(tabela, id)
      }
      await armazenamento.delete('processos', processoId)

      const contagem = contar(cascata)
      const campos = Object.entries(processo).filter(
        ([campo]) => !(CAMPOS_REGISTRO as readonly string[]).includes(campo),
      )
      await gravarLogDireto(
        armazenamento,
        contexto,
        {
          acao: 'excluiu',
          colecao: 'processos',
          registroId: processoId,
          processoId,
          mudancas: [
            ...campos.map(([campo, de]) => ({ campo, de, para: undefined })),
            ...Object.entries(contagem).map(([tabela, de]) => ({
              campo: `${PREFIXO_CASCATA}${tabela}`,
              de,
              para: 0,
            })),
          ],
        },
        carimbo,
      )
      return contagem
    })
  }
}

// ---------------------------------------------------------------------------------------------
// Empresa: bloqueada se vinculada a processo

export const ERRO_EMPRESA_VINCULADA =
  'A empresa está vinculada a processos e não pode ser excluída.'

/** Exclui a empresa; recusa, com os processos, se ela aparece em algum (T-23, RF-17). */
export function excluirEmpresa(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoEmpresas = criarRepositorio(armazenamento, 'empresas', contexto)

  return async (empresaId: Id): Promise<void> => {
    exigirPermissao(contexto, 'empresas')
    await armazenamento.transacao(
      ['empresas', 'processoEmpresas', 'processos', 'logs'],
      async () => {
        const vinculos = await armazenamento.porIndice<Tipos['processoEmpresas']>(
          'processoEmpresas',
          'empresaId',
          empresaId,
        )
        const processos: Vinculo[] = []
        for (const vinculo of vinculos) {
          const processo = await armazenamento.get<Processo>('processos', vinculo.processoId)
          if (processo) processos.push(vinculoDoProcesso(processo))
        }
        if (processos.length > 0) throw new ErroRegra(ERRO_EMPRESA_VINCULADA, processos)
        await repoEmpresas.excluir(empresaId)
      },
    )
  }
}

function vinculoDoProcesso(processo: Processo): Vinculo {
  return { colecao: 'processos', id: processo.id, rotulo: processo.apelido }
}

// ---------------------------------------------------------------------------------------------
// Credor: bloqueado se participou de AGC encerrada

export const ERRO_CREDOR_EM_AGC_ENCERRADA =
  'O credor participou de AGC encerrada e não pode ser excluído: a ata já registrada depende dele.'

/**
 * Exclui o credor (T-23, CRD-14). Recusa se ele votou ou esteve presente numa AGC encerrada
 * (presente sem voto conta como abstenção, T-33). Nos demais casos, as presenças e os votos dele
 * em AGCs abertas e os pedidos de crédito ligados a ele saem junto, cada um com seu log.
 */
export function excluirCredor(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoCredores = criarRepositorio(armazenamento, 'credores', contexto)
  const repoPresencas = criarRepositorio(armazenamento, 'presencas', contexto)
  const repoVotos = criarRepositorio(armazenamento, 'votos', contexto)
  const repoPedidos = criarRepositorio(armazenamento, 'pedidosDeCredito', contexto)
  const tabelas: Tabela[] = ['credores', 'presencas', 'votos', 'agcs', 'pedidosDeCredito', 'logs']

  return async (credorId: Id): Promise<void> => {
    exigirPermissao(contexto, 'credores')
    await armazenamento.transacao(tabelas, async () => {
      await buscarOuFalhar(armazenamento, 'credores', credorId)
      const presencas = await armazenamento.porIndice<Tipos['presencas']>(
        'presencas',
        'credorId',
        credorId,
      )
      const votos = await armazenamento.porIndice<Tipos['votos']>('votos', 'credorId', credorId)
      const encerradas: Vinculo[] = []
      for (const agcId of new Set([...presencas, ...votos].map((p) => p.agcId))) {
        const agc = await armazenamento.get<Tipos['agcs']>('agcs', agcId)
        if (agc?.status === 'encerrada') {
          encerradas.push({ colecao: 'agcs', id: agc.id, rotulo: agc.pauta })
        }
      }
      if (encerradas.length > 0) throw new ErroRegra(ERRO_CREDOR_EM_AGC_ENCERRADA, encerradas)

      for (const voto of votos) await repoVotos.excluir(voto.id)
      for (const presenca of presencas) await repoPresencas.excluir(presenca.id)
      const pedidos = await armazenamento.porIndice<Tipos['pedidosDeCredito']>(
        'pedidosDeCredito',
        'credorId',
        credorId,
      )
      for (const pedido of pedidos) await repoPedidos.excluir(pedido.id)
      await repoCredores.excluir(credorId)
    })
  }
}

// ---------------------------------------------------------------------------------------------
// Usuário: nem o responsável por processo, nem o próprio

export const ERRO_EXCLUIR_A_SI_MESMO = 'Você não pode excluir o próprio usuário.'
export const ERRO_USUARIO_RESPONSAVEL =
  'O usuário é responsável por processos e não pode ser excluído.'

/** Exclui o usuário (T-23): recusa o próprio e quem é responsável por processo. */
export function excluirUsuario(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoUsuarios = criarRepositorio(armazenamento, 'usuarios', contexto)

  return async (usuarioId: Id): Promise<void> => {
    exigirPermissao(contexto, 'usuarios')
    if (usuarioId === contexto.usuario.id) throw new ErroRegra(ERRO_EXCLUIR_A_SI_MESMO)
    await armazenamento.transacao(['usuarios', 'processos', 'logs'], async () => {
      const processos = await armazenamento.porIndice<Processo>(
        'processos',
        'responsavelId',
        usuarioId,
      )
      if (processos.length > 0) {
        throw new ErroRegra(ERRO_USUARIO_RESPONSAVEL, processos.map(vinculoDoProcesso))
      }
      await repoUsuarios.excluir(usuarioId)
    })
  }
}
