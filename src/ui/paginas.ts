export type ItemPaginacao = number | 'reticencias'

/**
 * Páginas a mostrar na paginação: a primeira, a última e as vizinhas da atual,
 * com reticências nos saltos. Ex.: atual 1 de 10 → 1 2 3 … 10.
 */
export function paginasVisiveis(atual: number, total: number, vizinhas = 1): ItemPaginacao[] {
  if (total <= 0) return []
  const pagina = Math.min(Math.max(atual, 1), total)
  const inicio = Math.max(1, pagina - vizinhas - (pagina === total ? 1 : 0))
  const fim = Math.min(total, pagina + vizinhas + (pagina === 1 ? 1 : 0))

  const itens: ItemPaginacao[] = []
  if (inicio > 1) {
    itens.push(1)
    if (inicio > 3) itens.push('reticencias')
    else if (inicio === 3) itens.push(2)
  }
  for (let p = inicio; p <= fim; p++) itens.push(p)
  if (fim < total) {
    if (fim < total - 2) itens.push('reticencias')
    else if (fim === total - 2) itens.push(total - 1)
    itens.push(total)
  }
  return itens
}
