// Rota do início, antes dashboard (DMO-18, AJ-05): todo papel lê (RF-39, PER-07). O caminho `/`
// e a permissão `dashboard` continuam os da demo (S-01 do SDD do início).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { Inicio } from './Inicio'

export const registro: RegistroDoModulo = {
  rotas: [rota('/', 'ler', 'dashboard', <Inicio />)],
}
