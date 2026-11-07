// Rotas de credores (DMO-15): a tela do credor, o QGC para impressão e a aba do processo (AJ-05).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { AbaCredores } from './AbaCredores'
import { TelaCredor } from './TelaCredor'
import { TelaQgc } from './TelaQgc'

export const registro: RegistroDoModulo = {
  rotas: [rota('/processos/:id/credores/:credorId', 'ler', 'credores', <TelaCredor />)],
  rotasSemLayout: [rota('/processos/:id/qgc', 'ler', 'credores', <TelaQgc />)],
  abas: { credores: AbaCredores },
}
