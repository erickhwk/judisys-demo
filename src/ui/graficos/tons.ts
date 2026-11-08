// Cores dos gráficos (S-06, INV-04): só tokens, sem degradê. Os tokens --cor-grafico-1 a -4 nascem
// na INI-01 (S-09); enquanto não existem, cada um cai num token que já existe. A INI-10 tira os
// fallbacks quando os quatro estiverem em tokens.css.

export type Tom = 'serie-1' | 'serie-2' | 'serie-3' | 'serie-4' | 'perigo' | 'trilho'

const COR_DO_TOM: Record<Tom, string> = {
  'serie-1': 'var(--cor-grafico-1, var(--cor-azul-900))',
  'serie-2': 'var(--cor-grafico-2, var(--cor-dourado-500))',
  'serie-3': 'var(--cor-grafico-3, var(--cor-texto-placeholder))',
  'serie-4': 'var(--cor-grafico-4, var(--cor-borda-campo))',
  perigo: 'var(--cor-perigo)',
  trilho: 'var(--cor-trilho)',
}

/** Ordem dos tons quando o item não diz o seu: as quatro séries e o trilho (5 classes no Q-11). */
const TONS_EM_ORDEM: readonly Tom[] = ['serie-1', 'serie-2', 'serie-3', 'serie-4', 'trilho']

/** Cor (`var(--…)`) do tom pedido ou, sem tom, da posição do item. */
export function corDoTom(tom: Tom | undefined, indice = 0): string {
  return COR_DO_TOM[tom ?? TONS_EM_ORDEM[indice % TONS_EM_ORDEM.length] ?? 'serie-1']
}
