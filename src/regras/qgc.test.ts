import { describe, expect, it } from 'vitest'
import { formatarMoeda } from './moeda'
import {
  CLASSES_FALENCIA,
  CLASSES_RJ,
  type CredorQgc,
  formatarVariacao,
  resumoPorClasse,
  rotuloClasse,
  valorVigente,
  variacao,
} from './qgc'

describe('classes', () => {
  it('RJ: I a IV e não sujeito (RF-26)', () => {
    expect(CLASSES_RJ).toEqual([
      'trabalhista',
      'garantia-real',
      'quirografario',
      'me-epp',
      'nao-sujeito',
    ])
  })

  it('C-01 · falência com tributários, juros (IX) e extraconcursais à parte', () => {
    expect(CLASSES_FALENCIA).toEqual([
      'trabalhista',
      'garantia-real',
      'tributario',
      'quirografario',
      'multas',
      'subordinados',
      'juros',
      'extraconcursal',
    ])
  })

  it('rótulo com o número da classe conforme o tipo', () => {
    expect(rotuloClasse('quirografario', 'rj')).toBe('III · Quirografário')
    expect(rotuloClasse('quirografario', 'falencia')).toBe('VI · Quirografário')
    expect(rotuloClasse('juros', 'falencia')).toBe('IX · Juros')
    expect(rotuloClasse('nao-sujeito', 'rj')).toBe('Não sujeito')
    expect(rotuloClasse('extraconcursal', 'falencia')).toBe('Extraconcursal')
  })
})

describe('valorVigente (T-26)', () => {
  it('QGC prevalece sobre AJ', () => {
    expect(valorVigente({ valorAj: 100, valorQgc: 200 })).toBe(200)
  })
  it('sem QGC vale o AJ', () => {
    expect(valorVigente({ valorAj: 100, valorQgc: null })).toBe(100)
    expect(valorVigente({ valorAj: 100 })).toBe(100)
  })
  it('QGC zero vale zero (não cai para o AJ)', () => {
    expect(valorVigente({ valorAj: 100, valorQgc: 0 })).toBe(0)
  })
  it('sem AJ nem QGC vale zero; o devedor nunca vale', () => {
    expect(valorVigente({ valorAj: null, valorQgc: null })).toBe(0)
  })
})

describe('variacao', () => {
  it('CRD-02 · 100.000,00 → 120.000,00 → —: +20,00% entre devedor e AJ; QGC "—"', () => {
    const v = variacao({ valorDevedor: 10000000, valorAj: 12000000, valorQgc: null })
    expect(v.devedorParaAj).toEqual({ diferenca: 2000000, percentualCentesimos: 2000 })
    expect(formatarVariacao(v.devedorParaAj)).toBe('+20,00%')
    expect(v.ajParaQgc).toBeNull()
    expect(formatarVariacao(v.ajParaQgc)).toBe('—')
  })

  it('redução e arredondamento', () => {
    const v = variacao({ valorDevedor: 30000, valorAj: 20000, valorQgc: 20001 })
    expect(formatarVariacao(v.devedorParaAj)).toBe('-33,33%')
    expect(formatarVariacao(v.ajParaQgc)).toBe('+0,01%')
  })

  it('arredondamento simétrico em ,5 para aumento e redução', () => {
    expect(formatarVariacao(variacao({ valorDevedor: 20000, valorAj: 20001 }).devedorParaAj)).toBe(
      '+0,01%',
    )
    expect(formatarVariacao(variacao({ valorDevedor: 20000, valorAj: 19999 }).devedorParaAj)).toBe(
      '-0,01%',
    )
  })

  it('sem mudança: 0,00%; devedor zero: diferença sem percentual', () => {
    expect(formatarVariacao(variacao({ valorDevedor: 500, valorAj: 500 }).devedorParaAj)).toBe(
      '0,00%',
    )
    const v = variacao({ valorDevedor: 0, valorAj: 500 })
    expect(v.devedorParaAj).toEqual({ diferenca: 500, percentualCentesimos: null })
    expect(formatarVariacao(v.devedorParaAj)).toBe('—')
  })
})

describe('resumoPorClasse', () => {
  const credor = (classe: CredorQgc['classe'], valorAj: number, valorQgc?: number): CredorQgc => ({
    classe,
    valorDevedor: 1,
    valorAj,
    valorQgc,
  })

  it('CRD-13 · R$ 0,10 + R$ 0,20 + R$ 0,30 = R$ 0,60 exato', () => {
    const resumo = resumoPorClasse([
      credor('quirografario', 10),
      credor('quirografario', 20),
      credor('quirografario', 30),
    ])
    expect(resumo.linhas).toEqual([
      { classe: 'quirografario', quantidade: 3, valor: 60, percentualCentesimos: 10000 },
    ])
    expect(resumo.total).toEqual({ quantidade: 3, valor: 60 })
    expect(formatarMoeda(resumo.total.valor)).toBe('R$ 0,60')
  })

  it('ordem da lei, percentuais e não sujeito à parte (RF-28)', () => {
    const resumo = resumoPorClasse([
      credor('me-epp', 2500),
      credor('trabalhista', 7500),
      credor('nao-sujeito', 99999),
    ])
    expect(resumo.linhas.map((l) => [l.classe, l.percentualCentesimos])).toEqual([
      ['trabalhista', 7500],
      ['me-epp', 2500],
    ])
    expect(resumo.total).toEqual({ quantidade: 2, valor: 10000 })
    expect(resumo.aParte).toEqual([
      { classe: 'nao-sujeito', quantidade: 1, valor: 99999, percentualCentesimos: null },
    ])
  })

  it('CRD-15 · falência: extraconcursais fora do total concursal', () => {
    const resumo = resumoPorClasse([
      credor('tributario', 300),
      credor('juros', 100),
      credor('extraconcursal', 5000),
    ])
    expect(resumo.linhas.map((l) => l.classe)).toEqual(['tributario', 'juros'])
    expect(resumo.total.valor).toBe(400)
    expect(resumo.aParte.map((l) => l.classe)).toEqual(['extraconcursal'])
  })

  it('valor vigente por padrão; coluna escolhida trata ausente como zero', () => {
    const credores = [credor('quirografario', 100, 150), credor('quirografario', 200)]
    expect(resumoPorClasse(credores).total.valor).toBe(350)
    expect(resumoPorClasse(credores, 'valorAj').total.valor).toBe(300)
    expect(resumoPorClasse(credores, 'valorQgc').total.valor).toBe(150)
    expect(resumoPorClasse(credores, 'valorDevedor').total.valor).toBe(2)
  })

  it('lista vazia', () => {
    expect(resumoPorClasse([])).toEqual({
      linhas: [],
      total: { quantidade: 0, valor: 0 },
      aParte: [],
    })
  })
})
