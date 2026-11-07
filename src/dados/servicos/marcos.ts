// Avançar fase e desfazer marco (RF-15, T-27, T-28, INV-04, INV-05). Cada operação numa
// transação, gravando pelos repositórios: um log por registro criado, editado ou removido.
import type { DataIso } from '../../regras/datas'
import { type Fase, fasesSeguintes, validarDataDoMarco } from '../../regras/fases'
import { prazosDoMarco } from '../../regras/prazos'
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import { type ContextoGravacao, criarRepositorio } from '../repositorio'
import type { Tipos } from '../schemas'
import {
  buscarOuFalhar,
  ErroRegra,
  ehRjAtiva,
  ehRma,
  erroDeCampo,
  exigirPermissao,
  garantirRmaAberto,
  ordenarMarcos,
  temRmaAberto,
} from './comum'

type Processo = Tipos['processos']
type Marco = Tipos['marcosDeFase']
type Prazo = Tipos['prazos']

const TABELAS_MARCOS: Tabela[] = ['processos', 'marcosDeFase', 'prazos', 'logs']

export const ERRO_FASE_INDISPONIVEL = 'Esta fase não pode ser escolhida a partir da fase atual.'
export const ERRO_PRIMEIRO_MARCO = 'O primeiro marco não pode ser desfeito.'
export const ERRO_MARCO_NAO_E_O_ULTIMO = 'Este marco não é mais o último do processo.'

export interface Avanco {
  fase: Fase
  data: DataIso
}

export interface ResultadoAvanco {
  marco: Marco
  prazos: Prazo[]
}

/**
 * Grava o marco, muda a fase atual e cria os prazos automáticos da fase (RF-15, RF-22), numa
 * transação. Só fases posteriores (T-27); data não anterior ao último marco (PRC-08); marcos
 * pulados não geram prazos (T-28). O RMA do "Processamento deferido" não é criado se a RJ já
 * tem um aberto (INV-05).
 */
export function avancarFase(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoProcessos = criarRepositorio(armazenamento, 'processos', contexto)
  const repoMarcos = criarRepositorio(armazenamento, 'marcosDeFase', contexto)
  const repoPrazos = criarRepositorio(armazenamento, 'prazos', contexto)

  return async (processoId: Id, { fase, data }: Avanco): Promise<ResultadoAvanco> => {
    exigirPermissao(contexto, 'processos')
    return armazenamento.transacao(TABELAS_MARCOS, async () => {
      const processo = await buscarOuFalhar(armazenamento, 'processos', processoId)
      if (!fasesSeguintes(processo.tipo, processo.faseAtual as Fase).includes(fase)) {
        throw erroDeCampo('fase', ERRO_FASE_INDISPONIVEL, fase)
      }
      const marcos = await armazenamento.porIndice<Marco>('marcosDeFase', 'processoId', processoId)
      const erroData = validarDataDoMarco(data, marcos)
      if (erroData) throw erroDeCampo('data', erroData, data)

      const marco = await repoMarcos.criar({ processoId, fase, data })
      await repoProcessos.atualizar(processoId, { faseAtual: fase })

      const existentes = await armazenamento.porIndice<Prazo>('prazos', 'processoId', processoId)
      const jaTemRma = temRmaAberto(existentes)
      const novos = prazosDoMarco(processo, marco, [...marcos, marco]).filter(
        (novo) => !(jaTemRma && ehRma(novo)),
      )
      const prazos: Prazo[] = []
      for (const novo of novos) prazos.push(await repoPrazos.criar(novo))
      return { marco, prazos }
    })
  }
}

export interface PlanoDesfazer {
  marco: Marco
  /** Fase para a qual o processo volta: a do marco anterior. */
  faseAnterior: Fase
  /** Prazos abertos que saem junto (os cumpridos ficam como histórico, RF-15). */
  prazos: Prazo[]
}

/**
 * O que "Desfazer" removeria, para a confirmação (RF-15): o último marco e seus prazos abertos.
 * Só lê. Ao desfazer "Processamento deferido", sai também o RMA aberto da RJ, venha ele do marco
 * ou de um cumprimento (INV-05: refazer o marco não deixa dois RMAs abertos).
 */
export function previaDesfazerMarco(armazenamento: Armazenamento) {
  return (processoId: Id): Promise<PlanoDesfazer> => planejarDesfazer(armazenamento, processoId)
}

/**
 * Desfaz o último marco (RF-15, PRC-10/11), numa transação: remove os prazos do plano e o marco
 * e volta a fase. `marcoId`, se vier, é o marco que a confirmação mostrou; se já não for o
 * último, nada é feito. Se a RJ volta a uma fase ativa sem RMA aberto (ex.: desfazer "Encerrada"
 * depois de cumprir o RMA), cria o seguinte (INV-05). Devolve o que foi removido.
 */
export function desfazerMarco(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoProcessos = criarRepositorio(armazenamento, 'processos', contexto)
  const repoMarcos = criarRepositorio(armazenamento, 'marcosDeFase', contexto)
  const repoPrazos = criarRepositorio(armazenamento, 'prazos', contexto)

  return async (processoId: Id, marcoId?: Id): Promise<PlanoDesfazer> => {
    exigirPermissao(contexto, 'processos')
    return armazenamento.transacao(TABELAS_MARCOS, async () => {
      const plano = await planejarDesfazer(armazenamento, processoId)
      if (marcoId !== undefined && plano.marco.id !== marcoId) {
        throw new ErroRegra(ERRO_MARCO_NAO_E_O_ULTIMO)
      }
      for (const prazo of plano.prazos) await repoPrazos.excluir(prazo.id)
      await repoMarcos.excluir(plano.marco.id)
      const processo = await repoProcessos.atualizar(processoId, { faseAtual: plano.faseAnterior })
      await manterRmaAposDesfazer(armazenamento, contexto, processo)
      return plano
    })
  }
}

async function planejarDesfazer(
  armazenamento: Armazenamento,
  processoId: Id,
): Promise<PlanoDesfazer> {
  const processo = await buscarOuFalhar(armazenamento, 'processos', processoId)
  const marcos = ordenarMarcos(
    processo.tipo,
    await armazenamento.porIndice<Marco>('marcosDeFase', 'processoId', processoId),
  )
  const marco = marcos.at(-1)
  const anterior = marcos.at(-2)
  // O primeiro marco é a criação do processo (PRC-11).
  if (!marco || !anterior) throw new ErroRegra(ERRO_PRIMEIRO_MARCO)
  const prazos = (await armazenamento.porIndice<Prazo>('prazos', 'processoId', processoId)).filter(
    (prazo) =>
      prazo.status === 'aberto' &&
      (prazo.marcoId === marco.id || (marco.fase === 'processamento-deferido' && ehRma(prazo))),
  )
  return { marco, faseAnterior: anterior.fase as Fase, prazos }
}

async function manterRmaAposDesfazer(
  armazenamento: Armazenamento,
  contexto: ContextoGravacao,
  processo: Processo,
): Promise<void> {
  if (!ehRjAtiva(processo)) return
  const marcos = await armazenamento.porIndice<Marco>('marcosDeFase', 'processoId', processo.id)
  const deferido = marcos.find((m) => m.fase === 'processamento-deferido')
  if (!deferido) return
  // O seguinte ao último RMA (já cumprido); sem nenhum, o do próprio marco.
  const ultimoRma = (await armazenamento.porIndice<Prazo>('prazos', 'processoId', processo.id))
    .filter(ehRma)
    .map((prazo) => prazo.vencimento)
    .sort()
    .at(-1)
  await garantirRmaAberto(
    armazenamento,
    contexto,
    processo.id,
    ultimoRma ?? deferido.data,
    deferido.id,
  )
}
