// Rotas de processos (DMO-11/12) e o conteúdo das abas Visão geral, Empresas e Histórico (AJ-05).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { AbaEmpresas } from './AbaEmpresas'
import { AbaHistorico } from './AbaHistorico'
import { AbaVisaoGeral } from './AbaVisaoGeral'
import { EditarProcesso, NovoProcesso } from './FormularioProcesso'
import { ListaProcessos } from './ListaProcessos'

export const registro: RegistroDoModulo = {
  rotas: [
    rota('/processos', 'ler', 'processos', <ListaProcessos />),
    rota('/processos/novo', 'editar', 'processos', <NovoProcesso />),
    rota('/processos/:id/editar', 'editar', 'processos', <EditarProcesso />),
  ],
  abas: { 'visao-geral': AbaVisaoGeral, empresas: AbaEmpresas, historico: AbaHistorico },
}
