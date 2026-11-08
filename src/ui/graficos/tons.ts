// Cores dos gráficos (S-06, INV-04): só tokens, sem degradê. As cinco séries são os tokens
// --cor-grafico-1 a -5 de tokens.css, nos dois temas.

export type Tom = 'serie-1' | 'serie-2' | 'serie-3' | 'serie-4' | 'serie-5' | 'perigo' | 'trilho'

const COR_DO_TOM: Record<Tom, string> = {
  'serie-1': 'var(--cor-grafico-1)',
  'serie-2': 'var(--cor-grafico-2)',
  'serie-3': 'var(--cor-grafico-3)',
  'serie-4': 'var(--cor-grafico-4)',
  'serie-5': 'var(--cor-grafico-5)',
  perigo: 'var(--cor-perigo)',
  trilho: 'var(--cor-trilho)',
}

/**
 * Ordem dos tons quando o item não diz o seu: as cinco séries (5 classes no Q-11). A 5ª era o
 * trilho, que sumia sobre a superfície no tema claro (INI-05).
 */
const TONS_EM_ORDEM: readonly Tom[] = ['serie-1', 'serie-2', 'serie-3', 'serie-4', 'serie-5']

/** Cor (`var(--…)`) do tom pedido ou, sem tom, da posição do item. */
export function corDoTom(tom: Tom | undefined, indice = 0): string {
  return COR_DO_TOM[tom ?? TONS_EM_ORDEM[indice % TONS_EM_ORDEM.length] ?? 'serie-1']
}
