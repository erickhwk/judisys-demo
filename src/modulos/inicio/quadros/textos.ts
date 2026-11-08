// Textos curtos dos quadros 1×2 do início (INI-07, Q-04 a Q-07): data curta e relativa dos prazos,
// iniciais e frase da atividade recente. Funções puras: "hoje" vem por parâmetro (T-19).
import type { Log } from '../../../dados/schemas'
import { type Carimbo, type DataIso, diasEntre } from '../../../regras/datas'
import { ROTULOS_COLECAO } from '../../processos/historico'

/** `09/08`: dia e mês, sem o ano (Q-04, Q-07). */
export function diaEMes(data: DataIso | Carimbo): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`
}

/** Distância de hoje: "há 90 dias", "ontem", "hoje", "amanhã", "em 5 dias" (Q-04, QDR-05). */
export function dataRelativa(data: DataIso, hoje: DataIso): string {
  const dias = diasEntre(hoje, data)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias === -1) return 'ontem'
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`
}

/** Iniciais do avatar: a primeira letra do primeiro e do último nome ("Marina Albuquerque" → "MA"). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return `${primeira}${ultima}`.toUpperCase()
}

const VERBOS: Readonly<Record<Log['acao'], string>> = {
  criou: 'cadastrou',
  editou: 'editou',
  excluiu: 'excluiu',
}

/** Coleções de nome feminino ("uma AGC", "uma presença em AGC", "uma empresa"). */
const FEMININOS = new Set<Log['colecao']>(['agcs', 'presencas', 'empresas'])

/**
 * O "o quê" da atividade, para ler entre o nome e o processo (Q-06, canvas): "editou um credor em",
 * "cadastrou uma AGC em"; o próprio processo fica "editou o processo"; sem processo, sem o "em".
 */
export function acaoDaAtividade(log: Pick<Log, 'acao' | 'colecao' | 'processoId'>): string {
  const verbo = VERBOS[log.acao]
  if (log.colecao === 'processos') return `${verbo} o processo`
  const colecao = ROTULOS_COLECAO[log.colecao] ?? log.colecao
  const artigo = FEMININOS.has(log.colecao) ? 'uma' : 'um'
  return `${verbo} ${artigo} ${colecao}${log.processoId ? ' em' : ''}`
}
