// Rota do dashboard (AJ-05). Ainda em construção: a DMO-18 troca este arquivo.
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { EmConstrucao } from '../../ui/TelasDeAviso'

export const registro: RegistroDoModulo = {
  rotas: [rota('/', 'ler', 'dashboard', <EmConstrucao titulo="Dashboard" />)],
}
