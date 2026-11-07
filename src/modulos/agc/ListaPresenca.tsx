// Lista de presença da AGC (RF-32): credor a credor, com busca, filtro de classe e 50 por página.
// Quem não vota (não sujeito, valor zero) aparece com a caixa desabilitada e o motivo (AGC-24,
// INV-06). "Todos da classe" fica no painel de instalação, ao lado do quórum de cada classe.
import { useId, useState } from 'react'
import { useServico } from '../../dados/contexto'
import { POR_PAGINA } from '../../dados/repositorio'
import { marcarPresenca } from '../../dados/servicos/agc'
import { formatarMoeda } from '../../regras/datas'
import { formatarDocumento } from '../../regras/documentos'
import { CLASSES_VOTANTES, rotuloClasse } from '../../regras/qgc'
import { CampoSelecao } from '../../ui/Campo'
import { CampoBusca, Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import { mensagemDeErro } from '../credores/erros'
import { type Agc, type FiltroClasse, filtrarPresenca, type LinhaPresenca } from './agc'
import estilos from './agc.module.css'

export function ListaPresenca({
  agc,
  linhas,
  editavel,
}: {
  agc: Agc
  linhas: readonly LinhaPresenca[]
  /** Papel que edita AGC e AGC ainda agendada. */
  editavel: boolean
}) {
  const idTitulo = useId()
  const [busca, setBusca] = useState('')
  const [classe, setClasse] = useState<FiltroClasse>('')
  const [pagina, setPagina] = useState(1)
  // Marcação otimista: a caixa muda no clique e volta ao gravado quando a gravação termina.
  const [otimistas, setOtimistas] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [erro, setErro] = useState<string | null>(null)
  const marcar = useServico(marcarPresenca)

  const filtradas = filtrarPresenca(linhas, { busca, classe })
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)
  const votantes = linhas.filter((linha) => !linha.motivo)
  const presentes = votantes.filter((linha) => linha.presente).length

  const presenteEm = (linha: LinhaPresenca) => otimistas.get(linha.credor.id) ?? linha.presente

  async function alternar(linha: LinhaPresenca) {
    const credorId = linha.credor.id
    const presente = !presenteEm(linha)
    setOtimistas((atuais) => new Map(atuais).set(credorId, presente))
    setErro(null)
    try {
      await marcar({ agcId: agc.id, credorIds: [credorId], presente })
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    } finally {
      setOtimistas((atuais) => {
        const proximos = new Map(atuais)
        proximos.delete(credorId)
        return proximos
      })
    }
  }

  function filtrar(mudanca: { busca?: string; classe?: FiltroClasse }) {
    if (mudanca.busca !== undefined) setBusca(mudanca.busca)
    if (mudanca.classe !== undefined) setClasse(mudanca.classe)
    setPagina(1)
  }

  return (
    <section className={estilos.secao} aria-labelledby={idTitulo}>
      <div>
        <h2 id={idTitulo} className={estilos.tituloSecao}>
          Lista de presença
        </h2>
        <p className={estilos.notaSecao}>
          Votam e contam para a instalação os credores das classes I a IV com valor no QGC ou, sem
          QGC, na relação do AJ.
        </p>
      </div>

      <Filtros
        titulo="Buscar na lista de presença"
        aoLimpar={busca || classe ? () => filtrar({ busca: '', classe: '' }) : undefined}
      >
        <CampoBusca
          rotulo="Buscar por nome ou CPF/CNPJ"
          placeholder="Buscar por nome ou CPF/CNPJ"
          value={busca}
          onChange={(evento) => filtrar({ busca: evento.target.value })}
        />
        <CampoSelecao
          rotulo="Classe"
          rotuloOculto
          value={classe}
          onChange={(evento) => filtrar({ classe: evento.target.value as FiltroClasse })}
        >
          <option value="">Todas as classes</option>
          {CLASSES_VOTANTES.map((opcao) => (
            <option key={opcao} value={opcao}>
              {rotuloClasse(opcao, 'rj')}
            </option>
          ))}
          <option value="sem-voto">Sem direito a voto</option>
        </CampoSelecao>
      </Filtros>

      {erro && (
        <p className={estilos.erroTexto} role="alert">
          {erro}
        </p>
      )}

      <Tabela<LinhaPresenca>
        rotulo="Credores da lista de presença"
        linhas={visiveis}
        chaveLinha={(linha) => linha.credor.id}
        topo={
          <span>
            {presentes} de {votantes.length} credores votantes presentes
          </span>
        }
        vazio={
          <Vazio
            titulo="Nenhum credor encontrado"
            descricao={busca || classe ? 'Mude a busca ou o filtro de classe.' : undefined}
          />
        }
        rodape={<Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} aoMudar={setPagina} />}
        colunas={[
          {
            chave: 'presente',
            titulo: 'Presente',
            largura: '100px',
            alinhar: 'centro',
            celula: (linha) => (
              <input
                type="checkbox"
                className={estilos.caixa}
                checked={presenteEm(linha)}
                disabled={!editavel || linha.motivo !== null || otimistas.has(linha.credor.id)}
                aria-label={`Presente: ${linha.credor.nome}`}
                aria-describedby={linha.motivo ? `motivo-${linha.credor.id}` : undefined}
                onChange={() => alternar(linha)}
              />
            ),
          },
          {
            chave: 'credor',
            titulo: 'Credor',
            destaque: true,
            celula: (linha) => (
              <span className={estilos.pilha}>
                <span>{linha.credor.nome}</span>
                <span className={estilos.secundario}>
                  {formatarDocumento(linha.credor.documento)}
                </span>
              </span>
            ),
          },
          {
            chave: 'classe',
            titulo: 'Classe',
            largura: '180px',
            celula: (linha) => rotuloClasse(linha.credor.classe, 'rj'),
          },
          {
            chave: 'valor',
            titulo: 'Valor que vota',
            largura: '170px',
            alinhar: 'direita',
            numerica: true,
            celula: (linha) => formatarMoeda(linha.valor),
          },
          {
            chave: 'situacao',
            titulo: 'Situação',
            largura: '260px',
            celula: (linha) =>
              linha.motivo ? (
                <span id={`motivo-${linha.credor.id}`} className={estilos.secundario}>
                  Não vota: {linha.motivo.charAt(0).toLowerCase() + linha.motivo.slice(1)}
                </span>
              ) : presenteEm(linha) ? (
                'Presente'
              ) : (
                <span className={estilos.secundario}>Ausente</span>
              ),
          },
        ]}
      />
    </section>
  )
}
