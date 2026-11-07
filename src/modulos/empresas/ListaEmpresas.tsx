// Lista de empresas (RF-16): busca por razão social, nome fantasia e CNPJ (com ou sem pontuação,
// BUS-03), paginação de 50, exportação CSV de tudo que passa na busca (RF-44) e exclusão (T-23).
// Busca e página ficam na URL, para o "voltar" do navegador e do formulário manterem a lista.
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useRepo } from '../../dados/contexto'
import { type Filtro, POR_PAGINA } from '../../dados/repositorio'
import { gerarCsv, nomeArquivoCsv } from '../../regras/csv'
import { formatarCnpj } from '../../regras/documentos'
import { pode } from '../../regras/permissoes'
import { hoje } from '../../regras/relogio'
import { Botao, BotaoIcone } from '../../ui/Botao'
import { Erro } from '../../ui/Erro'
import { CampoBusca, Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { AcoesLinha, type ColunaTabela, Tabela } from '../../ui/Tabela'
import { useExportarCsv } from '../../ui/useExportarCsv'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import { Cabecalho } from './Cabecalho'
import estilos from './Empresas.module.css'
import { useExclusaoEmpresa } from './ExclusaoEmpresa'
import { COLUNAS_CSV_EMPRESAS, type Empresa, ROTULOS_PORTE } from './empresas'

const ORDEM: Filtro<Empresa>['ordem'] = { campo: 'razaoSocial', direcao: 'asc' }

export function ListaEmpresas() {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'empresas') : false
  const navegar = useNavigate()
  const repo = useRepo('empresas')
  const [parametros, setParametros] = useSearchParams()
  const busca = parametros.get('busca') ?? ''
  const pagina = Number(parametros.get('pagina') ?? '1')
  const exclusao = useExclusaoEmpresa()

  const filtro: Filtro<Empresa> = { busca, ordem: ORDEM, pagina }
  const consulta = useQuery({
    queryKey: ['empresas', 'listar', filtro],
    queryFn: () => repo.listar(filtro),
    placeholderData: keepPreviousData,
  })

  function mudar(novos: { busca?: string; pagina?: number }) {
    const proximos = new URLSearchParams(parametros)
    if (novos.busca !== undefined) {
      if (novos.busca) proximos.set('busca', novos.busca)
      else proximos.delete('busca')
      proximos.delete('pagina')
    }
    if (novos.pagina !== undefined) {
      if (novos.pagina > 1) proximos.set('pagina', String(novos.pagina))
      else proximos.delete('pagina')
    }
    setParametros(proximos, { replace: true })
  }

  const exportacao = useExportarCsv(async () => ({
    nome: nomeArquivoCsv('empresas', hoje()),
    conteudo: gerarCsv(COLUNAS_CSV_EMPRESAS, await repo.todos({ busca, ordem: ORDEM })),
  }))

  const colunas: ColunaTabela<Empresa>[] = [
    {
      chave: 'razao',
      titulo: 'Razão social',
      largura: '38%',
      destaque: true,
      celula: (empresa) => (
        <span className={estilos.razao}>
          <Link to={`/empresas/${empresa.id}`}>{empresa.razaoSocial}</Link>
          {empresa.nomeFantasia && <span className={estilos.fantasia}>{empresa.nomeFantasia}</span>}
        </span>
      ),
    },
    {
      chave: 'cnpj',
      titulo: 'CNPJ',
      largura: '22%',
      numerica: true,
      celula: (empresa) => formatarCnpj(empresa.cnpj),
    },
    {
      chave: 'cidade',
      titulo: 'Cidade',
      largura: '20%',
      celula: (empresa) => `${empresa.cidade} – ${empresa.uf}`,
    },
    {
      chave: 'porte',
      titulo: 'Porte',
      largura: '9%',
      celula: (empresa) => ROTULOS_PORTE[empresa.porte],
    },
  ]
  if (podeEditar) {
    colunas.push({
      chave: 'acoes',
      titulo: 'Ações',
      largura: '11%',
      alinhar: 'direita',
      celula: (empresa) => (
        <AcoesLinha>
          <BotaoIcone
            aria-label={`Editar ${empresa.razaoSocial}`}
            icone={<Pencil size={18} />}
            onClick={() => navegar(`/empresas/${empresa.id}`)}
          />
          <BotaoIcone
            aria-label={`Excluir ${empresa.razaoSocial}`}
            icone={<Trash2 size={18} />}
            perigo
            onClick={() => exclusao.pedir(empresa)}
          />
        </AcoesLinha>
      ),
    })
  }

  const dados = consulta.data
  const apoio =
    dados && !busca && !consulta.isPlaceholderData
      ? `${dados.total} ${dados.total === 1 ? 'empresa cadastrada' : 'empresas cadastradas'}`
      : undefined

  return (
    <div className={estilos.tela}>
      <Cabecalho
        titulo="Empresas"
        apoio={apoio}
        acoes={
          <>
            {exportacao.botao}
            {podeEditar && (
              <Botao
                variante="primario"
                icone={<Plus size={18} />}
                onClick={() => navegar('/empresas/novo')}
              >
                Nova empresa
              </Botao>
            )}
          </>
        }
      />
      {exportacao.erro}
      <Filtros aoLimpar={busca ? () => mudar({ busca: '' }) : undefined}>
        <CampoBusca
          rotulo="Buscar por razão social, nome fantasia ou CNPJ"
          placeholder="Razão social, nome fantasia ou CNPJ"
          value={busca}
          onChange={(evento) => mudar({ busca: evento.target.value })}
        />
      </Filtros>
      {consulta.isError ? (
        <Erro mensagem="Não foi possível carregar as empresas." />
      ) : (
        dados && (
          <Tabela
            rotulo="Lista de empresas"
            colunas={colunas}
            linhas={dados.itens}
            chaveLinha={(empresa) => empresa.id}
            topo={<span>{resumo(dados.total, dados.pagina, dados.itens.length)}</span>}
            vazio={
              <Vazio
                titulo="Nenhuma empresa encontrada"
                descricao={busca ? 'Confira a busca ou limpe para ver todas.' : undefined}
              />
            }
            rodape={
              dados.paginas > 1 && (
                <Paginacao
                  pagina={dados.pagina}
                  totalPaginas={dados.paginas}
                  aoMudar={(nova) => mudar({ pagina: nova })}
                />
              )
            }
          />
        )
      )}
      {exclusao.elemento}
    </div>
  )
}

/** "Mostrando 1–40 de 40", como no guia. */
function resumo(total: number, pagina: number, naPagina: number): string {
  if (total === 0) return 'Nenhum resultado'
  const inicio = (pagina - 1) * POR_PAGINA + 1
  return `Mostrando ${inicio}–${inicio + naPagina - 1} de ${total}`
}
