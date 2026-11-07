import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// O `biome migrate` troca o preset para "none" e o `biome check` passa a aprovar tudo
// sem aviso; o Biome 2 também formata Markdown e já reescreveu os docs uma vez.
const config = JSON.parse(readFileSync(new URL('../biome.json', import.meta.url), 'utf8'))

describe('biome.json', () => {
  it('mantém o linter com o preset recommended', () => {
    expect(config.linter?.enabled).toBe(true)
    expect(config.linter?.rules?.preset).toBe('recommended')
  })

  it('mantém o Markdown fora do Biome', () => {
    expect(config.files?.includes).toContain('!**/*.md')
  })
})
