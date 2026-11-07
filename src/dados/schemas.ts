// Tipos e schemas zod de cada coleção (T-04, PRD §6 com as mudanças do SDD §5.4 e T-30).
// Os schemas validam cada gravação no repositório, o seed ao carregar e os formulários.
// CPF, CNPJ e CNJ são refinamentos que chamam regras/documentos.ts e ficam gravados só com
// dígitos; a formatação é das telas e do CSV.
//
// Para os formulários: `camposX` é o objeto sem refinamentos entre campos (aceita `.omit`,
// `.pick`, `.partial`); `schemaX` é o registro completo, com eles.
import { z } from 'zod'
import { ehDataIso } from '../regras/datas'
import { somenteDigitos, validarCnj, validarCnpj, validarCpf } from '../regras/documentos'
import { PAPEIS } from '../regras/permissoes'
import { TABELAS, type Tabela } from './armazenamento'

z.config(z.locales.pt())

// TEMPORÁRIO (lote 3): trocar por import de regras/fases.ts e regras/qgc.ts
const FASES_RJ = [
  'pedido',
  'processamento-deferido',
  'edital-publicado',
  'relacao-aj-publicada',
  'plano-apresentado',
  'prazo-objecoes',
  'agc',
  'plano-homologado',
  'fiscalizacao',
  'encerrada',
] as const
const FASES_FINAIS_ALTERNATIVAS_RJ = ['convolada-falencia', 'desistencia'] as const
const FASES_FALENCIA = [
  'decretada',
  'arrecadacao',
  'quadro-credores',
  'realizacao-ativo',
  'pagamentos',
  'prestacao-contas',
  'encerrada',
] as const
const CLASSES_RJ = [
  'trabalhista',
  'garantia-real',
  'quirografario',
  'me-epp',
  'nao-sujeito',
] as const
const CLASSES_FALENCIA = [
  'trabalhista',
  'garantia-real',
  'tributario',
  'quirografario',
  'multas',
  'subordinados',
  'juros',
  'extraconcursal',
] as const
// fim do bloco TEMPORÁRIO

// ---------------------------------------------------------------------------------------------
// Peças comuns

const FASES_POR_TIPO = {
  rj: [...FASES_RJ, ...FASES_FINAIS_ALTERNATIVAS_RJ] as readonly string[],
  falencia: FASES_FALENCIA as readonly string[],
}

/** Tamanho máximo de um anexo enviado pelo visitante (RF-21, INF-04). */
export const TAMANHO_MAXIMO_ANEXO = 10 * 1024 * 1024

/** Categorias de informe do `mcaa-app` (RF-18). */
export const CATEGORIAS_INFORME = {
  'atas-agc': 'Atas de AGC',
  editais: 'Editais',
  'notas-relevantes': 'Notas Relevantes',
  'outros-documentos': 'Outros Documentos',
  prj: 'PRJ',
  relatorios: 'Relatórios',
  'relacao-credores': 'Relação de Credores',
} as const
export type CategoriaInforme = keyof typeof CATEGORIAS_INFORME
const CATEGORIAS = Object.keys(CATEGORIAS_INFORME) as [CategoriaInforme, ...CategoriaInforme[]]

const FORMATO_CARIMBO = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/

const id = z.string().trim().min(1, 'Campo obrigatório')
const texto = z.string().trim().min(1, 'Campo obrigatório')
const textoOpcional = z.string().trim()
const centavos = z.number().int('Valor em centavos deve ser inteiro').nonnegative()
const uf = z.string().regex(/^[A-Z]{2}$/, 'UF inválida')

const dataIso = z.string().refine(ehDataIso, 'Data inválida')
const carimbo = z.string().refine((valor) => {
  const partes = FORMATO_CARIMBO.exec(valor)
  return partes !== null && ehDataIso(partes[1] ?? '')
}, 'Data e hora inválidas')

const cpfOuCnpj = z
  .string()
  .refine((valor) => validarCpf(valor) || validarCnpj(valor), 'CPF ou CNPJ inválido')
  .transform(somenteDigitos)
const cnpj = z.string().refine(validarCnpj, 'CNPJ inválido').transform(somenteDigitos)
const numeroCnj = z.string().refine(validarCnj, 'Número CNJ inválido').transform(somenteDigitos)

// Repetições ('encerrada', 'trabalhista'...) não atrapalham o enum.
const fase = z.enum([...FASES_RJ, ...FASES_FINAIS_ALTERNATIVAS_RJ, ...FASES_FALENCIA])
const classe = z.enum([...CLASSES_RJ, ...CLASSES_FALENCIA])

/** Campos que o repositório preenche em todo registro (SDD §5.3). */
export const schemaRegistro = z.object({
  id,
  escritorioId: id,
  criadoEm: carimbo,
  atualizadoEm: carimbo,
})
export type Registro = z.output<typeof schemaRegistro>
export const CAMPOS_REGISTRO = ['id', 'escritorioId', 'criadoEm', 'atualizadoEm'] as const

/** O que quem cria informa: o registro sem os quatro campos do repositório. */
export type Novo<T> = Omit<T, keyof Registro>

function problema(ctx: z.core.ParsePayload<unknown>, caminho: string, mensagem: string): void {
  ctx.issues.push({ code: 'custom', message: mensagem, path: [caminho], input: ctx.value })
}

// ---------------------------------------------------------------------------------------------
// Coleções

export const camposEscritorio = z.object({ nome: texto })
export const schemaEscritorio = schemaRegistro.extend(camposEscritorio.shape)
export type Escritorio = z.output<typeof schemaEscritorio>

export const camposUsuario = z.object({
  nome: texto,
  email: z.email('E-mail inválido'),
  papel: z.enum(PAPEIS),
})
export const schemaUsuario = schemaRegistro.extend(camposUsuario.shape)
export type Usuario = z.output<typeof schemaUsuario>

export const camposEmpresa = z.object({
  razaoSocial: texto,
  nomeFantasia: textoOpcional,
  cnpj,
  porte: z.enum(['me', 'epp', 'demais']),
  cidade: texto,
  uf,
  cnae: textoOpcional,
})
export const schemaEmpresa = schemaRegistro.extend(camposEmpresa.shape)
export type Empresa = z.output<typeof schemaEmpresa>

export const camposProcesso = z.object({
  apelido: texto,
  numeroCnj,
  tipo: z.enum(['rj', 'falencia']),
  comarca: texto,
  uf,
  vara: texto,
  email: z.union([z.email('E-mail inválido'), z.literal('')]),
  consolidacao: z.enum(['nenhuma', 'processual', 'substancial']),
  passivoDeclarado: centavos,
  responsavelId: id,
  honorariosPercentual: z.number().min(0).max(100).nullable().optional(),
  honorariosValor: centavos.nullable().optional(),
  faseAtual: fase,
})
export const schemaProcesso = schemaRegistro.extend(camposProcesso.shape).check((ctx) => {
  if (!FASES_POR_TIPO[ctx.value.tipo].includes(ctx.value.faseAtual)) {
    problema(ctx, 'faseAtual', 'Fase não pertence a este tipo de processo')
  }
})
export type Processo = z.output<typeof schemaProcesso>

/** Vínculo processo × empresa (substitui `empresaIds[]` do PRD §6; SDD §5.4). */
export const camposProcessoEmpresa = z.object({ processoId: id, empresaId: id })
export const schemaProcessoEmpresa = schemaRegistro.extend(camposProcessoEmpresa.shape)
export type ProcessoEmpresa = z.output<typeof schemaProcessoEmpresa>

export const camposMarcoDeFase = z.object({ processoId: id, fase, data: dataIso })
export const schemaMarcoDeFase = schemaRegistro.extend(camposMarcoDeFase.shape)
export type MarcoDeFase = z.output<typeof schemaMarcoDeFase>

export const camposPrazo = z.object({
  processoId: id,
  titulo: texto,
  baseLegal: textoOpcional.optional(),
  vencimento: dataIso,
  origem: z.enum(['automatico', 'manual']),
  status: z.enum(['aberto', 'cumprido']),
  marcoId: id.optional(),
})
export const schemaPrazo = schemaRegistro.extend(camposPrazo.shape)
export type Prazo = z.output<typeof schemaPrazo>

export const camposCredor = z.object({
  processoId: id,
  nome: texto,
  documento: cpfOuCnpj,
  classe,
  natureza: textoOpcional,
  valorDevedor: centavos,
  valorAj: centavos.nullable().optional(),
  valorQgc: centavos.nullable().optional(),
})
export const schemaCredor = schemaRegistro.extend(camposCredor.shape)
export type Credor = z.output<typeof schemaCredor>

export const camposPedidoDeCredito = z.object({
  processoId: id,
  /** Vazio quando o requerente não está na lista; aí vale `requerente` (RF-29). */
  credorId: id.optional(),
  requerente: z.object({ nome: texto, documento: cpfOuCnpj }).optional(),
  tipo: z.enum(['habilitacao', 'divergencia', 'impugnacao']),
  valorPedido: centavos,
  classePedida: classe,
  status: z.enum(['pendente', 'acolhido', 'rejeitado']),
  data: dataIso,
})
export const schemaPedidoDeCredito = schemaRegistro
  .extend(camposPedidoDeCredito.shape)
  .check((ctx) => {
    if (!ctx.value.credorId && !ctx.value.requerente) {
      problema(ctx, 'requerente', 'Informe o credor ou o nome e o CPF/CNPJ do requerente')
    }
  })
export type PedidoDeCredito = z.output<typeof schemaPedidoDeCredito>

export const camposAgc = z.object({
  processoId: id,
  dataPrimeira: dataIso,
  dataSegunda: dataIso,
  pauta: texto,
  status: z.enum(['agendada', 'instalada', 'encerrada']),
  convocacaoInstalada: z.literal([1, 2]).optional(),
})
export const schemaAgc = schemaRegistro.extend(camposAgc.shape).check((ctx) => {
  if (ctx.value.dataSegunda < ctx.value.dataPrimeira) {
    problema(ctx, 'dataSegunda', 'A 2ª convocação não pode ser antes da 1ª')
  }
})
export type Agc = z.output<typeof schemaAgc>

export const camposPresenca = z.object({ agcId: id, credorId: id })
export const schemaPresenca = schemaRegistro.extend(camposPresenca.shape)
export type Presenca = z.output<typeof schemaPresenca>

export const camposVoto = z.object({
  agcId: id,
  credorId: id,
  voto: z.enum(['sim', 'nao', 'abstencao']),
})
export const schemaVoto = schemaRegistro.extend(camposVoto.shape)
export type Voto = z.output<typeof schemaVoto>

/** Anexo de informe: PDF genérico do site (seed) ou upload guardado em `arquivos` (SDD §5.4). */
export const schemaAnexo = z.discriminatedUnion('origem', [
  z.object({
    origem: z.literal('publico'),
    caminho: z.string().regex(/^anexos\/[\w.-]+$/, 'Caminho de anexo inválido'),
    nome: texto,
  }),
  z.object({
    origem: z.literal('local'),
    arquivoId: id,
    nome: texto,
    tipo: textoOpcional,
    tamanho: z.number().int().nonnegative().max(TAMANHO_MAXIMO_ANEXO, 'Arquivo acima de 10 MB.'),
  }),
])
export type Anexo = z.output<typeof schemaAnexo>

export const camposInforme = z.object({
  processoId: id,
  titulo: texto,
  categoria: z.enum(CATEGORIAS),
  fase: fase.optional(),
  folhaInicial: z.number().int().positive().optional(),
  folhaFinal: z.number().int().positive().optional(),
  /** Só em "Atas de AGC" (RF-18). */
  dataAgc: dataIso.optional(),
  publicadoNoSite: z.boolean(),
  data: dataIso,
  anexos: z.array(schemaAnexo),
  /** Resumo estruturado da ata (T-30). */
  resumo: textoOpcional.optional(),
})
export const schemaInforme = schemaRegistro.extend(camposInforme.shape).check((ctx) => {
  const { categoria, dataAgc, folhaInicial, folhaFinal } = ctx.value
  if (dataAgc !== undefined && categoria !== 'atas-agc') {
    problema(ctx, 'dataAgc', 'Data da AGC só vale para Atas de AGC')
  }
  if (folhaInicial !== undefined && folhaFinal !== undefined && folhaFinal < folhaInicial) {
    problema(ctx, 'folhaFinal', 'A folha final não pode ser antes da inicial')
  }
})
export type Informe = z.output<typeof schemaInforme>

/** Conteúdo de um anexo enviado pelo visitante (tabela `arquivos`). */
export const camposArquivo = z.object({
  nome: texto,
  tipo: textoOpcional,
  tamanho: z.number().int().nonnegative().max(TAMANHO_MAXIMO_ANEXO, 'Arquivo acima de 10 MB.'),
  conteudo: z.instanceof(Blob),
})
export const schemaArquivo = schemaRegistro.extend(camposArquivo.shape)
export type Arquivo = z.output<typeof schemaArquivo>

export const schemaMudanca = z.object({
  campo: texto,
  de: z.unknown(),
  para: z.unknown(),
})

export const camposLog = z.object({
  usuarioId: id,
  acao: z.enum(['criou', 'editou', 'excluiu']),
  colecao: z.enum(TABELAS as [Tabela, ...Tabela[]]),
  registroId: id,
  processoId: id.optional(),
  mudancas: z.array(schemaMudanca),
  data: carimbo,
})
export const schemaLog = schemaRegistro.extend(camposLog.shape)
export type Log = z.output<typeof schemaLog>

// ---------------------------------------------------------------------------------------------
// Mapa tabela → schema e tipo

export const SCHEMAS = {
  escritorios: schemaEscritorio,
  usuarios: schemaUsuario,
  empresas: schemaEmpresa,
  processos: schemaProcesso,
  processoEmpresas: schemaProcessoEmpresa,
  marcosDeFase: schemaMarcoDeFase,
  prazos: schemaPrazo,
  credores: schemaCredor,
  pedidosDeCredito: schemaPedidoDeCredito,
  agcs: schemaAgc,
  presencas: schemaPresenca,
  votos: schemaVoto,
  informes: schemaInforme,
  arquivos: schemaArquivo,
  logs: schemaLog,
} satisfies Record<Tabela, z.ZodType>

export type Tipos = { [K in Tabela]: z.output<(typeof SCHEMAS)[K]> }
