// Seção de votação da tela da AGC (RF-34 a RF-37; DMO-17). Agendada: a votação espera a instalação
// e "Registrar resultado" fica desabilitado com o motivo (AGC-23). Instalada: mesa, painel ao vivo
// e registro, bloqueado enquanto houver presente sem voto (T-33). Encerrada: o resultado gravado,
// só leitura (AGC-22).
import { FileCheck, Vote } from 'lucide-react'
import { type ReactNode, useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useServico } from '../../dados/contexto'
import { registrarResultadoAgc } from '../../dados/servicos/agc'
import {
  cenario,
  type NomeCenario,
  type OpcaoVoto,
  resultadoAgc,
  type Votante,
} from '../../regras/votacao'
import { Botao } from '../../ui/Botao'
import { Confirmacao } from '../../ui/Confirmacao'
import { Erro } from '../../ui/Erro'
import { Vazio } from '../../ui/Vazio'
import { mensagemDeErro } from '../credores/erros'
import { rotaDoProcesso } from '../processos/abas'
import type { Agc } from './agc'
import estilos from './agc.module.css'
import { useVotos } from './consultas'
import { MesaVotacao } from './MesaVotacao'
import { type LinhaMesa, listaDeVotos, mapaDeVotos, motivoSemRegistro } from './mesa'
import { PainelArt45, SITUACOES_GERAIS } from './PainelArt45'

export function SecaoVotacao({
  agc,
  linhas,
  votantes,
  presentes,
  podeEditar,
}: {
  agc: Agc
  /** Presentes com direito a voto (`linhasDaMesa`). */
  linhas: readonly LinhaMesa[]
  votantes: readonly Votante[]
  presentes: ReadonlySet<string>
  /** Papel que edita AGC (a situação da AGC decide o resto). */
  podeEditar: boolean
}) {
  const idTitulo = useId()
  const votosGravados = useVotos(agc.id)
  // Id da ata criada nesta visita, para o link depois do registro.
  const [ataId, setAtaId] = useState<string | null>(null)
  const votosDaMesa = useMemo(
    () => mapaDeVotos(votosGravados.data ?? [], linhas),
    [votosGravados.data, linhas],
  )

  let conteudo: ReactNode
  if (votosGravados.isError) {
    conteudo = <Erro mensagem="Não foi possível carregar os votos." />
  } else if (votosGravados.isPending) {
    conteudo = <p className={estilos.carregando}>Carregando votos…</p>
  } else if (agc.status === 'encerrada') {
    conteudo = (
      <Encerrada
        agc={agc}
        linhas={linhas}
        votantes={votantes}
        presentes={presentes}
        votos={votosDaMesa}
        ataId={ataId}
      />
    )
  } else {
    conteudo = (
      <Aberta
        agc={agc}
        linhas={linhas}
        votantes={votantes}
        presentes={presentes}
        votosIniciais={votosDaMesa}
        podeEditar={podeEditar}
        aoRegistrar={setAtaId}
      />
    )
  }

  return (
    <section className={estilos.secao} aria-labelledby={idTitulo}>
      <h2 id={idTitulo} className={estilos.tituloSecao}>
        Votação
      </h2>
      {conteudo}
    </section>
  )
}

function Aberta({
  agc,
  linhas,
  votantes,
  presentes,
  votosIniciais,
  podeEditar,
  aoRegistrar,
}: {
  agc: Agc
  linhas: readonly LinhaMesa[]
  votantes: readonly Votante[]
  presentes: ReadonlySet<string>
  votosIniciais: ReadonlyMap<string, OpcaoVoto>
  podeEditar: boolean
  aoRegistrar: (ataId: string) => void
}) {
  const idMotivo = useId()
  const [votosLancados, setVotos] = useState<ReadonlyMap<string, OpcaoVoto>>(votosIniciais)
  // Só valem os votos de quem está na mesa: com a AGC agendada, desmarcar um presente tira a linha,
  // mas o voto dele continuaria no estado e iria para o registro.
  const votos = useMemo(
    () => mapaDeVotos(listaDeVotos(votosLancados), linhas),
    [votosLancados, linhas],
  )
  const [avisoCenario, setAvisoCenario] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const registrar = useServico(registrarResultadoAgc)

  const instalada = agc.status === 'instalada'
  const resultado = useMemo(
    () => resultadoAgc(votantes, presentes, listaDeVotos(votos)),
    [votantes, presentes, votos],
  )
  const motivo = motivoSemRegistro(agc, resultado)

  function votar(credorId: string, voto: OpcaoVoto) {
    setAvisoCenario(null)
    setVotos((atuais) => new Map(atuais).set(credorId, voto))
  }

  function aplicarCenario(nome: NomeCenario) {
    const presentesQueVotam = linhas.map((l) => ({
      credorId: l.credor.id,
      classe: l.classe,
      valor: l.valor,
    }))
    // Math.random só sorteia votos; não é relógio (INV-08).
    const saida = cenario(nome, presentesQueVotam, Math.random)
    if (!saida.possivel) {
      setAvisoCenario(saida.mensagem)
      return
    }
    setAvisoCenario(null)
    setVotos(new Map(saida.votos.map((v) => [v.credorId, v.voto])))
  }

  async function confirmar() {
    setOcupado(true)
    setErro(null)
    try {
      const { informe } = await registrar({ agcId: agc.id, votos: listaDeVotos(votos) })
      aoRegistrar(informe.id)
      setConfirmando(false)
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    } finally {
      setOcupado(false)
    }
  }

  // O registro fica logo abaixo do painel, antes da tabela da mesa (que pode ter centenas de linhas).
  const registro = (
    <>
      {erro && !confirmando && (
        <p className={estilos.erroTexto} role="alert">
          {erro}
        </p>
      )}
      {podeEditar && (
        <div className={estilos.rodapeInstalacao}>
          {motivo && (
            <p id={idMotivo} className={estilos.motivo}>
              {motivo}
            </p>
          )}
          <Botao
            variante="primario"
            icone={<FileCheck size={18} />}
            disabled={motivo !== null || ocupado}
            aria-describedby={motivo ? idMotivo : undefined}
            onClick={() => {
              setErro(null)
              setConfirmando(true)
            }}
          >
            Registrar resultado
          </Botao>
        </div>
      )}
    </>
  )

  return (
    <>
      {instalada ? (
        <MesaVotacao
          linhas={linhas}
          votos={votos}
          editavel={podeEditar}
          aoVotar={votar}
          aoCenario={aplicarCenario}
          avisoCenario={avisoCenario}
          painel={
            <>
              <PainelArt45 resultado={resultado} />
              {registro}
            </>
          }
        />
      ) : (
        <>
          <div className={estilos.cartao}>
            <Vazio
              icone={<Vote size={24} />}
              titulo="A votação abre depois da instalação"
              descricao="Marque os presentes e instale a AGC: votam os presentes da instalação com direito a voto."
            />
          </div>
          {registro}
        </>
      )}
      <Confirmacao
        aberto={confirmando}
        titulo="Registrar o resultado da AGC?"
        mensagem={
          <>
            {`Resultado: ${SITUACOES_GERAIS[resultado.situacao].rotulo.toLowerCase()}. `}A AGC fica
            encerrada, presença e votos ficam só leitura e a ata é criada em Informes.
            {erro && (
              <span className={estilos.erroTexto} role="alert">
                {' '}
                {erro}
              </span>
            )}
          </>
        }
        rotuloConfirmar="Registrar"
        ocupado={ocupado}
        aoConfirmar={confirmar}
        aoCancelar={() => setConfirmando(false)}
      />
    </>
  )
}

function Encerrada({
  agc,
  linhas,
  votantes,
  presentes,
  votos,
  ataId,
}: {
  agc: Agc
  linhas: readonly LinhaMesa[]
  votantes: readonly Votante[]
  presentes: ReadonlySet<string>
  votos: ReadonlyMap<string, OpcaoVoto>
  ataId: string | null
}) {
  const resultado = useMemo(
    () => resultadoAgc(votantes, presentes, listaDeVotos(votos)),
    [votantes, presentes, votos],
  )
  return (
    <>
      <p className={estilos.registrado} role="status">
        <FileCheck size={18} aria-hidden="true" />
        <span>
          Resultado registrado: presença e votos ficam só leitura.{' '}
          {ataId ? (
            <Link to={`/informes/${ataId}`}>Ver a ata em Informes</Link>
          ) : (
            <Link to={rotaDoProcesso(agc.processoId, 'informes')}>Ver as atas em Informes</Link>
          )}
        </span>
      </p>
      <MesaVotacao
        linhas={linhas}
        votos={votos}
        editavel={false}
        aoVotar={() => {}}
        aoCenario={() => {}}
        avisoCenario={null}
        painel={<PainelArt45 resultado={resultado} />}
      />
    </>
  )
}
