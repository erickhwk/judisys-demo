// Lista de prazos da aba Prazos e da agenda (RF-24, PRZ-06, PRZ-07): vencido em vermelho, urgente
// (até 3 dias) em dourado, cumprido sem destaque, com o selo "Cumprido".
import { Check, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { Tipos } from '../../dados/schemas'
import { type DataIso, formatarData } from '../../regras/datas'
import { situacao } from '../../regras/prazos'
import { BotaoIcone } from '../../ui/Botao'
import { juntarClasses } from '../../ui/classes'
import { Selo } from '../../ui/Selo'
import { AcoesLinha, type ColunaTabela, Tabela } from '../../ui/Tabela'
import estilos from './prazos.module.css'
import { rotuloSituacao, TOM_SITUACAO } from './regras'
import type { AcoesPrazo } from './useAcoesPrazo'

type Prazo = Tipos['prazos']
type Processo = Tipos['processos']

/** Endereço do prazo na aba Prazos do processo (PRZ-09: o calendário leva ao prazo). */
export function enderecoDoPrazo(prazo: Pick<Prazo, 'id' | 'processoId'>): string {
  return `/processos/${prazo.processoId}/prazos?prazo=${encodeURIComponent(prazo.id)}`
}

/** `id` do elemento do prazo na aba, para rolar até ele. */
export function ancoraDoPrazo(id: string): string {
  return `prazo-${id}`
}

export type PropsTabelaPrazos = {
  rotulo: string
  prazos: Prazo[]
  hoje: DataIso
  acoes: AcoesPrazo
  /** Agenda: colunas Processo e Responsável. */
  processos?: ReadonlyMap<string, Processo>
  responsaveis?: ReadonlyMap<string, string>
  /** Prazo aberto pelo link do calendário ou da agenda. */
  destacado?: string | null
  vazio: ReactNode
  topo?: ReactNode
  rodape?: ReactNode
}

export function TabelaPrazos({
  rotulo,
  prazos,
  hoje,
  acoes,
  processos,
  responsaveis,
  destacado,
  vazio,
  topo,
  rodape,
}: PropsTabelaPrazos) {
  const colunas: ColunaTabela<Prazo>[] = [
    {
      chave: 'vencimento',
      titulo: 'Vencimento',
      largura: '124px',
      numerica: true,
      celula: (prazo) => (
        <span className={estilos[`data_${situacao(prazo, hoje)}`]}>
          {formatarData(prazo.vencimento)}
        </span>
      ),
    },
    {
      chave: 'prazo',
      titulo: 'Prazo',
      destaque: true,
      celula: (prazo) => (
        <span
          id={ancoraDoPrazo(prazo.id)}
          className={juntarClasses(estilos.titulo, prazo.id === destacado && estilos.destacado)}
        >
          <span>{prazo.titulo}</span>
          {prazo.baseLegal && <span className={estilos.baseLegal}>{prazo.baseLegal}</span>}
        </span>
      ),
    },
  ]
  if (processos) {
    colunas.push({
      chave: 'processo',
      titulo: 'Processo',
      largura: '22%',
      celula: (prazo) => {
        const processo = processos.get(prazo.processoId)
        return (
          <Link to={enderecoDoPrazo(prazo)}>{processo?.apelido ?? 'Processo não encontrado'}</Link>
        )
      },
    })
    if (responsaveis) {
      colunas.push({
        chave: 'responsavel',
        titulo: 'Responsável',
        largura: '15%',
        celula: (prazo) => {
          const id = processos.get(prazo.processoId)?.responsavelId
          return (id && responsaveis.get(id)) || '—'
        },
      })
    }
  } else {
    // Na agenda a coluna Origem dá lugar a Processo e Responsável, para o título caber.
    colunas.push({
      chave: 'origem',
      titulo: 'Origem',
      largura: '120px',
      celula: (prazo) => (prazo.origem === 'automatico' ? 'Automático' : 'Manual'),
    })
  }
  colunas.push({
    chave: 'situacao',
    titulo: 'Situação',
    largura: '152px',
    celula: (prazo) => (
      <Selo tom={TOM_SITUACAO[situacao(prazo, hoje)]}>{rotuloSituacao(prazo, hoje)}</Selo>
    ),
  })
  if (acoes.podeEditar) {
    colunas.push({
      chave: 'acoes',
      titulo: <span className="somente-leitor">Ações</span>,
      largura: '112px',
      alinhar: 'direita',
      celula: (prazo) =>
        prazo.status === 'aberto' ? (
          <AcoesLinha>
            <BotaoIcone
              aria-label={`Marcar "${prazo.titulo}" como cumprido`}
              icone={<Check size={18} />}
              onClick={() => acoes.cumprir(prazo)}
            />
            <BotaoIcone
              aria-label={`Editar "${prazo.titulo}"`}
              icone={<Pencil size={18} />}
              onClick={() => acoes.editar(prazo)}
            />
          </AcoesLinha>
        ) : null,
    })
  }

  return (
    <Tabela
      rotulo={rotulo}
      colunas={colunas}
      linhas={prazos}
      chaveLinha={(prazo) => prazo.id}
      vazio={vazio}
      larguraMinima={processos ? 1040 : 820}
      topo={topo}
      rodape={rodape}
    />
  )
}
