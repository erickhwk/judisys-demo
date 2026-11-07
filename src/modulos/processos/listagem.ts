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
  { pagina = 1, ...filtro }: FiltroProcessos,
): Promise<ListaDeProcessos> {
  const { processos, porTipo } = await filtrarProcessos(repos, filtro)
  const paginas = Math.max(1, Math.ceil(processos.length / POR_PAGINA))
  const atual = Math.min(Math.max(1, Number.isFinite(pagina) ? Math.floor(pagina) : 1), paginas)
  return {
    itens: processos.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA),
    total: processos.length,
    pagina: atual,
    paginas,
    porTipo,
  }
}

/** Todos os processos que passam na busca, no tipo e na fase, por apelido (lista e CSV, RF-44). */
export async function filtrarProcessos(
  repos: ReposListagem,
  { busca = '', tipo, fase }: Omit<FiltroProcessos, 'pagina'>,
): Promise<{ processos: Processo[]; porTipo: ListaDeProcessos['porTipo'] }> {
  const onde = { faseAtual: fase }
  const ordem = { campo: 'apelido', direcao: 'asc' } as const
  let processos = await repos.processos.todos({ onde, ordem })

  if (busca.trim()) {
    const [diretos, empresas, vinculos] = await Promise.all([
      repos.processos.todos({ onde, busca }),
      repos.empresas.todos({ busca }),
      repos.processoEmpresas.todos(),
    ])
    const idsEmpresas = new Set(empresas.map((e) => e.id))
    const ids = new Set(diretos.map((p) => p.id))
    for (const vinculo of vinculos) {
      if (idsEmpresas.has(vinculo.empresaId)) ids.add(vinculo.processoId)
    }
    processos = processos.filter((processo) => ids.has(processo.id))
  }

  const porTipo = {
    todos: processos.length,
    rj: processos.filter((p) => p.tipo === 'rj').length,
    falencia: processos.filter((p) => p.tipo === 'falencia').length,
  }
  return { processos: tipo ? processos.filter((p) => p.tipo === tipo) : processos, porTipo }
}
