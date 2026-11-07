// Tela da AGC (#/processos/:id/agc/:agcId, RF-31 a RF-37): dados da AGC, aviso de simulação para
// data futura (AGC-01), painel de instalação, lista de presença e, no fim, a votação: mesa, painel
// do art. 45, cram down e registro do resultado (DMO-17).
import { Pencil, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { formatarData } from '../../regras/datas'
import { pode } from '../../regras/permissoes'
import { hoje } from '../../regras/relogio'
import { credoresVotantes } from '../../regras/votacao'
import { Botao } from '../../ui/Botao'
import { ApoioEmLinha, CabecalhoPagina } from '../../ui/CabecalhoPagina'
import { Erro } from '../../ui/Erro'
import { Selo } from '../../ui/Selo'
import { NaoEncontrada } from '../../ui/TelasDeAviso'
import { useCredoresDoProcesso, useProcesso } from '../credores/consultas'
import { useSessao } from '../entrada/sessao'
import {
  type Agc,
  convocacaoSugerida,
  emSimulacao,
  linhasDePresenca,
  MENSAGEM_SIMULACAO,
  SITUACOES_AGC,
} from './agc'
import estilos from './agc.module.css'
import { useAgc, usePresentes } from './consultas'
import { DialogoAgc } from './DialogoAgc'
import { ListaPresenca } from './ListaPresenca'
import { linhasDaMesa } from './mesa'
import { PainelInstalacao } from './PainelInstalacao'
import { SecaoVotacao } from './SecaoVotacao'

type Processo = { id: string; apelido: string }

export function TelaAgc() {
  const { id = '', agcId = '' } = useParams()
  const processo = useProcesso(id)
  const agc = useAgc(agcId)
  if (processo.isError || agc.isError) return <Erro mensagem="Não foi possível carregar a AGC." />
  if (processo.isPending || agc.isPending) {
    return <p className={estilos.carregando}>Carregando AGC…</p>
  }
  // Processo de falência não tem AGC (a aba é só da RJ).
  const doProcesso = processo.data?.tipo === 'rj' && agc.data?.processoId === processo.data.id
  if (!doProcesso || !processo.data || !agc.data) return <NaoEncontrada />
  // A chave zera convocação, filtros e página ao trocar de AGC sem sair da rota.
  return <ConteudoAgc key={agc.data.id} processo={processo.data} agc={agc.data} />
}

function ConteudoAgc({ processo, agc }: { processo: Processo; agc: Agc }) {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'agc') : false
  const editavel = podeEditar && agc.status === 'agendada'
  const [editando, setEditando] = useState(false)
  const credores = useCredoresDoProcesso(processo.id)
  const presentes = usePresentes(agc.id)
  const dataDeHoje = hoje()

  const votantes = useMemo(() => credoresVotantes(credores.data ?? []), [credores.data])
  const conjuntoPresentes = useMemo(() => presentes.data ?? new Set<string>(), [presentes.data])
  const linhas = useMemo(
    () => linhasDePresenca(credores.data ?? [], conjuntoPresentes),
    [credores.data, conjuntoPresentes],
  )
  const linhasMesa = useMemo(
    () => linhasDaMesa(credores.data ?? [], votantes, conjuntoPresentes),
    [credores.data, votantes, conjuntoPresentes],
  )
  const aba = `/processos/${processo.id}/agc`
  const situacao = SITUACOES_AGC[agc.status]

  return (
    <div className={estilos.tela}>
      <CabecalhoPagina
        trilha={[
          { rotulo: 'Processos', para: '/processos' },
          { rotulo: processo.apelido, para: aba },
          { rotulo: 'AGC', para: aba },
        ]}
        titulo={`AGC de ${formatarData(agc.dataPrimeira)}`}
        apoio={
          <ApoioEmLinha>
            <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>
            <span>1ª convocação: {formatarData(agc.dataPrimeira)}</span>
            <span>2ª convocação: {formatarData(agc.dataSegunda)}</span>
          </ApoioEmLinha>
        }
        acoes={
          editavel && (
            <Botao
              variante="secundario"
              icone={<Pencil size={18} />}
              onClick={() => setEditando(true)}
            >
              Editar
            </Botao>
          )
        }
      />

      {emSimulacao(agc, dataDeHoje) && (
        <p className={estilos.simulacao} role="note">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>
            <strong>{MENSAGEM_SIMULACAO}.</strong> Presença e votação ficam liberadas para simular a
            assembleia.
          </span>
        </p>
      )}

      <section className={estilos.pauta} aria-label="Pauta">
        <span className={estilos.rotuloPauta}>Pauta</span>
        <p>{agc.pauta}</p>
      </section>

      {credores.isError || presentes.isError ? (
        <Erro mensagem="Não foi possível carregar a lista de presença." />
      ) : credores.isPending || presentes.isPending ? (
        <p className={estilos.carregando}>Carregando lista de presença…</p>
      ) : (
        <>
          <PainelInstalacao
            agc={agc}
            votantes={votantes}
            presentes={conjuntoPresentes}
            convocacaoInicial={convocacaoSugerida(agc, dataDeHoje)}
            editavel={editavel}
          />
          <ListaPresenca agc={agc} linhas={linhas} editavel={editavel} />
          <SecaoVotacao
            agc={agc}
            linhas={linhasMesa}
            votantes={votantes}
            presentes={conjuntoPresentes}
            podeEditar={podeEditar}
          />
        </>
      )}

      {editavel && (
        <DialogoAgc
          aberto={editando}
          aoFechar={() => setEditando(false)}
          processoId={processo.id}
          agc={agc}
        />
      )}
    </div>
  )
}
