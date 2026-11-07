// Regras das telas de informes (RF-18 a RF-21, SDD §7.11): ordem da lista, anexos (PDF no
// visualizador, o resto baixado, limite de 10 MB) e o formulário, que trabalha com texto e sai
// como os dados do serviço `salvarInforme`.
import { z } from 'zod'
import type { Filtro } from '../../dados/repositorio'
import {
  type Anexo,
  CATEGORIAS_INFORME,
  type CategoriaInforme,
  TAMANHO_MAXIMO_ANEXO,
  type Tipos,
} from '../../dados/schemas'
import type { PedidoSalvarInforme } from '../../dados/servicos/informes'
import { type DataIso, ehDataIso } from '../../regras/datas'
import type { Fase } from '../../regras/fases'

export type Informe = Tipos['informes']
type Processo = Tipos['processos']

/** Mais recente primeiro (RF-20); no mesmo dia, pela ordem dos ids. */
export const ORDEM_INFORMES: Filtro<Informe>['ordem'] = { campo: 'data', direcao: 'desc' }

export const CATEGORIAS = Object.keys(CATEGORIAS_INFORME) as CategoriaInforme[]

export function ehCategoria(valor: string | null): valor is CategoriaInforme {
  return valor !== null && valor in CATEGORIAS_INFORME
}

// ---------------------------------------------------------------------------------------------
// Anexos

export const MENSAGEM_ARQUIVO_GRANDE = 'Arquivo acima de 10 MB.'

/** Recusa o arquivo acima do limite já na escolha (INF-04); `null` quando pode anexar. */
export function erroDoArquivo(arquivo: { size: number }): string | null {
  return arquivo.size > TAMANHO_MAXIMO_ANEXO ? MENSAGEM_ARQUIVO_GRANDE : null
}

/** PDF abre no visualizador; o resto é baixado (RF-21, INF-03, INF-05). */
export function ehPdf(anexo: Anexo): boolean {
  if (anexo.origem === 'local' && anexo.tipo) return anexo.tipo === 'application/pdf'
  const nome = anexo.origem === 'publico' ? anexo.caminho : anexo.nome
  return nome.toLowerCase().endsWith('.pdf')
}

/** `2,0 MB`, `512 KB`, `800 B`. */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

// ---------------------------------------------------------------------------------------------
// Formulário

const OBRIGATORIO = 'Campo obrigatório'

const folha = z
  .string()
  .trim()
  .refine((t) => t === '' || (/^\d+$/.test(t) && Number(t) > 0), 'Número de folha inválido')

export const schemaFormularioInforme = z
  .object({
    processoId: z.string().min(1, 'Selecione o processo'),
    titulo: z.string().trim().min(1, OBRIGATORIO),
    categoria: z.string().refine((valor) => ehCategoria(valor), 'Selecione a categoria'),
    fase: z.string(),
    data: z.string().refine(ehDataIso, 'Informe uma data válida'),
    dataAgc: z.string(),
    folhaInicial: folha,
    folhaFinal: folha,
    publicadoNoSite: z.boolean(),
  })
  .superRefine((valores, ctx) => {
    // "Data da AGC" só existe em Atas de AGC (RF-18); nas outras categorias é ignorada.
    if (valores.categoria === 'atas-agc' && valores.dataAgc && !ehDataIso(valores.dataAgc)) {
      ctx.addIssue({ code: 'custom', message: 'Informe uma data válida', path: ['dataAgc'] })
    }
    const inicial = Number(valores.folhaInicial)
    const final = Number(valores.folhaFinal)
    if (valores.folhaInicial && valores.folhaFinal && final < inicial) {
      ctx.addIssue({
        code: 'custom',
        message: 'A folha final não pode ser antes da inicial',
        path: ['folhaFinal'],
      })
    }
  })

export type ValoresInforme = z.input<typeof schemaFormularioInforme>

export const CAMPOS_FORMULARIO = Object.keys(
  schemaFormularioInforme.shape,
) as (keyof ValoresInforme)[]

/** Valores de um informe novo: fase do processo escolhido (RF-19, INF-01) e data de hoje. */
export function valoresIniciais(processo: Processo | undefined, hoje: DataIso): ValoresInforme {
  return {
    processoId: processo?.id ?? '',
    titulo: '',
    categoria: '',
    fase: processo?.faseAtual ?? '',
    data: hoje,
    dataAgc: '',
    folhaInicial: '',
    folhaFinal: '',
    publicadoNoSite: false,
  }
}

export function valoresDoInforme(informe: Informe): ValoresInforme {
  return {
    processoId: informe.processoId,
    titulo: informe.titulo,
    categoria: informe.categoria,
    fase: informe.fase ?? '',
    data: informe.data,
    dataAgc: informe.dataAgc ?? '',
    folhaInicial: informe.folhaInicial === undefined ? '' : String(informe.folhaInicial),
    folhaFinal: informe.folhaFinal === undefined ? '' : String(informe.folhaFinal),
    publicadoNoSite: informe.publicadoNoSite,
  }
}

/**
 * Valores do formulário → dados do informe. Os opcionais vazios saem como `undefined` explícito,
 * para a edição apagar o que havia (ex.: a data da AGC ao trocar de categoria, INF-02).
 */
export function dadosDoFormulario(valores: ValoresInforme): PedidoSalvarInforme['dados'] {
  const categoria = valores.categoria as CategoriaInforme
  const numero = (texto: string) => (texto.trim() === '' ? undefined : Number(texto))
  return {
    processoId: valores.processoId,
    titulo: valores.titulo.trim(),
    categoria,
    fase: valores.fase === '' ? undefined : (valores.fase as Fase),
    data: valores.data,
    dataAgc: categoria === 'atas-agc' && valores.dataAgc !== '' ? valores.dataAgc : undefined,
    folhaInicial: numero(valores.folhaInicial),
    folhaFinal: numero(valores.folhaFinal),
    publicadoNoSite: valores.publicadoNoSite,
  }
}
