// Os PDFs genéricos da demo (RF-21, T-16): gerados por scripts/gerar-pdfs.ts, commitados em
// public/anexos/ e reaproveitados pelos informes do seed (anexo `{ origem: 'publico' }`, SDD §5.4).
import type { CategoriaInforme } from '../../src/dados/schemas'

export const TARJA = 'DOCUMENTO FICTÍCIO · DEMONSTRAÇÃO'

export interface PdfGenerico {
  /** Nome do arquivo em public/anexos/. */
  arquivo: string
  /** Nome exibido no informe. */
  nome: string
  titulo: string
  /** Parágrafos do corpo, genéricos de propósito: o conteúdo real fica nos dados do informe. */
  paragrafos: readonly string[]
}

const AVISO =
  'Este arquivo é um modelo genérico da demonstração do Judisys. Os nomes, números e valores ' +
  'mostrados no painel são fictícios e não correspondem a pessoas, empresas ou processos reais.'

export const PDFS = {
  edital: {
    arquivo: 'edital.pdf',
    nome: 'Edital.pdf',
    titulo: 'Edital',
    paragrafos: [
      'Edital de convocação e aviso aos credores, nos termos da Lei 11.101/2005.',
      'Prazo para habilitações e divergências: 15 dias da publicação (art. 7º, §1º).',
      AVISO,
    ],
  },
  relacaoCredores: {
    arquivo: 'relacao-credores.pdf',
    nome: 'Relação de credores.pdf',
    titulo: 'Relação de credores',
    paragrafos: [
      'Relação nominal de credores, com a classificação e o valor de cada crédito.',
      'Impugnações no prazo de 10 dias da publicação (art. 8º).',
      AVISO,
    ],
  },
  rma: {
    arquivo: 'rma.pdf',
    nome: 'Relatório mensal de atividades.pdf',
    titulo: 'Relatório mensal de atividades (RMA)',
    paragrafos: [
      'Relatório mensal das atividades da devedora, apresentado pela administração judicial ' +
        '(art. 22, II, "c").',
      'Resumo de faturamento, fluxo de caixa, quadro de funcionários e cumprimento do plano.',
      AVISO,
    ],
  },
  prj: {
    arquivo: 'prj.pdf',
    nome: 'Plano de recuperação judicial.pdf',
    titulo: 'Plano de recuperação judicial',
    paragrafos: [
      'Plano de recuperação judicial apresentado pela devedora (art. 53).',
      'Meios de recuperação, laudo econômico-financeiro e condições de pagamento por classe.',
      AVISO,
    ],
  },
  ataAgc: {
    arquivo: 'ata-agc.pdf',
    nome: 'Ata da AGC.pdf',
    titulo: 'Ata da assembleia geral de credores',
    paragrafos: [
      'Ata da assembleia geral de credores: instalação, presenças, votação e resultado.',
      'O resultado registrado na demo aparece no resumo do informe, acima deste arquivo.',
      AVISO,
    ],
  },
  parecer: {
    arquivo: 'parecer.pdf',
    nome: 'Parecer da administração judicial.pdf',
    titulo: 'Parecer da administração judicial',
    paragrafos: [
      'Manifestação da administração judicial nos autos, com análise e recomendação ao juízo.',
      AVISO,
    ],
  },
  laudo: {
    arquivo: 'laudo.pdf',
    nome: 'Laudo de avaliação.pdf',
    titulo: 'Laudo de avaliação',
    paragrafos: [
      'Laudo de avaliação de bens e ativos, com a metodologia e os valores apurados.',
      AVISO,
    ],
  },
  nota: {
    arquivo: 'nota.pdf',
    nome: 'Nota relevante.pdf',
    titulo: 'Nota relevante',
    paragrafos: [
      'Comunicado da administração judicial aos credores e interessados sobre fato relevante ' +
        'do processo.',
      AVISO,
    ],
  },
} as const satisfies Record<string, PdfGenerico>

export type ChavePdf = keyof typeof PDFS

/** Caminho público do anexo (relativo à base do site). */
export function caminhoDoPdf(chave: ChavePdf): string {
  return `anexos/${PDFS[chave].arquivo}`
}

/** PDF padrão de cada categoria de informe. */
export const PDF_DA_CATEGORIA: Record<CategoriaInforme, ChavePdf> = {
  'atas-agc': 'ataAgc',
  editais: 'edital',
  'notas-relevantes': 'nota',
  'outros-documentos': 'parecer',
  prj: 'prj',
  relatorios: 'rma',
  'relacao-credores': 'relacaoCredores',
}
