// Sessão da demo (PER-01, PER-02, PER-09, T-02): quem entrou e com que papel, guardada no
// `sessionStorage`, que é por aba. Sem `sessionStorage` (bloqueado), a sessão vive só na memória.
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { z } from 'zod'
import { PAPEIS, type Papel } from '../../regras/permissoes'

export interface Sessao {
  usuarioId: string
  escritorioId: string
  nome: string
  papel: Papel
}

/** Chave da sessão no `sessionStorage`. */
export const CHAVE_SESSAO = 'judisys:sessao'

const schemaSessao = z.object({
  usuarioId: z.string().min(1),
  escritorioId: z.string().min(1),
  nome: z.string().min(1),
  papel: z.enum(PAPEIS),
})

/** O mínimo de `Storage` que a sessão usa (injetável nos testes). */
export type Guarda = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** `sessionStorage`, ou `null` quando o navegador o bloqueia (o acesso lança). */
function guardaDoNavegador(): Guarda | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** Sessão gravada; JSON inválido ou adulterado (papel fora da tabela) conta como sem sessão. */
export function lerSessao(guarda: Guarda | null): Sessao | null {
  try {
    const texto = guarda?.getItem(CHAVE_SESSAO)
    if (!texto) return null
    const resultado = schemaSessao.safeParse(JSON.parse(texto))
    return resultado.success ? resultado.data : null
  } catch {
    return null
  }
}

/** Grava ou, com `null`, apaga a sessão. Falha do navegador não impede de seguir em memória. */
export function gravarSessao(guarda: Guarda | null, sessao: Sessao | null): void {
  try {
    if (sessao) guarda?.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
    else guarda?.removeItem(CHAVE_SESSAO)
  } catch {
    // Cota cheia ou acesso negado: a sessão continua no estado do React até fechar a aba.
  }
}

interface ValorSessao {
  sessao: Sessao | null
  entrar: (sessao: Sessao) => void
  /** Limpa a sessão (Trocar de papel, RF-06). */
  sair: () => void
}

const Contexto = createContext<ValorSessao | null>(null)

export function SessaoProvider({
  children,
  guarda = guardaDoNavegador(),
}: {
  children: ReactNode
  guarda?: Guarda | null
}) {
  const [sessao, setSessao] = useState(() => lerSessao(guarda))

  const entrar = useCallback(
    (nova: Sessao) => {
      gravarSessao(guarda, nova)
      setSessao(nova)
    },
    [guarda],
  )
  const sair = useCallback(() => {
    gravarSessao(guarda, null)
    setSessao(null)
  }, [guarda])

  const valor = useMemo(() => ({ sessao, entrar, sair }), [sessao, entrar, sair])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSessao(): ValorSessao {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useSessao fora do SessaoProvider')
  return valor
}
