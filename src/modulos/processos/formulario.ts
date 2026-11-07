// Schema e conversões do formulário de processo (RF-12, T-04, PRC-14). O formulário trabalha com
// texto (valores em reais com vírgula, CNJ com máscara); a saída é o registro em centavos e dígitos.
import { z } from 'zod'
import { camposProcesso, type Tipos } from '../../dados/schemas'
import type { DadosProcesso } from '../../dados/servicos/processos'
import { ehDataIso, formatarCentavos } from '../../regras/datas'
import { formatarCnj } from '../../regras/documentos'

/**
 * Texto em reais → centavos, sem ponto flutuante (INV-03). Aceita `1.234,56`, `1234,5`, `1234` e
 * `R$ 1.234,56`. Vazio ou inválido → `null`.
 */
export function lerCentavos(texto: string): number | null {
  const limpo = texto.replace(/^R\$/, '').replace(/\s/g, '')
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(limpo)) return null
  const [reais = '0', centavos = ''] = limpo.replaceAll('.', '').split(',')
  return Number(reais) * 100 + Number(centavos.padEnd(2, '0'))
}

/** Percentual com vírgula (`2,5`) entre 0 e 100. Vazio ou inválido → `null`. */
export function lerPercentual(texto: string): number | null {
  const limpo = texto.replace(/\s|%/g, '')
  if (!/^\d{1,3}(,\d{1,2})?$/.test(limpo)) return null
  const valor = Number(limpo.replace(',', '.'))
  return valor <= 100 ? valor : null
}

/** Percentual gravado → texto com vírgula (`2.5` → `2,5`). */
export function formatarPercentual(valor: number): string {
  return String(valor).replace('.', ',')
}

const moedaObrigatoria = z
  .string()
  .trim()
  .min(1, 'Campo obrigatório')
  .refine((t) => lerCentavos(t) !== null, 'Valor inválido. Use o formato 1.234,56.')

const moedaOpcional = z
  .string()
  .trim()
  .refine((t) => t === '' || lerCentavos(t) !== null, 'Valor inválido. Use o formato 1.234,56.')

const percentualOpcional = z
  .string()
  .trim()
  .refine((t) => t === '' || lerPercentual(t) !== null, 'Percentual entre 0 e 100, ex.: 2,5.')

/** Campos do formulário. O CNJ, a UF e o e-mail usam os refinamentos do schema da coleção. */
export const schemaFormularioProcesso = camposProcesso
  .pick({
    apelido: true,
    numeroCnj: true,
    tipo: true,
    comarca: true,
    uf: true,
    vara: true,
    email: true,
    consolidacao: true,
  })
  .extend({
    responsavelId: z.string().min(1, 'Selecione o responsável'),
    /** Só na criação: data do pedido (RJ) ou da decretação (falência). */
    dataInicio: z.string(),
    passivoDeclarado: moedaObrigatoria,
    honorariosPercentual: percentualOpcional,
    honorariosValor: moedaOpcional,
    empresaIds: z.array(z.string()).min(1, 'Selecione ao menos uma empresa'),
  })

export type EntradaFormulario = z.input<typeof schemaFormularioProcesso>
export type SaidaFormulario = z.output<typeof schemaFormularioProcesso>

/** Na criação, a data do primeiro marco é obrigatória. */
export const schemaFormularioNovoProcesso = schemaFormularioProcesso.refine(
  (valores) => ehDataIso(valores.dataInicio),
  { message: 'Informe uma data válida', path: ['dataInicio'] },
)

/**
 * Saída validada → campos do processo, em centavos e dígitos. Na edição, passe o `original`:
 * honorário vazio que já era ausente continua ausente, para salvar sem mudar nada não gerar log
 * (LOG-02).
 */
export function paraDadosProcesso(
  valores: SaidaFormulario,
  original?: Pick<Tipos['processos'], 'honorariosPercentual' | 'honorariosValor'>,
): DadosProcesso {
  const opcional = (valor: number | null, antes: number | null | undefined) =>
    valor === null && antes == null ? antes : valor
  return {
    apelido: valores.apelido,
    numeroCnj: valores.numeroCnj,
    tipo: valores.tipo,
    comarca: valores.comarca,
    uf: valores.uf,
    vara: valores.vara,
    email: valores.email,
    consolidacao: valores.consolidacao,
    responsavelId: valores.responsavelId,
    passivoDeclarado: lerCentavos(valores.passivoDeclarado) ?? 0,
    honorariosPercentual: opcional(
      lerPercentual(valores.honorariosPercentual),
      original ? original.honorariosPercentual : null,
    ),
    honorariosValor: opcional(
      lerCentavos(valores.honorariosValor),
      original ? original.honorariosValor : null,
    ),
  }
}

/** Valores iniciais para editar um processo gravado. */
export function paraFormulario(
  processo: Tipos['processos'],
  empresaIds: string[],
): EntradaFormulario {
  return {
    apelido: processo.apelido,
    numeroCnj: formatarCnj(processo.numeroCnj),
    tipo: processo.tipo,
    comarca: processo.comarca,
    uf: processo.uf,
    vara: processo.vara,
    email: processo.email,
    consolidacao: processo.consolidacao,
    responsavelId: processo.responsavelId,
    dataInicio: '',
    passivoDeclarado: formatarCentavos(processo.passivoDeclarado),
    honorariosPercentual:
      processo.honorariosPercentual == null
        ? ''
        : formatarPercentual(processo.honorariosPercentual),
    honorariosValor:
      processo.honorariosValor == null ? '' : formatarCentavos(processo.honorariosValor),
    empresaIds,
  }
}
