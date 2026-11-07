// O que cada módulo declara no seu `src/modulos/<m>/rotas.tsx` (AJ-05). O `src/rotas.tsx` junta
// tudo; o roteador (roteador.tsx) aplica a guarda de sessão e de permissão a todas as rotas.
import type { ReactNode } from 'react'
import type { Aba, ConteudoAba } from './modulos/processos/abas'
import type { Acao, Modulo } from './regras/permissoes'

export interface DefinicaoRota {
  caminho: string
  /** Permissão para abrir a rota: `pode(papel, acao, modulo)`. */
  acao: Acao
  modulo: Modulo
  tela: ReactNode
}

export function rota(caminho: string, acao: Acao, modulo: Modulo, tela: ReactNode): DefinicaoRota {
  return { caminho, acao, modulo, tela }
}

/**
 * O export `registro` de cada `src/modulos/<m>/rotas.tsx`. A permissão de rota nova é testada no
 * módulo dono (a tabela de `src/rotas.test.ts` guarda só as rotas de antes do AJ-05).
 */
export interface RegistroDoModulo {
  /** Telas dentro do layout (faixa, menu lateral, rodapé). */
  rotas?: DefinicaoRota[]
  /** Telas sem o layout (impressão). */
  rotasSemLayout?: DefinicaoRota[]
  /**
   * Conteúdo das abas do processo que são deste módulo. A ordem, o rótulo e a permissão de cada aba
   * ficam em `modulos/processos/abas.ts`; a rota `/processos/:id/<aba>` sai de lá.
   */
  abas?: Partial<Record<Aba, ConteudoAba>>
}
