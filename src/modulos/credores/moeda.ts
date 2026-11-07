// Valor em reais digitado no formulário ↔ centavos inteiros (INV-03), sem ponto flutuante.
import { formatarCentavos, formatarMoeda } from '../../regras/datas'

const FORMATO = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/

/**
 * `1.234,56`, `1234,5`, `1234` ou `R$ 1.234,56` → centavos. Vazio → `null`. Texto que não é
 * valor (letras, vírgula sobrando, separador de milhar fora do lugar, negativo) → `undefined`.
 */
export function lerMoeda(texto: string): number | null | undefined {
  const limpo = texto.replace(/^\s*R\$/, '').replace(/\s/g, '')
  if (limpo === '') return null
  if (!FORMATO.test(limpo)) return undefined
  const [inteiro = '', fracao = ''] = limpo.split(',')
  const reais = Number(inteiro.replaceAll('.', ''))
  const centavos = Number(fracao.padEnd(2, '0'))
  const total = reais * 100 + centavos
  return Number.isSafeInteger(total) ? total : undefined
}

/** Centavos → texto do campo (`1.234,56`); `null`/`undefined` → vazio. */
export function moedaParaCampo(centavos: number | null | undefined): string {
  return centavos === null || centavos === undefined ? '' : formatarCentavos(centavos)
}

/** Valor de uma relação, ou `—` quando ela ainda não tem o credor (RF-27). */
export function valorOuTraco(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '—' : formatarMoeda(valor)
}
