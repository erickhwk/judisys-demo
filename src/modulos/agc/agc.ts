// Peças puras das telas da AGC (RF-31 a RF-33): situação, aviso de simulação, convocação sugerida,
// lista de presença e o formulário. Quem vota e o quórum vêm de `regras/votacao.ts` (DMO-05).
import { z } from 'zod'
import type { Tipos } from '../../dados/schemas'
import { type DataIso, ehDataIso } from '../../regras/datas'
import { normalizar } from '../../regras/normalizar'
import { CLASSES_VOTANTES, type Classe, formatarCentesimos, valorVigente } from '../../regras/qgc'
import { type Convocacao, motivoSemVoto } from '../../regras/votacao'
import type { TomSelo } from '../../ui/Selo'

export type Agc = Tipos['agcs']
type Credor = Tipos['credores']

export const MENSAGEM_SIMULACAO = 'Simulação: a data da AGC ainda não chegou'

export const SITUACOES_AGC: Record<Agc['status'], { rotulo: string; tom: TomSelo }> = {
  agendada: { rotulo: 'Agendada', tom: 'azul' },
  instalada: { rotulo: 'Instalada', tom: 'dourado' },
  encerrada: { rotulo: 'Encerrada', tom: 'neutro' },
}

/**
 * A demo deixa conduzir a AGC antes da data, com aviso (RF-31, AGC-01): vale enquanto a AGC não
 * foi encerrada e a 1ª convocação ainda não chegou.
 */
export function emSimulacao(agc: Pick<Agc, 'status' | 'dataPrimeira'>, hoje: DataIso): boolean {
  return agc.status !== 'encerrada' && agc.dataPrimeira > hoje
}

/** Convocação sugerida no painel: a 2ª depois que a data da 1ª passou. */
export function convocacaoSugerida(agc: Pick<Agc, 'dataPrimeira'>, hoje: DataIso): Convocacao {
  return hoje > agc.dataPrimeira ? 2 : 1
}

// ---------------------------------------------------------------------------------------------
// Lista de presença

export interface LinhaPresenca {
  credor: Credor
  /** Valor que conta para a instalação (T-26). */
  valor: number
  presente: boolean
  /** Por que não vota (AGC-24, INV-06); `null` para quem vota. */
  motivo: string | null
}

/** Filtro de classe da lista: uma das classes votantes ou quem não vota. */
export type FiltroClasse = '' | (typeof CLASSES_VOTANTES)[number] | 'sem-voto'

/** Votantes por classe (I a IV) e depois quem não vota, cada grupo por nome. */
export function linhasDePresenca(
  credores: readonly Credor[],
  presentes: ReadonlySet<string>,
): LinhaPresenca[] {
  const linhas = credores.map((credor) => {
    const motivo = motivoSemVoto(credor)
    return {
      credor,
      valor: valorVigente(credor),
      // Quem perdeu o direito a voto depois de marcado continua aparecendo como presente, para
      // poder ser desmarcado.
      presente: presentes.has(credor.id),
      motivo,
    }
  })
  const grupo = (linha: LinhaPresenca) =>
    linha.motivo
      ? CLASSES_VOTANTES.length
      : (CLASSES_VOTANTES as readonly Classe[]).indexOf(linha.credor.classe)
  return linhas.sort(
    (a, b) => grupo(a) - grupo(b) || a.credor.nome.localeCompare(b.credor.nome, 'pt-BR'),
  )
}

/** Busca por nome ou CPF/CNPJ e filtro de classe, como na aba Credores. */
export function filtrarPresenca(
  linhas: readonly LinhaPresenca[],
  { busca, classe }: { busca: string; classe: FiltroClasse },
): LinhaPresenca[] {
  const casa = casaBusca(busca)
  return linhas.filter((linha) => {
    if (classe === 'sem-voto' && !linha.motivo) return false
    if (classe && classe !== 'sem-voto' && (linha.motivo || linha.credor.classe !== classe)) {
      return false
    }
    return casa(linha.credor)
  })
}

/** Predicado da busca por nome ou CPF/CNPJ (todas as palavras), usado na presença e na mesa. */
export function casaBusca(busca: string): (credor: Pick<Credor, 'nome' | 'documento'>) => boolean {
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean)
  return (credor) => {
    const alvo = normalizar(`${credor.nome} ${credor.documento}`)
    return palavras.every((palavra) => alvo.includes(palavra))
  }
}

/** Parte da base em centésimos de ponto percentual, truncado (50,004% não vira 50,01%). */
export function centesimosDe(parte: number, base: number): number {
  if (base <= 0) return 0
  // Em BigInt: centavos × 10.000 passa do inteiro seguro em classes de bilhões.
  return Number((BigInt(parte) * BigInt(10000)) / BigInt(base))
}

/** `33,33%`, truncado; `—` sem base. */
export function percentualDe(parte: number, base: number): string {
  return base > 0 ? `${formatarCentesimos(centesimosDe(parte, base))}%` : '—'
}

// ---------------------------------------------------------------------------------------------
// Formulário (RF-31)

const OBRIGATORIO = 'Campo obrigatório'
const data = z.string().trim().min(1, OBRIGATORIO).refine(ehDataIso, 'Data inválida')

export const schemaFormularioAgc = z
  .object({ dataPrimeira: data, dataSegunda: data, pauta: z.string().trim().min(1, OBRIGATORIO) })
  .refine((dados) => dados.dataSegunda >= dados.dataPrimeira, {
    path: ['dataSegunda'],
    message: 'A 2ª convocação não pode ser antes da 1ª',
  })
export type FormularioAgc = z.infer<typeof schemaFormularioAgc>
