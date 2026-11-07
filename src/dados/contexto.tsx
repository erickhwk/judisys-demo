// Ponte entre as telas e a camada de dados (T-02, T-22, SDD §5.2). As telas não importam Dexie
// nem `Armazenamento`: pedem repositórios e serviços por estes hooks.
import {
  QueryClient,
  QueryClientProvider,
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useMemo, useState } from 'react'
import type { Armazenamento, Id, Tabela } from './armazenamento'
import {
  type ContextoGravacao,
  criarRepositorio,
  ErroPermissao,
  type Filtro,
  type Pagina,
  type Repositorio,
} from './repositorio'
import type { Registro, Tipos } from './schemas'

interface ValorDados {
  armazenamento: Armazenamento
  /** `null` sem sessão: leituras funcionam, gravações são recusadas. */
  contexto: ContextoGravacao | null
}

const Dados = createContext<ValorDados | null>(null)

export interface PropsDadosProvider {
  armazenamento: Armazenamento
  contexto: ContextoGravacao | null
  /** Para os testes ou para quem já tem um; sem ele, o provider cria o seu. */
  queryClient?: QueryClient
  children: ReactNode
}

export function DadosProvider({
  armazenamento,
  contexto,
  queryClient,
  children,
}: PropsDadosProvider) {
  const [clientePadrao] = useState(() => new QueryClient())
  const valor = useMemo(() => ({ armazenamento, contexto }), [armazenamento, contexto])
  return (
    <QueryClientProvider client={queryClient ?? clientePadrao}>
      <Dados.Provider value={valor}>{children}</Dados.Provider>
    </QueryClientProvider>
  )
}

function useDados(): ValorDados {
  const valor = useContext(Dados)
  if (!valor) throw new Error('useRepo/useServico fora do DadosProvider')
  return valor
}

/** Contexto só para as leituras sem sessão; as gravações nem chegam ao repositório. */
const LEITOR: ContextoGravacao = {
  usuario: { id: '', escritorioId: '' },
  papel: 'analista',
  agora: () => '',
}

function semSessao(): Promise<never> {
  return Promise.reject(new ErroPermissao())
}

/** Sem sessão, gravar é sempre recusado; ler não depende do papel. */
function somenteLeitura<T extends Registro>(repositorio: Repositorio<T>): Repositorio<T> {
  return { ...repositorio, criar: semSessao, atualizar: semSessao, excluir: semSessao }
}

/**
 * Repositório cujas gravações chamam `invalidar` ao terminar, deu certo ou não: depois de
 * qualquer gravação a tela recarrega tudo (T-22).
 */
export function comInvalidacao<T extends Registro>(
  repositorio: Repositorio<T>,
  invalidar: () => Promise<void>,
): Repositorio<T> {
  async function depois<R>(gravacao: Promise<R>): Promise<R> {
    try {
      return await gravacao
    } finally {
      await invalidar()
    }
  }
  return {
    ...repositorio,
    criar: (dados) => depois(repositorio.criar(dados)),
    atualizar: (id, mudancas) => depois(repositorio.atualizar(id, mudancas)),
    excluir: (id) => depois(repositorio.excluir(id)),
  }
}

/** Repositório da coleção com o contexto da sessão e invalidação após gravar. */
export function useRepo<K extends Tabela>(tabela: K): Repositorio<Tipos[K]> {
  const { armazenamento, contexto } = useDados()
  const queryClient = useQueryClient()
  return useMemo(() => {
    if (!contexto) return somenteLeitura(criarRepositorio(armazenamento, tabela, LEITOR))
    return comInvalidacao(criarRepositorio(armazenamento, tabela, contexto), () =>
      queryClient.invalidateQueries(),
    )
  }, [armazenamento, contexto, queryClient, tabela])
}

/**
 * Serviço (operação em várias coleções, DMO-11) ligado ao armazenamento e ao contexto da
 * sessão, com a mesma invalidação. `fabrica` deve ser estável (função de módulo).
 */
export function useServico<A extends unknown[], R>(
  fabrica: (armazenamento: Armazenamento, contexto: ContextoGravacao) => (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  const { armazenamento, contexto } = useDados()
  const queryClient = useQueryClient()
  return useMemo(() => {
    if (!contexto) return semSessao
    const servico = fabrica(armazenamento, contexto)
    return async (...args: A) => {
      try {
        return await servico(...args)
      } finally {
        await queryClient.invalidateQueries()
      }
    }
  }, [armazenamento, contexto, queryClient, fabrica])
}

/** Página da coleção (listas com paginação de 50). */
export function useListar<K extends Tabela>(
  tabela: K,
  filtro: Filtro<Tipos[K]> = {},
): UseQueryResult<Pagina<Tipos[K]>> {
  const repo = useRepo(tabela)
  return useQuery({ queryKey: [tabela, 'listar', filtro], queryFn: () => repo.listar(filtro) })
}

/** Todos os que passam no filtro (CSV, resumos). */
export function useTodos<K extends Tabela>(
  tabela: K,
  filtro: Omit<Filtro<Tipos[K]>, 'pagina' | 'porPagina'> = {},
): UseQueryResult<Tipos[K][]> {
  const repo = useRepo(tabela)
  return useQuery({ queryKey: [tabela, 'todos', filtro], queryFn: () => repo.todos(filtro) })
}

/** Um registro; `null` quando não existe (LOG-03: "Registro não existe mais"). */
export function useRegistro<K extends Tabela>(
  tabela: K,
  id: Id | undefined,
): UseQueryResult<Tipos[K] | null> {
  const repo = useRepo(tabela)
  return useQuery({
    queryKey: [tabela, 'buscar', id],
    queryFn: async () => (id === undefined ? null : ((await repo.buscar(id)) ?? null)),
    enabled: id !== undefined,
  })
}
