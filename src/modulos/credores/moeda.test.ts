// Campo de valor em reais (INV-03): texto ↔ centavos inteiros.
import { describe, expect, it } from 'vitest'
import { lerMoeda, moedaParaCampo } from './moeda'

describe('lerMoeda', () => {
  it.each([
    ['1.234,56', 123_456],
    ['1234,56', 123_456],
    ['1234,5', 123_450],
    ['1234', 123_400],
    ['R$ 1.234.567,89', 123_456_789],
    ['0,10', 10],
    [' 12 ', 1_200],
  ])('%s → %i centavos', (texto, centavos) => {
    expect(lerMoeda(texto)).toBe(centavos)
  })

  it('vazio é null; texto que não é valor é undefined', () => {
    expect(lerMoeda('')).toBeNull()
    expect(lerMoeda('   ')).toBeNull()
    for (const texto of ['abc', '1,2,3', '12.34', '1.23,00', '-5', '1,234', '10.5']) {
      expect(lerMoeda(texto), texto).toBeUndefined()
    }
  })

  it('CRD-13 · 0,10 + 0,20 + 0,30 dá 0,60 exato', () => {
    const soma = ['0,10', '0,20', '0,30'].reduce(
      (total, texto) => total + (lerMoeda(texto) ?? 0),
      0,
    )
    expect(soma).toBe(60)
    expect(moedaParaCampo(soma)).toBe('0,60')
  })

  it('ida e volta', () => {
    expect(moedaParaCampo(123_456)).toBe('1.234,56')
    expect(lerMoeda(moedaParaCampo(123_456))).toBe(123_456)
    expect(moedaParaCampo(null)).toBe('')
  })
})
