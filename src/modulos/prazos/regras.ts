// Regras das telas de prazos (RF-23 a RF-25, SDD §7.4): filtros da agenda, grade do calendário
// mensal, rótulo e tom de cada situação e os dados que o formulário grava. Funções puras: "hoje"
// vem por parâmetro (T-19).
import { getDay, parseISO } from 'date-fns'
import type { Tipos } from '../../dados/schemas'
import { type DataIso, diasEntre, ehDataIso, somarDias, somarMeses } from '../../regras/datas'
import { type SituacaoPrazo, situacao } from '../../regras/prazos'
import type { TomSelo } from '../../ui/Selo'

type Prazo = Tipos['prazos']
type Processo = Tipos['processos']

// ---------------------------------------------------------------------------------------------
// Situação (RF-24, PRZ-06/07)

/** Vencido em vermelho, urgente em dourado (RF-24); cumprido sem destaque, só o selo (PRZ-07). */
export const TOM_SITUACAO: Readonly<Record<SituacaoPrazo, TomSelo>> = {
  vencido: 'perigo',
  urgente: 'dourado',
  cumprido: 'sucesso',
  normal: 'neutro',
}

/** Texto do selo de situação: "Vencido", "Vence hoje", "Vence em 3 dias", "Cumprido", "Em aberto". */
export function rotuloSituacao(prazo: Pick<Prazo, 'status' | 'vencimento'>, hoje: DataIso): string {
  const atual = situacao(prazo, hoje)
  if (atual === 'cumprido') return 'Cumprido'
  if (atual === 'vencido') return 'Vencido'
  if (atual === 'normal') return 'Em aberto'
  const dias = diasEntre(hoje, prazo.vencimento)
  if (dias === 0) return 'Vence hoje'
  return dias === 1 ? 'Vence amanhã' : `Vence em ${dias} dias`
}

// ---------------------------------------------------------------------------------------------
// Filtros da agenda (RF-25, PRZ-08)

export const PERIODOS = {
  abertos: 'Todos em aberto',
  vencidos: 'Vencidos',
  hoje: 'Vencem hoje',
  '7-dias': 'Próximos 7 dias',
  '30-dias': 'Próximos 30 dias',
  todos: 'Todos, inclusive cumpridos',
} as const
export type Periodo = keyof typeof PERIODOS

export const PERIODO_PADRAO: Periodo = 'abertos'

export function ehPeriodo(valor: string | null): valor is Periodo {
  return valor !== null && Object.hasOwn(PERIODOS, valor)
}

export interface FiltroAgenda {
  periodo: Periodo
  /** Vazio: todos os processos. */
  processoId: string
  /** Responsável do processo (`responsavelId`); vazio: todos. */
  responsavelId: string
}

/** O prazo passa no período? "7 dias" e "30 dias" vão de hoje a D+n, inclusive, só abertos (PRZ-08). */
export function noPeriodo(
  prazo: Pick<Prazo, 'status' | 'vencimento'>,
  periodo: Periodo,
  hoje: DataIso,
): boolean {
  if (periodo === 'todos') return true
  if (prazo.status !== 'aberto') return false
  const v = prazo.vencimento
  switch (periodo) {
    case 'abertos':
      return true
    case 'vencidos':
      return v < hoje
    case 'hoje':
      return v === hoje
    case '7-dias':
      return v >= hoje && v <= somarDias(hoje, 7)
    case '30-dias':
      return v >= hoje && v <= somarDias(hoje, 30)
  }
}

/** Prazos da agenda filtrados e ordenados por vencimento (e título, no mesmo dia). */
export function filtrarAgenda(
  prazos: readonly Prazo[],
  processos: ReadonlyMap<string, Pick<Processo, 'responsavelId'>>,
  filtro: FiltroAgenda,
  hoje: DataIso,
): Prazo[] {
  return prazos
    .filter(
      (prazo) =>
        noPeriodo(prazo, filtro.periodo, hoje) &&
        (filtro.processoId === '' || prazo.processoId === filtro.processoId) &&
        (filtro.responsavelId === '' ||
          processos.get(prazo.processoId)?.responsavelId === filtro.responsavelId),
    )
    .sort(compararPrazos)
}

export function compararPrazos(a: Prazo, b: Prazo): number {
  return (
    a.vencimento.localeCompare(b.vencimento) ||
    a.titulo.localeCompare(b.titulo, 'pt-BR') ||
    a.id.localeCompare(b.id)
  )
}

// ---------------------------------------------------------------------------------------------
// Calendário mensal (PRZ-09, T-08)

/** Mês no formato `aaaa-mm`. */
export type Mes = string

const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/

export function ehMes(valor: string | null): valor is Mes {
  return valor !== null && FORMATO_MES.test(valor)
}

export function mesDe(data: DataIso): Mes {
  return data.slice(0, 7)
}

export function somarMesesAoMes(mes: Mes, meses: number): Mes {
  return mesDe(somarMeses(`${mes}-01`, meses))
}

export const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

export interface DiaDoCalendario {
  data: DataIso
  /** Fora do mês mostrado (completa a primeira e a última semana). */
  foraDoMes: boolean
}

/** Semanas (domingo a sábado) que cobrem o mês, com os dias vizinhos completando as pontas. */
export function semanasDoMes(mes: Mes): DiaDoCalendario[][] {
  const primeiro = `${mes}-01`
  const inicio = somarDias(primeiro, -getDay(parseISO(primeiro)))
  const ultimo = somarDias(somarMeses(primeiro, 1), -1)
  const semanas: DiaDoCalendario[][] = []
  for (let domingo = inicio; domingo <= ultimo; domingo = somarDias(domingo, 7)) {
    semanas.push(
      Array.from({ length: 7 }, (_, i) => {
        const data = somarDias(domingo, i)
        return { data, foraDoMes: mesDe(data) !== mes }
      }),
    )
  }
  return semanas
}

/** Prazos agrupados pelo dia do vencimento, cada dia em ordem. */
export function prazosPorDia(prazos: readonly Prazo[]): Map<DataIso, Prazo[]> {
  const dias = new Map<DataIso, Prazo[]>()
  for (const prazo of [...prazos].sort(compararPrazos)) {
    const lista = dias.get(prazo.vencimento)
    if (lista) lista.push(prazo)
    else dias.set(prazo.vencimento, [prazo])
  }
  return dias
}

// ---------------------------------------------------------------------------------------------
// Formulário (RF-23, PRZ-10, PRZ-11, T-37)

export interface ValoresPrazo {
  processoId: string
  titulo: string
  vencimento: string
  baseLegal: string
}

export type ErrosPrazo = Partial<Record<keyof ValoresPrazo, string>>

export const MENSAGEM_OBRIGATORIO = 'Campo obrigatório'
export const MENSAGEM_DATA_INVALIDA = 'Data inválida'

/** Valores iniciais: vazio para o novo; o prazo atual na edição. */
export function valoresIniciais(prazo?: Prazo, processoId = ''): ValoresPrazo {
  if (!prazo) return { processoId, titulo: '', vencimento: '', baseLegal: '' }
  return {
    processoId: prazo.processoId,
    titulo: prazo.titulo,
    vencimento: prazo.vencimento,
    baseLegal: prazo.baseLegal ?? '',
  }
}

/** Título e base legal travados no prazo automático: só o vencimento muda (C-05, T-37). */
export function soVencimentoEditavel(prazo: Prazo | undefined): boolean {
  return prazo?.origem === 'automatico'
}

/** Erros por campo; base legal é opcional (PRZ-10). */
export function validarPrazo(valores: ValoresPrazo, prazo?: Prazo): ErrosPrazo {
  const erros: ErrosPrazo = {}
  if (!prazo && valores.processoId === '') erros.processoId = MENSAGEM_OBRIGATORIO
  if (!soVencimentoEditavel(prazo) && valores.titulo.trim() === '') {
    erros.titulo = MENSAGEM_OBRIGATORIO
  }
  if (valores.vencimento === '') erros.vencimento = MENSAGEM_OBRIGATORIO
  else if (!ehDataIso(valores.vencimento)) erros.vencimento = MENSAGEM_DATA_INVALIDA
  return erros
}

/** Prazo manual novo, aberto (RF-23). Sem base legal, o campo fica de fora (PRZ-10). */
export function novoPrazoManual(valores: ValoresPrazo) {
  const baseLegal = valores.baseLegal.trim()
  return {
    processoId: valores.processoId,
    titulo: valores.titulo.trim(),
    vencimento: valores.vencimento,
    origem: 'manual' as const,
    status: 'aberto' as const,
    ...(baseLegal === '' ? {} : { baseLegal }),
  }
}

/**
 * Mudanças da edição. No automático vai só o vencimento, mesmo que o formulário traga outro
 * título (T-37): a origem continua `automatico` e o RMA continua reconhecível (PRZ-11, INV-05).
 */
export function mudancasDaEdicao(
  prazo: Prazo,
  valores: ValoresPrazo,
): Partial<Pick<Prazo, 'titulo' | 'vencimento' | 'baseLegal'>> {
  if (soVencimentoEditavel(prazo)) return { vencimento: valores.vencimento }
  const baseLegal = valores.baseLegal.trim()
  return {
    titulo: valores.titulo.trim(),
    vencimento: valores.vencimento,
    // Sem base legal antes e depois: não grava '' no lugar do campo ausente (o log ficaria com
    // uma mudança que ninguém fez).
    ...(baseLegal === '' && prazo.baseLegal === undefined ? {} : { baseLegal }),
  }
}
