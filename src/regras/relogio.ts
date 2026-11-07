// Único acesso ao relógio do sistema (T-19, INV-08). Nenhum outro arquivo chama `new Date()`
// sem argumento nem `Date.now()`: as regras recebem a data por parâmetro.
import { format } from 'date-fns'
import type { Carimbo, DataIso } from './datas'

/** Data de hoje no fuso local, `aaaa-mm-dd` (T-05). */
export function hoje(): DataIso {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Carimbo do instante atual, ISO 8601 em horário local sem fuso: `aaaa-mm-ddTHH:mm:ss`. */
export function agora(): Carimbo {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
}
