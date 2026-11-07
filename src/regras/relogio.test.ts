import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { agora, hoje } from './relogio'

describe('relogio', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('hoje() devolve a data local em aaaa-mm-dd', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 7, 23, 59, 30))
    expect(hoje()).toBe('2026-11-07')
  })

  it('agora() devolve o carimbo local em ISO 8601', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 7, 9, 5, 3))
    expect(agora()).toBe('2026-11-07T09:05:03')
  })
})

// INV-08 / T-19: fora de src/regras/relogio.ts, ninguém lê o relógio do sistema.
describe('INV-08 · relógio só em relogio.ts', () => {
  const raiz = join(import.meta.dirname, '..', '..')
  const permitido = join('src', 'regras', 'relogio.ts')
  const leituraDoRelogio = /new Date\(\s*\)|Date\.now\(/

  function arquivosFonte(pasta: string): string[] {
    return readdirSync(pasta).flatMap((nome) => {
      const caminho = join(pasta, nome)
      if (statSync(caminho).isDirectory()) return arquivosFonte(caminho)
      return /\.tsx?$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
    })
  }

  it('nenhum arquivo de src/ ou scripts/ chama new Date() ou Date.now()', () => {
    const violacoes = ['src', 'scripts']
      .flatMap((pasta) => arquivosFonte(join(raiz, pasta)))
      .map((caminho) => relative(raiz, caminho))
      .filter((caminho) => caminho !== permitido)
      .filter((caminho) => leituraDoRelogio.test(readFileSync(join(raiz, caminho), 'utf8')))
    expect(violacoes).toEqual([])
  })
})
