// Tela do informe (`#/informes/:id`, RF-18 a RF-21, T-09, T-30): dados, o resumo da ata quando
// houver (acima do PDF genérico) e os anexos: PDF no visualizador, outros tipos baixados. Quem
// edita informes troca para o formulário com `?editar=1`.
import { Download, Eye, FileText, Pencil } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useRegistro } from '../../dados/contexto'
import { type Anexo, CATEGORIAS_INFORME } from '../../dados/schemas'
import { chaveAnexo } from '../../dados/servicos/informes'
import { formatarData } from '../../regras/datas'
import { ROTULOS_FASE } from '../../regras/fases'
import { pode } from '../../regras/permissoes'
import { Botao } from '../../ui/Botao'
import { ApoioEmLinha, CabecalhoPagina } from '../../ui/CabecalhoPagina'
import { juntarClasses } from '../../ui/classes'
import { Erro } from '../../ui/Erro'
import { Selo } from '../../ui/Selo'
import { VisualizadorPdf } from '../../ui/VisualizadorPdf'
import { useSessao } from '../entrada/sessao'
import { rotaDoProcesso } from '../processos/abas'
import { useUrlDoAnexo } from './anexos'
import { CamposInforme, Voltar } from './FormularioInforme'
import { ehPdf, formatarTamanho, type Informe } from './informes'
import estilos from './informes.module.css'
import { SELO_PUBLICADO } from './TabelaInformes'

export function TelaInforme() {
  const { id } = useParams()
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'informes') : false
  const [parametros, setParametros] = useSearchParams()
  const editando = podeEditar && parametros.get('editar') === '1'
  const consulta = useRegistro('informes', id)
  const processo = useRegistro('processos', consulta.data?.processoId)

  function editar(sim: boolean) {
    const proximos = new URLSearchParams(parametros)
    if (sim) proximos.set('editar', '1')
    else proximos.delete('editar')
    setParametros(proximos, { replace: true })
  }

  if (consulta.isPending) return null
  if (consulta.isError || !consulta.data) {
    return (
      <div className={estilos.tela}>
        <CabecalhoPagina
          trilha={[{ rotulo: 'Informes', para: '/informes' }, { rotulo: 'Informe' }]}
          titulo="Informe"
          acoes={<Voltar para="/informes" />}
        />
        <Erro
          titulo="Registro não existe mais"
          mensagem="O informe pode ter sido excluído."
          acao={<Link to="/informes">Voltar para os informes</Link>}
        />
      </div>
    )
  }

  const informe = consulta.data
  const apelido = processo.data?.apelido
  return (
    <div className={estilos.tela}>
      <CabecalhoPagina
        trilha={[
          { rotulo: 'Informes', para: '/informes' },
          ...(apelido
            ? [{ rotulo: apelido, para: rotaDoProcesso(informe.processoId, 'visao-geral') }]
            : []),
          { rotulo: editando ? 'Editar' : 'Informe' },
        ]}
        titulo={informe.titulo}
        apoio={
          <ApoioEmLinha>
            <span>{CATEGORIAS_INFORME[informe.categoria]}</span>
            <span>{formatarData(informe.data)}</span>
            {informe.publicadoNoSite && <Selo tom="sucesso">{SELO_PUBLICADO}</Selo>}
          </ApoioEmLinha>
        }
        acoes={
          !editando && (
            <>
              <Voltar para={rotaDoProcesso(informe.processoId, 'informes')} />
              {podeEditar && (
                <Botao
                  variante="primario"
                  icone={<Pencil size={18} />}
                  onClick={() => editar(true)}
                >
                  Editar
                </Botao>
              )}
            </>
          )
        }
      />
      {editando ? (
        // `key`: o informe regravado recomeça o formulário com os valores novos.
        <CamposInforme
          key={`${informe.id}-${informe.atualizadoEm}`}
          informe={informe}
          aoCancelar={() => editar(false)}
        />
      ) : (
        <Detalhes informe={informe} apelido={apelido} />
      )}
    </div>
  )
}

function Detalhes({ informe, apelido }: { informe: Informe; apelido?: string }) {
  const idDados = useId()
  const idResumo = useId()
  const folhas = [informe.folhaInicial, informe.folhaFinal].filter((f) => f !== undefined)

  return (
    <>
      <section className={juntarClasses(estilos.cartao, estilos.secao)} aria-labelledby={idDados}>
        <h2 id={idDados} className={estilos.tituloSecao}>
          Dados do informe
        </h2>
        <dl className={estilos.dados}>
          <div>
            <dt>Processo</dt>
            <dd>
              <Link to={rotaDoProcesso(informe.processoId, 'informes')}>{apelido ?? '—'}</Link>
            </dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{CATEGORIAS_INFORME[informe.categoria]}</dd>
          </div>
          <div>
            <dt>Fase</dt>
            <dd>{informe.fase ? ROTULOS_FASE[informe.fase] : '—'}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd className="numeros-tabulares">{formatarData(informe.data)}</dd>
          </div>
          {informe.categoria === 'atas-agc' && (
            <div>
              <dt>Data da AGC</dt>
              <dd className="numeros-tabulares">
                {informe.dataAgc ? formatarData(informe.dataAgc) : '—'}
              </dd>
            </div>
          )}
          <div>
            <dt>Folhas</dt>
            <dd className="numeros-tabulares">{folhas.length ? folhas.join(' a ') : '—'}</dd>
          </div>
          <div>
            <dt>Site</dt>
            <dd>{informe.publicadoNoSite ? SELO_PUBLICADO : 'Não publicado'}</dd>
          </div>
        </dl>
      </section>

      {informe.resumo && (
        <section
          className={juntarClasses(estilos.cartao, estilos.secao)}
          aria-labelledby={idResumo}
        >
          <h2 id={idResumo} className={estilos.tituloSecao}>
            Resumo
          </h2>
          <p className={estilos.resumo}>{informe.resumo}</p>
        </section>
      )}

      <Anexos anexos={informe.anexos} />
    </>
  )
}

function Anexos({ anexos }: { anexos: Anexo[] }) {
  const idTitulo = useId()
  const pdfs = anexos.filter(ehPdf)
  const [escolhido, setEscolhido] = useState<string | undefined>(
    pdfs[0] ? chaveAnexo(pdfs[0]) : undefined,
  )
  const aberto = pdfs.find((anexo) => chaveAnexo(anexo) === escolhido)

  return (
    <section className={juntarClasses(estilos.cartao, estilos.secao)} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.tituloSecao}>
        Anexos
      </h2>
      {anexos.length === 0 ? (
        <p className={estilos.semAnexos}>Este informe não tem anexos.</p>
      ) : (
        <ul className={estilos.listaAnexos} aria-label="Anexos">
          {anexos.map((anexo) => (
            <LinhaAnexo
              key={chaveAnexo(anexo)}
              anexo={anexo}
              aberto={anexo === aberto}
              aoAbrir={() => setEscolhido(chaveAnexo(anexo))}
            />
          ))}
        </ul>
      )}
      {aberto && <Visualizador anexo={aberto} />}
    </section>
  )
}

function LinhaAnexo({
  anexo,
  aberto,
  aoAbrir,
}: {
  anexo: Anexo
  aberto: boolean
  aoAbrir: () => void
}) {
  return (
    <li className={estilos.itemAnexo}>
      <span className={estilos.nomeAnexo}>
        <FileText size={18} aria-hidden="true" />
        <span>{anexo.nome}</span>
        {anexo.origem === 'local' && (
          <span className={estilos.tamanho}>{formatarTamanho(anexo.tamanho)}</span>
        )}
      </span>
      {ehPdf(anexo) ? (
        <Botao
          variante="fantasma"
          icone={<Eye size={18} />}
          aria-pressed={aberto}
          aria-label={`Visualizar ${anexo.nome}`}
          onClick={aoAbrir}
        >
          Visualizar
        </Botao>
      ) : (
        <Baixar anexo={anexo} />
      )}
    </li>
  )
}

/** Outros tipos são baixados (RF-21, INF-05), sem rede além do próprio site (INV-09). */
function Baixar({ anexo }: { anexo: Anexo }) {
  // Só aqui a URL é criada: o PDF da lista usa a do visualizador.
  const url = useUrlDoAnexo(anexo)
  if (!url) {
    return (
      <span className={estilos.tamanho}>
        {url === null ? 'Arquivo indisponível' : 'Carregando…'}
      </span>
    )
  }
  return (
    <a
      className={estilos.baixar}
      href={url}
      download={anexo.nome}
      aria-label={`Baixar ${anexo.nome}`}
    >
      <Download size={18} aria-hidden="true" />
      Baixar
    </a>
  )
}

function Visualizador({ anexo }: { anexo: Anexo }) {
  const url = useUrlDoAnexo(anexo)
  if (!url) {
    return (
      <p className={estilos.semAnexos}>
        {url === null ? 'O arquivo deste anexo não está mais no navegador.' : 'Carregando o PDF…'}
      </p>
    )
  }
  return <VisualizadorPdf url={url} titulo={anexo.nome} />
}
