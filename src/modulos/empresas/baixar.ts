// Entrega um arquivo gerado no navegador (CSV, RF-44) como download, sem rede (INV-09).
export function baixarArquivo(
  nome: string,
  conteudo: string,
  tipo = 'text/csv;charset=utf-8',
): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  // Depois do clique: revogar na hora pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
