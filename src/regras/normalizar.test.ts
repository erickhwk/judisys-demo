import { describe, expect, it } from 'vitest'
import { normalizar } from './normalizar'

describe('normalizar', () => {
  it('BUS-02 · ignora acentos e maiúsculas', () => {
    expect(normalizar('José Conceição')).toBe(normalizar('jose conceicao'))
    expect(normalizar('JOSÉ CONCEIÇÃO')).toBe('jose conceicao')
  })

  it('BUS-03 · CNPJ com e sem pontuação normalizam igual', () => {
    expect(normalizar('12.345.678/0001-90')).toBe(normalizar('12345678000190'))
    expect(normalizar('12.345.678/0001-90')).toBe('12345678000190')
  })

  it('número CNJ sem pontuação casa com o formatado', () => {
    expect(normalizar('1000123-45.2025.8.26.0100')).toBe('10001234520258260100')
  })

  it('tira espaços extras', () => {
    expect(normalizar('  Aurora   Têxtil \t Ltda ')).toBe('aurora textil ltda')
  })

  it('texto vazio continua vazio', () => {
    expect(normalizar('')).toBe('')
  })
})
