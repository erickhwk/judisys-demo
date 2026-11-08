// Regras de encaixe da montagem (SDD-INI §5.4, INV-01, INV-02, GRD-05, MNT-04, MNT-05).
import { describe, expect, it } from 'vitest'
import { PAPEIS } from '../../regras/permissoes'
import {
  CATALOGO,
  COLUNAS_DESKTOP,
  COLUNAS_TABLET,
  cabe,
  catalogoDoPapel,
  empacotar,
  ID_QUADROS,
  type ItemMontagem,
  MEDIDA_DESKTOP,
  MEDIDA_TABLET,
  type Montagem,
  normalizar,
  ordemDeLeitura,
  PADROES,
  primeiroLugarLivre,
} from './montagem'

/** Nenhum item fora das colunas nem sobreposto a outro (INV-01). */
function semSobreposicao(montagem: readonly ItemMontagem[], cols = COLUNAS_DESKTOP): boolean {
  return montagem.every((item) => cabe(item, item.x, item.y, montagem, cols))
}

describe('CATALOGO', () => {
  it('tem os 12 quadros, com os tamanhos do PRD §6.4', () => {
    expect(Object.keys(CATALOGO)).toEqual([...ID_QUADROS])
    const tamanhos = Object.fromEntries(
      ID_QUADROS.map((id) => [id, `${CATALOGO[id].w}x${CATALOGO[id].h}`]),
    )
    expect(tamanhos).toEqual({
      prazos: '1x1',
      agc: '1x1',
      pedidos: '1x1',
      proximos: '1x2',
      calendario: '1x2',
      atividade: '1x2',
      informes: '1x2',
      passivo: '2x1',
      publicados: '2x1',
      cumpridos: '2x1',
      classes: '2x1',
      carteira: '4x1',
    })
  })

  it('no tablet, quadros de 1 ou 2 mantêm o tamanho e a carteira vira 2×2', () => {
    for (const id of ID_QUADROS) {
      const { w, h, wTablet, hTablet } = CATALOGO[id]
      if (id === 'carteira') expect([wTablet, hTablet]).toEqual([2, 2])
      else expect([wTablet, hTablet]).toEqual([w, h])
    }
  })

  it('S-05 · hoje os três papéis leem os 12 quadros', () => {
    for (const papel of PAPEIS) expect(catalogoDoPapel(papel)).toHaveLength(12)
  })
})

describe('PADROES (RF-17)', () => {
  it.each(PAPEIS)('INV-01 · %s: sem sobreposição, dentro de 4 colunas, sem repetidos', (papel) => {
    const padrao = PADROES[papel]
    expect(semSobreposicao(padrao)).toBe(true)
    expect(new Set(padrao.map((i) => i.quadro)).size).toBe(padrao.length)
    // O padrão é estável: normalizar não mexe nele.
    expect(normalizar(padrao, papel)).toEqual(ordemDeLeitura(padrao))
  })

  it('cada padrão preenche as 4 linhas por inteiro (16 unidades, sem buraco)', () => {
    for (const papel of PAPEIS) {
      const area = PADROES[papel].reduce(
        (soma, i) => soma + CATALOGO[i.quadro].w * CATALOGO[i.quadro].h,
        0,
      )
      expect(area, papel).toBe(16)
    }
  })
})

describe('cabe', () => {
  const montagem: Montagem = [
    { quadro: 'prazos', x: 0, y: 0 },
    { quadro: 'passivo', x: 2, y: 0 },
  ]

  it('fora do grid à direita: x + w > cols', () => {
    expect(cabe({ quadro: 'publicados' }, 3, 1, montagem, 4)).toBe(false)
    expect(cabe({ quadro: 'publicados' }, 2, 1, montagem, 4)).toBe(true)
  })

  it('x negativo', () => {
    expect(cabe({ quadro: 'agc' }, -1, 1, montagem, 4)).toBe(false)
  })

  it('sobreposição com outro item, inclusive pela altura', () => {
    expect(cabe({ quadro: 'agc' }, 3, 0, montagem, 4)).toBe(false)
    expect(cabe({ quadro: 'agc' }, 1, 0, montagem, 4)).toBe(true)
    // Próximos prazos (1×2) começando acima do Prazos esbarra nele.
    const comAlto: Montagem = [{ quadro: 'proximos', x: 1, y: 0 }]
    expect(cabe({ quadro: 'agc' }, 1, 1, comAlto, 4)).toBe(false)
    expect(cabe({ quadro: 'agc' }, 1, 2, comAlto, 4)).toBe(true)
  })

  it('o próprio item é ignorado', () => {
    expect(cabe({ quadro: 'passivo' }, 0, 0, montagem, 4)).toBe(false) // esbarra no Prazos
    expect(cabe({ quadro: 'passivo' }, 2, 0, montagem, 4)).toBe(true)
    // Uma coluna para a esquerda cobre a coluna 2, onde ele mesmo está: cabe.
    expect(cabe({ quadro: 'passivo' }, 1, 0, montagem, 4)).toBe(true)
    expect(cabe({ quadro: 'prazos' }, 1, 0, montagem, 4)).toBe(true)
  })
})

describe('primeiroLugarLivre', () => {
  it('buraco no meio', () => {
    const montagem: Montagem = [
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'agc', x: 1, y: 0 },
      { quadro: 'pedidos', x: 3, y: 0 },
      { quadro: 'publicados', x: 0, y: 1 },
    ]
    expect(primeiroLugarLivre('proximos', montagem, 4)).toEqual({ x: 2, y: 0 })
  })

  it('primeira linha cheia: vai para a linha seguinte', () => {
    const montagem: Montagem = [
      { quadro: 'carteira', x: 0, y: 0 },
      { quadro: 'prazos', x: 0, y: 1 },
    ]
    expect(primeiroLugarLivre('passivo', montagem, 4)).toEqual({ x: 1, y: 1 })
  })

  it('sem lugar: vai para a base, na coluna 0', () => {
    const montagem: Montagem = [
      { quadro: 'passivo', x: 0, y: 0 },
      { quadro: 'prazos', x: 2, y: 0 },
      { quadro: 'proximos', x: 3, y: 0 },
      { quadro: 'agc', x: 2, y: 1 },
    ]
    // Na linha 1 sobram as colunas 0 e 1: cabe um 2×1, mas não a carteira (4×1), que vai para a base.
    expect(primeiroLugarLivre('publicados', montagem, 4)).toEqual({ x: 0, y: 1 })
    expect(primeiroLugarLivre('carteira', montagem, 4)).toEqual({ x: 0, y: 2 })
    expect(primeiroLugarLivre('carteira', [], 4)).toEqual({ x: 0, y: 0 })
  })
})

describe('ordemDeLeitura', () => {
  it('por linha e, na linha, por coluna, sem alterar a entrada', () => {
    const montagem: Montagem = [
      { quadro: 'agc', x: 3, y: 1 },
      { quadro: 'prazos', x: 2, y: 0 },
      { quadro: 'pedidos', x: 0, y: 1 },
    ]
    expect(ordemDeLeitura(montagem).map((i) => i.quadro)).toEqual(['prazos', 'pedidos', 'agc'])
    expect(montagem[0]?.quadro).toBe('agc')
  })
})

describe('empacotar', () => {
  it('GRD-05 · padrão do advogado em 2 colunas, na ordem de leitura do desktop', () => {
    const tablet = empacotar(PADROES.advogado, COLUNAS_TABLET, MEDIDA_TABLET)
    expect(ordemDeLeitura(tablet).map((i) => i.quadro)).toEqual([
      'prazos',
      'agc',
      'proximos',
      'calendario',
      'publicados',
      'passivo',
      'classes',
      'carteira',
    ])
    expect(tablet).toEqual([
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'agc', x: 1, y: 0 },
      { quadro: 'proximos', x: 0, y: 1 },
      { quadro: 'calendario', x: 1, y: 1 },
      { quadro: 'publicados', x: 0, y: 3 },
      { quadro: 'passivo', x: 0, y: 4 },
      { quadro: 'classes', x: 0, y: 5 },
      { quadro: 'carteira', x: 0, y: 6 },
    ])
    expect(tablet.every((i) => cabe(i, i.x, i.y, tablet, 2, MEDIDA_TABLET))).toBe(true)
  })

  it('os três padrões viram 2 colunas sem sobreposição', () => {
    for (const papel of PAPEIS) {
      const tablet = empacotar(PADROES[papel], COLUNAS_TABLET, MEDIDA_TABLET)
      expect(tablet).toHaveLength(PADROES[papel].length)
      expect(
        tablet.every((i) => cabe(i, i.x, i.y, tablet, 2, MEDIDA_TABLET)),
        papel,
      ).toBe(true)
    }
  })
})

describe('normalizar', () => {
  it('MNT-04 · quadro inexistente ignorado; repetido também', () => {
    const salva = [
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'grafico-antigo', x: 1, y: 0 },
      { quadro: 'prazos', x: 2, y: 0 },
      { quadro: 'agc', x: 3, y: 0 },
    ]
    expect(normalizar(salva, 'advogado')).toEqual([
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'agc', x: 3, y: 0 },
    ])
  })

  it('MNT-05 · itens sobrepostos ou fora do grid reposicionados (INV-01)', () => {
    const salva = [
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'agc', x: 0, y: 0 }, // em cima do Prazos
      { quadro: 'passivo', x: 3, y: 1 }, // 2×1 na coluna 3: passa da 4ª coluna
      { quadro: 'pedidos', x: 1, y: 0 }, // estava certo: não é desalojado pelos deslocados
    ]
    const normalizada = normalizar(salva, 'analista')
    expect(normalizada).toEqual([
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'pedidos', x: 1, y: 0 },
      { quadro: 'agc', x: 2, y: 0 },
      { quadro: 'passivo', x: 0, y: 1 },
    ])
    expect(semSobreposicao(normalizada)).toBe(true)
  })

  it('INV-02 · largura e altura vêm do catálogo, nunca do que foi salvo', () => {
    const salva = [{ quadro: 'carteira', x: 0, y: 0, w: 1, h: 1 }]
    const normalizada = normalizar(salva, 'aj')
    expect(normalizada).toEqual([{ quadro: 'carteira', x: 0, y: 0 }])
    expect(MEDIDA_DESKTOP('carteira')).toEqual({ w: 4, h: 1 })
  })

  it('montagem vazia continua vazia', () => {
    expect(normalizar([], 'aj')).toEqual([])
  })
})
