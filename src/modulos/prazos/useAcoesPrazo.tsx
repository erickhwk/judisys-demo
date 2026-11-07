// Ações sobre prazos, comuns à aba Prazos e à agenda: novo prazo manual, editar e marcar como
// cumprido pelo serviço `cumprirPrazo` (RF-23, RF-24, PRZ-01 a PRZ-04). Esconde tudo de quem não
// edita prazos (T-13, PER-03).
import { type ReactNode, useState } from 'react'
import { useServico } from '../../dados/contexto'
import type { Tipos } from '../../dados/schemas'
import { ehRjAtiva, ehRma } from '../../dados/servicos/comum'
import { cumprirPrazo } from '../../dados/servicos/prazos'
import { formatarData } from '../../regras/datas'
import { pode } from '../../regras/permissoes'
import { proximoRma } from '../../regras/prazos'
import { Confirmacao } from '../../ui/Confirmacao'
import { useSessao } from '../entrada/sessao'
import { FormularioPrazo, type OpcaoProcesso } from './FormularioPrazo'

type Prazo = Tipos['prazos']
type Processo = Tipos['processos']

export interface Aviso {
  tipo: 'sucesso' | 'erro'
  texto: string
}

type Edicao = { prazo?: Prazo; processoId?: string }

export interface AcoesPrazo {
  /** `false` para quem só lê prazos: a tela não mostra os botões. */
  podeEditar: boolean
  novo: (processoId?: string) => void
  editar: (prazo: Prazo) => void
  cumprir: (prazo: Prazo) => void
  /** Diálogos de edição e de confirmação: renderize uma vez na tela. */
  dialogos: ReactNode
  /** Resultado da última ação, para a mensagem da tela. */
  aviso: Aviso | null
}

/** O cumprimento deste prazo cria o RMA seguinte? Só RMA de RJ fora das fases finais (INV-05). */
export function criaProximoRma(prazo: Prazo, processo: Processo | undefined): boolean {
  return ehRma(prazo) && processo !== undefined && ehRjAtiva(processo)
}

export function useAcoesPrazo({
  processos,
  opcoesProcesso,
}: {
  /** Processos dos prazos mostrados, para saber se cumprir cria o RMA seguinte. */
  processos: ReadonlyMap<string, Processo>
  /** Opções do campo Processo no novo prazo (agenda). */
  opcoesProcesso?: readonly OpcaoProcesso[]
}): AcoesPrazo {
  const { sessao } = useSessao()
  const podeEditar = sessao !== null && pode(sessao.papel, 'editar', 'prazos')
  const cumprirNoServico = useServico(cumprirPrazo)
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aCumprir, setACumprir] = useState<Prazo | null>(null)
  const [cumprindo, setCumprindo] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)

  // O formulário só existe com o diálogo aberto: cada abertura começa do zero.
  const abrirEdicao = (dados: Edicao) => {
    setAviso(null)
    setEdicao(dados)
  }

  const confirmarCumprimento = async () => {
    if (!aCumprir) return
    setCumprindo(true)
    try {
      const resultado = await cumprirNoServico(aCumprir.id)
      setAviso({
        tipo: 'sucesso',
        texto: resultado.proximoRma
          ? `Prazo cumprido. Próximo RMA criado com vencimento em ${formatarData(resultado.proximoRma.vencimento)}.`
          : `Prazo "${resultado.prazo.titulo}" marcado como cumprido.`,
      })
    } catch (erro) {
      setAviso({
        tipo: 'erro',
        texto: erro instanceof Error ? erro.message : 'Não foi possível marcar como cumprido.',
      })
    } finally {
      setCumprindo(false)
      setACumprir(null)
    }
  }

  const dialogos = (
    <>
      {edicao && (
        <FormularioPrazo
          {...(edicao.prazo ? { prazo: edicao.prazo } : {})}
          {...(edicao.processoId ? { processoId: edicao.processoId } : {})}
          {...(opcoesProcesso ? { processos: opcoesProcesso } : {})}
          aoFechar={() => setEdicao(null)}
          aoSalvar={(prazo) => {
            setAviso({
              tipo: 'sucesso',
              texto: edicao.prazo
                ? `Prazo "${prazo.titulo}" atualizado.`
                : `Prazo "${prazo.titulo}" criado.`,
            })
            setEdicao(null)
          }}
        />
      )}
      <Confirmacao
        aberto={aCumprir !== null}
        titulo="Marcar como cumprido"
        mensagem={aCumprir && mensagemDeCumprimento(aCumprir, processos.get(aCumprir.processoId))}
        rotuloConfirmar="Marcar como cumprido"
        ocupado={cumprindo}
        aoConfirmar={confirmarCumprimento}
        aoCancelar={() => setACumprir(null)}
      />
    </>
  )

  return {
    podeEditar,
    novo: (processoId) => abrirEdicao(processoId ? { processoId } : {}),
    editar: (prazo) => abrirEdicao({ prazo }),
    cumprir: (prazo) => {
      setAviso(null)
      setACumprir(prazo)
    },
    dialogos,
    aviso,
  }
}

function mensagemDeCumprimento(prazo: Prazo, processo: Processo | undefined): ReactNode {
  return (
    <>
      <p>
        "{prazo.titulo}", com vencimento em {formatarData(prazo.vencimento)}, passa a cumprido.
      </p>
      {criaProximoRma(prazo, processo) && (
        <p>
          O próximo RMA será criado com vencimento em {formatarData(proximoRma(prazo.vencimento))}.
        </p>
      )}
    </>
  )
}
