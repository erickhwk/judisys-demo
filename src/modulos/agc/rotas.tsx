// Rotas da AGC e a aba do processo (AJ-05). Ainda em construção: a DMO-16 troca este arquivo.
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { EmConstrucao } from '../../ui/TelasDeAviso'

export const registro: RegistroDoModulo = {
  rotas: [rota('/processos/:id/agc/:agcId', 'ler', 'agc', <EmConstrucao titulo="AGC" />)],
  abas: { agc: () => <EmConstrucao titulo="AGC" /> },
}
