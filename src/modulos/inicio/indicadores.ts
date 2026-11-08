// Números e listas do início (antes dashboard: RF-07 a RF-10 da demo, SDD §7.7; e o SDD do início
// §5.7). Funções puras: "hoje" vem por parâmetro (T-19); a tela só busca as coleções e desenha.
import type { Tipos } from '../../dados/schemas'
import { type DataIso, somarDias } from '../../regras/datas'
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

// ---------------------------------------------------------------------------------------------
// INI-06 · quadros 1×1: prazos em aberto (Q-01), próxima AGC (Q-02) e pedidos de crédito (Q-03)

/** Prazos em aberto por urgência (Q-01). As faixas não se cruzam e somam `abertos`. */
export interface PrazosPorUrgencia {
  abertos: number
  /** Vencimento antes de hoje (o período "vencidos" da agenda). */
  vencidos: number
  hoje: number
  /** De D+1 a D+7. */
  ate7Dias: number
  /** De D+8 a D+30. */
  ate30Dias: number
  /** Depois de D+30. */
  depois: number
}

export function prazosPorUrgencia(prazos: readonly Prazo[], hoje: DataIso): PrazosPorUrgencia {
  const contagem: PrazosPorUrgencia = {
    abertos: 0,
    vencidos: 0,
    hoje: 0,
    ate7Dias: 0,
    ate30Dias: 0,
    depois: 0,
  }
  const em7 = somarDias(hoje, 7)
  const em30 = somarDias(hoje, 30)
  for (const prazo of prazos) {
    if (!noPeriodo(prazo, 'abertos', hoje)) continue
    const v = prazo.vencimento
    contagem.abertos++
    if (v < hoje) contagem.vencidos++
    else if (v === hoje) contagem.hoje++
    else if (v <= em7) contagem.ate7Dias++
    else if (v <= em30) contagem.ate30Dias++
    else contagem.depois++
  }
  return contagem
}

/**
 * A primeira AGC `agendada` com a 1ª convocação de hoje em diante (SDD §5.7, Q-02): pela data e,
 * no mesmo dia, pelo id. AGC instalada ou encerrada não é "próxima"; a de 1ª convocação já passada
 * também não, como no `resumoDoDia`.
 */
export function proximaAgc(agcs: readonly Agc[], hoje: DataIso): Agc | null {
  const [primeira] = agcs
    .filter((a) => a.status === 'agendada' && a.dataPrimeira >= hoje)
    .sort((a, b) => a.dataPrimeira.localeCompare(b.dataPrimeira) || a.id.localeCompare(b.id))
  return primeira ?? null
}

type PedidoDeCredito = Tipos['pedidosDeCredito']

export interface PedidosPorStatus {
  pendentes: number
  acolhidos: number
  rejeitados: number
  /** O processo com mais pedidos pendentes (no empate, o de menor id), ou `null` sem pendentes. */
  maisPendentes: { processoId: string; pendentes: number } | null
}

export function pedidosPorStatus(pedidos: readonly PedidoDeCredito[]): PedidosPorStatus {
  const pendentesPorProcesso = new Map<string, number>()
  let acolhidos = 0
  let rejeitados = 0
  for (const pedido of pedidos) {
    if (pedido.status === 'acolhido') acolhidos++
    else if (pedido.status === 'rejeitado') rejeitados++
    else {
      pendentesPorProcesso.set(
        pedido.processoId,
        (pendentesPorProcesso.get(pedido.processoId) ?? 0) + 1,
      )
    }
  }
  let maisPendentes: PedidosPorStatus['maisPendentes'] = null
  let pendentes = 0
  for (const [processoId, quantidade] of pendentesPorProcesso) {
    pendentes += quantidade
    if (
      !maisPendentes ||
      quantidade > maisPendentes.pendentes ||
      (quantidade === maisPendentes.pendentes && processoId < maisPendentes.processoId)
    ) {
      maisPendentes = { processoId, pendentes: quantidade }
    }
  }
  return { pendentes, acolhidos, rejeitados, maisPendentes }
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
