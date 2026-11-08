// Registro de cada log como ele está agora, para o link "Abrir" (LOG-03): usado pela tela de logs
// e pela Atividade recente do início (Q-06).
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Id } from '../../dados/armazenamento'
import { useRepo } from '../../dados/contexto'
import type { Repositorio } from '../../dados/repositorio'
import type { Log, Registro } from '../../dados/schemas'
import { chaveDoRegistro, type TabelaComDestino, temDestino } from './consulta'

/**
 * O registro de cada log da página como está agora: `null` quando não existe mais (LOG-03).
 * Só as coleções com tela; as outras ficam fora do mapa.
 */
export function useRegistrosDosLogs(logs: readonly Log[]) {
  const repos: Record<TabelaComDestino, Pick<Repositorio<Registro>, 'buscar'>> = {
    processos: useRepo('processos'),
    marcosDeFase: useRepo('marcosDeFase'),
    prazos: useRepo('prazos'),
    credores: useRepo('credores'),
    pedidosDeCredito: useRepo('pedidosDeCredito'),
    agcs: useRepo('agcs'),
    presencas: useRepo('presencas'),
    votos: useRepo('votos'),
    informes: useRepo('informes'),
    empresas: useRepo('empresas'),
    usuarios: useRepo('usuarios'),
  }
  const pedidos = [
    ...new Map(
      logs.flatMap((log) =>
        temDestino(log.colecao) ? [[chaveDoRegistro(log), [log.colecao, log.registroId]]] : [],
      ) as [string, [TabelaComDestino, Id]][],
    ),
  ]
  return useQuery({
    queryKey: ['logs', 'registros', pedidos.map(([chave]) => chave)],
    queryFn: async () => {
      const encontrados = await Promise.all(
        pedidos.map(
          async ([chave, [tabela, id]]) =>
            [chave, (await repos[tabela].buscar(id)) ?? null] as const,
        ),
      )
      return new Map<string, Registro | null>(encontrados)
    },
    enabled: pedidos.length > 0,
    placeholderData: keepPreviousData,
  })
}
