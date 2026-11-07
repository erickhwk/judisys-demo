// Dashboard executivo (RF-07 a RF-10, SDD §7.7), no visual do `dashboard.html` do guia: números do
// topo, próximos prazos e AGCs, funil por fase, passivo por classe, últimos informes e atividade
// recente. Toda gravação invalida as consultas (T-22), então voltar ao dashboard já mostra a
// mudança (DSH-04).
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlarmClock,
  CalendarClock,
  ClipboardList,
  FileText,
  Gavel,
  Scale,
  Users,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Id } from '../../dados/armazenamento'
import { useRepo, useTodos } from '../../dados/contexto'
import { COLECOES, type Repositorio } from '../../dados/repositorio'
import { CATEGORIAS_INFORME, type Log, type Registro } from '../../dados/schemas'
import { formatarData, formatarDataHora, formatarMoeda } from '../../regras/datas'
import type { TipoProcesso } from '../../regras/fases'
import { type Modulo, pode } from '../../regras/permissoes'
import { situacao } from '../../regras/prazos'
import { hoje as hojeDoRelogio } from '../../regras/relogio'
import { Erro } from '../../ui/Erro'
import { Selo } from '../../ui/Selo'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import {
  chaveDoRegistro,
  destinoDoRegistro,
  type TabelaComDestino,
  temDestino,
} from '../logs/consulta'
import { rotuloSituacao, TOM_SITUACAO } from '../prazos/regras'
import { ROTULOS_ACAO, ROTULOS_COLECAO } from '../processos/historico'
import estilos from './dashboard.module.css'
import { formatarMoedaCurta } from './formato'
import { GraficoPassivo } from './GraficoPassivo'
import {
  atividadeRecente,
  type EtapaDoFunil,
  funilPorFase,
  numerosDoTopo,
  passivoPorClasse,
  proximasAgcs,
  proximosPrazos,
  ultimosInformes,
} from './indicadores'

const LOGS_MAIS_NOVOS = { ordem: { campo: 'data', direcao: 'desc' } } as const

const ROTULOS_TIPO: Record<TipoProcesso, string> = {
  rj: 'Recuperação judicial',
  falencia: 'Falência',
}

export function Dashboard() {
  const hoje = hojeDoRelogio()
  const { sessao } = useSessao()
  const podeLer = (modulo: Modulo) => (sessao ? pode(sessao.papel, 'ler', modulo) : false)

  const processos = useTodos('processos')
  const credores = useTodos('credores')
  const prazos = useTodos('prazos')
  const agcs = useTodos('agcs')
  const informes = useTodos('informes')
  const logs = useTodos('logs', LOGS_MAIS_NOVOS)
  const usuarios = useTodos('usuarios')

  const consultas = [processos, credores, prazos, agcs, informes, logs, usuarios]
  const recentes = logs.data ? atividadeRecente(logs.data) : []
  const registros = useRegistrosDosLogs(recentes)

  if (consultas.some((c) => c.isError)) {
    return (
      <div className={estilos.tela}>
        <h1>Dashboard</h1>
        <Erro mensagem="Não foi possível carregar o dashboard." />
      </div>
    )
  }
  if (
    !processos.data ||
    !credores.data ||
    !prazos.data ||
    !agcs.data ||
    !informes.data ||
    !logs.data ||
    !usuarios.data
  ) {
    return (
      <div className={estilos.tela}>
        <h1>Dashboard</h1>
        <p className={estilos.apoio}>Carregando…</p>
      </div>
    )
  }

  const apelidos = new Map(processos.data.map((p) => [p.id, p.apelido]))
  const apelido = (id: Id | undefined) => (id ? (apelidos.get(id) ?? 'Processo excluído') : '—')
  const nomes = new Map(usuarios.data.map((u) => [u.id, u.nome]))
  const numeros = numerosDoTopo(
    { processos: processos.data, credores: credores.data, prazos: prazos.data },
    hoje,
  )

  return (
    <div className={estilos.tela}>
      <h1>Dashboard</h1>

      <section aria-label="Números do escritório" className={estilos.numeros}>
        <Numero
          rotulo="Processos ativos"
          stat="processos-ativos"
          valor={numeros.ativosRj + numeros.ativosFalencia}
          icone={<Scale size={22} />}
          apoio={
            <>
              RJ: <b data-stat="ativos-rj">{numeros.ativosRj}</b> · Falência:{' '}
              <b data-stat="ativos-falencia">{numeros.ativosFalencia}</b>
            </>
          }
        />
        <Numero
          rotulo="Passivo sob administração"
          stat="passivo"
          dadoValor={numeros.passivo}
          valor={formatarMoedaCurta(numeros.passivo)}
          icone={<Wallet size={22} />}
          apoio={`${formatarMoeda(numeros.passivo)} na relação do AJ`}
        />
        <Numero
          rotulo="Credores"
          stat="credores"
          valor={numeros.credores.toLocaleString('pt-BR')}
          icone={<Users size={22} />}
          apoio="em todos os processos"
        />
        <article className={estilos.numero}>
          <div className={estilos.numeroTopo}>
            <span className={estilos.numeroRotulo}>Prazos em aberto</span>
            <span className={estilos.numeroIcone} aria-hidden="true">
              <AlarmClock size={22} />
            </span>
          </div>
          <div className={estilos.par}>
            <ParteDosPrazos
              stat="prazos-vencidos"
              valor={numeros.prazosVencidos}
              legenda="vencidos"
              destaque={numeros.prazosVencidos > 0}
              para={podeLer('prazos') ? '/agenda?periodo=vencidos' : undefined}
            />
            <ParteDosPrazos
              stat="prazos-7-dias"
              valor={numeros.prazosProximos}
              legenda="vencem em 7 dias"
              para={podeLer('prazos') ? '/agenda?periodo=7-dias' : undefined}
            />
          </div>
        </article>
      </section>

      <div className={estilos.linha}>
        <Cartao titulo="Próximos prazos" icone={<AlarmClock size={22} />} largo>
          <Lista vazio="Nenhum prazo em aberto">
            {proximosPrazos(prazos.data, hoje).map((prazo) => (
              <Item
                key={prazo.id}
                para={`/processos/${prazo.processoId}/prazos`}
                icone={<CalendarClock size={22} />}
                titulo={prazo.titulo}
                apoio={apelido(prazo.processoId)}
                data={formatarData(prazo.vencimento)}
                selo={
                  <Selo tom={TOM_SITUACAO[situacao(prazo, hoje)]}>
                    {rotuloSituacao(prazo, hoje)}
                  </Selo>
                }
              />
            ))}
          </Lista>
        </Cartao>
        <Cartao titulo="Próximas AGCs" icone={<Gavel size={22} />}>
          <Lista vazio="Nenhuma AGC agendada">
            {proximasAgcs(agcs.data, hoje).map(({ agc, data, convocacao }) => (
              <Item
                key={agc.id}
                para={`/processos/${agc.processoId}/agc/${agc.id}`}
                icone={<Gavel size={22} />}
                titulo={apelido(agc.processoId)}
                apoio={`${convocacao}ª convocação · ${agc.pauta}`}
                data={formatarData(data)}
              />
            ))}
          </Lista>
        </Cartao>
      </div>

      <div className={estilos.linha}>
        <Cartao titulo="Processos por fase" largo>
          <div className={estilos.funis}>
            {(['rj', 'falencia'] as const).map((tipo) => (
              <Funil key={tipo} tipo={tipo} etapas={funilPorFase(processos.data, tipo)} />
            ))}
          </div>
        </Cartao>
        <Cartao titulo="Passivo por classe (RJ)">
          <GraficoPassivo classes={passivoPorClasse(processos.data, credores.data)} />
        </Cartao>
      </div>

      <div className={estilos.linha}>
        <Cartao titulo="Últimos informes" icone={<FileText size={22} />} largo>
          <Lista vazio="Nenhum informe cadastrado">
            {ultimosInformes(informes.data).map((informe) => (
              <Item
                key={informe.id}
                para={`/informes/${informe.id}`}
                icone={<ClipboardList size={22} />}
                titulo={informe.titulo}
                apoio={`${CATEGORIAS_INFORME[informe.categoria]} · ${apelido(informe.processoId)}`}
                data={formatarData(informe.data)}
              />
            ))}
          </Lista>
        </Cartao>
        {podeLer('logs') && (
          <Cartao titulo="Atividade recente">
            <Lista vazio="Nenhuma atividade registrada">
              {recentes.map((log) => (
                <ItemAtividade
                  key={log.id}
                  log={log}
                  usuario={nomes.get(log.usuarioId) ?? 'Usuário excluído'}
                  processo={log.processoId ? apelido(log.processoId) : undefined}
                  destino={destinoDaAtividade(log, registros.data, podeLer)}
                />
              ))}
            </Lista>
          </Cartao>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Peças da tela

function Numero({
  rotulo,
  stat,
  valor,
  dadoValor,
  icone,
  apoio,
}: {
  rotulo: string
  /** Marcação estável para os testes (SDD §10): `data-stat="passivo"`. */
  stat: string
  valor: ReactNode
  /** Valor exato (ex.: centavos) quando o texto mostrado é arredondado. */
  dadoValor?: number
  icone: ReactNode
  apoio?: ReactNode
}) {
  return (
    <article className={estilos.numero}>
      <div className={estilos.numeroTopo}>
        <span className={estilos.numeroRotulo}>{rotulo}</span>
        <span className={estilos.numeroIcone} aria-hidden="true">
          {icone}
        </span>
      </div>
      <span className={estilos.numeroValor} data-stat={stat} data-valor={dadoValor}>
        {valor}
      </span>
      {apoio && <span className={estilos.numeroApoio}>{apoio}</span>}
    </article>
  )
}

/** Metade do cartão de prazos (RF-07): o número e, para quem lê prazos, o link para a agenda filtrada. */
function ParteDosPrazos({
  stat,
  valor,
  legenda,
  destaque = false,
  para,
}: {
  stat: string
  valor: number
  legenda: string
  destaque?: boolean
  para: string | undefined
}) {
  return (
    <div className={estilos.parte}>
      <span
        className={destaque ? `${estilos.numeroValor} ${estilos.perigo}` : estilos.numeroValor}
        data-stat={stat}
      >
        {valor}
      </span>
      {para ? (
        <Link to={para} className={estilos.numeroApoio}>
          {legenda}
        </Link>
      ) : (
        <span className={estilos.numeroApoio}>{legenda}</span>
      )}
    </div>
  )
}

function Cartao({
  titulo,
  icone,
  largo = false,
  children,
}: {
  titulo: string
  icone?: ReactNode
  largo?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-label={titulo}
      className={largo ? `${estilos.cartao} ${estilos.cartaoLargo}` : estilos.cartao}
    >
      <header className={estilos.cartaoCabecalho}>
        {icone && <span aria-hidden="true">{icone}</span>}
        <h2>{titulo}</h2>
      </header>
      <div className={estilos.cartaoCorpo}>{children}</div>
    </section>
  )
}

function Lista({ vazio, children }: { vazio: string; children: ReactNode[] }) {
  if (children.length === 0) return <Vazio titulo={vazio} />
  return <ul className={estilos.lista}>{children}</ul>
}

function Item({
  para,
  icone,
  titulo,
  apoio,
  data,
  selo,
}: {
  para: string
  icone: ReactNode
  titulo: string
  apoio: ReactNode
  data: string
  selo?: ReactNode
}) {
  return (
    <li>
      <Link to={para} className={estilos.item}>
        <span className={estilos.itemIcone} aria-hidden="true">
          {icone}
        </span>
        <span className={estilos.itemTexto}>
          <span className={estilos.itemTitulo}>{titulo}</span>
          <span className={estilos.itemApoio}>{apoio}</span>
        </span>
        <span className={estilos.itemLado}>
          <b>{data}</b>
          {selo}
        </span>
      </Link>
    </li>
  )
}

function ItemAtividade({
  log,
  usuario,
  processo,
  destino,
}: {
  log: Log
  usuario: string
  processo: string | undefined
  destino: string | null
}) {
  const [dia, hora] = formatarDataHora(log.data).split(' ')
  const conteudo = (
    <>
      <span className={estilos.itemTexto}>
        <span className={estilos.itemTitulo}>
          {`${ROTULOS_ACAO[log.acao]} ${ROTULOS_COLECAO[log.colecao] ?? log.colecao}`}
        </span>
        <span className={estilos.itemApoio}>{processo ? `${usuario} · ${processo}` : usuario}</span>
      </span>
      <span className={estilos.itemLado}>
        <b>{dia}</b>
        {hora}
      </span>
    </>
  )
  return (
    <li>
      {destino ? (
        <Link to={destino} className={`${estilos.item} ${estilos.itemCompacto}`}>
          {conteudo}
        </Link>
      ) : (
        <span className={`${estilos.item} ${estilos.itemCompacto} ${estilos.semLink}`}>
          {conteudo}
        </span>
      )}
    </li>
  )
}

function Funil({ tipo, etapas }: { tipo: TipoProcesso; etapas: readonly EtapaDoFunil[] }) {
  const total = etapas.reduce((soma, etapa) => soma + etapa.quantidade, 0)
  return (
    <div className={estilos.funil} data-tipo={tipo}>
      <h3 className={estilos.funilTitulo}>{ROTULOS_TIPO[tipo]}</h3>
      <ul className={estilos.funilEtapas}>
        {etapas.map((etapa) => {
          const parte = total === 0 ? 0 : Math.round((etapa.quantidade / total) * 100)
          return (
            <li key={etapa.fase} className={estilos.etapa} data-fase={etapa.fase}>
              <span className={estilos.etapaRotulo}>{etapa.rotulo}</span>
              <b className={estilos.etapaQuantidade}>{etapa.quantidade}</b>
              <span className={estilos.trilho} aria-hidden="true">
                <span
                  className={tipo === 'rj' ? estilos.barraRj : estilos.barraFalencia}
                  style={{ width: `${parte}%` }}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Link de cada atividade: o registro como está agora (como na tela de logs, LOG-03)

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
    queryKey: ['dashboard', 'registros', pedidos.map(chaveDoRegistro)],
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
