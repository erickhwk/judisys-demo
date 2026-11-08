// Quadros 2×1 do início em HTML (INI-08: Q-08 a Q-11), com o seed no relógio fixo dos e2e e com o
// armazenamento vazio. O que só o navegador mede (estouro nos extremos de largura, QDR-16) está em
// e2e/quadros-2x1.spec.ts.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { HOJE_FIXO, tabelasDoSeed } from '../../../../scripts/indicadores'
import { gravarTabelas } from '../../../dados/carga'
import { ArmazenamentoMemoria } from '../../../dados/memoria'
import { renderizarComDados } from '../../../ui/renderizarParaTeste'
import type { Variante } from './Quadro'
import { QuadroClasses } from './QuadroClasses'
import { QuadroCumpridos, rotulosQueCabem } from './QuadroCumpridos'
import { QuadroPassivo } from './QuadroPassivo'
import { QuadroPublicados } from './QuadroPublicados'
import type { PropsDoQuadro } from './registro'

let comSeed: ArmazenamentoMemoria

beforeAll(async () => {
  // Só o Date: o "hoje" dos quadros vem do relógio (relogio.ts).
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-07T10:00:00'))
  comSeed = new ArmazenamentoMemoria()
  await gravarTabelas(comSeed, tabelasDoSeed(HOJE_FIXO))
})

afterAll(() => {
  vi.useRealTimers()
})

const VARIANTES: readonly Variante[] = ['desktop', 'tablet', 'celular']

function tela(
  Componente: (props: PropsDoQuadro) => React.ReactNode,
  variante: Variante,
  armazenamento = comSeed,
) {
  return renderizarComDados(<Componente variante={variante} />, { armazenamento })
}

/** O texto alternativo do gráfico (o `<title>` do SVG ou o `aria-label`). */
const titulo = (html: string) => /<title[^>]*>([^<]+)<\/title>/.exec(html)?.[1]
/** O texto visível, sem as tags nem os comentários que o React põe entre os trechos. */
const texto = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
/** O destaque do cabeçalho da moldura, se houver. */
const destaque = (html: string) => /<header.*?_destaque_\w+">([^<]+)</.exec(html)?.[1]
const contar = (html: string, atributo: string) =>
  html.match(new RegExp(`${atributo}="\\d+"`, 'g'))?.length ?? 0

describe('Q-08 · Passivo sob administração', () => {
  it.each(VARIANTES)('QDR-09 · %s: total do topo, quatro barras e a nota', async (variante) => {
    const html = await tela(QuadroPassivo, variante)
    if (variante === 'celular') {
      // No celular, o destaque desce para o corpo (o título não cabe ao lado dele).
      expect(destaque(html)).toBeUndefined()
      expect(texto(html)).toContain('R$ 546,5 mi na relação do AJ dos processos ativos')
    } else {
      expect(destaque(html)).toBe('R$ 546,5 mi')
    }
    expect(contar(html, 'data-barra')).toBe(4)
    expect(html).toContain('Grupo Lontra Azul')
    expect(html).toContain('Fora da soma: 4 processos ainda sem relação do AJ.')
    // Empilhado só no celular (nome e valor em cima, barra embaixo).
    expect(html.includes('barrasEmpilhadas')).toBe(variante === 'celular')
  })

  it('QDR-17 · o texto alternativo traz os valores', async () => {
    const html = await tela(QuadroPassivo, 'desktop')
    expect(html).toMatch(
      /aria-label="Relação do AJ dos maiores processos ativos: Grupo Lontra Azul R\$ 325,1 mi, Gráfica Beija-Flor R\$ 81,8 mi/,
    )
  })
})

describe('Q-09 · Informes publicados', () => {
  it.each(['desktop', 'tablet'] as const)('QDR-10 · %s: 12 colunas, de dez a nov', async (v) => {
    const html = await tela(QuadroPublicados, v)
    expect(destaque(html)).toBe('43 em 12 meses')
    expect(titulo(html)).toBe(
      'Informes publicados por mês, de dezembro de 2025 a novembro de 2026 (mês em curso): dez 1, jan 5, fev 3, mar 1, abr 3, mai 0, jun 3, jul 5, ago 5, set 8, out 8, nov 1',
    )
    // O mês sem informe (mai) não desenha coluna.
    expect(contar(html, 'data-coluna')).toBe(11)
  })

  it('QDR-10 · celular: os 6 últimos meses, e o destaque soma os 6', async () => {
    const html = await tela(QuadroPublicados, 'celular')
    expect(destaque(html)).toBeUndefined()
    expect(texto(html)).toContain('30 informes em 6 meses')
    expect(titulo(html)).toBe(
      'Informes publicados por mês, de junho de 2026 a novembro de 2026 (mês em curso): jun 3, jul 5, ago 5, set 8, out 8, nov 1',
    )
    expect(contar(html, 'data-coluna')).toBe(6)
  })

  it('os meses de pico (set e out, 8) ficam em destaque', async () => {
    const html = await tela(QuadroPublicados, 'desktop')
    expect(html.match(/valorDestaque[^>]*>8</g)).toHaveLength(2)
  })
})

describe('Q-10 · Prazos cumpridos', () => {
  it.each(VARIANTES)('QDR-11 · %s: 12 pontos e o recorde em setembro (C-01)', async (variante) => {
    const html = await tela(QuadroCumpridos, variante)
    if (variante === 'celular') {
      expect(destaque(html)).toBeUndefined()
      expect(texto(html)).toContain('40 em 12 meses, por mês de vencimento')
    } else {
      expect(destaque(html)).toBe('40 em 12 meses')
      expect(texto(html)).toContain('por mês de vencimento')
    }
    expect(titulo(html)).toBe(
      'Prazos cumpridos por mês de vencimento, de novembro de 2025 a outubro de 2026: nov/25 3, dez 2, jan 2, fev 3, mar 5, abr 2, mai 1, jun 2, jul 5, ago 4, set 6, out 5',
    )
    expect(html).toContain('data-marca="10"')
    expect(html).toContain('set: recorde (6)')
    expect(html).toContain('nov/25')
  })

  it('rótulos do eixo: quatro no desktop e no tablet; no celular, o que cabe ao lado do recorde', () => {
    const rotulos = [
      'nov/25',
      'dez',
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set: recorde (6)',
      'out',
    ]
    expect(rotulosQueCabem(rotulos, 10, 2 * 208 + 16 - 32)).toEqual([0, 6, 10, 11])
    expect(rotulosQueCabem(rotulos, 10, 2 * 292 + 16 - 32)).toEqual([0, 6, 10, 11])
    expect(rotulosQueCabem(rotulos, 10, 288 - 32)).toEqual([0, 10])
    // Recorde na ponta: o rótulo dele toma o lugar da ponta, sem repetir.
    expect(rotulosQueCabem(['a: recorde (9)', 'b', 'c'], 0, 400)).toEqual([0, 1, 2])
    expect(rotulosQueCabem([], undefined, 400)).toEqual([])
  })
})

describe('Q-11 · Passivo por classe (RJ)', () => {
  it.each(VARIANTES)('QDR-12 · %s: cinco classes somando R$ 389,5 mi', async (variante) => {
    const html = await tela(QuadroClasses, variante)
    if (variante === 'celular') {
      expect(destaque(html)).toBeUndefined()
      expect(texto(html)).toContain('R$ 389,5 mi nas RJ ativas')
    } else {
      expect(destaque(html)).toBe('R$ 389,5 mi')
    }
    expect(contar(html, 'data-segmento')).toBe(5)
    // Legenda: nome, valor apagado e percentual.
    expect(texto(html)).toContain('Quirografário R$ 219,3 mi 56%')
    expect(html.includes('legendaEmColuna')).toBe(variante === 'celular')
  })

  it('QDR-17 · da maior para a menor, com os percentuais no texto alternativo', async () => {
    const html = await tela(QuadroClasses, 'desktop')
    expect(titulo(html)).toBe(
      'Relação do AJ das RJ ativas por classe: Quirografário R$ 219,3 mi (56%), Garantia real R$ 78,2 mi (20%), Não sujeito R$ 48,4 mi (13%), Trabalhista R$ 28 mi (7%), ME/EPP R$ 15,5 mi (4%)',
    )
  })

  it('a 5ª classe usa a 5ª série, não o trilho (INI-05)', async () => {
    const html = await tela(QuadroClasses, 'desktop')
    expect(html).toContain('data-segmento="4" x="')
    expect(html).toMatch(/data-segmento="4"[^>]*fill="var\(--cor-grafico-5/)
  })
})

describe('QDR-15 · estado vazio dos quatro quadros', () => {
  it.each([
    [QuadroPassivo, 'Nenhum processo ativo com relação do AJ.'],
    [QuadroPublicados, 'Nenhum informe nos últimos 12 meses.'],
    [QuadroCumpridos, 'Nenhum prazo cumprido nos últimos 12 meses.'],
    [QuadroClasses, 'Nenhuma RJ ativa com relação do AJ.'],
  ] as const)('%o sem dados mostra "%s"', async (Componente, frase) => {
    const html = await tela(Componente, 'desktop', new ArmazenamentoMemoria())
    expect(html).toContain(frase)
    expect(html).not.toContain('data-grafico')
  })

  it('no celular, os informes vazios falam dos 6 meses', async () => {
    const html = await tela(QuadroPublicados, 'celular', new ArmazenamentoMemoria())
    expect(html).toContain('Nenhum informe nos últimos 6 meses.')
  })
})
