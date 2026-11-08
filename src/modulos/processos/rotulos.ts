// Rótulos das telas de processo: tipo e consolidação (RF-11 a RF-13); as UFs vêm de regras/empresas.
import type { TipoProcesso } from '../../regras/fases'
import type { TomSelo } from '../../ui/Selo'

export const ROTULOS_TIPO: Readonly<Record<TipoProcesso, string>> = {
  rj: 'Recuperação judicial',
  falencia: 'Falência',
}

/**
 * Pílula do tipo (lista e tela do processo): RJ azul, falência dourada, as mesmas cores da
 * Carteira por fase do início (INI-09, canvas aprovado), para o tipo não trocar de cor no clique.
 */
export const TOM_TIPO: Readonly<Record<TipoProcesso, TomSelo>> = {
  rj: 'azul',
  falencia: 'dourado',
}

export const ROTULOS_CONSOLIDACAO = {
  nenhuma: 'Nenhuma',
  processual: 'Processual',
  substancial: 'Substancial',
} as const

export type Consolidacao = keyof typeof ROTULOS_CONSOLIDACAO

/** "1 prazo", "2 prazos". */
export function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`
}
