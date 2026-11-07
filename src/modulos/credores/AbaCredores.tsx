// Aba Credores do processo (RF-26 a RF-30): quadro-resumo por classe acima da lista, filtro por
// classe, busca por nome ou CPF/CNPJ, 50 por página, e os pedidos de quem está fora da lista.
// Só o conteúdo: o cabeçalho do processo e as abas são da TelaDoProcesso (DMO-12).
import { FilePlus2, Printer, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { Tipos } from '../../dados/schemas'
import { formatarMoeda } from '../../regras/datas'
import { formatarDocumento } from '../../regras/documentos'
import type { TipoProcesso } from '../../regras/fases'
import { pode } from '../../regras/permissoes'
import { type Classe, resumoPorClasse, rotuloClasse } from '../../regras/qgc'
import { Botao } from '../../ui/Botao'
import { CampoSelecao } from '../../ui/Campo'
import { CampoBusca, Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import {
  useCredoresDoProcesso,
  usePaginaDeCredores,
  usePedidosDoProcesso,
  useProcesso,
  useRelacaoPublicada,
} from './consultas'
import estilos from './credores.module.css'
import { DialogoCredor } from './DialogoCredor'
import { DialogoPedido } from './DialogoPedido'
import { classesDoTipo } from './formularios'
import { ListaPedidos } from './ListaPedidos'
import { valorOuTraco } from './moeda'
import { QuadroResumo } from './QuadroResumo'

type Credor = Tipos['credores']

export function AbaCredores({ processoId }: { processoId: string }) {
  const processo = useProcesso(processoId)
  if (processo.isPending) return <p className={estilos.carregando}>Carregando credores…</p>
  if (!processo.data) return <Vazio titulo="Processo não encontrado" />
  return <ConteudoAba processoId={processoId} tipo={processo.data.tipo} />
}

function ConteudoAba({ processoId, tipo }: { processoId: string; tipo: TipoProcesso }) {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'credores') : false
  const [parametros, setParametros] = useSearchParams()
  const busca = parametros.get('busca') ?? ''
  const classe = (parametros.get('classe') ?? '') as Classe | ''
  const pagina = Number(parametros.get('pagina') ?? '1') || 1
  const [dialogo, setDialogo] = useState<'credor' | 'pedido' | null>(null)

  const todos = useCredoresDoProcesso(processoId)
  const publicada = useRelacaoPublicada(processoId)
  const pedidos = usePedidosDoProcesso(processoId)
  const lista = usePaginaDeCredores({
    onde: { processoId, classe: classe || undefined },
    busca,
    pagina,
    ordem: { campo: 'nome', direcao: 'asc' },
  })

  function mudar(campos: Record<string, string>) {
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        for (const [chave, valor] of Object.entries(campos)) {
          if (valor) novos.set(chave, valor)
          else novos.delete(chave)
        }
        return novos
      },
      { replace: true },
    )
  }

  const foraDaLista = (pedidos.data ?? []).filter((pedido) => !pedido.credorId)

  return (
    <div className={estilos.aba}>
      <div className={estilos.barraAcoes}>
        <Link to={`/processos/${processoId}/qgc`} className={estilos.botaoLink}>
          <Printer size={18} aria-hidden="true" />
          QGC para impressão
        </Link>
        {podeEditar && (
          <>
            <Botao
              variante="secundario"
              icone={<FilePlus2 size={18} />}
              onClick={() => setDialogo('pedido')}
              disabled={publicada.data === undefined}
            >
              Pedido de quem está fora da lista
            </Botao>
            <Botao
              variante="primario"
              icone={<UserPlus size={18} />}
              onClick={() => setDialogo('credor')}
            >
              Novo credor
            </Botao>
          </>
        )}
      </div>

      {todos.data && <QuadroResumo resumo={resumoPorClasse(todos.data)} tipo={tipo} />}

      <Filtros
        titulo="Buscar credores"
        aoLimpar={busca || classe ? () => mudar({ busca: '', classe: '', pagina: '' }) : undefined}
      >
        <CampoBusca
          rotulo="Buscar por nome ou CPF/CNPJ"
          placeholder="Buscar por nome ou CPF/CNPJ"
          value={busca}
          onChange={(evento) => mudar({ busca: evento.target.value, pagina: '' })}
        />
        <CampoSelecao
          rotulo="Classe"
          rotuloOculto
          value={classe}
          onChange={(evento) => mudar({ classe: evento.target.value, pagina: '' })}
        >
          <option value="">Todas as classes</option>
          {classesDoTipo(tipo).map((opcao) => (
            <option key={opcao} value={opcao}>
              {rotuloClasse(opcao, tipo)}
            </option>
          ))}
        </CampoSelecao>
      </Filtros>

      <Tabela<Credor>
        rotulo="Credores"
        linhas={lista.data?.itens ?? []}
        chaveLinha={(credor) => credor.id}
        topo={
          <span>
            {lista.data
              ? `${lista.data.total} ${lista.data.total === 1 ? 'credor' : 'credores'}`
              : 'Carregando…'}
          </span>
        }
        vazio={
          lista.data && (
            <Vazio
              titulo="Nenhum credor encontrado"
              descricao={busca || classe ? 'Mude a busca ou o filtro de classe.' : undefined}
            />
          )
        }
        rodape={
          lista.data && (
            <Paginacao
              pagina={lista.data.pagina}
              totalPaginas={lista.data.paginas}
              aoMudar={(nova) => mudar({ pagina: nova > 1 ? String(nova) : '' })}
            />
          )
        }
        colunas={[
          {
            chave: 'nome',
            titulo: 'Credor',
            destaque: true,
            celula: (credor) => (
              <Link to={`/processos/${processoId}/credores/${credor.id}`}>{credor.nome}</Link>
            ),
          },
          {
            chave: 'documento',
            titulo: 'CPF/CNPJ',
            largura: '180px',
            numerica: true,
            celula: (credor) => formatarDocumento(credor.documento),
          },
          {
            chave: 'classe',
            titulo: 'Classe',
            largura: '170px',
            celula: (credor) => rotuloClasse(credor.classe, tipo),
          },
          {
            chave: 'devedor',
            titulo: 'Relação do devedor',
            largura: '160px',
            alinhar: 'direita',
            numerica: true,
            celula: (credor) => formatarMoeda(credor.valorDevedor),
          },
          {
            chave: 'aj',
            titulo: 'Relação do AJ',
            largura: '160px',
            alinhar: 'direita',
            numerica: true,
            celula: (credor) => valorOuTraco(credor.valorAj),
          },
          {
            chave: 'qgc',
            titulo: 'QGC',
            largura: '160px',
            alinhar: 'direita',
            numerica: true,
            celula: (credor) => valorOuTraco(credor.valorQgc),
          },
        ]}
      />

      {foraDaLista.length > 0 && (
        <section className={estilos.secao} aria-labelledby="titulo-fora-da-lista">
          <h2 id="titulo-fora-da-lista" className={estilos.tituloSecao}>
            Pedidos de quem está fora da lista
          </h2>
          <p className={estilos.notaSecao}>
            O requerente só vira credor quando o pedido é acolhido; rejeitar não cria nada.
          </p>
          <ListaPedidos
            rotulo="Pedidos de quem está fora da lista"
            pedidos={foraDaLista}
            tipoProcesso={tipo}
            comRequerente
            podeEditar={podeEditar}
            relacaoPublicada={publicada.data}
          />
        </section>
      )}

      <DialogoCredor
        aberto={dialogo === 'credor'}
        aoFechar={() => setDialogo(null)}
        processo={{ id: processoId, tipo }}
      />
      {publicada.data !== undefined && (
        <DialogoPedido
          aberto={dialogo === 'pedido'}
          aoFechar={() => setDialogo(null)}
          processo={{ id: processoId, tipo }}
          publicada={publicada.data}
        />
      )}
    </div>
  )
}
