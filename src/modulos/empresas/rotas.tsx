// Rotas de empresas (DMO-13, AJ-05).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { NovaEmpresa, TelaEmpresa } from './FormularioEmpresa'
import { ListaEmpresas } from './ListaEmpresas'

export const registro: RegistroDoModulo = {
  rotas: [
    rota('/empresas', 'ler', 'empresas', <ListaEmpresas />),
    rota('/empresas/novo', 'editar', 'empresas', <NovaEmpresa />),
    rota('/empresas/:id', 'ler', 'empresas', <TelaEmpresa />),
  ],
}
