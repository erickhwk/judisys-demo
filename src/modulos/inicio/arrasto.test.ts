// Regras puras da grade (SDD-INI §5.3 e §5.6): colunas pela largura, célula pelo ponteiro, recusa e
// empurrão para baixo. Os casos GRD e PRS de tela estão em grade.test.tsx e em e2e/personalizar.
import { describe, expect, it } from 'vitest'
import {
  colunaPretendida,
  colunasDaLargura,
  deslocamentoNoGrid,
  larguraDaUnidade,
  linhaPretendida,
  recusa,
  soltar,
} from './arrasto'
import { CATALOGO, type Montagem, padraoDoPapel } from './montagem'

const sobrepostos = (montagem: Montagem) =>
  montagem.some((a, i) =>
    montagem.some((b, j) => {
      if (i >= j) return false
      const da = CATALOGO[a.quadro]
      const db = CATALOGO[b.quadro]
      return a.x < b.x + db.w && b.x < a.x + da.w && a.y < b.y + db.h && b.y < a.y + da.h
    }),
  )

describe('larguras (5.3)', () => {
  it.each([
    [1600, 4],
    [880, 4],
    [879, 2],
    [600, 2],
    [599, 1],
    [358, 1],
  ] as const)('GRD-03/GRD-04/GRD-06 · contêiner de %ipx: %i colunas', (largura, cols) => {
    expect(colunasDaLargura(largura)).toBe(cols)
  })

  it('unidade de 208px em 880px, sem teto: 538px em 2200px e 813px em 3300px (GRD-09, AJ-26)', () => {
    expect(larguraDaUnidade(880, 4)).toBe(208)
    expect(larguraDaUnidade(2200, 4)).toBe(538)
    expect(larguraDaUnidade(3300, 4)).toBe(813)
    expect(larguraDaUnidade(5000, 4)).toBe(1238)
  })

  it('unidade de 292 a 432px em 2 colunas', () => {
    expect(larguraDaUnidade(600, 2)).toBe(292)
    expect(larguraDaUnidade(879, 2)).toBeCloseTo(431.5)
  })
})

describe('célula pelo ponteiro (5.6, passo 2)', () => {
  // Grid em x = 300, unidade de 298px: cada coluna começa 314px depois da anterior.
  it('arredonda a borda esquerda do quadro para a coluna mais próxima', () => {
    expect(colunaPretendida(300 + 20, 20, 300, 298)).toBe(0)
    expect(colunaPretendida(300 + 314 * 2 + 150, 20, 300, 298)).toBe(2)
    expect(colunaPretendida(300 + 314 * 2 + 190, 20, 300, 298)).toBe(3)
  })

  it('pode sair do grid pelos dois lados', () => {
    expect(colunaPretendida(300 - 200, 20, 300, 298)).toBe(-1)
    expect(colunaPretendida(300 + 314 * 3 + 20, 20, 300, 298)).toBe(3)
    expect(colunaPretendida(300 + 314 * 4 + 20, 20, 300, 298)).toBe(4)
  })

  it('no ultrawide, com unidade de 813px, cada coluna começa 829px depois da anterior (AJ-26)', () => {
    expect(colunaPretendida(300 + 829 * 2 + 20, 20, 300, 813)).toBe(2)
    expect(colunaPretendida(300 + 829 * 3 + 450, 20, 300, 813)).toBe(4)
  })

  it('a linha nunca fica acima da primeira', () => {
    expect(linhaPretendida(100, 10, 200)).toBe(0)
    expect(linhaPretendida(200 + 192 * 2 + 10, 10, 200)).toBe(2)
  })

  it('o desenho do arrastado não passa de um vão além das bordas do grid', () => {
    // Célula de 300px a 500px da esquerda, num grid de 1000px: sobra 200px à direita, mais o vão.
    expect(deslocamentoNoGrid(150, 500, 300, 1000)).toBe(150)
    expect(deslocamentoNoGrid(600, 500, 300, 1000)).toBe(216)
    expect(deslocamentoNoGrid(-900, 500, 300, 1000)).toBe(-516)
  })
})

describe('recusa (RF-19)', () => {
  it('PRS-04 · Passivo (2×1) na coluna 4 não cabe', () => {
    expect(recusa('passivo', 3)).toBe(true)
    expect(recusa('passivo', 2)).toBe(false)
  })

  it('negativa é recusa; um 1×1 cabe em qualquer coluna de 0 a 3', () => {
    expect(recusa('prazos', -1)).toBe(true)
    for (const x of [0, 1, 2, 3]) expect(recusa('prazos', x)).toBe(false)
    expect(recusa('prazos', 4)).toBe(true)
  })

  it('a carteira (4×1) só cabe na coluna 1', () => {
    expect(recusa('carteira', 0)).toBe(false)
    expect(recusa('carteira', 1)).toBe(true)
  })
})

describe('soltar (S-04)', () => {
  const advogado = padraoDoPapel('advogado')

  it('PRS-02 · lugar livre: o quadro vai para lá, nada mais se move', () => {
    // Sem a carteira, a linha 3 fica livre.
    const antes = advogado.filter((item) => item.quadro !== 'carteira')
    const depois = soltar(antes, 'prazos', 2, 3)
    expect(depois.find((i) => i.quadro === 'prazos')).toEqual({ quadro: 'prazos', x: 2, y: 3 })
    expect(depois.filter((i) => i.quadro !== 'prazos')).toEqual(
      antes.filter((i) => i.quadro !== 'prazos'),
    )
  })

  it('PRS-03 · sobre outro quadro: o outro desce, e quem ficaria por baixo também', () => {
    const depois = soltar(advogado, 'prazos', 1, 0)
    expect(depois.find((i) => i.quadro === 'agc')).toEqual({ quadro: 'agc', x: 1, y: 1 })
    // O AGC desce para a linha 1 e empurra os Informes publicados, que empurram o resto.
    expect(depois.find((i) => i.quadro === 'publicados')?.y).toBe(2)
    expect(depois.find((i) => i.quadro === 'calendario')).toEqual(
      advogado.find((i) => i.quadro === 'calendario'),
    )
    expect(sobrepostos(depois)).toBe(false)
  })

  it('o buraco de onde o quadro saiu fica (sem compactar)', () => {
    const depois = soltar(advogado, 'prazos', 0, 5)
    expect(depois.some((i) => i.x === 0 && i.y === 0)).toBe(false)
    expect(depois.find((i) => i.quadro === 'agc')).toEqual({ quadro: 'agc', x: 1, y: 0 })
  })

  it('parte sempre da montagem de antes: o caminho não deixa quadros empurrados', () => {
    // Passar por cima dos outros e voltar ao lugar de origem não muda nada.
    const meio = soltar(advogado, 'prazos', 0, 2)
    expect(meio).not.toEqual(advogado)
    expect(soltar(advogado, 'prazos', 0, 0)).toEqual(advogado)
  })

  it('soltar muito abaixo vai para a base dos outros, sem linhas vazias', () => {
    const depois = soltar(advogado, 'prazos', 0, 40)
    expect(depois.find((i) => i.quadro === 'prazos')?.y).toBe(4)
  })

  it('nunca sobrepõe, em qualquer célula do grid', () => {
    for (const quadro of ['prazos', 'passivo', 'proximos', 'carteira'] as const) {
      for (let x = 0; x + CATALOGO[quadro].w <= 4; x++) {
        for (let y = 0; y <= 4; y++) {
          expect(sobrepostos(soltar(advogado, quadro, x, y)), `${quadro} em ${x},${y}`).toBe(false)
        }
      }
    }
  })
})
