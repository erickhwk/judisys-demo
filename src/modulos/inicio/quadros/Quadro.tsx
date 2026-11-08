// Moldura comum dos quadros do início (SDD-INI S-07, §5.1), conforme o componente "Quadro" do
// canvas: cabeçalho com título, destaque opcional e link para a origem (RF-13), corpo e estado
// vazio (RF-15). No modo de edição (RF-18), a moldura mostra a alça e o ×, e desliga os links do
// cabeçalho e do corpo. Cada quadro (INI-06 a INI-09) só monta o corpo: o contrato está em
// `registro.tsx`.
import { GripVertical, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { type Modulo, pode } from '../../../regras/permissoes'
import { juntarClasses } from '../../../ui/classes'
import { useSessao } from '../../entrada/sessao'
import type { IdQuadro } from '../montagem'
import { useEdicao } from './edicao'
import estilos from './Quadro.module.css'

/** Desenho do quadro por largura (RF-14): 4 colunas, 2 colunas ou a lista do celular. */
export type Variante = 'desktop' | 'tablet' | 'celular'

export interface LinkDoQuadro {
  para: string
  /** Texto curto do link, como no canvas: "Agenda", "Abrir", "Processos". */
  rotulo: string
  /** Sem permissão de leitura neste módulo, o link some (RF-13, RF-40 da demo). */
  modulo: Modulo
}

export interface PropsQuadro {
  id: IdQuadro
  /** Título do cabeçalho; também é o nome da região (`aria-label`). */
  titulo: string
  variante: Variante
  /** Número curto à direita do título, como "R$ 546,5 mi" ou "44 em 12 meses". */
  destaque?: ReactNode
  link?: LinkDoQuadro
  /** Sem dados: a frase do estado vazio no lugar do corpo (RF-15), como "Nenhuma AGC agendada". */
  vazio?: string
  children?: ReactNode
}

export function Quadro({ id, titulo, variante, destaque, link, vazio, children }: PropsQuadro) {
  const { editando, tirar, pegar } = useEdicao()
  const { sessao } = useSessao()
  const mostraLink = link && !editando && sessao && pode(sessao.papel, 'ler', link.modulo)

  return (
    <section
      aria-label={titulo}
      className={juntarClasses(estilos.quadro, estilos[variante], editando && estilos.editando)}
      data-quadro={id}
      data-variante={variante}
    >
      <header className={estilos.cabecalho}>
        {editando && (
          // Arrastar é só com o mouse (D-04, RNF-01): a alça não recebe foco nem é lida.
          <span
            aria-hidden="true"
            className={estilos.alca}
            data-alca=""
            onPointerDown={(evento) => pegar(id, evento)}
          >
            <GripVertical size={16} />
          </span>
        )}
        <h2 className={estilos.titulo}>{titulo}</h2>
        {destaque !== undefined && <span className={estilos.destaque}>{destaque}</span>}
        {mostraLink && (
          <Link to={link.para} className={estilos.link}>
            {link.rotulo}
          </Link>
        )}
        {editando && (
          <button
            type="button"
            className={estilos.tirar}
            aria-label={`Tirar ${titulo} do início`}
            onClick={() => tirar(id)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </header>
      {/* `inert` desliga os links e botões do corpo no modo de edição (RF-18). */}
      <div className={estilos.corpo} inert={editando}>
        {vazio === undefined ? children : <p className={estilos.vazio}>{vazio}</p>}
      </div>
    </section>
  )
}
