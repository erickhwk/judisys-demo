// Schemas dos formulários de credor e de pedido de crédito (T-04): os campos chegam como texto e
// saem como os dados do repositório, com valores em centavos (INV-03) e CPF/CNPJ validado pelo
// dígito verificador (RF-28, CRD-16). O schema da coleção (dados/schemas.ts) valida de novo ao
// gravar; aqui o erro aparece no campo antes disso.
import { z } from 'zod'
import type { Novo, Tipos } from '../../dados/schemas'
import { ehDataIso } from '../../regras/datas'
import { somenteDigitos, validarCnpj, validarCpf } from '../../regras/documentos'
import type { TipoProcesso } from '../../regras/fases'
import { lerMoeda } from '../../regras/moeda'
import { CLASSES_FALENCIA, CLASSES_RJ, type Classe } from '../../regras/qgc'

type Credor = Tipos['credores']
type Pedido = Tipos['pedidosDeCredito']

export const MENSAGEM_DOCUMENTO_INVALIDO = 'CPF ou CNPJ inválido'
export const MENSAGEM_VALOR_INVALIDO = 'Valor inválido (ex.: 1.234,56)'
const OBRIGATORIO = 'Campo obrigatório'

/** Classes que o processo admite (RF-26, C-01). */
export function classesDoTipo(tipo: TipoProcesso): readonly Classe[] {
  return tipo === 'rj' ? CLASSES_RJ : CLASSES_FALENCIA
}

const texto = z.string().trim().min(1, OBRIGATORIO)

const documento = z
  .string()
  .trim()
  .min(1, OBRIGATORIO)
  .refine((valor) => validarCpf(valor) || validarCnpj(valor), MENSAGEM_DOCUMENTO_INVALIDO)
  .transform(somenteDigitos)

/** Valor em reais opcional: vazio → `null`. */
const valorOpcional = z.string().transform((entrada, ctx): number | null => {
  const centavos = lerMoeda(entrada)
  if (centavos !== undefined) return centavos
  ctx.issues.push({ code: 'custom', message: MENSAGEM_VALOR_INVALIDO, input: entrada })
  return z.NEVER
})

/** Valor em reais obrigatório (pode ser zero). */
const valorObrigatorio = z.string().transform((entrada, ctx): number => {
  const centavos = lerMoeda(entrada)
  if (centavos !== undefined && centavos !== null) return centavos
  const message = centavos === null ? OBRIGATORIO : MENSAGEM_VALOR_INVALIDO
  ctx.issues.push({ code: 'custom', message, input: entrada })
  return z.NEVER
})

function classeDoTipo(tipo: TipoProcesso) {
  return z.enum(classesDoTipo(tipo) as [Classe, ...Classe[]], 'Escolha a classe')
}

// ---------------------------------------------------------------------------------------------
// Credor

export function schemaFormularioCredor(tipo: TipoProcesso) {
  return z.object({
    nome: texto,
    documento,
    classe: classeDoTipo(tipo),
    natureza: z.string().trim(),
    valorDevedor: valorObrigatorio,
    valorAj: valorOpcional,
    valorQgc: valorOpcional,
  })
}

export type EntradaCredor = z.input<ReturnType<typeof schemaFormularioCredor>>
export type SaidaCredor = z.output<ReturnType<typeof schemaFormularioCredor>>

export function credorDoFormulario(processoId: string, saida: SaidaCredor): Novo<Credor> {
  return { processoId, ...saida }
}

// ---------------------------------------------------------------------------------------------
// Pedido de crédito

/** `comRequerente`: pedido de quem não está na lista (nome e CPF/CNPJ obrigatórios, RF-29). */
export function schemaFormularioPedido(
  tipo: TipoProcesso,
  tipos: readonly Pedido['tipo'][],
  comRequerente: boolean,
) {
  return z.object({
    tipo: z.enum(tipos as [Pedido['tipo'], ...Pedido['tipo'][]], 'Escolha o tipo'),
    valorPedido: valorObrigatorio,
    classePedida: classeDoTipo(tipo),
    data: z.string().refine(ehDataIso, 'Data inválida'),
    requerenteNome: comRequerente ? texto : z.string(),
    requerenteDocumento: comRequerente ? documento : z.string(),
  })
}

export type EntradaPedido = z.input<ReturnType<typeof schemaFormularioPedido>>
export type SaidaPedido = z.output<ReturnType<typeof schemaFormularioPedido>>
