// Banco fechado por outra aba (DMO-08): quando outra aba apaga o banco para recarregar uma versão
// nova do seed, o Dexie desta aba fecha a conexão (versionchange) e toda operação seguinte falha com
// `DatabaseClosedError`. A casca pede para recarregar a página.

/** O erro (ou o `inner` que o Dexie repassa) é de banco fechado. */
export function ehBancoFechado(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false
  const { name, inner } = erro as { name?: unknown; inner?: unknown }
  return name === 'DatabaseClosedError' || (inner !== undefined && ehBancoFechado(inner))
}

/** Aviso da faixa quando o banco desta aba foi fechado. */
export const MENSAGEM_BANCO_FECHADO = 'A demo foi atualizada em outra aba. Recarregue esta página.'
