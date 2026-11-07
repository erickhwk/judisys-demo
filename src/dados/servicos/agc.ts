// AGC: cadastro, lista de presença e instalação (RF-31 a RF-33, SDD §7.6, DMO-16). As regras de
// quem vota e do quórum são as puras de `regras/votacao.ts` (DMO-05); aqui ficam as gravações, com
// permissão (INV-02) e log por registro na mesma transação (INV-01).
//
// A lista de presença só muda enquanto a AGC está agendada: instalar fecha a lista (a votação da
// DMO-17 parte dos presentes da instalação) e a AGC encerrada é só leitura (AGC-22).
import type { DataIso } from '../../regras/datas'
import { type ClasseVotante, rotuloClasse } from '../../regras/qgc'
import type { Convocacao, Instalacao } from '../../regras/votacao'
import { credoresVotantes, instalacao, motivoSemVoto } from '../../regras/votacao'
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import { type ContextoGravacao, criarRepositorio } from '../repositorio'
import type { Tipos } from '../schemas'
import { buscarOuFalhar, ErroRegra, exigirPermissao } from './comum'

type Agc = Tipos['agcs']

export const ERRO_AGC_SO_RJ = 'AGC só existe em recuperação judicial.'
export const ERRO_AGC_NAO_AGENDADA =
  'A AGC já foi instalada ou encerrada: a lista de presença e os dados não mudam mais.'
export const ERRO_CREDOR_DE_OUTRO_PROCESSO = 'O credor não é deste processo.'
export const ERRO_SEM_PRESENTES = 'Nenhum credor presente.'

const TABELAS_AGC: Tabela[] = ['agcs', 'presencas', 'votos', 'credores', 'processos', 'logs']

export interface DadosAgc {
  processoId: Id
  dataPrimeira: DataIso
  dataSegunda: DataIso
  pauta: string
}

export interface PedidoSalvarAgc {
  /** Sem `id`, cria (agendada); com `id`, edita datas e pauta enquanto agendada. */
  id?: Id
  dados: DadosAgc
}

/** Cria ou edita a AGC (RF-31): várias por processo, só na RJ. */
export function salvarAgc(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repo = criarRepositorio(armazenamento, 'agcs', contexto)
  return async ({ id, dados }: PedidoSalvarAgc): Promise<Agc> => {
    exigirPermissao(contexto, 'agc')
    return armazenamento.transacao(TABELAS_AGC, async () => {
      const processo = await buscarOuFalhar(armazenamento, 'processos', dados.processoId)
      if (processo.tipo !== 'rj') throw new ErroRegra(ERRO_AGC_SO_RJ)
      const campos = {
        dataPrimeira: dados.dataPrimeira,
        dataSegunda: dados.dataSegunda,
        pauta: dados.pauta,
      }
      if (id === undefined) {
        return repo.criar({ processoId: processo.id, ...campos, status: 'agendada' })
      }
      const agc = await agcAgendada(armazenamento, id)
      if (agc.processoId !== processo.id) throw new ErroRegra(ERRO_AGC_NAO_AGENDADA)
      return repo.atualizar(agc.id, campos)
    })
  }
}

async function agcAgendada(armazenamento: Armazenamento, agcId: Id): Promise<Agc> {
  const agc = await buscarOuFalhar(armazenamento, 'agcs', agcId)
  if (agc.status !== 'agendada') throw new ErroRegra(ERRO_AGC_NAO_AGENDADA)
  return agc
}

/** Credores do processo da AGC, como estão gravados. */
async function credoresDoProcesso(
  armazenamento: Armazenamento,
  processoId: Id,
): Promise<Tipos['credores'][]> {
  return armazenamento.porIndice<Tipos['credores']>('credores', 'processoId', processoId)
}

export interface PedidoPresenca {
  agcId: Id
  credorIds: readonly Id[]
  presente: boolean
}

/**
 * Marca ou desmarca a presença de credores (RF-32), credor a credor ou vários de uma vez.
 * Só credores do processo com direito a voto (INV-06, AGC-24); quem já está como pedido fica como
 * está (sem log). Desmarcar tira também o voto do credor, se houver.
 */
export function marcarPresenca(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoPresencas = criarRepositorio(armazenamento, 'presencas', contexto)
  const repoVotos = criarRepositorio(armazenamento, 'votos', contexto)
  return async ({ agcId, credorIds, presente }: PedidoPresenca): Promise<void> => {
    exigirPermissao(contexto, 'agc')
    await armazenamento.transacao(TABELAS_AGC, async () => {
      const agc = await agcAgendada(armazenamento, agcId)
      const credores = new Map(
        (await credoresDoProcesso(armazenamento, agc.processoId)).map((c) => [c.id, c]),
      )
      const presencas = await armazenamento.porIndice<Tipos['presencas']>(
        'presencas',
        'agcId',
        agcId,
      )
      const presencaPorCredor = new Map(presencas.map((p) => [p.credorId, p]))

      for (const credorId of new Set(credorIds)) {
        const credor = credores.get(credorId)
        if (!credor) throw new ErroRegra(ERRO_CREDOR_DE_OUTRO_PROCESSO)
        const motivo = motivoSemVoto(credor)
        if (motivo) throw new ErroRegra(`${credor.nome}: ${motivo.toLowerCase()}.`)

        const atual = presencaPorCredor.get(credorId)
        if (presente && !atual) await repoPresencas.criar({ agcId, credorId })
        if (!presente && atual) {
          await repoPresencas.excluir(atual.id)
          const votos = await armazenamento.porIndice<Tipos['votos']>('votos', 'credorId', credorId)
          for (const voto of votos.filter((v) => v.agcId === agcId)) {
            await repoVotos.excluir(voto.id)
          }
        }
      }
    })
  }
}

/**
 * "Todos da classe" (RF-32, AGC-02): marca (ou desmarca) todos os votantes da classe no processo.
 * Quem não vota fica de fora sem erro.
 */
export function marcarClasse(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const marcar = marcarPresenca(armazenamento, contexto)
  return async ({
    agcId,
    classe,
    presente,
  }: {
    agcId: Id
    classe: ClasseVotante
    presente: boolean
  }): Promise<void> => {
    exigirPermissao(contexto, 'agc')
    const agc = await buscarOuFalhar(armazenamento, 'agcs', agcId)
    const votantes = credoresVotantes(await credoresDoProcesso(armazenamento, agc.processoId))
    const credorIds = votantes.filter((v) => v.classe === classe).map((v) => v.credorId)
    await marcar({ agcId, credorIds, presente })
  }
}

/** Por que a AGC não instala nesta convocação (art. 37, §2º, T-32); `null` se instala. */
export function motivoSemInstalacao(situacao: Instalacao): string | null {
  if (situacao.instalada) return null
  if (situacao.classes.every((c) => c.quantidadePresente === 0)) return ERRO_SEM_PRESENTES
  const abaixo = situacao.classes.filter((c) => c.situacao === 'nao-atinge').map((c) => c.classe)
  return `Em 1ª convocação, cada classe precisa de presentes com mais de 50% do valor votante. Não atinge: ${abaixo.map((c) => rotuloClasse(c, 'rj')).join(', ')}.`
}

/**
 * Instala a AGC na convocação escolhida (RF-33): em 1ª, só se todas as classes com votantes
 * passam de 50% do valor (C-09); em 2ª, com qualquer número de presentes, mas não zero (T-32).
 */
export function instalarAgc(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repo = criarRepositorio(armazenamento, 'agcs', contexto)
  return async ({ agcId, convocacao }: { agcId: Id; convocacao: Convocacao }): Promise<Agc> => {
    exigirPermissao(contexto, 'agc')
    return armazenamento.transacao(TABELAS_AGC, async () => {
      const agc = await agcAgendada(armazenamento, agcId)
      const votantes = credoresVotantes(await credoresDoProcesso(armazenamento, agc.processoId))
      const presencas = await armazenamento.porIndice<Tipos['presencas']>(
        'presencas',
        'agcId',
        agcId,
      )
      const situacao = instalacao(
        votantes,
        presencas.map((p) => p.credorId),
        convocacao,
      )
      const motivo = motivoSemInstalacao(situacao)
      if (motivo) throw new ErroRegra(motivo)
      return repo.atualizar(agc.id, { status: 'instalada', convocacaoInstalada: convocacao })
    })
  }
}
