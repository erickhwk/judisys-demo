// Regras da grade montável (SDD-INI §5.3 e §5.6) que não dependem de tela: as colunas pela largura
// do contêiner, a célula pretendida pelo ponteiro, a recusa e o empurrão para baixo. Funções puras;
// a GradeMontavel só mede e desenha. O grid é próprio (Q-01, S-11): o react-grid-layout acumulava
// os empurrões do caminho do arrasto e chegava a sobrepor quadros.
import {
  base,
  CATALOGO,
  COLUNAS_DESKTOP,
  type IdQuadro,
  type ItemMontagem,
  type Montagem,
  ordemDeLeitura,
} from './montagem'

/** Vão entre as unidades, na horizontal e na vertical (5.3). */
export const VAO = 16
/** Altura de uma unidade nas faixas de 4 e de 2 colunas (5.3). */
export const ALTURA_UNIDADE = 176
/** Largura máxima do grid: 4 unidades de 298px e 3 vãos (5.3). */
export const LARGURA_MAXIMA = 1240
/** A partir desta largura de contêiner, 4 colunas e Personalizar (5.3). */
export const LARGURA_4_COLUNAS = 976
/** A partir desta largura de contêiner, 2 colunas; abaixo, a lista do celular (5.3). */
export const LARGURA_2_COLUNAS = 600

export type Colunas = 1 | 2 | 4

/** Colunas pela largura do contêiner (RF-09 a RF-12). */
export function colunasDaLargura(largura: number): Colunas {
  if (largura >= LARGURA_4_COLUNAS) return 4
  if (largura >= LARGURA_2_COLUNAS) return 2
  return 1
}

/** Largura de uma unidade: o contêiner (até 1240px) menos os vãos, dividido pelas colunas. */
export function larguraDaUnidade(largura: number, cols: number): number {
  const util = Math.min(largura, LARGURA_MAXIMA)
  return (util - VAO * (cols - 1)) / cols
}

/**
 * Coluna pretendida pelo ponteiro (5.6, passo 2): a borda esquerda do quadro arrastado, medida pelo
 * ponteiro menos o deslocamento dele dentro do quadro, arredondada para a coluna mais próxima. Pode
 * sair do grid (negativa ou além da última coluna): é isso que liga a recusa.
 */
export function colunaPretendida(
  clienteX: number,
  deslocamento: number,
  esquerdaDoGrid: number,
  unidade: number,
): number {
  return Math.round((clienteX - deslocamento - esquerdaDoGrid) / (unidade + VAO))
}

/** Linha pretendida pelo ponteiro, no mesmo cálculo da coluna; nunca acima da primeira. */
export function linhaPretendida(
  clienteY: number,
  deslocamento: number,
  topoDoGrid: number,
): number {
  return Math.max(0, Math.round((clienteY - deslocamento - topoDoGrid) / (ALTURA_UNIDADE + VAO)))
}

/** O quadro de largura `w` na coluna `x` sai do grid (RF-19): é recusado, não limitado. */
export function recusa(quadro: IdQuadro, x: number, cols: number = COLUNAS_DESKTOP): boolean {
  return x < 0 || x + CATALOGO[quadro].w > cols
}

const sobrepoe = (a: ItemMontagem, b: ItemMontagem) => {
  const da = CATALOGO[a.quadro]
  const db = CATALOGO[b.quadro]
  return a.x < b.x + db.w && b.x < a.x + da.w && a.y < b.y + db.h && b.y < a.y + da.h
}

/**
 * Montagem com o quadro solto em (x, y), sempre a partir da montagem de antes do arrasto (e não da
 * que o caminho do ponteiro foi formando): quem ficaria por baixo desce até abrir espaço, em cascata,
 * e o resto não se move (S-04, PRS-02, PRS-03). Os buracos ficam (sem compactar). A linha é limitada
 * à base dos outros quadros, para não abrir linhas vazias soltando muito abaixo.
 */
export function soltar(
  antes: readonly ItemMontagem[],
  quadro: IdQuadro,
  x: number,
  y: number,
): Montagem {
  const outros = antes.filter((item) => item.quadro !== quadro)
  const movido: ItemMontagem = { quadro, x, y: Math.min(y, base(outros)) }
  const postos: Montagem = [movido]
  for (const item of ordemDeLeitura(outros)) {
    const posto = { ...item }
    for (;;) {
      const embaixo = postos.filter((outro) => sobrepoe(posto, outro))
      if (embaixo.length === 0) break
      posto.y = Math.max(...embaixo.map((outro) => outro.y + CATALOGO[outro.quadro].h))
    }
    postos.push(posto)
  }
  // Na ordem da montagem de antes, com o quadro movido no lugar dele: a ordem do DOM não pula.
  return antes.map((item) => postos.find((p) => p.quadro === item.quadro) ?? item)
}
