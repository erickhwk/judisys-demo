// Modo de edição visto de dentro do quadro (SDD-INI §5.6, RF-18): a grade fornece, e a moldura
// (`Quadro.tsx`) usa para mostrar a alça e o ×. Os quadros não leem este contexto: só a moldura.
import { createContext, type PointerEvent, useContext } from 'react'
import type { IdQuadro } from '../montagem'

export interface EdicaoDaGrade {
  editando: boolean
  /** Tira o quadro do rascunho e o devolve ao catálogo (RF-21). */
  tirar: (quadro: IdQuadro) => void
  /** Pointer down na alça: a grade começa a acompanhar o arrasto (RF-19). */
  pegar: (quadro: IdQuadro, evento: PointerEvent<HTMLElement>) => void
}

const FORA_DA_EDICAO: EdicaoDaGrade = { editando: false, tirar: () => {}, pegar: () => {} }

export const ContextoEdicao = createContext<EdicaoDaGrade>(FORA_DA_EDICAO)

export function useEdicao(): EdicaoDaGrade {
  return useContext(ContextoEdicao)
}
