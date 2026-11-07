// Mesa de votação (RF-34): voto sim, não ou abstenção por presente com direito a voto, com busca,
// filtro de classe (ou só quem falta votar) e 50 por página; botões de cenário com as regras puras
// de `regras/votacao.ts` (T-29). O painel do art. 45 entra entre os cenários e a tabela, para o
// resultado ficar à vista de quem aplica um cenário. Os votos ficam na tela até "Registrar
// resultado" (RF-37).
import { Shuffle } from 'lucide-react'
import { type ReactNode, useId, useMemo, useState } from 'react'
import { POR_PAGINA } from '../../dados/repositorio'
import { formatarMoeda } from '../../regras/datas'
import { formatarDocumento } from '../../regras/documentos'
import { CLASSES_VOTANTES, rotuloClasse } from '../../regras/qgc'
import { CENARIOS, type NomeCenario, type OpcaoVoto } from '../../regras/votacao'
import { Botao } from '../../ui/Botao'
import { CampoSelecao } from '../../ui/Campo'
import { CampoBusca, Filtros } from '../../ui/Filtros'
import { Paginacao } from '../../ui/Paginacao'
import { Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import estilos from './agc.module.css'
import { type FiltroMesa, filtrarMesa, type LinhaMesa, type MapaVotos, OPCOES_VOTO } from './mesa'

export function MesaVotacao({
  linhas,
  votos,
  editavel,
  aoVotar,
  aoCenario,
  avisoCenario,
  painel,
}: {
  linhas: readonly LinhaMesa[]
  votos: MapaVotos
  /** Papel que edita AGC e AGC instalada. */
  editavel: boolean
  aoVotar: (credorId: string, voto: OpcaoVoto) => void
  aoCenario: (nome: NomeCenario) => void
  /** Mensagem do cenário impossível (T-29), ou `null`. */
  avisoCenario: string | null
  /** Painel do art. 45, mostrado acima da tabela. */
  painel: ReactNode
}) {
  const idTitulo = useId()
  const idAviso = useId()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroMesa>('')
  const [pagina, setPagina] = useState(1)

  const filtradas = useMemo(
    () => filtrarMesa(linhas, votos, { busca, filtro }),
    [linhas, votos, busca, filtro],
  )
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)
  const comVoto = linhas.filter((linha) => votos.has(linha.credor.id)).length

  function filtrar(mudanca: { busca?: string; filtro?: FiltroMesa }) {
    if (mudanca.busca !== undefined) setBusca(mudanca.busca)
    if (mudanca.filtro !== undefined) setFiltro(mudanca.filtro)
    setPagina(1)
  }

  return (
    <section className={estilos.secao} aria-labelledby={idTitulo}>
      <div>
        <h3 id={idTitulo} className={estilos.subtituloSecao}>
          Mesa de votação
        </h3>
        <p className={estilos.notaSecao}>
          Votam os presentes da instalação com direito a voto. Os votos ficam nesta tela até o
          registro do resultado.
        </p>
      </div>

      {editavel && (
        <fieldset
          className={estilos.cenarios}
          aria-describedby={avisoCenario ? idAviso : undefined}
        >
          <legend className={estilos.rotuloCenarios}>Cenários</legend>
          {CENARIOS.map((cenario) => (
            <Botao
              key={cenario.id}
              variante={cenario.id === 'limpar' ? 'fantasma' : 'secundario'}
              icone={cenario.id === 'aleatorio' ? <Shuffle size={18} /> : undefined}
              onClick={() => aoCenario(cenario.id)}
            >
              {cenario.rotulo}
            </Botao>
          ))}
        </fieldset>
      )}
      {avisoCenario && (
        <p id={idAviso} className={estilos.avisoCenario} role="alert">
          {avisoCenario}
        </p>
      )}

      {painel}

      <Filtros
        titulo="Buscar na mesa de votação"
        aoLimpar={busca || filtro ? () => filtrar({ busca: '', filtro: '' }) : undefined}
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
          value={filtro}
          onChange={(evento) => filtrar({ filtro: evento.target.value as FiltroMesa })}
        >
          <option value="">Todas as classes</option>
          {CLASSES_VOTANTES.map((opcao) => (
            <option key={opcao} value={opcao}>
              {rotuloClasse(opcao, 'rj')}
            </option>
          ))}
          <option value="sem-voto">Sem voto lançado</option>
        </CampoSelecao>
      </Filtros>

      <Tabela<LinhaMesa>
        rotulo="Votos dos presentes"
        linhas={visiveis}
        chaveLinha={(linha) => linha.credor.id}
        larguraMinima={860}
        topo={
          <span>
            {comVoto} de {linhas.length} presentes com voto lançado
          </span>
        }
        vazio={
          <Vazio
            titulo="Nenhum presente encontrado"
            descricao={busca || filtro ? 'Mude a busca ou o filtro.' : undefined}
          />
        }
        rodape={<Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} aoMudar={setPagina} />}
        colunas={[
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
            largura: '170px',
            celula: (linha) => rotuloClasse(linha.classe, 'rj'),
          },
          {
            chave: 'valor',
            titulo: 'Valor que vota',
            largura: '160px',
            alinhar: 'direita',
            numerica: true,
            celula: (linha) => formatarMoeda(linha.valor),
          },
          {
            chave: 'voto',
            titulo: 'Voto',
            largura: '340px',
            celula: (linha) => (
              <EscolhaVoto
                linha={linha}
                voto={votos.get(linha.credor.id)}
                editavel={editavel}
                aoVotar={aoVotar}
              />
            ),
          },
        ]}
      />
    </section>
  )
}

/** Sim, não ou abstenção: três rádios com cara de botões segmentados, alvo de 44px. */
function EscolhaVoto({
  linha,
  voto,
  editavel,
  aoVotar,
}: {
  linha: LinhaMesa
  voto: OpcaoVoto | undefined
  editavel: boolean
  aoVotar: (credorId: string, voto: OpcaoVoto) => void
}) {
  const nome = linha.credor.nome
  return (
    <fieldset className={estilos.escolhaVoto} disabled={!editavel}>
      <legend className="somente-leitor">{`Voto de ${nome}`}</legend>
      {OPCOES_VOTO.map((opcao) => (
        <label key={opcao.valor} className={estilos.opcaoVoto} data-voto={opcao.valor}>
          <input
            type="radio"
            name={`voto-${linha.credor.id}`}
            value={opcao.valor}
            checked={voto === opcao.valor}
            onChange={() => aoVotar(linha.credor.id, opcao.valor)}
          />
          <span>{opcao.rotulo}</span>
        </label>
      ))}
    </fieldset>
  )
}
