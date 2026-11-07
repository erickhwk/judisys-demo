// Abas da tela do processo (RF-13, SDD §5.6): rótulo, módulo de leitura e o conteúdo de cada uma.
// O conteúdo recebe só o `processoId`; o cabeçalho e a navegação são da TelaDoProcesso.
import type { JSX } from 'react'
import type { Modulo } from '../../regras/permissoes'
import { EmConstrucao } from '../../ui/TelasDeAviso'
import { AbaPrazos } from '../prazos/AbaPrazos'
import { AbaEmpresas } from './AbaEmpresas'
import { AbaHistorico } from './AbaHistorico'
import { AbaVisaoGeral } from './AbaVisaoGeral'

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

export interface DefinicaoAba {
  rotulo: string
  /** Módulo que precisa de leitura (o mesmo da rota em rotas.tsx). */
  modulo: Modulo
  /** Só na recuperação judicial (a AGC). */
  soRj?: boolean
  Conteudo: (props: { processoId: string }) => JSX.Element | null
}

export const DEFINICOES_ABAS: Record<Aba, DefinicaoAba> = {
  'visao-geral': { rotulo: 'Visão geral', modulo: 'processos', Conteudo: AbaVisaoGeral },
  empresas: { rotulo: 'Empresas', modulo: 'empresas', Conteudo: AbaEmpresas },
  // TEMPORÁRIO (lote 7a): trocar por AbaCredores (DMO-15)
  credores: {
    rotulo: 'Credores',
    modulo: 'credores',
    Conteudo: () => <EmConstrucao titulo="Credores" />,
  },
  prazos: { rotulo: 'Prazos', modulo: 'prazos', Conteudo: AbaPrazos },
  // AGC e Informes chegam com DMO-16 e DMO-19.
  agc: {
    rotulo: 'AGC',
    modulo: 'agc',
    soRj: true,
    Conteudo: () => <EmConstrucao titulo="AGC" />,
  },
  informes: {
    rotulo: 'Informes',
    modulo: 'informes',
    Conteudo: () => <EmConstrucao titulo="Informes" />,
  },
  // FIM DO TEMPORÁRIO
  historico: { rotulo: 'Histórico', modulo: 'logs', Conteudo: AbaHistorico },
}
