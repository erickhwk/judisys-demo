// Cálculo e formatação de datas e moeda (T-05, RNF-04). Funções puras: "hoje" vem por parâmetro.
import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Data sem hora, `aaaa-mm-dd`, sem fuso. */
export type DataIso = string
/** Carimbo ISO 8601 (`aaaa-mm-ddTHH:mm[:ss]`), em horário local. */
export type Carimbo = string

const FORMATO_DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

/** `true` se o texto é uma data `aaaa-mm-dd` que existe no calendário. */
export function ehDataIso(texto: string): boolean {
  if (!FORMATO_DATA_ISO.test(texto)) return false
  const data = parseISO(texto)
  return isValid(data) && format(data, 'yyyy-MM-dd') === texto
}

function paraDate(data: DataIso | Carimbo): Date {
  const resultado = parseISO(data)
  if (!isValid(resultado)) throw new Error(`Data inválida: ${data}`)
  return resultado
}

function paraIso(data: Date): DataIso {
  return format(data, 'yyyy-MM-dd')
}

export function somarDias(data: DataIso, dias: number): DataIso {
  return paraIso(addDays(paraDate(data), dias))
}

/** Soma meses; no fim do mês ajusta para o último dia (31/01 + 1 mês = 28/02 ou 29/02). */
export function somarMeses(data: DataIso, meses: number): DataIso {
  return paraIso(addMonths(paraDate(data), meses))
}

export function somarAnos(data: DataIso, anos: number): DataIso {
  return paraIso(addYears(paraDate(data), anos))
}

/** Dias de calendário de `de` até `ate` (positivo se `ate` é depois). */
export function diasEntre(de: DataIso, ate: DataIso): number {
  return differenceInCalendarDays(paraDate(ate), paraDate(de))
}

/** `dd/mm/aaaa`. Aceita data ou carimbo. */
export function formatarData(data: DataIso | Carimbo): string {
  return format(paraDate(data), 'dd/MM/yyyy')
}

/** `dd/mm/aaaa HH:mm`, para carimbos (logs, atividade recente). */
export function formatarDataHora(carimbo: Carimbo): string {
  return format(paraDate(carimbo), 'dd/MM/yyyy HH:mm')
}

/** `7 de novembro de 2026`. */
export function formatarDataPorExtenso(data: DataIso | Carimbo): string {
  return format(paraDate(data), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

/** `novembro de 2026`, para o título do calendário. */
export function formatarMesAno(data: DataIso): string {
  return format(paraDate(data), "MMMM 'de' yyyy", { locale: ptBR })
}

/**
 * Inteiro em centavos → `1.234,56` (sem símbolo), sem passar por ponto flutuante (INV-03).
 * Com `separadorMilhar = ''` sai `1234,56` (formato do CSV, RF-44).
 */
export function formatarCentavos(centavos: number, separadorMilhar = '.'): string {
  if (!Number.isInteger(centavos)) throw new Error(`Valor em centavos não inteiro: ${centavos}`)
  const sinal = centavos < 0 ? '-' : ''
  const absoluto = Math.abs(centavos)
  const reais = Math.floor(absoluto / 100).toString()
  const resto = (absoluto % 100).toString().padStart(2, '0')
  const reaisAgrupados = reais.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMilhar)
  return `${sinal}${reaisAgrupados},${resto}`
}

/** Inteiro em centavos → `R$ 1.234,56` (negativo: `-R$ 1.234,56`), com espaço comum. */
export function formatarMoeda(centavos: number): string {
  const texto = formatarCentavos(centavos)
  return texto.startsWith('-') ? `-R$ ${texto.slice(1)}` : `R$ ${texto}`
}
