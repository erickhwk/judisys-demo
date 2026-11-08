// Q-06 · Atividade recente (INI-07, ficha "atividade" do canvas): as 6 últimas ações dos logs, com
// quem, o quê, onde e quando (QDR-07). Cada uma leva ao registro como ele está agora, como na tela
// de logs (LOG-03), e só para quem lê o módulo dele (RF-40). O quadro só entra no catálogo de quem
// lê logs (S-05, `catalogoDoPapel`). Vem da atividade recente do antigo dashboard (DMO-18).
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useListar, useRepo, useTodos } from '../../../dados/contexto'
import { COLECOES, type Repositorio } from '../../../dados/repositorio'
import type { Log, Registro } from '../../../dados/schemas'
import { type Modulo, pode } from '../../../regras/permissoes'
import { juntarClasses } from '../../../ui/classes'
import { useSessao } from '../../entrada/sessao'
import {
  chaveDoRegistro,
  destinoDoRegistro,
  type TabelaComDestino,
  temDestino,
} from '../../logs/consulta'
import { LIMITE_ATIVIDADE_DO_QUADRO } from '../indicadores'
import listas from './listaDoQuadro.module.css'
import { Quadro } from './Quadro'
import estilos from './QuadroAtividade.module.css'
import type { PropsDoQuadro } from './registro'
import { acaoDaAtividade, diaEMes, iniciais } from './textos'

/** Só os logs mostrados, do mais novo ao mais antigo (a ordem da tela de logs). */
const LOGS_RECENTES = {
  ordem: { campo: 'data', direcao: 'desc' },
  porPagina: LIMITE_ATIVIDADE_DO_QUADRO,
} as const

export function QuadroAtividade({ variante }: PropsDoQuadro) {
  const { sessao } = useSessao()
  const logs = useListar('logs', LOGS_RECENTES)
  const usuarios = useTodos('usuarios')
  const processos = useTodos('processos')
  const recentes = logs.data?.itens ?? []
  const registros = useRegistrosDosLogs(recentes)
  const podeLer = (modulo: Modulo) => (sessao ? pode(sessao.papel, 'ler', modulo) : false)

  const moldura = {
    id: 'atividade',
    titulo: 'Atividade recente',
    variante,
    link: { para: '/logs', rotulo: 'Logs', modulo: 'logs' },
  } as const
  if (logs.isError || usuarios.isError || processos.isError) {
    return <Quadro {...moldura} vazio="Não foi possível carregar a atividade." />
  }
  if (!logs.data || !usuarios.data || !processos.data) return <Quadro {...moldura} />
  if (recentes.length === 0) return <Quadro {...moldura} vazio="Nenhuma atividade registrada." />

  const nomes = new Map(usuarios.data.map((u) => [u.id, u.nome]))
  const apelidos = new Map(processos.data.map((p) => [p.id, p.apelido]))

  return (
    <Quadro {...moldura}>
      <ol className={listas.lista}>
        {recentes.map((log) => {
          const quem = nomes.get(log.usuarioId) ?? 'Usuário excluído'
          const onde = log.processoId
            ? (apelidos.get(log.processoId) ?? 'Processo excluído')
            : undefined
          const destino = destinoDaAtividade(log, registros.data, podeLer)
          const conteudo = (
            <>
              <span className={estilos.avatar} aria-hidden="true">
                {iniciais(quem)}
              </span>
              <span className={estilos.texto}>
                <span className={estilos.topo}>
                  <b className={estilos.quem}>{quem}</b>
                  <span className={estilos.quando}>
                    {diaEMes(log.data)}
                    <span className={estilos.hora}> · {log.data.slice(11, 16)}</span>
                  </span>
                </span>
                <span className={estilos.frase}>
                  {acaoDaAtividade(log)}
                  {onde && <b> {onde}</b>}
                </span>
              </span>
            </>
          )
          const classe = juntarClasses(listas.linha, estilos.linha)
          return (
            <li key={log.id} className={listas.item}>
              {destino ? (
                <Link to={destino} className={classe}>
                  {conteudo}
                </Link>
              ) : (
                <span className={classe}>{conteudo}</span>
              )}
            </li>
          )
        })}
      </ol>
    </Quadro>
  )
}

/** Busca o registro de cada log mostrado, para o link; `null` quando ele não existe mais. */
function useRegistrosDosLogs(logs: readonly Log[]) {
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
  const pedidos = logs.filter((log) => temDestino(log.colecao))
  return useQuery({
    queryKey: ['inicio', 'atividade', 'registros', pedidos.map(chaveDoRegistro)],
    queryFn: async () => {
      const encontrados = await Promise.all(
        pedidos.map(async (log) => {
          const repo = repos[log.colecao as TabelaComDestino]
          return [chaveDoRegistro(log), (await repo.buscar(log.registroId)) ?? null] as const
        }),
      )
      return new Map<string, Registro | null>(encontrados)
    },
    enabled: pedidos.length > 0,
    placeholderData: keepPreviousData,
  })
}

/** Sem link quando o papel não lê o módulo (RF-40), o registro sumiu ou não tem tela. */
function destinoDaAtividade(
  log: Log,
  registros: Map<string, Registro | null> | undefined,
  podeLer: (modulo: Modulo) => boolean,
): string | null {
  if (!temDestino(log.colecao) || !podeLer(COLECOES[log.colecao].modulo)) return null
  const registro = registros?.get(chaveDoRegistro(log))
  return registro ? destinoDoRegistro(log, registro) : null
}
