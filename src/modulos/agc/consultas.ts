// Leituras das telas da AGC, pelo repositório da sessão (T-02, T-14). As chaves começam pela
// coleção; depois de qualquer gravação, tudo é recarregado (T-22).
import { useQuery } from '@tanstack/react-query'
import { useRepo } from '../../dados/contexto'

/** AGCs do processo, a mais recente primeiro. */
export function useAgcsDoProcesso(processoId: string) {
  const repo = useRepo('agcs')
  return useQuery({
    queryKey: ['agcs', 'todos', processoId],
    queryFn: () =>
      repo.todos({ onde: { processoId }, ordem: { campo: 'dataPrimeira', direcao: 'desc' } }),
  })
}

export function useAgc(agcId: string) {
  const repo = useRepo('agcs')
  return useQuery({
    queryKey: ['agcs', 'buscar', agcId],
    queryFn: async () => (await repo.buscar(agcId)) ?? null,
  })
}

/** Ids dos credores presentes na AGC. */
export function usePresentes(agcId: string) {
  const repo = useRepo('presencas')
  return useQuery({
    queryKey: ['presencas', 'todos', agcId],
    queryFn: async () => new Set((await repo.todos({ onde: { agcId } })).map((p) => p.credorId)),
  })
}

/** Votos gravados da AGC (os da AGC encerrada são os do resultado registrado). */
export function useVotos(agcId: string) {
  const repo = useRepo('votos')
  return useQuery({
    queryKey: ['votos', 'todos', agcId],
    queryFn: () => repo.todos({ onde: { agcId } }),
  })
}
