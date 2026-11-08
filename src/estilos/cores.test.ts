import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// AJ-17: toda cor vem de src/estilos/tokens.css. É o que deixa o tema escuro (AJ-11) trocar a paleta
// num lugar só; uma cor solta num componente fica igual nos dois temas. A impressão é sempre clara e
// tem cores próprias. Degradê de cor também fica de fora: o Judisys usa cores chapadas, inclusive na
// marca. O radial-gradient do padrão de pontos da entrada é textura e passa.

const SRC = fileURLToPath(new URL('..', import.meta.url))
const PERMITIDOS = new Set(['estilos/tokens.css', 'estilos/impressao.css'])
const PROIBIDOS: [string, RegExp][] = [
  ['cor hex', /#[0-9a-fA-F]{3,8}\b/],
  ['rgb()', /\brgba?\(/],
  ['degradê', /\b(linear|conic)-gradient\(/],
]

function arquivos(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = join(pasta, item.name)
    if (item.isDirectory()) return arquivos(caminho)
    return /\.(css|ts|tsx)$/.test(item.name) && !/\.test\.tsx?$/.test(item.name) ? [caminho] : []
  })
}

/** Devolve `arquivo:linha · tipo · trecho` de cada cor fora dos tokens. */
function coresForaDosTokens(pasta = SRC): string[] {
  return arquivos(pasta).flatMap((caminho) => {
    const nome = relative(pasta, caminho).split('\\').join('/')
    if (PERMITIDOS.has(nome)) return []
    return readFileSync(caminho, 'utf8')
      .split('\n')
      .flatMap((linha, i) =>
        PROIBIDOS.filter(([, padrao]) => padrao.test(linha)).map(
          ([tipo]) => `${nome}:${i + 1} · ${tipo} · ${linha.trim()}`,
        ),
      )
  })
}

describe('cores só nos tokens (AJ-17)', () => {
  it('nenhuma cor fixa nem degradê fora de tokens.css e impressao.css', () => {
    expect(coresForaDosTokens()).toEqual([])
  })
})
