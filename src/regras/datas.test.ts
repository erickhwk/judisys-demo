import { describe, expect, it } from 'vitest'
import {
  diasEntre,
  ehDataIso,
  formatarData,
  formatarDataHora,
  formatarDataPorExtenso,
  formatarMesAno,
  somarAnos,
  somarDias,
  somarMeses,
} from './datas'

describe('cálculo de datas', () => {
  it('somarDias atravessa mês, ano e horário de verão sem fuso', () => {
    expect(somarDias('2026-11-07', 6)).toBe('2026-11-13')
    expect(somarDias('2026-12-20', 15)).toBe('2027-01-04')
    expect(somarDias('2026-11-07', -12)).toBe('2026-10-26')
    expect(somarDias('2026-03-01', 180)).toBe('2026-08-28')
  })

  it('somarMeses ajusta o fim do mês', () => {
    expect(somarMeses('2026-12-15', 1)).toBe('2027-01-15')
    expect(somarMeses('2027-01-31', 1)).toBe('2027-02-28')
    expect(somarMeses('2028-01-31', 1)).toBe('2028-02-29')
  })

  it('somarAnos', () => {
    expect(somarAnos('2026-11-07', 2)).toBe('2028-11-07')
  })

  it('diasEntre conta dias de calendário', () => {
    expect(diasEntre('2026-11-07', '2026-11-10')).toBe(3)
    expect(diasEntre('2026-11-07', '2026-11-06')).toBe(-1)
    expect(diasEntre('2026-11-07', '2026-11-07')).toBe(0)
  })

  it('ehDataIso só aceita datas que existem', () => {
    expect(ehDataIso('2026-11-07')).toBe(true)
    expect(ehDataIso('2028-02-29')).toBe(true)
    expect(ehDataIso('2027-02-29')).toBe(false)
    expect(ehDataIso('2026-13-01')).toBe(false)
    expect(ehDataIso('07/11/2026')).toBe(false)
    expect(ehDataIso('2026-11-07T10:00')).toBe(false)
    expect(ehDataIso('')).toBe(false)
  })

  it('data inválida lança erro', () => {
    expect(() => somarDias('abc', 1)).toThrow('Data inválida')
  })
})

describe('formatação de datas (RNF-04)', () => {
  it('formatarData → dd/mm/aaaa, de data ou carimbo', () => {
    expect(formatarData('2026-01-05')).toBe('05/01/2026')
    expect(formatarData('2026-11-04T14:22')).toBe('04/11/2026')
    expect(formatarData('2026-11-04T23:59:59')).toBe('04/11/2026')
  })

  it('formatarDataHora → dd/mm/aaaa HH:mm', () => {
    expect(formatarDataHora('2026-11-04T14:22')).toBe('04/11/2026 14:22')
    expect(formatarDataHora('2026-11-04T09:05:30')).toBe('04/11/2026 09:05')
  })

  it('por extenso e mês/ano em pt-BR', () => {
    expect(formatarDataPorExtenso('2026-11-07')).toBe('7 de novembro de 2026')
    expect(formatarMesAno('2026-03-01')).toBe('março de 2026')
  })
})
