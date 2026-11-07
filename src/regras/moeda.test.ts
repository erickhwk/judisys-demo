// Reais em centavos inteiros (INV-03, RNF-04): formatação e leitura do campo.
import { describe, expect, it } from 'vitest'
import {
  formatarCentavos,
  formatarMoeda,
  formatarMoedaCurta,
  lerMoeda,
  moedaParaCampo,
} from './moeda'

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

describe('formatação de moeda (RNF-04, INV-03)', () => {
  it('formatarMoeda → R$ 1.234,56', () => {
    expect(formatarMoeda(123456)).toBe('R$ 1.234,56')
    expect(formatarMoeda(0)).toBe('R$ 0,00')
    expect(formatarMoeda(7)).toBe('R$ 0,07')
    expect(formatarMoeda(99)).toBe('R$ 0,99')
    expect(formatarMoeda(100000)).toBe('R$ 1.000,00')
    expect(formatarMoeda(123456789012)).toBe('R$ 1.234.567.890,12')
    expect(formatarMoeda(-123456)).toBe('-R$ 1.234,56')
  })

  it('CRD-13 · soma de centavos é exata', () => {
    expect(formatarMoeda(10 + 20 + 30)).toBe('R$ 0,60')
  })

  it('formatarCentavos sem símbolo, com separador configurável', () => {
    expect(formatarCentavos(123456)).toBe('1.234,56')
    expect(formatarCentavos(123456, '')).toBe('1234,56')
  })

  it('recusa valor não inteiro', () => {
    expect(() => formatarMoeda(12.5)).toThrow('não inteiro')
  })
})

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
