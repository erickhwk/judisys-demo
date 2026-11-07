// Lista de processos (RF-11, PRC-12): busca por apelido, número CNJ e empresa, filtros por tipo
// e fase e paginação de 50. O repositório busca só nos campos do processo; a busca por empresa
// passa pelos vínculos `processoEmpresas` (SDD §5.4).
import { type Pagina, POR_PAGINA, type Repositorio } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import type { Fase, TipoProcesso } from '../../regras/fases'

type Processo = Tipos['processos']

export interface ReposListagem {
  processos: Repositorio<Processo>
  empresas: Repositorio<Tipos['empresas']>
  processoEmpresas: Repositorio<Tipos['processoEmpresas']>
}

export interface FiltroProcessos {
  busca?: string
  tipo?: TipoProcesso
  fase?: Fase
  pagina?: number
}

export interface ListaDeProcessos extends Pagina<Processo> {
  /** Quantos casam com a busca e a fase, por tipo (contagem das abas). */
  porTipo: Record<'todos' | TipoProcesso, number>
}

export async function listarProcessos(
  repos: ReposListagem,
  { busca = '', tipo, fase, pagina = 1 }: FiltroProcessos,
): Promise<ListaDeProcessos> {
  const onde = { faseAtual: fase }
  const ordem = { campo: 'apelido', direcao: 'asc' } as const
  let processos = await repos.processos.todos({ onde, ordem })

  if (busca.trim()) {
    const diretos = await repos.processos.todos({ onde, busca })
    const empresas = await repos.empresas.todos({ busca })
    const viaEmpresa = new Set<string>()
    for (const empresa of empresas) {
      const vinculos = await repos.processoEmpresas.todos({ onde: { empresaId: empresa.id } })
      for (const vinculo of vinculos) viaEmpresa.add(vinculo.processoId)
    }
    const ids = new Set([...diretos.map((p) => p.id), ...viaEmpresa])
    processos = processos.filter((processo) => ids.has(processo.id))
  }

  const porTipo = {
    todos: processos.length,
    rj: processos.filter((p) => p.tipo === 'rj').length,
    falencia: processos.filter((p) => p.tipo === 'falencia').length,
  }
  const doTipo = tipo ? processos.filter((p) => p.tipo === tipo) : processos
  const paginas = Math.max(1, Math.ceil(doTipo.length / POR_PAGINA))
  const atual = Math.min(Math.max(1, Number.isFinite(pagina) ? Math.floor(pagina) : 1), paginas)
  return {
    itens: doTipo.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA),
    total: doTipo.length,
    pagina: atual,
    paginas,
    porTipo,
  }
}
