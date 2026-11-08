// Números e listas do início (antes dashboard: RF-07 a RF-10 da demo, SDD §7.7; e o SDD do início
// §5.7). Funções puras: "hoje" vem por parâmetro (T-19); a tela só busca as coleções e desenha.
import type { Tipos } from '../../dados/schemas'
import { type DataIso, somarDias, somarMeses } from '../../regras/datas'
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
// INI-08 · quadros 2×1: passivo por processo, informes e prazos cumpridos por mês (SDD-INI §5.7)

/** Quantos processos o Q-08 desenha em barras. */
export const LIMITE_PASSIVO = 4
/** Meses das séries do Q-09 e do Q-10. */
export const MESES_NA_SERIE = 12

export interface PassivoDoProcesso {
  processoId: string
  apelido: string
  /** Soma da relação do AJ dos credores, em centavos. */
  valor: number
}

export interface PassivoPorProcesso {
  /** Os maiores processos ativos com relação do AJ, do maior para o menor. */
  maiores: PassivoDoProcesso[]
  /** Processos ativos sem nenhum credor com valor na relação do AJ (ficam fora da soma). */
  semRelacao: number
  /** Centavos: o mesmo `passivo` de `numerosDoTopo` (QDR-09). */
  total: number
}

/** Credor com valor na relação do AJ (zero conta; `null` ou ausente não). */
function temRelacao(credor: Pick<Credor, 'valorAj'>): boolean {
  return credor.valorAj !== null && credor.valorAj !== undefined
}

/** Relação do AJ dos processos ativos, por processo (Q-08). */
export function passivoPorProcesso(
  processos: readonly Processo[],
  credores: readonly Credor[],
): PassivoPorProcesso {
  const somas = new Map<string, number>()
  for (const credor of credores) {
    if (!temRelacao(credor)) continue
    somas.set(credor.processoId, (somas.get(credor.processoId) ?? 0) + (credor.valorAj ?? 0))
  }
  const ativos = processos.filter(ehAtivo)
  const comRelacao = ativos
    .filter((p) => somas.has(p.id))
    .map((p) => ({
      processoId: p.id,
      apelido: p.apelido,
      valor: somas.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.valor - a.valor || a.apelido.localeCompare(b.apelido, 'pt-BR'))
  return {
    maiores: comRelacao.slice(0, LIMITE_PASSIVO),
    semRelacao: ativos.length - comRelacao.length,
    total: comRelacao.reduce((soma, p) => soma + p.valor, 0),
  }
}

/** Contagem de um mês da série: `mes` em `aaaa-mm`. */
export interface ContagemDoMes {
  mes: string
  quantidade: number
}

/** Os `quantos` meses que terminam em `ultimo` (`aaaa-mm-dd` de qualquer dia), do mais antigo. */
function mesesAte(ultimo: DataIso, quantos: number): string[] {
  const primeiroDia = `${ultimo.slice(0, 7)}-01`
  return Array.from({ length: quantos }, (_, i) =>
    somarMeses(primeiroDia, i - quantos + 1).slice(0, 7),
  )
}

function contarPorMes(meses: readonly string[], datas: readonly DataIso[]): ContagemDoMes[] {
  const contagem = new Map(meses.map((mes) => [mes, 0]))
  for (const data of datas) {
    const mes = data.slice(0, 7)
    const atual = contagem.get(mes)
    if (atual !== undefined) contagem.set(mes, atual + 1)
  }
  return meses.map((mes) => ({ mes, quantidade: contagem.get(mes) ?? 0 }))
}

/** Informes por mês da data, nos 12 meses até o mês de `hoje`, inclusive (Q-09). */
export function informesPorMes(informes: readonly Informe[], hoje: DataIso): ContagemDoMes[] {
  return contarPorMes(
    mesesAte(hoje, MESES_NA_SERIE),
    informes.map((i) => i.data),
  )
}

/**
 * Prazos cumpridos nos 12 meses fechados antes do mês de `hoje`, contados pelo mês do vencimento:
 * não há data de cumprimento (C-01, F-07). Para o Q-10.
 */
export function cumpridosPorMes(prazos: readonly Prazo[], hoje: DataIso): ContagemDoMes[] {
  return contarPorMes(
    mesesAte(somarMeses(`${hoje.slice(0, 7)}-01`, -1), MESES_NA_SERIE),
    prazos.filter((p) => p.status === 'cumprido').map((p) => p.vencimento),
  )
}

const MESES_CURTOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const

/** `2026-11` → `nov`; com o ano, `nov/26` (rótulo do eixo dos gráficos por mês). */
export function rotuloDoMes(mes: string, comAno = false): string {
  const nome = MESES_CURTOS[Number(mes.slice(5, 7)) - 1] ?? mes
  return comAno ? `${nome}/${mes.slice(2, 4)}` : nome
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
  const proxima = proximaAgc(
    agcs.filter((a) => apelidos.has(a.processoId)),
    hoje,
  )
  const agc = proxima && proxima.dataPrimeira <= limite ? proxima : null
  return {
    vencidos: prazos.filter((p) => noPeriodo(p, 'vencidos', hoje)).length,
    hoje: prazos.filter((p) => noPeriodo(p, 'hoje', hoje)).length,
    agc: agc ? { apelido: apelidos.get(agc.processoId) ?? '', data: agc.dataPrimeira } : null,
  }
}
