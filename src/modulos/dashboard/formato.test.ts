// Valor compacto do cartão do passivo e do eixo do gráfico (INV-03: entra em centavos).
import { describe, expect, it } from 'vitest'
import { formatarMoedaCurta } from './formato'

describe('formatarMoedaCurta', () => {
  it.each([
    [0, 'R$ 0'],
    [99_900, 'R$ 999'],
    [500_000_000, 'R$ 5 mi'],
    [54_650_000_000, 'R$ 546,5 mi'],
  ])('%i centavos → %s', (centavos, esperado) => {
    expect(formatarMoedaCurta(centavos)).toBe(esperado)
  })
})
