// Peças puras da mesa de votação e do painel do art. 45 (RF-34 a RF-37, T-33; DMO-17). Resultado,
// cram down e cenários vêm de `regras/votacao.ts` (DMO-05); aqui ficam as linhas da mesa, os
// filtros e o motivo de não poder registrar.
import type { Tipos } from '../../dados/schemas'
import { CLASSES_VOTANTES, type ClasseVotante } from '../../regras/qgc'
import type { OpcaoVoto, ResultadoAgc, Votante, VotoLancado } from '../../regras/votacao'
import { plural } from '../processos/rotulos'
import { type Agc, casaBusca } from './agc'

type Credor = Tipos['credores']

/** Votos da mesa, por credor. */
export type MapaVotos = ReadonlyMap<string, OpcaoVoto>

export const OPCOES_VOTO: readonly { valor: OpcaoVoto; rotulo: string }[] = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
  { valor: 'abstencao', rotulo: 'Abstenção' },
]

/** Linha da mesa: um presente com direito a voto. */
export interface LinhaMesa {
  credor: Credor
  classe: ClasseVotante
  /** Valor vigente que vota (T-26). */
  valor: number
}

/**
 * Presentes com direito a voto, na ordem dos votantes (classe I a IV) e por nome. Quem foi marcado
 * presente e perdeu o direito a voto depois não vota (INV-06).
 */
export function linhasDaMesa(
  credores: readonly Credor[],
  votantes: readonly Votante[],
  presentes: ReadonlySet<string>,
): LinhaMesa[] {
  const porId = new Map(credores.map((c) => [c.id, c]))
  const linhas: LinhaMesa[] = []
  for (const votante of votantes) {
    const credor = porId.get(votante.credorId)
    if (!credor || !presentes.has(votante.credorId)) continue
    linhas.push({ credor, classe: votante.classe, valor: votante.valor })
  }
  return linhas.sort(
    (a, b) =>
      CLASSES_VOTANTES.indexOf(a.classe) - CLASSES_VOTANTES.indexOf(b.classe) ||
      a.credor.nome.localeCompare(b.credor.nome, 'pt-BR'),
  )
}

/** Filtro da mesa: classe votante e, opcionalmente, só quem ainda não tem voto. */
export type FiltroMesa = '' | ClasseVotante | 'sem-voto'

export function filtrarMesa(
  linhas: readonly LinhaMesa[],
  votos: MapaVotos,
  { busca, filtro }: { busca: string; filtro: FiltroMesa },
): LinhaMesa[] {
  const casa = casaBusca(busca)
  return linhas.filter((linha) => {
    if (filtro === 'sem-voto' && votos.has(linha.credor.id)) return false
    if (filtro && filtro !== 'sem-voto' && linha.classe !== filtro) return false
    return casa(linha.credor)
  })
}

/** Votos gravados da AGC, só dos presentes que votam. */
export function mapaDeVotos(
  votos: readonly Pick<Tipos['votos'], 'credorId' | 'voto'>[],
  linhas: readonly LinhaMesa[],
): Map<string, OpcaoVoto> {
  const ids = new Set(linhas.map((l) => l.credor.id))
  return new Map(votos.filter((v) => ids.has(v.credorId)).map((v) => [v.credorId, v.voto]))
}

export function listaDeVotos(votos: MapaVotos): VotoLancado[] {
  return [...votos].map(([credorId, voto]) => ({ credorId, voto }))
}

/** Presentes ainda sem voto, somando as classes (T-33). */
export function presentesSemVoto(resultado: ResultadoAgc): number {
  return resultado.classes.reduce((soma, classe) => soma + classe.semVoto, 0)
}

/**
 * Por que "Registrar resultado" está bloqueado (AGC-23, T-33); `null` se pode registrar. A AGC
 * encerrada não mostra o botão.
 */
export function motivoSemRegistro(
  agc: Pick<Agc, 'status'>,
  resultado: ResultadoAgc,
): string | null {
  if (agc.status === 'agendada') {
    return 'Instale a AGC para abrir a votação: o resultado só é registrado depois da instalação.'
  }
  if (agc.status === 'encerrada') return 'A AGC já foi encerrada.'
  if (resultado.classes.every((classe) => classe.presentes === 0)) {
    return 'Nenhum presente tem direito a voto: não há votação a registrar.'
  }
  const faltam = presentesSemVoto(resultado)
  if (faltam > 0) {
    return `Falta o voto de ${plural(faltam, 'presente', 'presentes')}: lance todos os votos para registrar o resultado.`
  }
  return null
}
