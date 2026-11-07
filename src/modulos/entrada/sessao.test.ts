// Sessão por aba (PER-01, PER-02, PER-09): leitura e gravação no sessionStorage.
import { describe, expect, it } from 'vitest'
import { CHAVE_SESSAO, type Guarda, gravarSessao, lerSessao, type Sessao } from './sessao'

const LIA: Sessao = {
  usuarioId: 'usr-05',
  escritorioId: 'esc-01',
  nome: 'Lia Campos',
  papel: 'analista',
}

function guardaEmMemoria(
  inicial: Record<string, string> = {},
): Guarda & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => void dados.set(chave, valor),
    removeItem: (chave) => void dados.delete(chave),
  }
}

const quebrada: Guarda = {
  getItem: () => {
    throw new DOMException('bloqueado', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('cheio', 'QuotaExceededError')
  },
  removeItem: () => {
    throw new DOMException('bloqueado', 'SecurityError')
  },
}

describe('sessão', () => {
  it('PER-01 · grava e lê a sessão de quem entrou', () => {
    const guarda = guardaEmMemoria()
    gravarSessao(guarda, LIA)
    expect(lerSessao(guarda)).toEqual(LIA)
  })

  it('PER-02 · sair apaga a sessão', () => {
    const guarda = guardaEmMemoria()
    gravarSessao(guarda, LIA)
    gravarSessao(guarda, null)
    expect(guarda.dados.has(CHAVE_SESSAO)).toBe(false)
    expect(lerSessao(guarda)).toBeNull()
  })

  it('PER-08 · sem nada gravado não há sessão', () => {
    expect(lerSessao(guardaEmMemoria())).toBeNull()
    expect(lerSessao(null)).toBeNull()
  })

  it('JSON inválido ou papel fora da tabela conta como sem sessão', () => {
    expect(lerSessao(guardaEmMemoria({ [CHAVE_SESSAO]: '{quebrado' }))).toBeNull()
    const adulterada = JSON.stringify({ ...LIA, papel: 'root' })
    expect(lerSessao(guardaEmMemoria({ [CHAVE_SESSAO]: adulterada }))).toBeNull()
  })

  it('sessionStorage bloqueado não derruba a tela', () => {
    expect(lerSessao(quebrada)).toBeNull()
    expect(() => gravarSessao(quebrada, LIA)).not.toThrow()
    expect(() => gravarSessao(quebrada, null)).not.toThrow()
  })
})
