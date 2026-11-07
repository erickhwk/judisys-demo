// Classes de credores, valor vigente, quadro-resumo por classe e variação entre as relações
// (RF-26 a RF-28, RF-30, C-01, T-26). Valores em centavos inteiros (INV-03).

/** Classes da RJ (RF-26): I a IV do art. 41 e "Não sujeito" (art. 49, §3º, C-07). */
export const CLASSES_RJ = [
  'trabalhista',
  'garantia-real',
  'quirografario',
  'me-epp',
  'nao-sujeito',
] as const

/** Classes da falência (C-01): art. 83, I, II, III, VI, VII, VIII e IX, e extraconcursais (art. 84). */
export const CLASSES_FALENCIA = [
  'trabalhista',
  'garantia-real',
  'tributario',
  'quirografario',
  'multas',
  'subordinados',
  'juros',
  'extraconcursal',
] as const

export type ClasseRj = (typeof CLASSES_RJ)[number]
export type ClasseFalencia = (typeof CLASSES_FALENCIA)[number]
export type Classe = ClasseRj | ClasseFalencia

/** Classes que votam na AGC (RF-32): I a IV da RJ, na ordem do art. 41. */
export const CLASSES_VOTANTES = ['trabalhista', 'garantia-real', 'quirografario', 'me-epp'] as const
export type ClasseVotante = (typeof CLASSES_VOTANTES)[number]

/** Classes que aparecem à parte e ficam fora do total do QGC (RF-26, CRD-15). */
export const CLASSES_A_PARTE: readonly Classe[] = ['nao-sujeito', 'extraconcursal']

/** Nome legível da classe, sem numeração (a numeração depende do tipo: ver `rotuloClasse`). */
export const ROTULOS_CLASSE: Record<Classe, string> = {
  trabalhista: 'Trabalhista',
  'garantia-real': 'Garantia real',
  quirografario: 'Quirografário',
  'me-epp': 'ME/EPP',
  'nao-sujeito': 'Não sujeito',
  tributario: 'Tributário',
  multas: 'Multas',
  subordinados: 'Subordinados',
  juros: 'Juros',
  extraconcursal: 'Extraconcursal',
}

const NUMERAIS_RJ: Partial<Record<Classe, string>> = {
  trabalhista: 'I',
  'garantia-real': 'II',
  quirografario: 'III',
  'me-epp': 'IV',
}

/** Incisos do art. 83 (IV e V revogados, C-01). */
const NUMERAIS_FALENCIA: Partial<Record<Classe, string>> = {
  trabalhista: 'I',
  'garantia-real': 'II',
  tributario: 'III',
  quirografario: 'VI',
  multas: 'VII',
  subordinados: 'VIII',
  juros: 'IX',
}

/** `I · Trabalhista` na RJ, `VI · Quirografário` na falência; sem número: `Não sujeito`. */
export function rotuloClasse(classe: Classe, tipo: 'rj' | 'falencia'): string {
  const numeral = (tipo === 'rj' ? NUMERAIS_RJ : NUMERAIS_FALENCIA)[classe]
  return numeral ? `${numeral} · ${ROTULOS_CLASSE[classe]}` : ROTULOS_CLASSE[classe]
}

/** Ordem de exibição que serve aos dois tipos (a RJ e a falência seguem a ordem da lei). */
const ORDEM_CLASSES: readonly Classe[] = [
  'trabalhista',
  'garantia-real',
  'tributario',
  'quirografario',
  'me-epp',
  'multas',
  'subordinados',
  'juros',
  'nao-sujeito',
  'extraconcursal',
]

/** Campos do credor que as regras do QGC usam (nomes do PRD §6). */
export interface CredorQgc {
  classe: Classe
  valorDevedor: number
  valorAj?: number | null
  valorQgc?: number | null
}

/** Valor que vale para voto, instalação e quadro-resumo (T-26). O da relação do devedor nunca vale. */
export function valorVigente(credor: Pick<CredorQgc, 'valorAj' | 'valorQgc'>): number {
  return credor.valorQgc ?? credor.valorAj ?? 0
}

export type ColunaQgc = 'valorDevedor' | 'valorAj' | 'valorQgc' | 'vigente'

function valorDaColuna(credor: CredorQgc, coluna: ColunaQgc): number {
  if (coluna === 'vigente') return valorVigente(credor)
  return credor[coluna] ?? 0
}

export interface LinhaResumo {
  classe: Classe
  quantidade: number
  /** Centavos. */
  valor: number
  /** Centésimos de ponto percentual sobre o total concursal (2000 = 20,00%); `null` nas classes à parte. */
  percentualCentesimos: number | null
}

export interface ResumoQgc {
  /** Classes concursais presentes, na ordem da lei. */
  linhas: LinhaResumo[]
  /** Soma das linhas concursais. */
  total: { quantidade: number; valor: number }
  /** Não sujeitos e extraconcursais: aparecem, mas fora do total (RF-26, CRD-15). */
  aParte: LinhaResumo[]
}

/**
 * Quadro-resumo por classe (RF-28, RF-30): quantidade, soma em centavos e percentual sobre o
 * total concursal. Só aparecem as classes com ao menos um credor.
 */
export function resumoPorClasse(
  credores: readonly CredorQgc[],
  coluna: ColunaQgc = 'vigente',
): ResumoQgc {
  const somas = new Map<Classe, { quantidade: number; valor: number }>()
  for (const credor of credores) {
    const soma = somas.get(credor.classe) ?? { quantidade: 0, valor: 0 }
    soma.quantidade += 1
    soma.valor += valorDaColuna(credor, coluna)
    somas.set(credor.classe, soma)
  }

  const total = { quantidade: 0, valor: 0 }
  for (const [classe, soma] of somas) {
    if (CLASSES_A_PARTE.includes(classe)) continue
    total.quantidade += soma.quantidade
    total.valor += soma.valor
  }

  const linhas: LinhaResumo[] = []
  const aParte: LinhaResumo[] = []
  for (const classe of ORDEM_CLASSES) {
    const soma = somas.get(classe)
    if (!soma) continue
    if (CLASSES_A_PARTE.includes(classe)) {
      aParte.push({ classe, ...soma, percentualCentesimos: null })
    } else {
      linhas.push({
        classe,
        ...soma,
        percentualCentesimos: total.valor === 0 ? 0 : razaoEmCentesimos(soma.valor, total.valor),
      })
    }
  }
  return { linhas, total, aParte }
}

export interface Variacao {
  /** Centavos (destino − origem). */
  diferenca: number
  /** Centésimos de ponto percentual (2000 = +20,00%); `null` quando a origem é zero. */
  percentualCentesimos: number | null
}

/**
 * Variação entre as relações (RF-27, CRD-02): devedor → AJ e AJ → QGC.
 * `null` quando o valor de destino ainda não existe.
 */
export function variacao(credor: Pick<CredorQgc, 'valorDevedor' | 'valorAj' | 'valorQgc'>): {
  devedorParaAj: Variacao | null
  ajParaQgc: Variacao | null
} {
  const aj = credor.valorAj ?? null
  const qgc = credor.valorQgc ?? null
  return {
    devedorParaAj: aj === null ? null : variacaoEntre(credor.valorDevedor, aj),
    ajParaQgc: qgc === null || aj === null ? null : variacaoEntre(aj, qgc),
  }
}

function variacaoEntre(de: number, para: number): Variacao {
  const diferenca = para - de
  return { diferenca, percentualCentesimos: de === 0 ? null : razaoEmCentesimos(diferenca, de) }
}

/**
 * `parte / todo` em centésimos de ponto percentual, arredondado. Só para exibição: as comparações
 * de fronteira (votação, instalação) usam produtos inteiros em `votacao.ts`.
 */
function razaoEmCentesimos(parte: number, todo: number): number {
  return Math.round((parte / todo) * 10000)
}

/** `+20,00%`, `-5,50%`, `0,00%`; `—` sem variação calculável. */
export function formatarVariacao(variacaoCalculada: Variacao | null): string {
  if (variacaoCalculada === null || variacaoCalculada.percentualCentesimos === null) return '—'
  const centesimos = variacaoCalculada.percentualCentesimos
  const sinal = centesimos > 0 ? '+' : centesimos < 0 ? '-' : ''
  return `${sinal}${formatarCentesimos(Math.abs(centesimos))}%`
}

/** Centésimos de ponto percentual → `20,00` (sem sinal de %). */
export function formatarCentesimos(centesimos: number): string {
  const sinal = centesimos < 0 ? '-' : ''
  const absoluto = Math.abs(centesimos)
  return `${sinal}${Math.floor(absoluto / 100)},${(absoluto % 100).toString().padStart(2, '0')}`
}
