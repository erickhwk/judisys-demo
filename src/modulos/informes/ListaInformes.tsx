// Lista geral de informes (RF-18 a RF-20): mais recentes primeiro, selo "Publicado no site", busca
// por título e filtros de categoria e processo, paginação de 50. Busca, filtros e página ficam na
// URL, para o "voltar" manter a lista.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useRepo, useTodos } from '../../dados/contexto'
import { type Filtro, POR_PAGINA } from '../../dados/repositorio'
import { CATEGORIAS_INFORME, type Tipos } from '../../dados/schemas'
import { pode } from '../../regras/permissoes'
import { Botao } from '../../ui/Botao'
import { CabecalhoPagina } from '../../ui/CabecalhoPagina'
import { CampoSelecao } from '../../ui/Campo'
import { Erro } from '../../ui/Erro'
import { CampoBusca, Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import { CATEGORIAS, ehCategoria, type Informe, ORDEM_INFORMES } from './informes'
import estilos from './informes.module.css'
import { TabelaInformes } from './TabelaInformes'

type Processo = Tipos['processos']

export function ListaInformes() {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'informes') : false
  const navegar = useNavigate()
  const repo = useRepo('informes')
  const [parametros, setParametros] = useSearchParams()
  const busca = parametros.get('busca') ?? ''
  const categoriaParam = parametros.get('categoria')
  const categoria = ehCategoria(categoriaParam) ? categoriaParam : undefined
  const processoId = parametros.get('processo') || undefined
  const pagina = Number(parametros.get('pagina') ?? '1')

  const consultaProcessos = useTodos('processos', { ordem: { campo: 'apelido', direcao: 'asc' } })
  const processos = useMemo(
    () => new Map<string, Processo>((consultaProcessos.data ?? []).map((p) => [p.id, p])),
    [consultaProcessos.data],
  )

  const filtro: Filtro<Informe> = {
    onde: { categoria, processoId },
    busca,
    ordem: ORDEM_INFORMES,
    pagina,
  }
  const consulta = useQuery({
    queryKey: ['informes', 'listar', filtro],
    queryFn: () => repo.listar(filtro),
    placeholderData: keepPreviousData,
  })

  type Parametro = 'busca' | 'categoria' | 'processo' | 'pagina'

  /** Troca um parâmetro da URL; busca e filtros voltam à primeira página. */
  function mudar(chave: Parametro, valor: string) {
    const proximos = new URLSearchParams(parametros)
    if (valor && !(chave === 'pagina' && valor === '1')) proximos.set(chave, valor)
    else proximos.delete(chave)
    if (chave !== 'pagina') proximos.delete('pagina')
    setParametros(proximos, { replace: true })
  }

  function limpar() {
    const proximos = new URLSearchParams(parametros)
    for (const chave of ['busca', 'categoria', 'processo', 'pagina']) proximos.delete(chave)
    setParametros(proximos, { replace: true })
  }

  const filtrando = Boolean(busca || categoria || processoId)
  const dados = consulta.data

  return (
    <div className={estilos.tela}>
      <CabecalhoPagina
        titulo="Informes"
        apoio={
          dados && !filtrando && !consulta.isPlaceholderData
            ? `${dados.total} ${dados.total === 1 ? 'informe' : 'informes'}, mais recentes primeiro`
            : undefined
        }
        acoes={
          podeEditar && (
            <Botao
              variante="primario"
              icone={<Plus size={18} />}
              onClick={() => navegar('/informes/novo')}
            >
              Novo informe
            </Botao>
          )
        }
      />
      <Filtros aoLimpar={filtrando ? limpar : undefined}>
        <CampoBusca
          rotulo="Buscar informe por título"
          placeholder="Título do informe"
          value={busca}
          onChange={(evento) => mudar('busca', evento.target.value)}
        />
        <CampoSelecao
          rotulo="Categoria"
          rotuloOculto
          value={categoria ?? ''}
          onChange={(evento) => mudar('categoria', evento.target.value)}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((valor) => (
            <option key={valor} value={valor}>
              {CATEGORIAS_INFORME[valor]}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao
          rotulo="Processo"
          rotuloOculto
          value={processoId ?? ''}
          onChange={(evento) => mudar('processo', evento.target.value)}
        >
          <option value="">Todos os processos</option>
          {(consultaProcessos.data ?? []).map((processo) => (
            <option key={processo.id} value={processo.id}>
              {processo.apelido}
            </option>
          ))}
        </CampoSelecao>
      </Filtros>
      {consulta.isError ? (
        <Erro mensagem="Não foi possível carregar os informes." />
      ) : (
        dados && (
          <TabelaInformes
            rotulo="Lista de informes"
            informes={dados.itens}
            processos={processos}
            topo={<span>{resumo(dados.total, dados.pagina, dados.itens.length)}</span>}
            vazio={
              <Vazio
                titulo="Nenhum informe encontrado"
                descricao={filtrando ? 'Confira a busca ou limpe para ver todos.' : undefined}
              />
            }
            rodape={
              dados.paginas > 1 && (
                <Paginacao
                  pagina={dados.pagina}
                  totalPaginas={dados.paginas}
                  aoMudar={(nova) => mudar('pagina', String(nova))}
                />
              )
            }
          />
        )
      )}
    </div>
  )
}

/** "Mostrando 1–50 de 77", como nas outras listas. */
function resumo(total: number, pagina: number, naPagina: number): string {
  if (total === 0) return 'Nenhum resultado'
  const inicio = (pagina - 1) * POR_PAGINA + 1
  return `Mostrando ${inicio}–${inicio + naPagina - 1} de ${total}`
}
