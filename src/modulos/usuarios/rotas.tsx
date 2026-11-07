// Rota de usuários (DMO-21, AJ-05).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { TelaUsuarios } from './TelaUsuarios'

export const registro: RegistroDoModulo = {
  rotas: [rota('/usuarios', 'ler', 'usuarios', <TelaUsuarios />)],
}
