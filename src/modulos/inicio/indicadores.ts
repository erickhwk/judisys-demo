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

/** Os prazos em aberto mais próximos (8, ou `limite`): vencidos primeiro, depois por data (DSH-03). */
export function proximosPrazos(
  prazos: readonly Prazo[],
  hoje: DataIso,
  limite: number = LIMITE_PRAZOS,
): Prazo[] {
  // Por vencimento, os vencidos (antes de hoje) já vêm na frente.
  return prazos
    .filter((p) => noPeriodo(p, 'abertos', hoje))
    .sort(compararPrazos)
    .slice(0, limite)
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
// INI-07 · quadros 1×2: próximos prazos, calendário do mês e atividade recente (SDD-INI §5.7, C-05)

/** Linhas do quadro Próximos prazos (C-05: 6, no lugar dos 8 do dashboard) e da Atividade recente. */
export const LIMITE_PROXIMOS_DO_QUADRO = 6
export const LIMITE_ATIVIDADE_DO_QUADRO = 6

export interface ProximosDoQuadro {
  prazos: Prazo[]
  /** Os prazos em aberto que não couberam: o rodapé "+ 13 prazos na agenda" (QDR-05). */
  restantes: number
}

/** Os 6 próximos prazos em aberto, na ordem da `proximosPrazos`, e quantos sobram na agenda. */
export function proximosDoQuadro(prazos: readonly Prazo[], hoje: DataIso): ProximosDoQuadro {
  const abertos = prazos.filter((p) => noPeriodo(p, 'abertos', hoje)).length
  const mostrados = proximosPrazos(prazos, hoje, LIMITE_PROXIMOS_DO_QUADRO)
  return { prazos: mostrados, restantes: abertos - mostrados.length }
}

/** Marca de um dia no calendário do mês (Q-05): a cor da célula. */
export type MarcaDoDia = 'vencido' | 'hoje' | 'prazo' | 'agc'

/** No mesmo dia, vale a marca mais urgente: vencido e hoje antes da AGC, a AGC antes do prazo. */
const PESO_DA_MARCA: Readonly<Record<MarcaDoDia, number>> = {
  vencido: 3,
  hoje: 3,
  agc: 2,
  prazo: 1,
}

/** Uma convocação de AGC no calendário: a data e qual das duas é. */
export interface ConvocacaoDoDia {
  data: DataIso
  convocacao: 1 | 2
}

/**
 * Datas de AGC que o calendário marca: a convocação instalada, se houve (mesmo de AGC encerrada: ela
 * aconteceu naquele dia); senão, as convocações de hoje em diante da AGC não encerrada (a 1ª que
 * passou sem instalar não acontece mais), como na `proximasAgcs`.
 */
export function datasDeAgc(agc: Agc, hoje: DataIso): ConvocacaoDoDia[] {
  const primeira = { data: agc.dataPrimeira, convocacao: 1 } as const
  const segunda = { data: agc.dataSegunda, convocacao: 2 } as const
  if (agc.convocacaoInstalada) return [agc.convocacaoInstalada === 1 ? primeira : segunda]
  if (agc.status === 'encerrada') return []
  // As duas no mesmo dia (o schema permite): um evento só, o da 1ª.
  const datas = agc.dataSegunda === agc.dataPrimeira ? [primeira] : [primeira, segunda]
  return datas.filter((c) => c.data >= hoje)
}

/**
 * Dia → marca, no mês de `hoje` (Q-05, QDR-06). Prazos em aberto: antes de hoje, vencido; hoje,
 * hoje; depois, prazo (os cumpridos ficam de fora). AGCs pelas `datasDeAgc`.
 */
export function prazosDoMes(
  prazos: readonly Prazo[],
  agcs: readonly Agc[],
  hoje: DataIso,
): Map<DataIso, MarcaDoDia> {
  const mes = hoje.slice(0, 7)
  const marcas = new Map<DataIso, MarcaDoDia>()
  const marcar = (data: DataIso, marca: MarcaDoDia) => {
    if (data.slice(0, 7) !== mes) return
    const atual = marcas.get(data)
    if (!atual || PESO_DA_MARCA[marca] > PESO_DA_MARCA[atual]) marcas.set(data, marca)
  }
  for (const prazo of prazos) {
    if (!noPeriodo(prazo, 'abertos', hoje)) continue
    const v = prazo.vencimento
    marcar(v, v < hoje ? 'vencido' : v === hoje ? 'hoje' : 'prazo')
  }
  for (const agc of agcs) for (const { data } of datasDeAgc(agc, hoje)) marcar(data, 'agc')
  return new Map([...marcas].sort(([a], [b]) => a.localeCompare(b)))
}

export type DestaqueDoMes =
  | { tipo: 'prazo'; data: DataIso; prazo: Prazo; outros: number }
  | { tipo: 'agc'; data: DataIso; agc: Agc; convocacao: 1 | 2; outros: number }

/**
 * O cartão do pé do calendário: o primeiro dia de hoje até o fim do mês com prazo em aberto ou
 * AGC; no dia, o primeiro prazo (pela ordem da agenda) e quantos outros eventos há nele. `null`
 * quando o resto do mês está livre.
 */
export function destaqueDoMes(
  prazos: readonly Prazo[],
  agcs: readonly Agc[],
  hoje: DataIso,
): DestaqueDoMes | null {
  const mes = hoje.slice(0, 7)
  const noMes = (data: DataIso) => data >= hoje && data.slice(0, 7) === mes
  const abertos = prazos
    .filter((p) => noPeriodo(p, 'abertos', hoje) && noMes(p.vencimento))
    .sort(compararPrazos)
  const convocacoes = agcs
    .flatMap((agc) => datasDeAgc(agc, hoje).map((c) => ({ ...c, agc })))
    .filter((c) => noMes(c.data))
    .sort((a, b) => a.data.localeCompare(b.data) || a.agc.id.localeCompare(b.agc.id))
  const [prazo] = abertos
  const [convocacao] = convocacoes
  const dia = [prazo?.vencimento, convocacao?.data].filter((d) => d !== undefined).sort()[0]
  if (dia === undefined) return null
  const eventos =
    abertos.filter((p) => p.vencimento === dia).length +
    convocacoes.filter((c) => c.data === dia).length
  if (prazo && prazo.vencimento === dia)
    return { tipo: 'prazo', data: dia, prazo, outros: eventos - 1 }
  if (!convocacao) return null
  return { ...convocacao, tipo: 'agc', outros: eventos - 1 }
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
