// Rotas da AGC (DMO-16) e a aba do processo (AJ-05). A aba só aparece na RJ (`soRj` em
// modulos/processos/abas.ts); a tela da AGC recusa processo de falência como não encontrado.
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { AbaAgc } from './AbaAgc'
import { TelaAgc } from './TelaAgc'

export const registro: RegistroDoModulo = {
  rotas: [rota('/processos/:id/agc/:agcId', 'ler', 'agc', <TelaAgc />)],
  abas: { agc: AbaAgc },
}
