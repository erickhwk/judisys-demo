// Regras da tela de logs (RF-42): filtros por usuário, módulo, processo e período, e o endereço do
// registro de cada log. Funções puras; a tela só junta os dados.
import type { Id, Tabela } from '../../dados/armazenamento'
import { COLECOES } from '../../dados/repositorio'
import type { Log } from '../../dados/schemas'
import type { DataIso } from '../../regras/datas'
import { MODULOS, type Modulo } from '../../regras/permissoes'
import { type Aba, rotaDoProcesso } from '../processos/abas'

export interface FiltrosLogs {
  usuarioId?: Id
  modulo?: Modulo
  processoId?: Id
  /** Período, com as duas pontas incluídas (`aaaa-mm-dd`). */
  de?: DataIso
  ate?: DataIso
}

/** Tabelas cujas gravações têm log próprio (as outras seguem o log de outra coleção). */
const TABELAS_COM_LOG = (Object.keys(COLECOES) as Tabela[]).filter((tabela) => COLECOES[tabela].log)

/** Módulos que aparecem no filtro: os que têm alguma coleção com log, na ordem do RF-39. */
export const MODULOS_COM_LOG: readonly Modulo[] = MODULOS.filter((modulo) =>
  TABELAS_COM_LOG.some((tabela) => COLECOES[tabela].modulo === modulo),
)

/** O dia do carimbo (`2026-11-04T14:22` → `2026-11-04`). */
function diaDe(carimbo: string): DataIso {
  return carimbo.slice(0, 10)
}

/** Os logs que passam em todos os filtros informados, na ordem em que vieram. */
export function filtrarLogs(logs: readonly Log[], filtros: FiltrosLogs): Log[] {
  const { usuarioId, modulo, processoId, de, ate } = filtros
  return logs.filter(
    (log) =>
      (!usuarioId || log.usuarioId === usuarioId) &&
      (!modulo || COLECOES[log.colecao].modulo === modulo) &&
      (!processoId || log.processoId === processoId) &&
      (!de || diaDe(log.data) >= de) &&
      (!ate || diaDe(log.data) <= ate),
  )
}

/** Tabelas cujo registro tem tela própria (ou a tela do processo) para onde o log leva. */
export const TABELAS_COM_DESTINO = [
  'processos',
  'marcosDeFase',
  'prazos',
  'credores',
  'pedidosDeCredito',
  'agcs',
  'presencas',
  'votos',
  'informes',
  'empresas',
  'usuarios',
] as const satisfies readonly Tabela[]
export type TabelaComDestino = (typeof TABELAS_COM_DESTINO)[number]

export function temDestino(tabela: Tabela): tabela is TabelaComDestino {
  return (TABELAS_COM_DESTINO as readonly Tabela[]).includes(tabela)
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor !== '' ? valor : undefined
}

/**
 * Endereço do registro do log, a partir do registro como está agora (o credor do pedido, a AGC da
 * presença). `null` quando o registro não tem tela.
 */
export function destinoDoRegistro(
  log: Pick<Log, 'colecao' | 'processoId'>,
  registro: Readonly<Record<string, unknown>>,
): string | null {
  const id = texto(registro.id)
  const processo = texto(registro.processoId) ?? log.processoId
  const doProcesso = (aba: Aba, sub?: string) =>
    processo ? `${rotaDoProcesso(processo, aba)}${sub ? `/${sub}` : ''}` : null
  switch (log.colecao) {
    case 'processos':
      return id ? rotaDoProcesso(id, 'visao-geral') : null
    case 'marcosDeFase':
      return doProcesso('visao-geral')
    case 'prazos':
      return doProcesso('prazos')
    case 'credores':
      return id ? doProcesso('credores', id) : null
    case 'pedidosDeCredito': {
      const credor = texto(registro.credorId)
      return doProcesso('credores', credor)
    }
    case 'agcs':
      return id ? doProcesso('agc', id) : null
    case 'presencas':
    case 'votos': {
      const agc = texto(registro.agcId)
      return agc ? doProcesso('agc', agc) : null
    }
    case 'informes':
      return id ? `/informes/${id}` : null
    case 'empresas':
      return id ? `/empresas/${id}` : null
    case 'usuarios':
      return '/usuarios'
    default:
      return null
  }
}

/** Chave do registro de um log, para agrupar as buscas. */
export function chaveDoRegistro(log: Pick<Log, 'colecao' | 'registroId'>): string {
  return `${log.colecao}:${log.registroId}`
}
