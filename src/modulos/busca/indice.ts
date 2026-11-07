// Índice da busca global (RF-38, T-14): processos, empresas e credores com os textos de busca já
// normalizados. Função pura; quem monta é `useIndiceBusca`, que o refaz depois de cada gravação.
import type { Credor, Empresa, Processo } from '../../dados/schemas'
import { formatarCnj, formatarCnpj, formatarDocumento } from '../../regras/documentos'
import { normalizar } from '../../regras/normalizar'

export const TIPOS_RESULTADO = ['processos', 'empresas', 'credores'] as const
export type TipoResultado = (typeof TIPOS_RESULTADO)[number]

export const ROTULOS_GRUPO: Record<TipoResultado, string> = {
  processos: 'Processos',
  empresas: 'Empresas',
  credores: 'Credores',
}

/** Resultados por grupo (RF-38). */
export const LIMITE_POR_GRUPO = 5

export interface EntradaIndice {
  tipo: TipoResultado
  id: string
  titulo: string
  detalhe: string
  /** Caminho da rota (sem o `#`). */
  destino: string
  /** Campos de busca normalizados. */
  textos: string[]
}

export type Indice = Record<TipoResultado, EntradaIndice[]>

export interface GrupoResultado {
  tipo: TipoResultado
  itens: EntradaIndice[]
  /** Quantos casam no total; os itens param em `LIMITE_POR_GRUPO`. */
  total: number
}

/** Coleções do índice; um grupo sem permissão de leitura vem ausente e não entra. */
export interface DadosIndice {
  processos?: Processo[]
  empresas?: Empresa[]
  credores?: Credor[]
}

function textos(...campos: (string | undefined)[]): string[] {
  return campos.filter((campo): campo is string => Boolean(campo)).map(normalizar)
}

function porTitulo(a: EntradaIndice, b: EntradaIndice): number {
  return a.titulo.localeCompare(b.titulo, 'pt-BR') || a.id.localeCompare(b.id)
}

export function montarIndice({ processos, empresas, credores }: DadosIndice): Indice {
  const apelidos = new Map((processos ?? []).map((processo) => [processo.id, processo.apelido]))
  return {
    processos: (processos ?? [])
      .map((processo) => ({
        tipo: 'processos' as const,
        id: processo.id,
        titulo: processo.apelido,
        detalhe: formatarCnj(processo.numeroCnj),
        destino: `/processos/${processo.id}/visao-geral`,
        textos: textos(processo.apelido, processo.numeroCnj),
      }))
      .sort(porTitulo),
    empresas: (empresas ?? [])
      .map((empresa) => ({
        tipo: 'empresas' as const,
        id: empresa.id,
        titulo: empresa.razaoSocial,
        detalhe: formatarCnpj(empresa.cnpj),
        destino: `/empresas/${empresa.id}`,
        textos: textos(empresa.razaoSocial, empresa.nomeFantasia, empresa.cnpj),
      }))
      .sort(porTitulo),
    credores: (credores ?? [])
      .map((credor) => {
        const apelido = apelidos.get(credor.processoId)
        return {
          tipo: 'credores' as const,
          id: credor.id,
          titulo: credor.nome,
          detalhe: [formatarDocumento(credor.documento), apelido].filter(Boolean).join(' · '),
          destino: `/processos/${credor.processoId}/credores/${credor.id}`,
          textos: textos(credor.nome, credor.documento),
        }
      })
      .sort(porTitulo),
  }
}

/**
 * Grupos com resultado para a consulta, na ordem de `TIPOS_RESULTADO`. Como na busca das listas
 * (repositório), cada palavra precisa aparecer num dos campos. Consulta vazia não devolve nada.
 */
export function buscarNoIndice(
  indice: Indice,
  consulta: string,
  limite = LIMITE_POR_GRUPO,
): GrupoResultado[] {
  const palavras = normalizar(consulta).split(' ').filter(Boolean)
  if (palavras.length === 0) return []
  const casa = (entrada: EntradaIndice) =>
    palavras.every((palavra) => entrada.textos.some((texto) => texto.includes(palavra)))
  return TIPOS_RESULTADO.flatMap((tipo) => {
    const encontrados = indice[tipo].filter(casa)
    return encontrados.length === 0
      ? []
      : [{ tipo, itens: encontrados.slice(0, limite), total: encontrados.length }]
  })
}
