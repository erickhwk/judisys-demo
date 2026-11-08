// Larguras da casca que o TypeScript também precisa conhecer (AJ-22).

/**
 * Teto da área de conteúdo de todas as telas, sem contar o padding do `.conteudo` do Layout:
 * num ultrawide, o conteúdo para em 2200px, alinhado à esquerda, e as ações do `CabecalhoPagina`
 * ficam na borda direita dele. É também o teto da grade do início (`LARGURA_MAXIMA` em
 * `modulos/inicio/arrasto.ts`, SDD-INI §5.3), então os dois não divergem.
 */
export const LARGURA_CONTEUDO = 2200
