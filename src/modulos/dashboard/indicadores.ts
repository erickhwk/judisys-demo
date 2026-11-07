// Números e listas do dashboard (RF-07 a RF-10, SDD §7.7). Funções puras: "hoje" vem por
// parâmetro (T-19); a tela só busca as coleções e desenha.
import type { Tipos } from '../../dados/schemas'
import type { DataIso } from '../../regras/datas'
import {
  ehFaseFinal,
  type Fase,
  fasesDoTipo,
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
type Log = Tipos['logs']

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
// Funil por fase (RF-08, T-35)

export interface EtapaDoFunil {
  fase: Fase
  rotulo: string
  quantidade: number
}

/** Toda fase do tipo, na ordem do RF-14, com quantos processos estão parados nela (zero também). */
export function funilPorFase(processos: readonly Processo[], tipo: TipoProcesso): EtapaDoFunil[] {
  const doTipo = processos.filter((p) => p.tipo === tipo)
  return fasesDoTipo(tipo).map((fase) => ({
    fase,
    rotulo: ROTULOS_FASE[fase],
    quantidade: doTipo.filter((p) => p.faseAtual === fase).length,
  }))
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
  const abertos = prazos.filter((p) => p.status === 'aberto')
  const vencidos = abertos.filter((p) => p.vencimento < hoje).sort(compararPrazos)
  const aVencer = abertos.filter((p) => p.vencimento >= hoje).sort(compararPrazos)
  return [...vencidos, ...aVencer].slice(0, LIMITE_PRAZOS)
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
    .filter((agc) => agc.status !== 'encerrada' && agc.dataSegunda >= hoje)
    .map(
      (agc): ProximaAgc =>
        agc.dataPrimeira >= hoje
          ? { agc, data: agc.dataPrimeira, convocacao: 1 }
          : { agc, data: agc.dataSegunda, convocacao: 2 },
    )
    .sort((a, b) => a.data.localeCompare(b.data) || a.agc.id.localeCompare(b.agc.id))
    .slice(0, LIMITE_AGCS)
}

/** Informes mais recentes: pela data e, no mesmo dia, pelo cadastro mais novo. */
export function ultimosInformes(informes: readonly Informe[]): Informe[] {
  return [...informes]
    .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, LIMITE_INFORMES)
}

/** Logs mais novos; no mesmo carimbo fica a ordem recebida (a do repositório, como nos logs). */
export function atividadeRecente(logs: readonly Log[]): Log[] {
  return [...logs].sort((a, b) => b.data.localeCompare(a.data)).slice(0, LIMITE_ATIVIDADE)
}
