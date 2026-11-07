// Rotas de prazos (DMO-14): a agenda e a aba do processo (AJ-05).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { AbaPrazos } from './AbaPrazos'
import { Agenda } from './Agenda'

export const registro: RegistroDoModulo = {
  rotas: [rota('/agenda', 'ler', 'prazos', <Agenda />)],
  abas: { prazos: AbaPrazos },
}
