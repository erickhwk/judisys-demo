// Rotas da demo e a permissão de cada uma (SDD §5.6, T-13). Uma linha por rota: cada tarefa de tela
// troca só a sua, pondo o componente dela no lugar do `EmConstrucao`. O roteador (roteador.tsx)
// aplica a guarda de sessão e de permissão a todas.
import type { ReactNode } from 'react'
import { TelaCredor, TelaQgc } from './modulos/credores'
import { ListaEmpresas, NovaEmpresa, TelaEmpresa } from './modulos/empresas'
import { ListaInformes, NovoInforme, TelaInforme } from './modulos/informes'
import { TelaLogs } from './modulos/logs'
import { Agenda } from './modulos/prazos/Agenda'
import {
  EditarProcesso,
  ListaProcessos,
  NovoProcesso,
  TelaDoProcesso,
} from './modulos/processos/telas'
import { TelaUsuarios } from './modulos/usuarios'
import type { Acao, Modulo } from './regras/permissoes'
import { EmConstrucao } from './ui/TelasDeAviso'

export interface DefinicaoRota {
  caminho: string
  /** Permissão para abrir a rota: `pode(papel, acao, modulo)`. */
  acao: Acao
  modulo: Modulo
  tela: ReactNode
}

function rota(caminho: string, acao: Acao, modulo: Modulo, tela: ReactNode): DefinicaoRota {
  return { caminho, acao, modulo, tela }
}

/** Telas dentro do layout (faixa, menu lateral, rodapé). */
export const ROTAS: DefinicaoRota[] = [
  rota('/', 'ler', 'dashboard', <EmConstrucao titulo="Dashboard" />),
  rota('/processos/:id/credores/:credorId', 'ler', 'credores', <TelaCredor />),
  rota('/processos', 'ler', 'processos', <ListaProcessos />),
  rota('/processos/novo', 'editar', 'processos', <NovoProcesso />),
  rota('/processos/:id/editar', 'editar', 'processos', <EditarProcesso />),
  rota('/processos/:id/visao-geral', 'ler', 'processos', <TelaDoProcesso aba="visao-geral" />),
  rota('/processos/:id/empresas', 'ler', 'empresas', <TelaDoProcesso aba="empresas" />),
  rota('/processos/:id/credores', 'ler', 'credores', <TelaDoProcesso aba="credores" />),
  rota('/processos/:id/prazos', 'ler', 'prazos', <TelaDoProcesso aba="prazos" />),
  rota('/processos/:id/agc', 'ler', 'agc', <TelaDoProcesso aba="agc" />),
  rota('/processos/:id/informes', 'ler', 'informes', <TelaDoProcesso aba="informes" />),
  rota('/processos/:id/historico', 'ler', 'logs', <TelaDoProcesso aba="historico" />),
  rota('/processos/:id/agc/:agcId', 'ler', 'agc', <EmConstrucao titulo="AGC" />),
  rota('/empresas', 'ler', 'empresas', <ListaEmpresas />),
  rota('/empresas/novo', 'editar', 'empresas', <NovaEmpresa />),
  rota('/empresas/:id', 'ler', 'empresas', <TelaEmpresa />),
  rota('/informes', 'ler', 'informes', <ListaInformes />),
  rota('/informes/novo', 'editar', 'informes', <NovoInforme />),
  rota('/informes/:id', 'ler', 'informes', <TelaInforme />),
  rota('/agenda', 'ler', 'prazos', <Agenda />),
  rota('/usuarios', 'ler', 'usuarios', <TelaUsuarios />),
  rota('/logs', 'ler', 'logs', <TelaLogs />),
]

/** Telas sem o layout (impressão). */
export const ROTAS_SEM_LAYOUT: DefinicaoRota[] = [
  rota('/processos/:id/qgc', 'ler', 'credores', <TelaQgc />),
]
