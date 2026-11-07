// Reais em centavos inteiros (INV-03, RNF-04), sem ponto flutuante: formatação para exibição e CSV
// e a leitura do valor digitado no formulário. Todo módulo formata e lê reais por aqui.

/**
 * Inteiro em centavos → `1.234,56` (sem símbolo), sem passar por ponto flutuante (INV-03).
 * Com `separadorMilhar = ''` sai `1234,56` (formato do CSV, RF-44).
 */
export function formatarCentavos(centavos: number, separadorMilhar = '.'): string {
  if (!Number.isInteger(centavos)) throw new Error(`Valor em centavos não inteiro: ${centavos}`)
  const sinal = centavos < 0 ? '-' : ''
  const absoluto = Math.abs(centavos)
  const reais = Math.floor(absoluto / 100).toString()
  const resto = (absoluto % 100).toString().padStart(2, '0')
  const reaisAgrupados = reais.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMilhar)
  return `${sinal}${reaisAgrupados},${resto}`
}

/** Inteiro em centavos → `R$ 1.234,56` (negativo: `-R$ 1.234,56`), com espaço comum. */
export function formatarMoeda(centavos: number): string {
  const texto = formatarCentavos(centavos)
  return texto.startsWith('-') ? `-R$ ${texto.slice(1)}` : `R$ ${texto}`
}

const COMPACTO = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  // Sem o mínimo, o BRL herda 2 casas cortadas para 1: `R$ 5,0 mi`, `R$ 0,0`.
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

/** Centavos → `R$ 312,5 mi` (INV-03: a conversão para reais só acontece aqui, na exibição). */
export function formatarMoedaCurta(centavos: number): string {
  return COMPACTO.format(centavos / 100).replace(/ /g, ' ')
}

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
