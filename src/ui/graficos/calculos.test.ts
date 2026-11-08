// Contas dos gráficos em SVG (INI-05, S-06). Os números de exemplo são os das fichas (QDR-04,
// QDR-10, QDR-11), só como entrada: estes testes não dependem do seed.
import { describe, expect, it } from 'vitest'
import {
  fatiasDoTotal,
  percentuaisArredondados,
  pontosDaLinha,
  proporcoesPeloMaximo,
  rotulosPadraoDoEixo,
  textoAlternativo,
} from './calculos'

const soma = (valores: readonly number[]) => valores.reduce((a, b) => a + b, 0)

describe('fatiasDoTotal (Rosca e Barra100)', () => {
  it('as fatias somam 100% e cada uma começa onde a anterior termina', () => {
    const fatias = fatiasDoTotal([8, 25, 17])
    expect(soma(fatias.map((f) => f.comprimento))).toBeCloseTo(100, 10)
    expect(fatias.map((f) => f.inicio)).toEqual([0, 16, 66])
    expect(fatias.map((f) => f.comprimento)).toEqual([16, 50, 34])
  })

  it('valor zero não vira fatia, e as outras continuam somando 100%', () => {
    const fatias = fatiasDoTotal([3, 0, 1])
    expect(fatias.map((f) => f.indice)).toEqual([0, 2])
    expect(soma(fatias.map((f) => f.comprimento))).toBeCloseTo(100, 10)
  })

  it('tudo zero (ou lista vazia) não desenha nada', () => {
    expect(fatiasDoTotal([0, 0, 0])).toEqual([])
    expect(fatiasDoTotal([])).toEqual([])
  })
})

describe('percentuaisArredondados (Barra100)', () => {
  it('inteiros que somam 100, mesmo quando o arredondamento comum daria 99', () => {
    // Arredondando cada um: 33 + 33 + 33 = 99.
    const percentuais = percentuaisArredondados([1, 1, 1])
    expect(soma(percentuais)).toBe(100)
    expect(percentuais).toEqual([34, 33, 33])
  })

  it('inteiros que somam 100, mesmo quando o arredondamento comum daria 101', () => {
    // Arredondando cada um: 17 + 17 + 17 + 17 + 17 + 17 = 102 (16,67 cada).
    const percentuais = percentuaisArredondados([1, 1, 1, 1, 1, 1])
    expect(soma(percentuais)).toBe(100)
  })

  it('o ponto que falta vai para a maior parte decimal', () => {
    // 56,3 · 20,1 · 12,4 · 7,2 · 4,0 → piso 99; o 12,4 leva o ponto.
    expect(percentuaisArredondados([563, 201, 124, 72, 40])).toEqual([56, 20, 13, 7, 4])
  })

  it('soma 100 em listas variadas', () => {
    const casos = [[7], [1, 2], [5, 5, 5, 5, 5, 5, 5], [389, 1, 1], [0, 3, 0, 9], [2, 3, 1, 4, 1]]
    for (const valores of casos) expect(soma(percentuaisArredondados(valores))).toBe(100)
  })

  it('tudo zero dá zeros', () => {
    expect(percentuaisArredondados([0, 0])).toEqual([0, 0])
  })
})

describe('proporcoesPeloMaximo (Colunas e BarrasHorizontais)', () => {
  it('o maior valor enche a escala e os outros são frações dele', () => {
    const proporcoes = proporcoesPeloMaximo([1, 5, 3, 1, 3, 0, 3, 5, 5, 8, 8, 1])
    expect(Math.max(...proporcoes)).toBe(1)
    expect(proporcoes[0]).toBe(1 / 8)
    expect(proporcoes[5]).toBe(0)
  })

  it('aceita um máximo dado e não passa de 1', () => {
    expect(proporcoesPeloMaximo([5, 20], 10)).toEqual([0.5, 1])
  })

  it('série toda zero não quebra: tudo zero, sem NaN', () => {
    expect(proporcoesPeloMaximo([0, 0, 0])).toEqual([0, 0, 0])
    expect(proporcoesPeloMaximo([])).toEqual([])
  })
})

describe('pontosDaLinha (Linha)', () => {
  it('escala pelo máximo: o recorde no topo, zero na base, x de ponta a ponta', () => {
    const pontos = pontosDaLinha([3, 2, 2, 3, 5, 2, 1, 2, 5, 4, 6, 5])
    expect(pontos[10]).toEqual({ x: 100 * (10 / 11), y: 0 })
    expect(pontos[0]?.x).toBe(0)
    expect(pontos[11]?.x).toBe(100)
    expect(pontos[0]?.y).toBeCloseTo(50, 10)
  })

  it('série toda zero não quebra: linha reta na base', () => {
    const pontos = pontosDaLinha([0, 0, 0])
    expect(pontos.map((p) => p.y)).toEqual([100, 100, 100])
    expect(pontos.every((p) => Number.isFinite(p.x))).toBe(true)
  })

  it('um ponto só fica no meio', () => {
    expect(pontosDaLinha([4])).toEqual([{ x: 50, y: 0 }])
  })
})

describe('rotulosPadraoDoEixo (Linha)', () => {
  it('as duas pontas e a marca', () => {
    expect(rotulosPadraoDoEixo(12, 5)).toEqual([0, 5, 11])
    expect(rotulosPadraoDoEixo(12)).toEqual([0, 11])
  })

  it('a ponta vizinha da marca sai, para não sobrepor', () => {
    expect(rotulosPadraoDoEixo(12, 10)).toEqual([0, 10])
    expect(rotulosPadraoDoEixo(12, 1)).toEqual([1, 11])
  })

  it('marca numa ponta, um ponto só e lista vazia', () => {
    expect(rotulosPadraoDoEixo(12, 11)).toEqual([0, 11])
    expect(rotulosPadraoDoEixo(1, 0)).toEqual([0])
    expect(rotulosPadraoDoEixo(0)).toEqual([])
  })
})

describe('textoAlternativo (QDR-17, INV-05)', () => {
  it('junta a descrição com cada rótulo e valor', () => {
    expect(
      textoAlternativo('Pedidos de crédito', [
        { rotulo: 'Pendentes', valor: 8 },
        { rotulo: 'Acolhidos', valor: 25 },
      ]),
    ).toBe('Pedidos de crédito: Pendentes 8, Acolhidos 25')
  })

  it('formata os números em pt-BR e aceita um complemento por item', () => {
    expect(
      textoAlternativo(
        'Passivo',
        [{ rotulo: 'Trabalhista', valor: 1234.5 }],
        undefined,
        () => ' (56%)',
      ),
    ).toBe('Passivo: Trabalhista 1.234,5 (56%)')
  })

  it('sem itens, diz que não há dados', () => {
    expect(textoAlternativo('Informes publicados', [])).toBe('Informes publicados: sem dados')
  })
})
