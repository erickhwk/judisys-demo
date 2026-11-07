// Criar e editar processo com as empresas (RF-12, PRC-05, PRC-15, SDD §5.4). Cada operação numa
// transação, gravando pelos repositórios: o processo, os vínculos `processoEmpresas` (sem log
// próprio; a mudança vai para o log do processo) e, na criação, o primeiro marco e seus prazos.
import type { DataIso } from '../../regras/datas'
import type { Fase, TipoProcesso } from '../../regras/fases'
import { prazosDoMarco } from '../../regras/prazos'
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import { type ContextoGravacao, criarRepositorio } from '../repositorio'
import type { Novo, Tipos } from '../schemas'
import { buscarOuFalhar, ErroRegra, erroDeCampo, exigirPermissao, gravarLogDireto } from './comum'

type Processo = Tipos['processos']

/** Campos do processo que o formulário informa: a fase vem do primeiro marco e dos avanços. */
export type DadosProcesso = Omit<Novo<Processo>, 'faseAtual'>

/** Fase em que o processo nasce (PRC-05, PRC-15): RJ em "pedido", falência em "decretada". */
export const FASE_INICIAL: Readonly<Record<TipoProcesso, Fase>> = {
  rj: 'pedido',
  falencia: 'decretada',
}

/** Campo do log do processo que registra as empresas vinculadas (ids, em ordem). */
export const CAMPO_EMPRESAS = 'empresas'

export const ERRO_TIPO_FIXO = 'O tipo do processo não pode ser alterado.'
export const ERRO_EMPRESA_REPETIDA = 'Empresa repetida na lista.'

const TABELAS: Tabela[] = [
  'processos',
  'processoEmpresas',
  'empresas',
  'marcosDeFase',
  'prazos',
  'logs',
]

export interface NovoProcesso {
  processo: DadosProcesso
  empresaIds: Id[]
  /** Data do primeiro marco (pedido da RJ ou decretação da falência). */
  dataInicio: DataIso
}

/**
 * Cria o processo na fase inicial do tipo, com o marco na data informada e os prazos automáticos
 * desse marco (PRC-05, PRC-15), e liga as empresas. Devolve o processo criado.
 */
export function criarProcesso(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoProcessos = criarRepositorio(armazenamento, 'processos', contexto)
  const repoMarcos = criarRepositorio(armazenamento, 'marcosDeFase', contexto)
  const repoPrazos = criarRepositorio(armazenamento, 'prazos', contexto)

  return async ({ processo: dados, empresaIds, dataInicio }: NovoProcesso): Promise<Processo> => {
    exigirPermissao(contexto, 'processos')
    return armazenamento.transacao(TABELAS, async () => {
      const processo = await repoProcessos.criar({ ...dados, faseAtual: FASE_INICIAL[dados.tipo] })
      await vincularEmpresas(armazenamento, contexto, processo.id, empresaIds, 'criou')
      const marco = await repoMarcos.criar({
        processoId: processo.id,
        fase: processo.faseAtual,
        data: dataInicio,
      })
      for (const prazo of prazosDoMarco(processo, marco, [marco])) await repoPrazos.criar(prazo)
      return processo
    })
  }
}

/**
 * Edita os campos do processo e troca as empresas vinculadas, numa transação. O tipo não muda
 * (as fases e os marcos dependem dele); a fase só muda por avançar ou desfazer (RF-15).
 */
export function editarProcesso(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoProcessos = criarRepositorio(armazenamento, 'processos', contexto)

  return async (id: Id, dados: DadosProcesso, empresaIds: Id[]): Promise<Processo> => {
    exigirPermissao(contexto, 'processos')
    return armazenamento.transacao(TABELAS, async () => {
      const antigo = await buscarOuFalhar(armazenamento, 'processos', id)
      if (dados.tipo !== antigo.tipo) throw new ErroRegra(ERRO_TIPO_FIXO)
      const processo = await repoProcessos.atualizar(id, dados)
      await vincularEmpresas(armazenamento, contexto, id, empresaIds)
      return processo
    })
  }
}

/**
 * Deixa o processo ligado exatamente a `empresaIds`: cria os vínculos que faltam e remove os
 * que sobram. Se o conjunto mudou, grava no log do processo a mudança do campo `empresas`, com a
 * ação de quem chama: 'criou' na criação (não parece uma edição que o usuário não fez), 'editou' na
 * edição.
 */
async function vincularEmpresas(
  armazenamento: Armazenamento,
  contexto: ContextoGravacao,
  processoId: Id,
  empresaIds: Id[],
  acao: 'criou' | 'editou' = 'editou',
): Promise<void> {
  if (new Set(empresaIds).size !== empresaIds.length) {
    throw erroDeCampo('empresaIds', ERRO_EMPRESA_REPETIDA, empresaIds)
  }
  for (const empresaId of empresaIds) await buscarOuFalhar(armazenamento, 'empresas', empresaId)

  const repoVinculos = criarRepositorio(armazenamento, 'processoEmpresas', contexto)
  const atuais = await armazenamento.porIndice<Tipos['processoEmpresas']>(
    'processoEmpresas',
    'processoId',
    processoId,
  )
  const antes = atuais.map((vinculo) => vinculo.empresaId)
  for (const vinculo of atuais) {
    if (!empresaIds.includes(vinculo.empresaId)) await repoVinculos.excluir(vinculo.id)
  }
  for (const empresaId of empresaIds) {
    if (!antes.includes(empresaId)) await repoVinculos.criar({ processoId, empresaId })
  }

  const mesmas = antes.length === empresaIds.length && antes.every((e) => empresaIds.includes(e))
  if (mesmas) return
  await gravarLogDireto(
    armazenamento,
    contexto,
    {
      acao,
      colecao: 'processos',
      registroId: processoId,
      processoId,
      mudancas: [{ campo: CAMPO_EMPRESAS, de: antes, para: empresaIds }],
    },
    contexto.agora(),
  )
}
