// Índice da busca global em memória (T-14). Fica no cache do React Query: toda gravação por
// `useRepo`/`useServico` chama `invalidateQueries()` (T-22), o que invalida também esta consulta,
// e a próxima abertura da busca monta o índice de novo (BUS-06).
import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { useRepo } from '../../dados/contexto'
import { type Papel, pode } from '../../regras/permissoes'
import { type Indice, montarIndice } from './indice'

export const CHAVE_INDICE = ['busca', 'indice'] as const

/** Só monta (e lê as coleções) quando `habilitado`, ou seja, com a busca aberta. */
export function useIndiceBusca(papel: Papel, habilitado: boolean): UseQueryResult<Indice> {
  const processos = useRepo('processos')
  const empresas = useRepo('empresas')
  const credores = useRepo('credores')
  return useQuery({
    queryKey: [...CHAVE_INDICE, papel],
    enabled: habilitado,
    queryFn: async () => {
      // Grupo de módulo sem leitura para o papel nem é lido (PER-03).
      const [listaProcessos, listaEmpresas, listaCredores] = await Promise.all([
        pode(papel, 'ler', 'processos') ? processos.todos() : undefined,
        pode(papel, 'ler', 'empresas') ? empresas.todos() : undefined,
        pode(papel, 'ler', 'credores') ? credores.todos() : undefined,
      ])
      return montarIndice({
        processos: listaProcessos,
        empresas: listaEmpresas,
        credores: listaCredores,
      })
    },
  })
}
