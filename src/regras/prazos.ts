// Prazos automáticos por marco de fase (RF-22 com C-02 a C-06, T-28), RMA e situação visual (RF-24).
// Funções puras: datas e "hoje" vêm por parâmetro.
import { type DataIso, diasEntre, somarAnos, somarDias, somarMeses } from './datas'
import type { Fase, TipoProcesso } from './fases'

/** O que as regras de prazo precisam do processo (campos do PRD §6). */
export interface ProcessoParaPrazos {
  id: string
  tipo: TipoProcesso
}

/** Marco de fase; `id` presente quando o marco já tem identificador (vira `marcoId` do prazo). */
export interface MarcoParaPrazos {
  id?: string
  fase: Fase
  data: DataIso
}

/** Prazo novo, sem os campos de `Registro`: o repositório os preenche. */
export interface NovoPrazoAutomatico {
  processoId: string
  titulo: string
  baseLegal: string
  vencimento: DataIso
  origem: 'automatico'
  status: 'aberto'
  marcoId?: string
}

interface RegraDePrazo {
  titulo: string
  baseLegal: string
  vencimento: (dataDoMarco: DataIso) => DataIso
}

export const TITULO_RMA = 'Relatório mensal de atividades (RMA)'
export const BASE_LEGAL_RMA = 'art. 22, II, "c"'
export const TITULO_OBJECOES = 'Objeções ao plano'
export const BASE_LEGAL_OBJECOES = 'art. 55'
const DIAS_OBJECOES = 30

/** Dia do mês em que o RMA vence (RF-22: padrão da demo, sem campo configurável). */
export const DIA_DO_RMA = 15

/**
 * Tabela do RF-22 corrigida por C-02 e C-03. Ficam de fora o RMA (data própria) e as objeções
 * (dependem de dois marcos, C-04), tratados em `prazosDoMarco`.
 */
const TABELA: Readonly<Record<TipoProcesso, Partial<Record<Fase, readonly RegraDePrazo[]>>>> = {
  rj: {
    'processamento-deferido': [
      // Prorrogável uma vez por igual período editando o vencimento (C-05).
      { titulo: 'Stay period', baseLegal: 'art. 6º, §4º', vencimento: (d) => somarDias(d, 180) },
      {
        titulo: 'Apresentação do plano',
        baseLegal: 'art. 53',
        vencimento: (d) => somarDias(d, 60),
      },
      {
        titulo: 'Realização da AGC',
        baseLegal: 'art. 56, §1º',
        vencimento: (d) => somarDias(d, 150),
      },
    ],
    'edital-publicado': [
      {
        titulo: 'Habilitações e divergências',
        baseLegal: 'art. 7º, §1º',
        vencimento: (d) => somarDias(d, 15),
      },
      // 45 dias contados do fim dos 15 das habilitações (F-05).
      { titulo: 'Relação do AJ', baseLegal: 'art. 7º, §2º', vencimento: (d) => somarDias(d, 60) },
    ],
    'relacao-aj-publicada': [
      { titulo: 'Impugnações', baseLegal: 'art. 8º', vencimento: (d) => somarDias(d, 10) },
    ],
    'plano-homologado': [
      // C-03: contado da concessão da RJ.
      {
        titulo: 'Fim do prazo de supervisão judicial',
        baseLegal: 'art. 61',
        vencimento: (d) => somarAnos(d, 2),
      },
    ],
  },
  falencia: {
    // C-02 (a) e C-06: o marco "Decretada" aproxima o termo de nomeação/compromisso do AJ.
    decretada: [
      { titulo: 'Habilitações', baseLegal: 'art. 7º, §1º', vencimento: (d) => somarDias(d, 15) },
      {
        titulo: 'Relatório do AJ',
        baseLegal: 'art. 22, III, "e"',
        vencimento: (d) => somarDias(d, 40),
      },
      {
        titulo: 'Plano detalhado de realização dos ativos',
        baseLegal: 'art. 99, §3º',
        vencimento: (d) => somarDias(d, 60),
      },
    ],
    // C-02 (b).
    arrecadacao: [
      {
        titulo: 'Realização dos ativos',
        baseLegal: 'art. 99, §3º',
        vencimento: (d) => somarDias(d, 180),
      },
    ],
  },
}

/**
 * Prazos automáticos que o `marco` cria (RF-22, RF-15). `marcos` são os marcos do processo (com
 * ou sem o próprio `marco`); só servem para as objeções. Marcos pulados não geram nada (T-28):
 * cada marco cria apenas os prazos da sua própria fase.
 */
export function prazosDoMarco(
  processo: ProcessoParaPrazos,
  marco: MarcoParaPrazos,
  marcos: readonly MarcoParaPrazos[],
): NovoPrazoAutomatico[] {
  const novo = (titulo: string, baseLegal: string, vencimento: DataIso) =>
    prazoAutomatico(processo.id, titulo, baseLegal, vencimento, marco.id)

  const prazos = (TABELA[processo.tipo][marco.fase] ?? []).map((regra) =>
    novo(regra.titulo, regra.baseLegal, regra.vencimento(marco.data)),
  )

  if (processo.tipo === 'rj') {
    if (marco.fase === 'processamento-deferido') {
      prazos.push(novoRma(processo.id, marco.data, marco.id))
    }
    const baseObjecoes = baseDasObjecoes(marco, marcos)
    if (baseObjecoes !== null) {
      prazos.push(
        novo(TITULO_OBJECOES, BASE_LEGAL_OBJECOES, somarDias(baseObjecoes, DIAS_OBJECOES)),
      )
    }
  }
  return prazos
}

/**
 * Data-base das objeções criadas por este marco, ou `null` se ele não as cria (C-04: a data
 * posterior entre "Plano apresentado" e "Relação do AJ publicada").
 * - "Plano apresentado" cria sempre, contado do posterior entre ele e a relação, se houver.
 * - "Relação do AJ publicada" cria só se o plano já foi apresentado até a data dela (PRC-04);
 *   sem plano não há o que objetar.
 */
function baseDasObjecoes(
  marco: MarcoParaPrazos,
  marcos: readonly MarcoParaPrazos[],
): DataIso | null {
  if (marco.fase === 'plano-apresentado') {
    const relacao = ultimoMarcoDaFase(marcos, 'relacao-aj-publicada')
    return relacao !== undefined && relacao.data > marco.data ? relacao.data : marco.data
  }
  if (marco.fase === 'relacao-aj-publicada') {
    const plano = ultimoMarcoDaFase(marcos, 'plano-apresentado')
    return plano !== undefined && plano.data <= marco.data ? marco.data : null
  }
  return null
}

// A fase procurada é sempre a outra, então o próprio marco nunca entra, esteja ou não em `marcos`.
function ultimoMarcoDaFase(
  marcos: readonly MarcoParaPrazos[],
  fase: Fase,
): MarcoParaPrazos | undefined {
  return marcos
    .filter((m) => m.fase === fase)
    .reduce<MarcoParaPrazos | undefined>(
      (ultimo, m) => (ultimo === undefined || m.data > ultimo.data ? m : ultimo),
      undefined,
    )
}

function prazoAutomatico(
  processoId: string,
  titulo: string,
  baseLegal: string,
  vencimento: DataIso,
  marcoId: string | undefined,
): NovoPrazoAutomatico {
  return {
    processoId,
    titulo,
    baseLegal,
    vencimento,
    origem: 'automatico',
    status: 'aberto',
    ...(marcoId === undefined ? {} : { marcoId }),
  }
}

/**
 * Vencimento do RMA: o próximo dia 15 **estritamente depois** de `dataReferencia` (PRZ-05). Serve
 * ao marco "Processamento deferido" e ao RMA seguinte, criado ao cumprir o atual (PRZ-01/02).
 */
export function proximoRma(dataReferencia: DataIso): DataIso {
  const diaDoMes = `${dataReferencia.slice(0, 8)}${String(DIA_DO_RMA).padStart(2, '0')}`
  return dataReferencia < diaDoMes ? diaDoMes : somarMeses(diaDoMes, 1)
}

/**
 * RMA aberto que vence no próximo dia 15 depois de `dataReferencia`. Para o RMA seguinte ao
 * cumprido, passe o vencimento do cumprido; quem chama decide se o processo ainda gera RMA (INV-05).
 */
export function novoRma(
  processoId: string,
  dataReferencia: DataIso,
  marcoId?: string,
): NovoPrazoAutomatico {
  return prazoAutomatico(
    processoId,
    TITULO_RMA,
    BASE_LEGAL_RMA,
    proximoRma(dataReferencia),
    marcoId,
  )
}

export type SituacaoPrazo = 'cumprido' | 'vencido' | 'urgente' | 'normal'

/** Vence em até tantos dias (inclusive, contando hoje como 0) → dourado (RF-24). */
export const DIAS_URGENTE = 3

/**
 * Situação visual do prazo (RF-24, PRZ-06/07): cumprido não tem destaque, mesmo vencido; aberto
 * antes de hoje é vencido; de hoje até `DIAS_URGENTE` dias é urgente.
 */
export function situacao(
  prazo: { status: 'aberto' | 'cumprido'; vencimento: DataIso },
  hoje: DataIso,
): SituacaoPrazo {
  if (prazo.status === 'cumprido') return 'cumprido'
  const dias = diasEntre(hoje, prazo.vencimento)
  if (dias < 0) return 'vencido'
  return dias <= DIAS_URGENTE ? 'urgente' : 'normal'
}
