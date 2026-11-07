// Banco fechado por outra aba (DMO-08): a casca reconhece o erro do Dexie e pede para recarregar.
import { describe, expect, it } from 'vitest'
import { ehBancoFechado } from './conexao'

describe('ehBancoFechado', () => {
  it('reconhece o DatabaseClosedError, direto ou no inner', () => {
    const fechado = Object.assign(new Error('Database has been closed'), {
      name: 'DatabaseClosedError',
    })
    expect(ehBancoFechado(fechado)).toBe(true)
    expect(ehBancoFechado({ name: 'AbortError', inner: fechado })).toBe(true)
  })

  it('outros erros não contam', () => {
    expect(ehBancoFechado(new Error('outro'))).toBe(false)
    expect(ehBancoFechado({ name: 'QuotaExceededError' })).toBe(false)
    expect(ehBancoFechado(null)).toBe(false)
    expect(ehBancoFechado('DatabaseClosedError')).toBe(false)
  })
})
