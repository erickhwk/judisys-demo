// Os cinco gráficos em SVG (INI-05, S-06) renderizados em HTML: texto alternativo com os valores
// (QDR-17, INV-05), cores só por token (INV-04) e os casos de borda de cada um.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Barra100 } from './Barra100'
import { BarrasHorizontais } from './BarrasHorizontais'
import { Colunas } from './Colunas'
import { Legenda } from './Legenda'
import { Linha } from './Linha'
import { Rosca } from './Rosca'

/** Desfaz o escape do HTML para comparar o texto. */
function texto(html: string): string {
  return html
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}

/** Nome acessível: o `<title>` apontado pelo aria-labelledby, ou o aria-label. */
function nomeAcessivel(html: string): string {
  const legivel = texto(html)
  const id = /aria-labelledby="([^"]+)"/.exec(legivel)?.[1]
  if (id) {
    const titulo = new RegExp(`<title id="${id}">([^<]*)</title>`).exec(legivel)
    if (titulo) return titulo[1] ?? ''
  }
  const rotulo = /role="img" aria-label="([^"]*)"/.exec(legivel)
  if (rotulo) return rotulo[1] ?? ''
  throw new Error('gráfico sem nome acessível')
}

const contar = (html: string, padrao: RegExp) => html.match(padrao)?.length ?? 0

/** Toda cor do SVG vem de var(--…), nunca de cor fixa (INV-04, AJ-17). */
function coresFixas(html: string): string[] {
  return [...html.matchAll(/(?:fill|stroke|background)[:=]"?\s*([^";]+)/g)]
    .map((m) => (m[1] ?? '').trim())
    .filter((cor) => cor !== 'none' && !cor.startsWith('var(--'))
}

const PEDIDOS = [
  { rotulo: 'Pendentes', valor: 8, tom: 'serie-2' as const },
  { rotulo: 'Acolhidos', valor: 25, tom: 'serie-1' as const },
  { rotulo: 'Rejeitados', valor: 17, tom: 'serie-4' as const },
]

const MESES = ['dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov']
const PUBLICADOS = [1, 5, 3, 1, 3, 0, 3, 5, 5, 8, 8, 1]
const CUMPRIDOS = [3, 2, 2, 3, 5, 2, 1, 2, 5, 4, 6, 5]

describe('QDR-17 · cada gráfico expõe o texto alternativo com os valores', () => {
  it('Rosca', () => {
    const html = renderToString(<Rosca descricao="Pedidos de crédito" segmentos={PEDIDOS} />)
    expect(html).toContain('role="img"')
    expect(nomeAcessivel(html)).toBe('Pedidos de crédito: Pendentes 8, Acolhidos 25, Rejeitados 17')
  })

  it('Colunas', () => {
    const colunas = MESES.map((rotulo, i) => ({ rotulo, valor: PUBLICADOS[i] ?? 0 }))
    const html = renderToString(
      <Colunas descricao="Informes publicados por mês" colunas={colunas} />,
    )
    expect(html).toContain('role="img"')
    expect(nomeAcessivel(html)).toBe(
      'Informes publicados por mês: dez 1, jan 5, fev 3, mar 1, abr 3, mai 0, jun 3, jul 5, ago 5, set 8, out 8, nov 1',
    )
  })

  it('Linha', () => {
    const pontos = MESES.map((rotulo, i) => ({ rotulo, valor: CUMPRIDOS[i] ?? 0 }))
    const html = renderToString(<Linha descricao="Prazos cumpridos por mês" pontos={pontos} />)
    expect(html).toContain('role="img"')
    expect(nomeAcessivel(html)).toBe(
      'Prazos cumpridos por mês: dez 3, jan 2, fev 2, mar 3, abr 5, mai 2, jun 1, jul 2, ago 5, set 4, out 6, nov 5',
    )
  })

  it('Barra100, com os percentuais', () => {
    const html = renderToString(
      <Barra100
        descricao="Passivo por classe"
        segmentos={[
          { rotulo: 'Trabalhista', valor: 1 },
          { rotulo: 'Quirografário', valor: 1 },
          { rotulo: 'ME e EPP', valor: 1 },
        ]}
      />,
    )
    expect(html).toContain('role="img"')
    expect(nomeAcessivel(html)).toBe(
      'Passivo por classe: Trabalhista 1 (34%), Quirografário 1 (33%), ME e EPP 1 (33%)',
    )
  })

  it('BarrasHorizontais, com o formatador dado', () => {
    const html = renderToString(
      <BarrasHorizontais
        descricao="Passivo sob administração"
        barras={[
          { rotulo: 'Grupo Lontra Azul', valor: 120 },
          { rotulo: 'Metalúrgica Horizonte', valor: 45 },
        ]}
        formatar={(v) => `R$ ${v} mi`}
      />,
    )
    expect(html).toContain('role="img"')
    expect(nomeAcessivel(html)).toBe(
      'Passivo sob administração: Grupo Lontra Azul R$ 120 mi, Metalúrgica Horizonte R$ 45 mi',
    )
  })
})

describe('cores só por token, sem degradê (INV-04)', () => {
  it('nenhum dos cinco usa cor fixa nem gradiente', () => {
    const htmls = [
      renderToString(<Rosca descricao="r" segmentos={PEDIDOS} centro={{ valor: '8' }} />),
      renderToString(
        <Colunas descricao="c" colunas={[{ rotulo: 'a', valor: 2, destaque: true }]} />,
      ),
      renderToString(
        <Linha
          descricao="l"
          pontos={[
            { rotulo: 'a', valor: 1 },
            { rotulo: 'b', valor: 3 },
          ]}
          marca={{ indice: 1 }}
        />,
      ),
      renderToString(<Barra100 descricao="b" segmentos={PEDIDOS} />),
      renderToString(<BarrasHorizontais descricao="h" barras={PEDIDOS} />),
      renderToString(<Legenda itens={PEDIDOS.map(({ rotulo, tom }) => ({ rotulo, tom }))} />),
    ]
    for (const html of htmls) {
      expect(coresFixas(html)).toEqual([])
      expect(html).not.toMatch(/gradient/i)
    }
  })
})

describe('Rosca', () => {
  it('um círculo por segmento com valor, e valor zero não desenha segmento', () => {
    const html = renderToString(
      <Rosca
        descricao="Pedidos"
        segmentos={[
          { rotulo: 'Pendentes', valor: 0 },
          { rotulo: 'Acolhidos', valor: 3 },
          { rotulo: 'Rejeitados', valor: 1 },
        ]}
      />,
    )
    expect(contar(html, /data-segmento=/g)).toBe(2)
    expect(html).not.toContain('data-segmento="0"')
    expect(html).toContain('stroke-dasharray="75 25"')
    expect(html).toContain('stroke-dashoffset="-75"')
  })

  it('tudo zero desenha só o trilho e mantém o texto alternativo', () => {
    const html = renderToString(
      <Rosca descricao="Pedidos" segmentos={[{ rotulo: 'Pendentes', valor: 0 }]} />,
    )
    expect(contar(html, /data-segmento=/g)).toBe(0)
    expect(nomeAcessivel(html)).toBe('Pedidos: Pendentes 0')
  })

  it('mostra o número e o rótulo do centro', () => {
    const html = renderToString(
      <Rosca
        descricao="Pedidos"
        segmentos={PEDIDOS}
        centro={{ valor: '8', rotulo: 'pendentes' }}
      />,
    )
    expect(html).toMatch(/<text[^>]*>8<\/text>/)
    expect(html).toMatch(/<text[^>]*>pendentes<\/text>/)
  })
})

describe('Colunas e Linha: escala e largura', () => {
  it('Colunas: a maior coluna enche a altura e coluna zero não desenha', () => {
    const html = renderToString(
      <Colunas
        descricao="c"
        colunas={[
          { rotulo: 'a', valor: 2 },
          { rotulo: 'b', valor: 8, destaque: true },
          { rotulo: 'c', valor: 0 },
        ]}
      />,
    )
    expect(html).toMatch(/data-coluna="1"[^>]*y="0"[^>]*height="100"/)
    expect(html).toMatch(/data-coluna="0"[^>]*y="75"[^>]*height="25"/)
    expect(html).not.toContain('data-coluna="2"')
    expect(html).toContain('preserveAspectRatio="none"')
    expect(html).toContain('vector-effect="non-scaling-stroke"')
  })

  it('Colunas: série toda zero não quebra (sem NaN, sem colunas)', () => {
    const html = renderToString(
      <Colunas descricao="c" colunas={MESES.map((rotulo) => ({ rotulo, valor: 0 }))} />,
    )
    expect(html).not.toContain('NaN')
    expect(contar(html, /data-coluna=/g)).toBe(0)
  })

  it('Linha: o maior valor fica no topo e o traço não escala', () => {
    const html = renderToString(
      <Linha
        descricao="l"
        pontos={[
          { rotulo: 'a', valor: 0 },
          { rotulo: 'b', valor: 4 },
          { rotulo: 'c', valor: 2 },
        ]}
        marca={{ indice: 1, rotulo: 'b: recorde (4)' }}
      />,
    )
    expect(html).toContain('points="0,100 50,0 100,50"')
    expect(html).toContain('preserveAspectRatio="none"')
    expect(html).toMatch(/<polyline[^>]*vector-effect="non-scaling-stroke"/)
    expect(texto(html)).toContain('b: recorde (4)')
  })

  it('Linha: série toda zero não quebra (linha reta na base)', () => {
    const html = renderToString(
      <Linha descricao="l" pontos={MESES.slice(0, 3).map((rotulo) => ({ rotulo, valor: 0 }))} />,
    )
    expect(html).not.toContain('NaN')
    expect(html).toContain('points="0,100 50,100 100,100"')
  })

  it('Linha: o rótulo do eixo não sai da área (ponto só, marca perto da ponta)', () => {
    const umPonto = renderToString(<Linha descricao="l" pontos={[{ rotulo: 'nov', valor: 3 }]} />)
    expect(umPonto).toContain('left:50%;transform:translateX(-50%)')
    // Marca no 2º de 5 pontos (x = 25%): a âncora fica a 25% do texto, não no meio dele.
    const pertoDaPonta = renderToString(
      <Linha
        descricao="l"
        pontos={MESES.slice(0, 5).map((rotulo, i) => ({ rotulo, valor: i === 1 ? 6 : 1 }))}
        marca={{ indice: 1, rotulo: 'recorde (6)' }}
      />,
    )
    expect(pertoDaPonta).toContain('left:25%;transform:translateX(-25%)')
    expect(pertoDaPonta).toContain('left:100%;transform:translateX(-100%)')
  })

  it('Linha: sem pontos não quebra', () => {
    const html = renderToString(<Linha descricao="l" pontos={[]} />)
    expect(nomeAcessivel(html)).toBe('l: sem dados')
    expect(html).not.toContain('<polyline')
  })
})

describe('Barra100 e BarrasHorizontais', () => {
  it('Barra100: segmento zero não desenha e a largura total é 100', () => {
    const html = renderToString(
      <Barra100
        descricao="b"
        segmentos={[
          { rotulo: 'a', valor: 3 },
          { rotulo: 'b', valor: 0 },
          { rotulo: 'c', valor: 1 },
        ]}
      />,
    )
    expect(html).toMatch(/data-segmento="0"[^>]*x="0"[^>]*width="75"/)
    expect(html).toMatch(/data-segmento="2"[^>]*x="75"[^>]*width="25"/)
    expect(html).not.toContain('data-segmento="1"')
  })

  it('BarrasHorizontais: barra proporcional ao maior e empilhada quando pedido', () => {
    const html = renderToString(
      <BarrasHorizontais
        descricao="h"
        empilhado
        barras={[
          { rotulo: 'a', valor: 10 },
          { rotulo: 'b', valor: 5 },
          { rotulo: 'c', valor: 0 },
        ]}
      />,
    )
    expect(html).toMatch(/data-barra="0"[^>]*width="100"/)
    expect(html).toMatch(/data-barra="1"[^>]*width="50"/)
    expect(html).toMatch(/data-barra="2"[^>]*width="0"/)
    expect(html).toContain('barrasEmpilhadas')
  })
})
