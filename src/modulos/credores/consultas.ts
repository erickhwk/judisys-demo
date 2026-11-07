// Leituras das telas de credores, pelo repositório da sessão (T-02, T-14). As chaves começam pela
// coleção; depois de qualquer gravação, tudo é recarregado (T-22).
import { useQuery } from '@tanstack/react-query'
import { useRepo } from '../../dados/contexto'
import type { Filtro } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { relacaoAjPublicada } from '../../dados/servicos/pedidos'

type Credor = Tipos['credores']

export function useProcesso(processoId: string) {
  const repo = useRepo('processos')
  return useQuery({
    queryKey: ['processos', 'buscar', processoId],
    queryFn: async () => (await repo.buscar(processoId)) ?? null,
  })
}

export function useCredor(credorId: string) {
  const repo = useRepo('credores')
  return useQuery({
    queryKey: ['credores', 'buscar', credorId],
    queryFn: async () => (await repo.buscar(credorId)) ?? null,
  })
}

/** Todos os credores do processo (quadro-resumo e QGC usam a lista inteira, não a página). */
export function useCredoresDoProcesso(processoId: string) {
  const repo = useRepo('credores')
  return useQuery({
    queryKey: ['credores', 'todos', processoId],
    queryFn: () => repo.todos({ onde: { processoId }, ordem: { campo: 'nome', direcao: 'asc' } }),
  })
}

/** Página da lista da aba (50 por página, RF-28). */
export function usePaginaDeCredores(filtro: Filtro<Credor>) {
  const repo = useRepo('credores')
  return useQuery({
    queryKey: ['credores', 'listar', filtro],
    queryFn: () => repo.listar(filtro),
  })
}

export function usePedidosDoProcesso(processoId: string) {
  const repo = useRepo('pedidosDeCredito')
  return useQuery({
    queryKey: ['pedidosDeCredito', 'todos', processoId],
    queryFn: () => repo.todos({ onde: { processoId }, ordem: { campo: 'data', direcao: 'desc' } }),
  })
}

/** A relação do AJ do processo já foi publicada (CRD-10). */
export function useRelacaoPublicada(processoId: string) {
  const repoMarcos = useRepo('marcosDeFase')
  const repoProcessos = useRepo('processos')
  return useQuery({
    queryKey: ['marcosDeFase', 'relacao-publicada', processoId],
    queryFn: async () => {
      const processo = await repoProcessos.buscar(processoId)
      if (!processo) return false
      const marcos = await repoMarcos.todos({ onde: { processoId } })
      return relacaoAjPublicada(processo.tipo, marcos)
    },
  })
}
