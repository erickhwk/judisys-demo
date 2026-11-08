// Rota do dashboard (DMO-18, AJ-05): todo papel lê (RF-39, PER-07).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { Inicio } from './Inicio'

export const registro: RegistroDoModulo = {
  rotas: [rota('/', 'ler', 'dashboard', <Inicio />)],
}
