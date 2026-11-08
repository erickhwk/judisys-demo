// Contraste dos pares de texto e fundo nos dois temas (RNF-01, AJ-11): lê os tokens do tokens.css,
// aplica as redefinições do :root[data-theme="dark"] por cima do :root e calcula a razão do WCAG.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

function declaracoes(bloco: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const [, nome, valor] of bloco.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (nome && valor) tokens[nome] = valor.trim()
  }
  return tokens
}

function blocoDepois(seletor: string): string {
  const inicio = css.indexOf(`${seletor} {`)
  if (inicio < 0) throw new Error(`bloco ${seletor} não encontrado no tokens.css`)
  return css.slice(inicio, css.indexOf('}', inicio))
}

const claro = declaracoes(blocoDepois(':root'))
const escuro = { ...claro, ...declaracoes(blocoDepois(':root[data-theme="dark"]')) }

function cor(tokens: Record<string, string>, nome: string): string {
  const valor = tokens[nome]
  if (!valor) throw new Error(`token ${nome} não existe`)
  const referencia = /^var\((--[\w-]+)\)$/.exec(valor)
  if (referencia?.[1]) return cor(tokens, referencia[1])
  if (!/^#[0-9a-f]{6}$/i.test(valor))
    throw new Error(`token ${nome} não é uma cor sólida: ${valor}`)
  return valor
}

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = canais.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return ((maior ?? 0) + 0.05) / ((menor ?? 0) + 0.05)
}

const FUNDOS_COMUNS = [
  '--cor-fundo',
  '--cor-fundo-login',
  '--cor-superficie',
  '--cor-superficie-suave',
  '--cor-cabecalho-tabela',
  '--cor-hover-linha',
  '--cor-hover-botao',
  '--cor-hover-fantasma',
]

/** [texto, fundo] usados nos componentes. */
const PARES: readonly (readonly [string, string])[] = [
  ...['--cor-texto', '--cor-texto-forte', '--cor-texto-muted', '--cor-azul-800'].flatMap((texto) =>
    FUNDOS_COMUNS.map((fundo) => [texto, fundo] as const),
  ),
  ['--cor-texto-placeholder', '--cor-superficie'],
  ['--cor-dourado-700', '--cor-superficie'],
  ['--cor-dourado-700', '--cor-fundo'],
  ['--cor-dourado-700', '--cor-fundo-login'],
  ['--cor-dourado-700', '--cor-dourado-claro'],
  ['--cor-azul-900', '--cor-superficie'],
  ['--cor-azul-900', '--cor-azul-claro'],
  ['--cor-azul-900', '--cor-dourado-claro'],
  ['--cor-texto', '--cor-azul-claro'],
  // Pé do calendário do início (INI-07): o próximo evento em azul-claro, o de hoje em dourado-claro
  ['--cor-texto-forte', '--cor-azul-claro'],
  ['--cor-texto', '--cor-dourado-claro'],
  ['--cor-texto-forte', '--cor-dourado-claro'],
  ['--cor-texto-forte', '--cor-trilho'],
  ['--cor-azul-800', '--cor-azul-claro'],
  ['--cor-texto-invertido', '--cor-azul-900'],
  ['--cor-texto-invertido', '--cor-azul-700'],
  ['--cor-texto-invertido', '--cor-perigo'],
  ['--cor-texto-invertido', '--cor-perigo-hover'],
  ['--cor-perigo', '--cor-superficie'],
  ['--cor-perigo', '--cor-perigo-claro'],
  ['--cor-sucesso', '--cor-superficie'],
  ['--cor-sucesso', '--cor-sucesso-claro'],
  ['--cor-alerta', '--cor-superficie'],
  ['--cor-alerta', '--cor-alerta-claro'],
  // Menu lateral (INI-01, CAS-06): itens, títulos das seções, contadores e item ativo
  ['--cor-texto', '--cor-menu-fundo'],
  ['--cor-texto-forte', '--cor-menu-fundo'],
  ['--cor-texto-muted', '--cor-menu-fundo'],
  ['--cor-texto', '--cor-menu-ativo'],
  ['--cor-texto-muted', '--cor-menu-ativo'],
  // Áreas sempre escuras: faixa da demo e painel da entrada
  ['--cor-escuro-texto', '--cor-azul-login'],
  ['--cor-escuro-texto-suave', '--cor-azul-login'],
  ['--cor-dourado-200', '--cor-azul-login'],
  ['--cor-sobre-dourado', '--cor-dourado-500'],
  ['--cor-sobre-dourado', '--cor-dourado-200'],
  // Prévia decorativa da entrada
  ['--cor-previa-texto', '--cor-previa-cartao'],
  ['--cor-previa-texto', '--cor-previa-fundo'],
  ['--cor-previa-rotulo', '--cor-previa-cartao'],
  ['--cor-dourado-200', '--cor-previa-destaque'],
]

describe.each([
  ['claro', claro],
  ['escuro', escuro],
])('tokens do tema %s', (_tema, tokens) => {
  it.each(PARES)('%s sobre %s tem contraste de pelo menos 4,5:1 (RNF-01)', (texto, fundo) => {
    expect(contraste(cor(tokens, texto), cor(tokens, fundo))).toBeGreaterThanOrEqual(4.5)
  })
})

/** [elemento gráfico, fundo]: ícones e marcas não textuais pedem 3:1 (WCAG 1.4.11). */
const PARES_GRAFICOS: readonly (readonly [string, string])[] = [
  ['--cor-menu-icone-ativo', '--cor-menu-ativo'],
]

describe.each([
  ['claro', claro],
  ['escuro', escuro],
])('elementos gráficos do tema %s', (_tema, tokens) => {
  it.each(PARES_GRAFICOS)('%s sobre %s tem contraste de pelo menos 3:1', (grafico, fundo) => {
    expect(contraste(cor(tokens, grafico), cor(tokens, fundo))).toBeGreaterThanOrEqual(3)
  })
})

describe('menu lateral (CAS-06)', () => {
  it('no escuro, o fundo do menu fica um tom acima do fundo da página (RF-04)', () => {
    const menu = luminancia(cor(escuro, '--cor-menu-fundo'))
    const fundo = luminancia(cor(escuro, '--cor-fundo'))
    const superficie = luminancia(cor(escuro, '--cor-superficie'))
    expect(menu).toBeGreaterThan(fundo)
    expect(menu).toBeLessThan(superficie)
  })

  it('os tokens sempre escuros só do menu saíram (S-09)', () => {
    expect(css).not.toMatch(/--cor-escuro-(texto-apagado|rotulo):/)
  })
})

describe('tema escuro', () => {
  it('só vale na tela: a impressão fica com os tokens claros', () => {
    expect(css).toMatch(/@media screen \{\s*:root\[data-theme="dark"\] \{/)
  })
})
