// Tela de logs (RF-41 a RF-43, LOG-03, LOG-04, PER-07): o histórico de todo o escritório, do mais
// novo ao mais antigo (mesmo segundo: pela ordem do id, no repositório), com filtros por usuário,
// módulo, processo e período na URL, as mudanças campo a campo e o link para o registro, ou
// "Registro não existe mais" quando ele foi excluído.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import type { Id } from '../../dados/armazenamento'
import { useRepo, useTodos } from '../../dados/contexto'
import { COLECOES, POR_PAGINA, type Repositorio } from '../../dados/repositorio'
import type { Log, Registro } from '../../dados/schemas'
import { PREFIXO_CASCATA } from '../../dados/servicos/exclusoes'
import { formatarDataHora } from '../../regras/datas'
import { type Modulo, pode } from '../../regras/permissoes'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Erro } from '../../ui/Erro'
import { Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { type ColunaTabela, Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import { Cabecalho } from '../empresas/Cabecalho'
import { useSessao } from '../entrada/sessao'
import { Mudancas } from '../processos/AbaHistorico'
import { type Nomes, ROTULOS_ACAO, ROTULOS_COLECAO } from '../processos/historico'
import { ROTULOS_MODULO } from '../usuarios/permissoes'
import {
  chaveDoRegistro,
  destinoDoRegistro,
  type FiltrosLogs,
  filtrarLogs,
  MODULOS_COM_LOG,
  type TabelaComDestino,
  temDestino,
} from './consulta'
import estilos from './logs.module.css'

const ORDEM = { campo: 'data', direcao: 'desc' } as const
const PARAMETROS = ['usuario', 'modulo', 'processo', 'de', 'ate'] as const
type Parametro = (typeof PARAMETROS)[number]

function rotuloColecao(log: Log): string {
  return ROTULOS_COLECAO[log.colecao] ?? log.colecao
}

/**
 * Na exclusão do processo (T-23), as contagens do que saiu junto vêm antes dos campos do processo,
 * para não ficarem escondidas no "e mais N campos".
 */
function cascataPrimeiro(log: Log): Log {
  const ehCascata = (campo: string) => campo.startsWith(PREFIXO_CASCATA)
  if (!log.mudancas.some((m) => ehCascata(m.campo))) return log
  return {
    ...log,
    mudancas: [
      ...log.mudancas.filter((m) => ehCascata(m.campo)),
      ...log.mudancas.filter((m) => !ehCascata(m.campo)),
    ],
  }
}

/**
 * O registro de cada log da página como está agora: `null` quando não existe mais (LOG-03).
 * Só as coleções com tela; as outras ficam fora do mapa.
 */
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

function LinkDoRegistro({
  log,
  registros,
  podeAbrir,
  falhou,
}: {
  log: Log
  registros: Map<string, Registro | null> | undefined
  /** O papel da sessão lê o módulo do registro (RF-40: sem link para tela proibida). */
  podeAbrir: boolean
  /** A busca dos registros falhou: sem link, em vez de "…" para sempre. */
  falhou: boolean
}) {
  if (!temDestino(log.colecao) || !podeAbrir) return <span className={estilos.apagado}>—</span>
  if (!registros?.has(chaveDoRegistro(log))) {
    return <span className={estilos.apagado}>{falhou ? '—' : '…'}</span>
  }
  const registro = registros.get(chaveDoRegistro(log))
  if (!registro) return <span className={estilos.apagado}>Registro não existe mais</span>
  const destino = destinoDoRegistro(log, registro)
  if (!destino) return <span className={estilos.apagado}>—</span>
  return <Link to={destino}>Abrir {rotuloColecao(log)}</Link>
}

export function TelaLogs() {
  const { sessao } = useSessao()
  const podeAbrir = (log: Log) =>
    sessao ? pode(sessao.papel, 'ler', COLECOES[log.colecao].modulo) : false
  const [parametros, setParametros] = useSearchParams()
  const valor = (nome: Parametro) => parametros.get(nome) || undefined
  const filtros: FiltrosLogs = {
    usuarioId: valor('usuario'),
    modulo: MODULOS_COM_LOG.find((modulo) => modulo === valor('modulo')),
    processoId: valor('processo'),
    de: valor('de'),
    ate: valor('ate'),
  }
  const paginaPedida = Number(parametros.get('pagina') ?? '1')

  // Usuário e processo usam os índices do repositório; módulo e período filtram em memória.
  const consulta = useTodos('logs', {
    onde: { usuarioId: filtros.usuarioId, processoId: filtros.processoId },
    ordem: ORDEM,
  })
  const usuarios = useTodos('usuarios', { ordem: { campo: 'nome', direcao: 'asc' } })
  const empresas = useTodos('empresas')
  const processos = useTodos('processos', { ordem: { campo: 'apelido', direcao: 'asc' } })
  const nomes: Nomes = {
    usuarios: new Map(usuarios.data?.map((u) => [u.id, u.nome])),
    empresas: new Map(empresas.data?.map((e) => [e.id, e.razaoSocial])),
  }
  const apelidos = new Map(processos.data?.map((p) => [p.id, p.apelido]))

  const filtrados = consulta.data ? filtrarLogs(consulta.data, filtros) : undefined
  const total = filtrados?.length ?? 0
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const pagina = Math.min(
    Math.max(1, Number.isFinite(paginaPedida) ? Math.floor(paginaPedida) : 1),
    paginas,
  )
  const naPagina = filtrados?.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA) ?? []
  const registros = useRegistrosDosLogs(naPagina)

  function mudar(nome: Parametro | 'pagina', novo: string) {
    const proximos = new URLSearchParams(parametros)
    if (novo) proximos.set(nome, novo)
    else proximos.delete(nome)
    if (nome !== 'pagina') proximos.delete('pagina')
    setParametros(proximos, { replace: true })
  }

  const algumFiltro = PARAMETROS.some((nome) => parametros.has(nome))
  function limpar() {
    const proximos = new URLSearchParams(parametros)
    for (const nome of [...PARAMETROS, 'pagina']) proximos.delete(nome)
    setParametros(proximos, { replace: true })
  }

  const colunas: ColunaTabela<Log>[] = [
    {
      chave: 'data',
      titulo: 'Data',
      largura: '140px',
      numerica: true,
      celula: (log) => formatarDataHora(log.data),
    },
    {
      chave: 'usuario',
      titulo: 'Usuário',
      largura: '14%',
      celula: (log) => nomes.usuarios.get(log.usuarioId) ?? 'Usuário excluído',
    },
    {
      chave: 'acao',
      titulo: 'Ação',
      largura: '15%',
      celula: (log) => `${ROTULOS_ACAO[log.acao]} ${rotuloColecao(log)}`,
    },
    {
      chave: 'processo',
      titulo: 'Processo',
      largura: '14%',
      celula: (log) =>
        log.processoId ? (apelidos.get(log.processoId) ?? 'Processo excluído') : '—',
    },
    {
      chave: 'mudancas',
      titulo: 'Mudanças',
      celula: (log) => <Mudancas log={cascataPrimeiro(log)} nomes={nomes} />,
    },
    {
      chave: 'registro',
      titulo: 'Registro',
      largura: '15%',
      celula: (log) => (
        <LinkDoRegistro
          log={log}
          registros={registros.data}
          podeAbrir={podeAbrir(log)}
          falhou={registros.isError}
        />
      ),
    },
  ]

  return (
    <div className={estilos.tela}>
      <Cabecalho
        titulo="Logs"
        apoio="Toda criação, edição e exclusão feita no escritório, campo a campo."
      />
      <Filtros titulo="Filtrar" aoLimpar={algumFiltro ? limpar : undefined}>
        <CampoSelecao
          rotulo="Usuário"
          value={filtros.usuarioId ?? ''}
          onChange={(evento) => mudar('usuario', evento.target.value)}
        >
          <option value="">Todos os usuários</option>
          {filtros.usuarioId && usuarios.data && !nomes.usuarios.has(filtros.usuarioId) && (
            <option value={filtros.usuarioId}>Usuário excluído</option>
          )}
          {usuarios.data?.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao
          rotulo="Módulo"
          value={filtros.modulo ?? ''}
          onChange={(evento) => mudar('modulo', evento.target.value as Modulo | '')}
        >
          <option value="">Todos os módulos</option>
          {MODULOS_COM_LOG.map((modulo) => (
            <option key={modulo} value={modulo}>
              {ROTULOS_MODULO[modulo]}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao
          rotulo="Processo"
          value={filtros.processoId ?? ''}
          onChange={(evento) => mudar('processo', evento.target.value)}
        >
          <option value="">Todos os processos</option>
          {filtros.processoId && processos.data && !apelidos.has(filtros.processoId) && (
            <option value={filtros.processoId}>Processo excluído</option>
          )}
          {processos.data?.map((processo) => (
            <option key={processo.id} value={processo.id}>
              {processo.apelido}
            </option>
          ))}
        </CampoSelecao>
        <CampoTexto
          rotulo="De"
          type="date"
          value={filtros.de ?? ''}
          max={filtros.ate}
          onChange={(evento) => mudar('de', evento.target.value)}
        />
        <CampoTexto
          rotulo="Até"
          type="date"
          value={filtros.ate ?? ''}
          min={filtros.de}
          onChange={(evento) => mudar('ate', evento.target.value)}
        />
      </Filtros>
      {consulta.isError ? (
        <Erro mensagem="Não foi possível carregar os logs." />
      ) : (
        <Tabela
          rotulo="Lista de logs"
          colunas={colunas}
          linhas={naPagina}
          chaveLinha={(log) => log.id}
          larguraMinima={1040}
          topo={filtrados && <span>{resumo(total, pagina, naPagina.length)}</span>}
          vazio={
            <Vazio
              titulo={consulta.isSuccess ? 'Nenhum log encontrado' : 'Carregando…'}
              descricao={
                consulta.isSuccess && algumFiltro
                  ? 'Confira os filtros ou limpe para ver todos.'
                  : undefined
              }
            />
          }
          rodape={
            paginas > 1 && (
              <Paginacao
                pagina={pagina}
                totalPaginas={paginas}
                aoMudar={(nova) => mudar('pagina', nova > 1 ? String(nova) : '')}
              />
            )
          }
        />
      )}
    </div>
  )
}

/** "Mostrando 1–50 de 812", como nas outras listas. */
function resumo(total: number, pagina: number, naPagina: number): string {
  if (total === 0) return 'Nenhum resultado'
  const inicio = (pagina - 1) * POR_PAGINA + 1
  return `Mostrando ${inicio}–${inicio + naPagina - 1} de ${total}`
}
