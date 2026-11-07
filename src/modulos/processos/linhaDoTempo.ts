// Linha do tempo das fases na Visão geral (RF-13, RF-14, T-27).
import type { Tipos } from '../../dados/schemas'
import { ordenarMarcos } from '../../dados/servicos/comum'
import {
  FASES_FALENCIA,
  FASES_FINAIS_ALTERNATIVAS_RJ,
  FASES_RJ,
  type Fase,
} from '../../regras/fases'

export type EstadoFase = 'concluida' | 'atual' | 'pulada' | 'futura'

export interface PassoLinhaDoTempo {
  fase: Fase
  estado: EstadoFase
  /** Data do marco, quando a fase foi alcançada. */
  data?: string
}

/**
 * Passos da linha do tempo: a sequência de fases do tipo, marcando as alcançadas (com a data do
 * marco), a atual, as puladas (T-27) e as futuras. Numa final alternativa da RJ (convolada,
 * desistência), a sequência para nas fases alcançadas e termina nela.
 */
export function linhaDoTempo(
  processo: Pick<Tipos['processos'], 'tipo' | 'faseAtual'>,
  marcos: Tipos['marcosDeFase'][],
): PassoLinhaDoTempo[] {
  const ordenados = ordenarMarcos(processo.tipo, marcos)
  const dataDe = (fase: Fase) => ordenados.findLast((m) => m.fase === fase)?.data
  const atual = processo.faseAtual as Fase
  const sequencia: readonly Fase[] = processo.tipo === 'rj' ? FASES_RJ : FASES_FALENCIA
  const alternativa = (FASES_FINAIS_ALTERNATIVAS_RJ as readonly Fase[]).includes(atual)
  const fases = alternativa ? [...sequencia.filter((f) => dataDe(f)), atual] : sequencia
  const posicaoAtual = fases.indexOf(atual)
  return fases.map((fase, indice) => {
    const data = dataDe(fase)
    const estado: EstadoFase =
      fase === atual ? 'atual' : indice < posicaoAtual ? (data ? 'concluida' : 'pulada') : 'futura'
    return data ? { fase, estado, data } : { fase, estado }
  })
}
