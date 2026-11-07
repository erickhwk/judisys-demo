// Banco fechado por outra aba (DMO-08): quando outra aba apaga o banco para recarregar uma versão
// nova do seed, o Dexie desta aba fecha a conexão (versionchange) e toda operação seguinte falha com
// `DatabaseClosedError`. A casca pede para recarregar a página.

/**
 * O erro é de banco fechado: direto, no `inner` que o Dexie repassa ou no `cause` de quem o
 * embrulhou (o `ErroCarga` do reset).
 */
export function ehBancoFechado(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false
  const { name, inner, cause } = erro as { name?: unknown; inner?: unknown; cause?: unknown }
  return (
    name === 'DatabaseClosedError' ||
    (inner !== undefined && ehBancoFechado(inner)) ||
    (cause !== undefined && ehBancoFechado(cause))
  )
}

/** Aviso da faixa quando o banco desta aba foi fechado. */
export const MENSAGEM_BANCO_FECHADO = 'A demo foi atualizada em outra aba. Recarregue esta página.'
