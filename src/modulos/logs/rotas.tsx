// Rota de logs (DMO-21, AJ-05).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { TelaLogs } from './TelaLogs'

export const registro: RegistroDoModulo = {
  rotas: [rota('/logs', 'ler', 'logs', <TelaLogs />)],
}
