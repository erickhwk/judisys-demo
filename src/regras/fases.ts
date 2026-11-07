// Fases por tipo de processo (RF-14) e o que "Avançar fase" oferece (T-27). Funções puras.
import type { DataIso } from './datas'

export type TipoProcesso = 'rj' | 'falencia'

/** RJ, na ordem do RF-14. */
export const FASES_RJ = [
  'pedido',
  'processamento-deferido',
  'edital-publicado',
  'relacao-aj-publicada',
  'plano-apresentado',
  'prazo-objecoes',
  'agc',
  'plano-homologado',
  'fiscalizacao',
  'encerrada',
] as const

/** Fases finais alternativas da RJ (RF-14): saem de qualquer fase não final. */
export const FASES_FINAIS_ALTERNATIVAS_RJ = ['convolada-falencia', 'desistencia'] as const

/** Falência, na ordem do RF-14. */
export const FASES_FALENCIA = [
  'decretada',
  'arrecadacao',
  'quadro-credores',
  'realizacao-ativo',
  'pagamentos',
  'prestacao-contas',
  'encerrada',
] as const

export type Fase =
  | (typeof FASES_RJ)[number]
  | (typeof FASES_FINAIS_ALTERNATIVAS_RJ)[number]
  | (typeof FASES_FALENCIA)[number]

/** Fases que não avançam (T-27). */
export const FASES_FINAIS: readonly Fase[] = ['encerrada', 'convolada-falencia', 'desistencia']

/** Rótulo legível de cada fase, como no RF-14. */
export const ROTULOS_FASE: Readonly<Record<Fase, string>> = {
  pedido: 'Pedido',
  'processamento-deferido': 'Processamento deferido',
  'edital-publicado': 'Edital de credores publicado',
  'relacao-aj-publicada': 'Relação do AJ publicada',
  'plano-apresentado': 'Plano apresentado',
  'prazo-objecoes': 'Prazo de objeções',
  agc: 'AGC',
  'plano-homologado': 'Plano homologado',
  fiscalizacao: 'Fiscalização',
  encerrada: 'Encerrada',
  'convolada-falencia': 'Convolada em falência',
  desistencia: 'Desistência',
  decretada: 'Decretada',
  arrecadacao: 'Arrecadação',
  'quadro-credores': 'Quadro de credores',
  'realizacao-ativo': 'Realização do ativo',
  pagamentos: 'Pagamentos',
  'prestacao-contas': 'Prestação de contas',
}

/** Todas as fases válidas do tipo: a sequência e, na RJ, as finais alternativas. */
export function fasesDoTipo(tipo: TipoProcesso): readonly Fase[] {
  return tipo === 'rj' ? [...FASES_RJ, ...FASES_FINAIS_ALTERNATIVAS_RJ] : FASES_FALENCIA
}

export function ehFaseFinal(fase: Fase): boolean {
  return FASES_FINAIS.includes(fase)
}

/**
 * Fases que "Avançar fase" oferece (T-27): as posteriores à atual na ordem do RF-14 (pode pular)
 * e, na RJ, as finais alternativas. Fase final, ou fase que não é do tipo, não tem seguintes.
 */
export function fasesSeguintes(tipo: TipoProcesso, faseAtual: Fase): Fase[] {
  if (ehFaseFinal(faseAtual)) return []
  const sequencia: readonly Fase[] = tipo === 'rj' ? FASES_RJ : FASES_FALENCIA
  const posicao = sequencia.indexOf(faseAtual)
  if (posicao === -1) return []
  const posteriores = sequencia.slice(posicao + 1)
  return tipo === 'rj' ? [...posteriores, ...FASES_FINAIS_ALTERNATIVAS_RJ] : [...posteriores]
}

/** Mensagem de PRC-08 (T-27). */
export const ERRO_DATA_ANTERIOR_AO_ULTIMO_MARCO = 'A data não pode ser anterior ao último marco.'

/**
 * Valida a data de um novo marco contra os marcos já gravados (T-27, PRC-08): não pode ser
 * anterior à do último. Mesma data é aceita. Devolve a mensagem de erro ou `null`.
 */
export function validarDataDoMarco(
  data: DataIso,
  marcos: readonly { data: DataIso }[],
): string | null {
  const ultima = marcos.reduce<DataIso | null>(
    (maior, marco) => (maior === null || marco.data > maior ? marco.data : maior),
    null,
  )
  return ultima !== null && data < ultima ? ERRO_DATA_ANTERIOR_AO_ULTIMO_MARCO : null
}
