// Abas da tela do processo (RF-13, SDD §5.6): a ordem, o rótulo e o módulo de leitura de cada uma.
// O conteúdo vem do módulo dono, no `registro.abas` do seu `rotas.tsx` (AJ-05); o cabeçalho e a
// navegação são da TelaDoProcesso.
import type { JSX } from 'react'
import type { Modulo } from '../../regras/permissoes'

export const ABAS = [
  'visao-geral',
  'empresas',
  'credores',
  'prazos',
  'agc',
  'informes',
  'historico',
] as const

export type Aba = (typeof ABAS)[number]

/** O conteúdo de uma aba recebe só o `processoId`. */
export type ConteudoAba = (props: { processoId: string }) => JSX.Element | null

export interface DefinicaoAba {
  rotulo: string
  /** Módulo que precisa de leitura (o da rota `/processos/:id/<aba>`). */
  modulo: Modulo
  /** Só na recuperação judicial (a AGC). */
  soRj?: boolean
}

export const DEFINICOES_ABAS: Record<Aba, DefinicaoAba> = {
  'visao-geral': { rotulo: 'Visão geral', modulo: 'processos' },
  empresas: { rotulo: 'Empresas', modulo: 'empresas' },
  credores: { rotulo: 'Credores', modulo: 'credores' },
  prazos: { rotulo: 'Prazos', modulo: 'prazos' },
  agc: { rotulo: 'AGC', modulo: 'agc', soRj: true },
  informes: { rotulo: 'Informes', modulo: 'informes' },
  historico: { rotulo: 'Histórico', modulo: 'logs' },
}
