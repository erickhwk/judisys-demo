// Formatação compacta de valores do dashboard: o passivo no cartão e nos eixos do gráfico.

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
