// Rota do dashboard (DMO-18, AJ-05): todo papel lê (RF-39, PER-07).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { Dashboard } from './Dashboard'

export const registro: RegistroDoModulo = {
  rotas: [rota('/', 'ler', 'dashboard', <Dashboard />)],
}
