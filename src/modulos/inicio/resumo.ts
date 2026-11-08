// Textos do cabeçalho do início (RF-05 a RF-07 do PRD do início, SDD §5.1 e §7.2): saudação pela
// hora, data por extenso e a frase-resumo do dia. Funções puras: hora e "hoje" vêm por parâmetro.
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { type Carimbo, type DataIso, diasEntre } from '../../regras/datas'
import type { ResumoDoDia } from './indicadores'

export type Saudacao = 'Bom dia' | 'Boa tarde' | 'Boa noite'

/** "Bom dia" até 12h, "Boa tarde" de 12h a 18h e "Boa noite" a partir de 18h (RF-05, CAB-02). */
export function saudacao(hora: number): Saudacao {
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Hora (0 a 23) de um carimbo `aaaa-mm-ddTHH:mm[:ss]`. */
export function horaDoCarimbo(carimbo: Carimbo): number {
  return Number(carimbo.slice(11, 13))
}

/** Primeiro nome, para a saudação ("Otávio Reis" → "Otávio"). */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ''
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** "Sábado, 7 de novembro" (RF-06, CAB-01). */
export function dataPorExtenso(data: DataIso): string {
  return maiuscula(format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR }))
}

/** Dia da semana com o artigo, de domingo (0) a sábado (6): "na sexta", "no sábado". */
const DIAS_DA_SEMANA = [
  ['o', 'domingo'],
  ['a', 'segunda'],
  ['a', 'terça'],
  ['a', 'quarta'],
  ['a', 'quinta'],
  ['a', 'sexta'],
  ['o', 'sábado'],
] as const

/** Quando é a AGC, visto de hoje: "hoje", "amanhã", "na sexta" ou, em D+7, "no próximo sábado". */
function quandoE(data: DataIso, hoje: DataIso): string {
  const dias = diasEntre(hoje, data)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  const [artigo, dia] = DIAS_DA_SEMANA[parseISO(data).getDay()] ?? DIAS_DA_SEMANA[0]
  const proximo = dias >= 7 ? `${artigo === 'a' ? 'próxima' : 'próximo'} ` : ''
  return `n${artigo} ${proximo}${dia}`
}

const plural = (n: number, singular: string, varios: string) => (n === 1 ? singular : varios)

/** Junta as partes como numa frase: "a, b e c". */
function juntar(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join('')
  return `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`
}

/**
 * A frase-resumo em duas partes: `destaque` (os vencidos, em vermelho na tela; vazio quando não
 * há) e o `resto`, que completa a frase. Cita só o que existe, na ordem vencidos, hoje e AGC
 * (RF-07, CAB-03 a CAB-07).
 */
export interface FraseDoResumo {
  destaque: string
  resto: string
}

export function fraseDoResumo(resumo: ResumoDoDia, hoje: DataIso): FraseDoResumo {
  const { vencidos, hoje: deHoje, agc } = resumo
  if (vencidos === 0 && deHoje === 0 && !agc) {
    return { destaque: '', resto: 'Nenhuma pendência para hoje.' }
  }
  const destaque =
    vencidos > 0 ? `${vencidos} ${plural(vencidos, 'prazo vencido', 'prazos vencidos')}` : ''
  const partes: string[] = []
  if (deHoje > 0) {
    // Depois dos vencidos, "prazo" já foi dito: "3 prazos vencidos, 1 vence hoje".
    const sujeito = vencidos > 0 ? `${deHoje}` : `${deHoje} ${plural(deHoje, 'prazo', 'prazos')}`
    partes.push(`${sujeito} ${plural(deHoje, 'vence', 'vencem')} hoje`)
  }
  if (agc) partes.push(`a AGC do ${agc.apelido} é ${quandoE(agc.data, hoje)}`)
  // O destaque abre a frase; o resto é o que vem depois dele.
  const frase = `${maiuscula(juntar(destaque ? [destaque, ...partes] : partes))}.`
  return { destaque, resto: frase.slice(destaque.length) }
}
