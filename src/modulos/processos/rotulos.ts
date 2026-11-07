// Rótulos das telas de processo: tipo, consolidação e UFs (RF-11 a RF-13).
import type { TipoProcesso } from '../../regras/fases'
import type { TomSelo } from '../../ui/Selo'

export const ROTULOS_TIPO: Readonly<Record<TipoProcesso, string>> = {
  rj: 'Recuperação judicial',
  falencia: 'Falência',
}

/** Pílula do tipo, como a "Categoria" de `processos-lista.html`: RJ dourada, falência azul. */
export const TOM_TIPO: Readonly<Record<TipoProcesso, TomSelo>> = {
  rj: 'dourado',
  falencia: 'azul',
}

export const ROTULOS_CONSOLIDACAO = {
  nenhuma: 'Nenhuma',
  processual: 'Processual',
  substancial: 'Substancial',
} as const

export type Consolidacao = keyof typeof ROTULOS_CONSOLIDACAO

export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const

/** "1 prazo", "2 prazos". */
export function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`
}
