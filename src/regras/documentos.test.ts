import { describe, expect, it } from 'vitest'
import {
  completarCnj,
  completarCnpj,
  completarCpf,
  formatarCnj,
  formatarCnpj,
  formatarCpf,
  formatarDocumento,
  somenteDigitos,
  validarCnj,
  validarCnpj,
  validarCpf,
} from './documentos'

describe('CPF', () => {
  it('aceita CPF válido com e sem pontuação', () => {
    expect(validarCpf('529.982.247-25')).toBe(true)
    expect(validarCpf('52998224725')).toBe(true)
  })

  it('aceita CPF válido com zero à esquerda', () => {
    const cpf = completarCpf('012345678')
    expect(cpf).toHaveLength(11)
    expect(cpf.startsWith('0')).toBe(true)
    expect(validarCpf(cpf)).toBe(true)
    expect(validarCpf(formatarCpf(cpf))).toBe(true)
  })

  it('recusa dígito verificador errado, tamanho errado e dígitos repetidos', () => {
    expect(validarCpf('529.982.247-24')).toBe(false)
    expect(validarCpf('52998224752')).toBe(false)
    expect(validarCpf('5299822472')).toBe(false)
    expect(validarCpf('529982247250')).toBe(false)
    expect(validarCpf('111.111.111-11')).toBe(false)
    expect(validarCpf('')).toBe(false)
    expect(validarCpf('abc')).toBe(false)
  })

  it('CSV-04 · formata CPF com zero à esquerda', () => {
    expect(formatarCpf('01234567890')).toBe('012.345.678-90')
    expect(formatarCpf('012.345.678-90')).toBe('012.345.678-90')
  })

  it('devolve como veio quando não tem 11 dígitos', () => {
    expect(formatarCpf('1234')).toBe('1234')
  })
})

describe('CNPJ', () => {
  it('aceita CNPJ válido com e sem pontuação', () => {
    expect(validarCnpj('11.222.333/0001-81')).toBe(true)
    expect(validarCnpj('11222333000181')).toBe(true)
  })

  it('completarCnpj gera os verificadores', () => {
    expect(completarCnpj('112223330001')).toBe('11222333000181')
    expect(validarCnpj(completarCnpj('001234560001'))).toBe(true)
  })

  it('recusa dígito verificador errado, tamanho errado e dígitos repetidos', () => {
    expect(validarCnpj('11.222.333/0001-82')).toBe(false)
    expect(validarCnpj('11.222.333/0001-18')).toBe(false)
    expect(validarCnpj('1122233300018')).toBe(false)
    expect(validarCnpj('00.000.000/0000-00')).toBe(false)
    expect(validarCnpj('')).toBe(false)
  })

  it('formata CNPJ', () => {
    expect(formatarCnpj('12345678000190')).toBe('12.345.678/0001-90')
    expect(formatarCnpj('12.345.678/0001-90')).toBe('12.345.678/0001-90')
    expect(formatarCnpj('123')).toBe('123')
  })
})

describe('número CNJ', () => {
  // Conferência independente: NNNNNNN AAAA J TR OOOO DD mod 97 == 1 (Resolução CNJ 65/2008).
  function conferePorBigInt(digitos: string): boolean {
    const reordenado = `${digitos.slice(0, 7)}${digitos.slice(9)}${digitos.slice(7, 9)}`
    return BigInt(reordenado) % 97n === 1n
  }

  const valido = completarCnj('100012320258260100')

  it('completarCnj gera um número que passa na conferência módulo 97', () => {
    expect(valido).toHaveLength(20)
    expect(conferePorBigInt(valido)).toBe(true)
  })

  it('aceita número válido com e sem pontuação', () => {
    expect(validarCnj(valido)).toBe(true)
    expect(validarCnj(formatarCnj(valido))).toBe(true)
  })

  it('aceita verificador com zero à esquerda', () => {
    // Procura uma base cujo DV comece com 0, para cobrir o padStart.
    let base = 0
    let numero = ''
    do {
      base += 1
      numero = completarCnj(`${base.toString().padStart(7, '0')}20258260100`)
    } while (numero[7] !== '0')
    expect(validarCnj(numero)).toBe(true)
    expect(conferePorBigInt(numero)).toBe(true)
  })

  it('recusa verificador errado e tamanho errado', () => {
    const dv = Number(valido.slice(7, 9))
    const errado = `${valido.slice(0, 7)}${((dv + 1) % 100).toString().padStart(2, '0')}${valido.slice(9)}`
    expect(validarCnj(errado)).toBe(false)
    expect(validarCnj(valido.slice(1))).toBe(false)
    expect(validarCnj('')).toBe(false)
  })

  it('formata como NNNNNNN-DD.AAAA.J.TR.OOOO', () => {
    expect(formatarCnj('10001234520258260100')).toBe('1000123-45.2025.8.26.0100')
    expect(formatarCnj('1000123-45.2025.8.26.0100')).toBe('1000123-45.2025.8.26.0100')
    expect(formatarCnj('123')).toBe('123')
  })
})

describe('completar* recusam base com tamanho errado', () => {
  it('lança erro em vez de gerar NaN ou verificador inválido', () => {
    expect(() => completarCpf('1234567')).toThrow()
    expect(() => completarCnpj('1122233300')).toThrow()
    expect(() => completarCnj('1000123')).toThrow()
    expect(() => completarCpf('12345678a')).toThrow()
  })
})

describe('formatarDocumento e somenteDigitos', () => {
  it('escolhe CPF ou CNPJ pelo tamanho', () => {
    expect(formatarDocumento('01234567890')).toBe('012.345.678-90')
    expect(formatarDocumento('12345678000190')).toBe('12.345.678/0001-90')
    expect(formatarDocumento('999')).toBe('999')
  })

  it('tira tudo que não é dígito', () => {
    expect(somenteDigitos('12.345.678/0001-90')).toBe('12345678000190')
  })
})
