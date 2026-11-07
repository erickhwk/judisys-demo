// Lista de processos (RF-11), como `processos-lista.html`: busca por apelido, CNJ e empresa,
// abas por tipo, filtro de fase, paginação de 50 e exportação CSV de tudo que passa nos filtros
// (RF-44). Busca, filtros e página ficam na URL.
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useRepo, useTodos } from '../../dados/contexto'
import { POR_PAGINA } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { formatarCnj } from '../../regras/documentos'
import {
  FASES_FALENCIA,
  FASES_FINAIS_ALTERNATIVAS_RJ,
  FASES_RJ,
  type Fase,
  fasesDoTipo,
  ROTULOS_FASE,
  type TipoProcesso,
} from '../../regras/fases'
import { pode } from '../../regras/permissoes'
import { hoje } from '../../regras/relogio'
import { Botao, BotaoIcone } from '../../ui/Botao'
import { CampoSelecao } from '../../ui/Campo'
import { Erro } from '../../ui/Erro'
import { CampoBusca, Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { Selo } from '../../ui/Selo'
import { AcoesLinha, type ColunaTabela, Tabela } from '../../ui/Tabela'
import { useExportarCsv } from '../../ui/useExportarCsv'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import { Cabecalho } from './Cabecalho'
import { useExcluirProcesso } from './ExcluirProcesso'
import { exportarProcessos } from './exportacao'
import { listarProcessos } from './listagem'
import { NavegacaoAbas } from './NavegacaoAbas'
import { plural, ROTULOS_TIPO, TOM_TIPO } from './rotulos'

type Processo = Tipos['processos']

/** Todas as fases, sem repetir "Encerrada", para o filtro sem tipo escolhido. */
const TODAS_AS_FASES: Fase[] = [
  ...new Set<Fase>([...FASES_RJ, ...FASES_FINAIS_ALTERNATIVAS_RJ, ...FASES_FALENCIA]),
]

function lerTipo(valor: string | null): TipoProcesso | undefined {
  return valor === 'rj' || valor === 'falencia' ? valor : undefined
}

function lerFase(valor: string | null): Fase | undefined {
  return TODAS_AS_FASES.find((fase) => fase === valor)
}

export function ListaProcessos() {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'processos') : false
  const navegar = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const busca = parametros.get('busca') ?? ''
  const tipo = lerTipo(parametros.get('tipo'))
  const fase = lerFase(parametros.get('fase'))
  const pagina = Number(parametros.get('pagina') ?? 1)

  const repos = {
    processos: useRepo('processos'),
    empresas: useRepo('empresas'),
    processoEmpresas: useRepo('processoEmpresas'),
  }
  const repoUsuarios = useRepo('usuarios')
  const filtro = { busca, tipo, fase, pagina }
  const lista = useQuery({
    queryKey: ['processos', 'lista', filtro],
    queryFn: () => listarProcessos(repos, filtro),
    placeholderData: (anterior) => anterior,
  })
  const usuarios = useTodos('usuarios')
  const nomeDe = (id: string) => usuarios.data?.find((u) => u.id === id)?.nome ?? '—'
  const exclusao = useExcluirProcesso()
  const exportacao = useExportarCsv(() =>
    exportarProcessos({ ...repos, usuarios: repoUsuarios }, { busca, tipo, fase }, hoje()),
  )

  /** Troca parâmetros da URL; mudar busca ou filtro volta à primeira página. */
  function mudar(novos: Record<string, string | undefined>) {
    setParametros(
      (atuais) => {
        const proximos = new URLSearchParams(atuais)
        for (const [chave, valor] of Object.entries(novos)) {
          if (valor) proximos.set(chave, valor)
          else proximos.delete(chave)
        }
        if (!('pagina' in novos)) proximos.delete('pagina')
        return proximos
      },
      { replace: true },
    )
  }

  /** Link da aba de tipo, mantendo busca e fase (a fase sai se não for do tipo). */
  function paraTipo(novo?: TipoProcesso) {
    const proximos = new URLSearchParams(parametros)
    proximos.delete('pagina')
    if (novo) proximos.set('tipo', novo)
    else proximos.delete('tipo')
    if (novo && fase && !fasesDoTipo(novo).includes(fase)) proximos.delete('fase')
    return { search: proximos.toString() }
  }

  const fasesDoFiltro = tipo ? fasesDoTipo(tipo) : TODAS_AS_FASES
  const dados = lista.data
  const total = dados?.porTipo.todos ?? 0

  const colunas: ColunaTabela<Processo>[] = [
    {
      chave: 'apelido',
      titulo: 'Apelido',
      largura: '26%',
      destaque: true,
      celula: (p) => <Link to={`/processos/${p.id}/visao-geral`}>{p.apelido}</Link>,
    },
    {
      chave: 'numero',
      titulo: 'Número CNJ',
      largura: '24%',
      numerica: true,
      celula: (p) => formatarCnj(p.numeroCnj),
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      largura: '20%',
      celula: (p) => (
        <Selo forma="pilula" tom={TOM_TIPO[p.tipo]}>
          {ROTULOS_TIPO[p.tipo]}
        </Selo>
      ),
    },
    { chave: 'fase', titulo: 'Fase', largura: '16%', celula: (p) => ROTULOS_FASE[p.faseAtual] },
    {
      chave: 'responsavel',
      titulo: 'Responsável',
      largura: '14%',
      celula: (p) => nomeDe(p.responsavelId),
    },
    ...(podeEditar
      ? [
          {
            chave: 'acoes',
            titulo: 'Ações',
            largura: '120px',
            alinhar: 'direita' as const,
            celula: (p: Processo) => (
              <AcoesLinha>
                <BotaoIcone
                  aria-label={`Editar ${p.apelido}`}
                  icone={<Pencil size={20} />}
                  onClick={() => navegar(`/processos/${p.id}/editar`)}
                />
                <BotaoIcone
                  aria-label={`Excluir ${p.apelido}`}
                  icone={<Trash2 size={20} />}
                  perigo
                  onClick={() => exclusao.pedir(p)}
                />
              </AcoesLinha>
            ),
          },
        ]
      : []),
  ]

  const inicio = dados && dados.total > 0 ? (dados.pagina - 1) * POR_PAGINA + 1 : 0
  const fim = dados ? Math.min(dados.pagina * POR_PAGINA, dados.total) : 0

  return (
    <>
      <Cabecalho
        titulo="Processos"
        subtitulo={
          lista.isSuccess && !busca && !fase
            ? `${plural(total, 'processo cadastrado', 'processos cadastrados')}`
            : undefined
        }
        acoes={
          <>
            {exportacao.botao}
            {podeEditar && (
              <Botao
                variante="primario"
                icone={<Plus size={18} />}
                onClick={() => navegar('/processos/novo')}
              >
                Novo processo
              </Botao>
            )}
          </>
        }
      />
      {exportacao.erro}

      <Filtros
        aoLimpar={busca || fase || tipo ? () => setParametros({}, { replace: true }) : undefined}
      >
        <CampoBusca
          rotulo="Buscar por apelido, número CNJ ou empresa"
          placeholder="Apelido, número CNJ ou empresa"
          value={busca}
          onChange={(evento) => mudar({ busca: evento.target.value })}
        />
        <CampoSelecao
          rotulo="Fase"
          rotuloOculto
          value={fase ?? ''}
          onChange={(evento) => mudar({ fase: evento.target.value })}
        >
          <option value="">Todas as fases</option>
          {fasesDoFiltro.map((f) => (
            <option key={f} value={f}>
              {ROTULOS_FASE[f]}
            </option>
          ))}
        </CampoSelecao>
      </Filtros>

      {exclusao.erro && <Erro titulo="Não foi possível excluir" mensagem={exclusao.erro} />}
      {lista.isError ? (
        <Erro mensagem="Não foi possível carregar os processos." />
      ) : (
        <Tabela
          rotulo="Lista de processos"
          colunas={colunas}
          linhas={dados?.itens ?? []}
          chaveLinha={(p) => p.id}
          topo={
            <>
              <NavegacaoAbas
                rotulo="Tipo de processo"
                itens={[
                  {
                    chave: 'todos',
                    rotulo: 'Todos',
                    para: paraTipo(),
                    ativa: !tipo,
                    contagem: dados?.porTipo.todos,
                  },
                  {
                    chave: 'rj',
                    rotulo: 'Recuperação judicial',
                    para: paraTipo('rj'),
                    ativa: tipo === 'rj',
                    contagem: dados?.porTipo.rj,
                  },
                  {
                    chave: 'falencia',
                    rotulo: 'Falência',
                    para: paraTipo('falencia'),
                    ativa: tipo === 'falencia',
                    contagem: dados?.porTipo.falencia,
                  },
                ]}
              />
              {dados && dados.total > 0 && (
                <span>
                  Mostrando {inicio}–{fim} de {dados.total}
                </span>
              )}
            </>
          }
          vazio={
            lista.isSuccess ? (
              <Vazio
                titulo="Nenhum processo encontrado"
                descricao={
                  busca || fase || tipo ? 'Tente outra busca ou limpe os filtros.' : undefined
                }
              />
            ) : (
              <Vazio titulo="Carregando processos…" />
            )
          }
          rodape={
            dados && dados.paginas > 1 ? (
              <Paginacao
                pagina={dados.pagina}
                totalPaginas={dados.paginas}
                aoMudar={(nova) => mudar({ pagina: String(nova) })}
              />
            ) : undefined
          }
        />
      )}
      {exclusao.dialogo}
    </>
  )
}
