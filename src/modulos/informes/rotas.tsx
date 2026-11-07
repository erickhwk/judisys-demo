// Rotas de informes (DMO-19) e a aba do processo (AJ-05).
import { type RegistroDoModulo, rota } from '../../definicaoRotas'
import { AbaInformes } from './AbaInformes'
import { NovoInforme } from './FormularioInforme'
import { ListaInformes } from './ListaInformes'
import { TelaInforme } from './TelaInforme'

export const registro: RegistroDoModulo = {
  rotas: [
    rota('/informes', 'ler', 'informes', <ListaInformes />),
    rota('/informes/novo', 'editar', 'informes', <NovoInforme />),
    rota('/informes/:id', 'ler', 'informes', <TelaInforme />),
  ],
  abas: { informes: AbaInformes },
}
