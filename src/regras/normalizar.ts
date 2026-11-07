// Normalização para busca e filtros (T-14, RF-38): ignora acentos, maiúsculas,
// a pontuação de documentos (`.`, `-`, `/`) e espaços extras.
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[.\-/]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
