// Agenda geral (RF-25, SDD §7.4): prazos de todos os processos em lista, com os filtros de período,
// processo e responsável (PRZ-08) e exportação CSV de tudo que passa nos filtros (RF-44), ou no
// calendário mensal (PRZ-09). Vista, filtros, mês e página ficam na URL
// (#/agenda?vista=lista|calendario), para o link e o voltar do navegador.
import { CalendarDays, List, Plus } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useTodos } from '../../dados/contexto'
import { POR_PAGINA } from '../../dados/repositorio'
import { hoje as hojeDoRelogio } from '../../regras/relogio'
import { Botao } from '../../ui/Botao'
import { CampoSelecao } from '../../ui/Campo'
import { juntarClasses } from '../../ui/classes'
import { Erro } from '../../ui/Erro'
import { Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { useExportarCsv } from '../../ui/useExportarCsv'
import { Vazio } from '../../ui/Vazio'
import { AvisoDaAcao } from './AvisoDaAcao'
import { CalendarioMensal } from './CalendarioMensal'
import { exportarPrazos } from './exportacao'
import estilos from './prazos.module.css'
import {
  ehMes,
  ehPeriodo,
  type FiltroAgenda,
  filtrarAgenda,
  mesDe,
  PERIODO_PADRAO,
  PERIODOS,
  type Periodo,
} from './regras'
import { TabelaPrazos } from './TabelaPrazos'
import { useAcoesPrazo } from './useAcoesPrazo'

type Vista = 'lista' | 'calendario'

const ORDEM_APELIDO = { ordem: { campo: 'apelido', direcao: 'asc' } } as const
const ORDEM_NOME = { ordem: { campo: 'nome', direcao: 'asc' } } as const

export function Agenda() {
  const hoje = hojeDoRelogio()
  const [parametros, setParametros] = useSearchParams()
  const vista: Vista = parametros.get('vista') === 'calendario' ? 'calendario' : 'lista'
  const periodoNaUrl = parametros.get('periodo')
  const mesNaUrl = parametros.get('mes')
  const filtro: FiltroAgenda = {
    periodo: ehPeriodo(periodoNaUrl) ? periodoNaUrl : PERIODO_PADRAO,
    processoId: parametros.get('processo') ?? '',
    responsavelId: parametros.get('responsavel') ?? '',
  }
  const mes = ehMes(mesNaUrl) ? mesNaUrl : mesDe(hoje)
  const pagina = Math.floor(Number(parametros.get('pagina') ?? 1)) || 1

  const consultaPrazos = useTodos('prazos')
  const consultaProcessos = useTodos('processos', ORDEM_APELIDO)
  const consultaUsuarios = useTodos('usuarios', ORDEM_NOME)

  const processos = useMemo(
    () => new Map((consultaProcessos.data ?? []).map((p) => [p.id, p])),
    [consultaProcessos.data],
  )
  const responsaveis = useMemo(
    () => new Map((consultaUsuarios.data ?? []).map((u) => [u.id, u.nome])),
    [consultaUsuarios.data],
  )
  const opcoesProcesso = useMemo(
    () => (consultaProcessos.data ?? []).map((p) => ({ id: p.id, rotulo: p.apelido })),
    [consultaProcessos.data],
  )
  const opcoesResponsavel = useMemo(() => {
    const comProcesso = new Set((consultaProcessos.data ?? []).map((p) => p.responsavelId))
    return (consultaUsuarios.data ?? []).filter((u) => comProcesso.has(u.id))
  }, [consultaProcessos.data, consultaUsuarios.data])

  const acoes = useAcoesPrazo({ processos, opcoesProcesso })

  // No calendário o período não se aplica: o mês mostra abertos e cumpridos.
  const periodo = vista === 'calendario' ? 'todos' : filtro.periodo
  const { processoId, responsavelId } = filtro
  const filtrados = useMemo(
    () =>
      filtrarAgenda(
        consultaPrazos.data ?? [],
        processos,
        { periodo, processoId, responsavelId },
        hoje,
      ),
    [consultaPrazos.data, processos, periodo, processoId, responsavelId, hoje],
  )

  const exportacao = useExportarCsv(() => exportarPrazos(filtrados, processos, responsaveis, hoje))

  const mudar = (mudancas: Record<string, string | null>) => {
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        for (const [chave, valor] of Object.entries(mudancas)) {
          if (valor === null || valor === '') novos.delete(chave)
          else novos.set(chave, valor)
        }
        return novos
      },
      { replace: true },
    )
  }
  // Filtro novo volta à primeira página.
  const filtrar = (chave: 'periodo' | 'processo' | 'responsavel', valor: string) =>
    mudar({ [chave]: valor, pagina: null })

  // No calendário o campo Período não aparece: só processo e responsável contam como filtro.
  const filtrou =
    (vista === 'lista' && filtro.periodo !== PERIODO_PADRAO) ||
    filtro.processoId !== '' ||
    filtro.responsavelId !== ''
  const carregando =
    consultaPrazos.isPending || consultaProcessos.isPending || consultaUsuarios.isPending
  const falhou = consultaPrazos.isError || consultaProcessos.isError || consultaUsuarios.isError

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas)
  const daPagina = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  return (
    <>
      <div className={estilos.cabecalho}>
        <div className={estilos.cabecalhoTexto}>
          <h1>Agenda</h1>
          <p className={estilos.subtitulo}>
            {carregando ? 'Carregando…' : contagem(filtrados.length, vista)}
          </p>
        </div>
        <div className={estilos.cabecalhoAcoes}>
          <fieldset className={estilos.vistas}>
            <legend className="somente-leitor">Vista</legend>
            <BotaoVista
              atual={vista}
              vista="lista"
              icone={<List size={18} />}
              aoEscolher={() => mudar({ vista: null })}
            >
              Lista
            </BotaoVista>
            <BotaoVista
              atual={vista}
              vista="calendario"
              icone={<CalendarDays size={18} />}
              aoEscolher={() => mudar({ vista: 'calendario', pagina: null })}
            >
              Calendário
            </BotaoVista>
          </fieldset>
          {vista === 'lista' && !carregando && !falhou && exportacao.botao}
          {acoes.podeEditar && (
            <Botao variante="primario" icone={<Plus size={18} />} onClick={() => acoes.novo()}>
              Novo prazo
            </Botao>
          )}
        </div>
      </div>

      <Filtros
        titulo="Filtrar"
        {...(filtrou
          ? {
              aoLimpar: () =>
                mudar({ periodo: null, processo: null, responsavel: null, pagina: null }),
            }
          : {})}
      >
        {vista === 'lista' && (
          <CampoSelecao
            rotulo="Período"
            value={filtro.periodo}
            onChange={(e) => filtrar('periodo', e.target.value)}
          >
            {(Object.keys(PERIODOS) as Periodo[]).map((periodo) => (
              <option key={periodo} value={periodo}>
                {PERIODOS[periodo]}
              </option>
            ))}
          </CampoSelecao>
        )}
        <CampoSelecao
          rotulo="Processo"
          value={filtro.processoId}
          onChange={(e) => filtrar('processo', e.target.value)}
        >
          <option value="">Todos os processos</option>
          {opcoesProcesso.map((opcao) => (
            <option key={opcao.id} value={opcao.id}>
              {opcao.rotulo}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao
          rotulo="Responsável"
          value={filtro.responsavelId}
          onChange={(e) => filtrar('responsavel', e.target.value)}
        >
          <option value="">Todos os responsáveis</option>
          {opcoesResponsavel.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nome}
            </option>
          ))}
        </CampoSelecao>
      </Filtros>

      <AvisoDaAcao aviso={acoes.aviso} />
      {exportacao.erro}

      {falhou ? (
        <Erro mensagem="Não foi possível carregar a agenda." />
      ) : vista === 'calendario' ? (
        <CalendarioMensal
          mes={mes}
          hoje={hoje}
          prazos={filtrados}
          processos={processos}
          aoMudarMes={(novo) => mudar({ mes: novo === mesDe(hoje) ? null : novo })}
        />
      ) : (
        <TabelaPrazos
          rotulo="Prazos da agenda"
          prazos={daPagina}
          hoje={hoje}
          acoes={acoes}
          processos={processos}
          responsaveis={responsaveis}
          vazio={
            <Vazio
              titulo={carregando ? 'Carregando prazos…' : 'Nenhum prazo encontrado'}
              {...(filtrou && !carregando
                ? { descricao: 'Mude o período ou limpe os filtros para ver mais prazos.' }
                : {})}
            />
          }
          {...(filtrados.length > 0
            ? { topo: <span>{faixa(paginaAtual, filtrados.length)}</span> }
            : {})}
          rodape={
            totalPaginas > 1 ? (
              <Paginacao
                pagina={paginaAtual}
                totalPaginas={totalPaginas}
                aoMudar={(nova) => mudar({ pagina: nova === 1 ? null : String(nova) })}
              />
            ) : undefined
          }
        />
      )}
      {acoes.dialogos}
    </>
  )
}

function BotaoVista({
  atual,
  vista,
  icone,
  aoEscolher,
  children,
}: {
  atual: Vista
  vista: Vista
  icone: ReactNode
  aoEscolher: () => void
  children: string
}) {
  const ativa = atual === vista
  return (
    <button
      type="button"
      className={juntarClasses(estilos.vista, ativa && estilos.vistaAtiva)}
      aria-pressed={ativa}
      onClick={aoEscolher}
    >
      <span aria-hidden="true">{icone}</span>
      {children}
    </button>
  )
}

function contagem(total: number, vista: Vista): string {
  if (vista === 'calendario') return 'Prazos de todos os processos, mês a mês'
  if (total === 0) return 'Nenhum prazo no filtro'
  return total === 1 ? '1 prazo no filtro' : `${total} prazos no filtro`
}

function faixa(pagina: number, total: number): string {
  const inicio = (pagina - 1) * POR_PAGINA + 1
  const fim = Math.min(pagina * POR_PAGINA, total)
  return `Mostrando ${inicio}–${fim} de ${total}`
}
