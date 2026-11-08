// Grade do início em HTML (SDD-INI §7.3, GRD; PRS-12; INV-06). No HTML do servidor não há layout:
// a largura do contêiner é injetada (`larguraForcada`, SDD §10). Os quadros desta etapa são os
// provisórios (moldura e título), então o armazenamento pode ficar vazio.
import { afterEach, describe, expect, it } from 'vitest'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { PAPEIS, type Papel } from '../../regras/permissoes'
import { renderizarComDados } from '../../ui/renderizarParaTeste'
import { Inicio } from './Inicio'
import {
  CATALOGO,
  empacotar,
  type IdQuadro,
  MEDIDA_TABLET,
  type Montagem,
  ordemDeLeitura,
  PADROES,
} from './montagem'
import { apagarMontagens, gravarMontagem } from './persistencia'

const USUARIOS: Record<Papel, string> = { aj: 'usr-aj', advogado: 'usr-adv', analista: 'usr-ana' }

const tela = (largura: number, papel: Papel = 'advogado') =>
  renderizarComDados(<Inicio larguraForcada={largura} />, {
    armazenamento: new ArmazenamentoMemoria(),
    papel,
  })

/** Quadros da grade na ordem do HTML, com a posição da célula. */
function celulas(html: string): Montagem {
  return [...html.matchAll(/data-celula="(\w+)" data-x="(\d+)" data-y="(\d+)"/g)].map((m) => ({
    quadro: m[1] as IdQuadro,
    x: Number(m[2]),
    y: Number(m[3]),
  }))
}

const colunas = (html: string) => /data-colunas="(\d)"/.exec(html)?.[1]

const variantes = (html: string) => [...html.matchAll(/data-variante="(\w+)"/g)].map((m) => m[1])

const titulos = (html: string) => [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])

const ordenada = (montagem: readonly Montagem[number][]) =>
  [...montagem].sort((a, b) => a.quadro.localeCompare(b.quadro))

afterEach(() => apagarMontagens(() => null))

describe('grade em 4 colunas', () => {
  it('GRD-01 · advogado sem montagem salva, em 1440px: os oito quadros do RF-17', async () => {
    const html = await tela(1440)
    expect(colunas(html)).toBe('4')
    expect(ordenada(celulas(html))).toEqual(ordenada(PADROES.advogado))
    expect(variantes(html).every((v) => v === 'desktop')).toBe(true)
  })

  it.each(PAPEIS)('GRD-02 · %s abre o padrão do papel', async (papel) => {
    const html = await tela(1440, papel)
    expect(ordenada(celulas(html))).toEqual(ordenada(PADROES[papel]))
  })

  it('GRD-03 · contêiner de 880px tem 4 colunas e o Personalizar', async () => {
    const html = await tela(880)
    expect(colunas(html)).toBe('4')
    expect(html).toContain('aria-label="Personalizar"')
  })

  it('GRD-08 · montagem com buraco: o buraco continua', async () => {
    const comBuraco: Montagem = [
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'agc', x: 3, y: 0 },
      { quadro: 'passivo', x: 1, y: 2 },
    ]
    gravarMontagem(USUARIOS.advogado, comBuraco, () => null)
    const html = await tela(1440)
    expect(celulas(html)).toEqual(comBuraco)
    // Duas linhas vazias de propósito: a grade tem as três, sem subir o Passivo.
    expect(html).toContain('grid-template-rows:repeat(3, 176px)')
  })

  it('a ordem do HTML é a de leitura (Tab e leitor de tela seguem o que se vê)', async () => {
    const html = await tela(1440, 'aj')
    expect(celulas(html)).toEqual(ordemDeLeitura(PADROES.aj))
  })

  it('cada quadro tem o título do catálogo e o link da origem no cabeçalho (RF-13)', async () => {
    const html = await tela(1440)
    expect(titulos(html)).toEqual(
      ordemDeLeitura(PADROES.advogado).map((i) => CATALOGO[i.quadro].titulo),
    )
    expect(html).toMatch(/aria-label="Prazos em aberto"[\s\S]*?href="\/agenda"[^>]*>Agenda</)
  })

  it('fora do modo de edição não há alça nem ×', async () => {
    const html = await tela(1440)
    expect(html).not.toContain('data-alca')
    expect(html).not.toContain('Tirar ')
  })
})

describe('grade em 2 colunas', () => {
  it('GRD-04 · contêiner de 879px: 2 colunas, montagem empacotada em ordem de leitura', async () => {
    const html = await tela(879)
    expect(colunas(html)).toBe('2')
    expect(celulas(html)).toEqual(ordemDeLeitura(empacotar(PADROES.advogado, 2, MEDIDA_TABLET)))
    expect(variantes(html).every((v) => v === 'tablet')).toBe(true)
  })

  it('GRD-05 · ordem do advogado e a Carteira em 2×2', async () => {
    const html = await tela(834)
    expect(titulos(html)).toEqual([
      'Prazos em aberto',
      'Próxima AGC',
      'Próximos prazos',
      'Calendário do mês',
      'Informes publicados',
      'Passivo sob administração',
      'Passivo por classe (RJ)',
      'Carteira por fase',
    ])
    expect(html).toMatch(
      /data-celula="carteira"[^>]*style="grid-column:1 \/ span 2;grid-row:\d+ \/ span 2"/,
    )
  })

  it('PRS-12 · sem o botão Personalizar (INV-06)', async () => {
    const html = await tela(879)
    expect(html).not.toContain('Personalizar')
    expect(html).not.toContain('data-alca')
  })
})

describe('celular', () => {
  it('GRD-06 · em 390px, uma coluna na mesma ordem, variantes de celular', async () => {
    const html = await tela(358)
    expect(colunas(html)).toBe('1')
    expect(html).not.toContain('data-celula')
    expect(titulos(html)).toEqual(
      ordemDeLeitura(PADROES.advogado).map((i) => CATALOGO[i.quadro].titulo),
    )
    expect(variantes(html)).toEqual(Array(8).fill('celular'))
    expect(html).not.toContain('Personalizar')
  })
})

describe('montagem vazia de propósito', () => {
  it('PRS-11 · fora do modo, o aviso com o Restaurar padrão em 4 colunas', async () => {
    gravarMontagem(USUARIOS.advogado, [], () => null)
    const html = await tela(1440)
    expect(html).toContain('Nenhum quadro no início')
    expect(html).toContain('>Restaurar padrão</button>')
  })

  it('PRS-11 · abaixo de 4 colunas, o aviso sem o botão (não há Personalizar)', async () => {
    gravarMontagem(USUARIOS.advogado, [], () => null)
    const html = await tela(834)
    expect(html).toContain('Nenhum quadro no início')
    expect(html).not.toContain('Restaurar padrão')
  })
})
