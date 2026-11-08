// Números e listas do início (antes dashboard: RF-07 a RF-10 da demo, SDD §7.7; e o SDD do início
// §5.7). Funções puras: "hoje" vem por parâmetro (T-19); a tela só busca as coleções e desenha.
import type { Tipos } from '../../dados/schemas'
import { type DataIso, somarDias } from '../../regras/datas'
import {
  ehFaseFinal,
  FASES_FALENCIA,
  FASES_RJ,
  type Fase,
  ROTULOS_FASE,
  type TipoProcesso,
} from '../../regras/fases'
import { CLASSES_RJ, type ClasseRj, rotuloClasse } from '../../regras/qgc'
import { compararPrazos, noPeriodo } from '../prazos/regras'

type Processo = Tipos['processos']
type Credor = Tipos['credores']
type Prazo = Tipos['prazos']
type Agc = Tipos['agcs']
type Informe = Tipos['informes']

/** Quantos itens cada lista mostra. Prazos: 8 (RF-10); as outras seguem o tamanho do guia. */
export const LIMITE_PRAZOS = 8
export const LIMITE_AGCS = 5
export const LIMITE_INFORMES = 5
export const LIMITE_ATIVIDADE = 8

/** Processo ativo: fora das fases finais (DSH-05, T-27). */
export function ehAtivo(processo: Pick<Processo, 'faseAtual'>): boolean {
  return !ehFaseFinal(processo.faseAtual)
}

// ---------------------------------------------------------------------------------------------
// Números do topo (RF-07, DSH-01, DSH-05)

export interface NumerosDoTopo {
  ativosRj: number
  ativosFalencia: number
  /** Soma da relação do AJ (`valorAj`) dos credores dos processos ativos, em centavos. */
  passivo: number
  credores: number
  prazosVencidos: number
  prazosProximos: number
}

export function numerosDoTopo(
  dados: {
    processos: readonly Processo[]
    credores: readonly Credor[]
    prazos: readonly Prazo[]
  },
  hoje: DataIso,
): NumerosDoTopo {
  const ativos = dados.processos.filter(ehAtivo)
  const idsAtivos = new Set(ativos.map((p) => p.id))
  return {
    ativosRj: ativos.filter((p) => p.tipo === 'rj').length,
    ativosFalencia: ativos.filter((p) => p.tipo === 'falencia').length,
    passivo: dados.credores
      .filter((c) => idsAtivos.has(c.processoId))
      .reduce((soma, c) => soma + (c.valorAj ?? 0), 0),
    credores: dados.credores.length,
    // Os mesmos períodos da agenda (PRZ-08), para onde os números levam: "7 dias" vai de hoje a D+7.
    prazosVencidos: dados.prazos.filter((p) => noPeriodo(p, 'vencidos', hoje)).length,
    prazosProximos: dados.prazos.filter((p) => noPeriodo(p, '7-dias', hoje)).length,
  }
}

// ---------------------------------------------------------------------------------------------
// INI-09 · Carteira por fase (SDD-INI §5.7, Q-12), no lugar do antigo funil por fase (RF-08, T-35)

export interface FaseDaCarteira {
  fase: Fase
  rotulo: string
  quantidade: number
}

export interface CarteiraDoTipo {
  tipo: TipoProcesso
  /** Processos do tipo fora das fases finais. */
  ativos: number
  /** Processos do tipo na fase "Encerrada", a última da sequência. */
  encerrados: number
  /** Toda fase da sequência do RF-14, na ordem, com zero onde não há processo. */
  fases: FaseDaCarteira[]
}

/**
 * Contagem por fase da carteira, RJ e depois falência, com todas as fases da sequência do RF-14
 * (as vazias também, para o quadro apagá-las). As finais alternativas da RJ (convolada em
 * falência, desistência) ficam de fora (SDD-INI §5.7).
 */
export function carteiraPorFase(processos: readonly Processo[]): CarteiraDoTipo[] {
  return (['rj', 'falencia'] as const).map((tipo) => {
    const doTipo = processos.filter((p) => p.tipo === tipo)
    const sequencia: readonly Fase[] = tipo === 'rj' ? FASES_RJ : FASES_FALENCIA
    return {
      tipo,
      ativos: doTipo.filter(ehAtivo).length,
      encerrados: doTipo.filter((p) => p.faseAtual === 'encerrada').length,
      fases: sequencia.map((fase) => ({
        fase,
        rotulo: ROTULOS_FASE[fase],
        quantidade: doTipo.filter((p) => p.faseAtual === fase).length,
      })),
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Passivo por classe (RF-09)

export interface PassivoDaClasse {
  classe: ClasseRj
  rotulo: string
  /** Centavos. */
  valor: number
}

/** Relação do AJ das RJs ativas, somada por classe do RF-26 (mesma base do passivo do topo). */
export function passivoPorClasse(
  processos: readonly Processo[],
  credores: readonly Credor[],
): PassivoDaClasse[] {
  const rjsAtivas = new Set(processos.filter((p) => p.tipo === 'rj' && ehAtivo(p)).map((p) => p.id))
  const somas = new Map<string, number>()
  for (const credor of credores) {
    if (!rjsAtivas.has(credor.processoId)) continue
    somas.set(credor.classe, (somas.get(credor.classe) ?? 0) + (credor.valorAj ?? 0))
  }
  return CLASSES_RJ.map((classe) => ({
    classe,
    rotulo: rotuloClasse(classe, 'rj'),
    valor: somas.get(classe) ?? 0,
  }))
}

// ---------------------------------------------------------------------------------------------
// Listas (RF-10, DSH-02, DSH-03)

/** Os 8 prazos em aberto mais próximos: vencidos primeiro, depois por data (DSH-03). */
export function proximosPrazos(prazos: readonly Prazo[], hoje: DataIso): Prazo[] {
  // Por vencimento, os vencidos (antes de hoje) já vêm na frente.
  return prazos
    .filter((p) => noPeriodo(p, 'abertos', hoje))
    .sort(compararPrazos)
    .slice(0, LIMITE_PRAZOS)
}

export interface ProximaAgc {
  agc: Agc
  /** Data da próxima convocação ainda por vir. */
  data: DataIso
  convocacao: 1 | 2
}

/**
 * AGCs não encerradas com convocação de hoje em diante, pela data. Passada a 1ª, vale a 2ª
 * (DSH-02: a do vitrine aparece em D+6, na 1ª convocação).
 */
export function proximasAgcs(agcs: readonly Agc[], hoje: DataIso): ProximaAgc[] {
  return agcs
    .flatMap((agc): ProximaAgc[] => {
      if (agc.status === 'encerrada') return []
      // Instalada numa convocação, a outra não acontece mais.
      const convocacao = agc.convocacaoInstalada ?? (agc.dataPrimeira >= hoje ? 1 : 2)
      const data = convocacao === 1 ? agc.dataPrimeira : agc.dataSegunda
      return data >= hoje ? [{ agc, data, convocacao }] : []
    })
    .sort((a, b) => a.data.localeCompare(b.data) || a.agc.id.localeCompare(b.agc.id))
    .slice(0, LIMITE_AGCS)
}

/** Informes mais recentes: pela data e, no mesmo dia, pelo cadastro mais novo. */
export function ultimosInformes(informes: readonly Informe[]): Informe[] {
  return [...informes]
    .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, LIMITE_INFORMES)
}

// ---------------------------------------------------------------------------------------------
// Resumo do dia do cabeçalho do início (RF-07 do PRD do início, SDD §5.7, CAB-03 a CAB-07)

/** Até quantos dias à frente a AGC entra no resumo (de hoje a D+7, inclusive). */
export const DIAS_AGC_NO_RESUMO = 7

export interface ResumoDoDia {
  /** Prazos em aberto com vencimento antes de hoje. */
  vencidos: number
  /** Prazos em aberto que vencem hoje. */
  hoje: number
  /** A primeira AGC agendada com a 1ª convocação de hoje a D+7, ou `null`. */
  agc: { apelido: string; data: DataIso } | null
}

/**
 * Números da frase-resumo: vencidos e de hoje pelos mesmos períodos da agenda (PRZ-08), para onde
 * o resumo leva; a AGC pela regra da `proximaAgc` do SDD (agendada, `dataPrimeira >= hoje`),
 * limitada aos próximos 7 dias. AGC de processo que não existe mais fica de fora.
 */
export function resumoDoDia(
  prazos: readonly Prazo[],
  agcs: readonly Agc[],
  processos: readonly Pick<Processo, 'id' | 'apelido'>[],
  hoje: DataIso,
): ResumoDoDia {
  const apelidos = new Map(processos.map((p) => [p.id, p.apelido]))
  const limite = somarDias(hoje, DIAS_AGC_NO_RESUMO)
  const [agc] = agcs
    .filter(
      (a) =>
        a.status === 'agendada' &&
        a.dataPrimeira >= hoje &&
        a.dataPrimeira <= limite &&
        apelidos.has(a.processoId),
    )
    .sort((a, b) => a.dataPrimeira.localeCompare(b.dataPrimeira) || a.id.localeCompare(b.id))
  return {
    vencidos: prazos.filter((p) => noPeriodo(p, 'vencidos', hoje)).length,
    hoje: prazos.filter((p) => noPeriodo(p, 'hoje', hoje)).length,
    agc: agc ? { apelido: apelidos.get(agc.processoId) ?? '', data: agc.dataPrimeira } : null,
  }
}
