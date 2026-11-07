import { ChevronDown } from 'lucide-react'
import {
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react'
import estilos from './Campo.module.css'
import { juntarClasses } from './classes'

/** Quantas das 6 colunas da seção de formulário o campo ocupa. */
export type Colunas = 1 | 2 | 3 | 4 | 5 | 6

export type PropsControle = {
  id: string
  className: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

type PropsComuns = {
  rotulo: ReactNode
  erro?: string
  ajuda?: ReactNode
  colunas?: Colunas
  obrigatorio?: boolean
  /** Rótulo só para leitor de tela (filtros, busca), como no guia. */
  rotuloOculto?: boolean
  id?: string
}

export type PropsCampo = PropsComuns & {
  /** Recebe id, classe e atributos de acessibilidade para pôr no controle, por último (vencem os do chamador). */
  children: (controle: PropsControle) => ReactNode
}

/**
 * Rótulo + controle + ajuda + erro. Todo campo tem `<label>` associado (RNF-01).
 * Use direto para controles próprios; para os comuns, `CampoTexto`, `CampoSelecao`,
 * `CampoAreaTexto` e `CampoMarcacao`.
 */
export function Campo({
  rotulo,
  erro,
  ajuda,
  colunas = 6,
  obrigatorio = false,
  rotuloOculto = false,
  id,
  children,
}: PropsCampo) {
  const { idControle, idAjuda, idErro, descritores } = useIdsCampo(id, ajuda, erro)

  return (
    <div className={juntarClasses(estilos.campo, estilos[`colunas${colunas}`])}>
      <label htmlFor={idControle} className={rotuloOculto ? 'somente-leitor' : estilos.rotulo}>
        {rotulo}
        {obrigatorio && (
          <span className={estilos.obrigatorio} aria-hidden="true">
            {' *'}
          </span>
        )}
      </label>
      {children({
        id: idControle,
        className: juntarClasses(estilos.controle, erro && estilos.comErro),
        'aria-invalid': erro ? true : undefined,
        'aria-describedby': descritores,
      })}
      <Mensagens {...{ ajuda, erro, idAjuda, idErro }} />
    </div>
  )
}

function useIdsCampo(id: string | undefined, ajuda: ReactNode, erro: string | undefined) {
  const idGerado = useId()
  const idControle = id ?? idGerado
  const idAjuda = ajuda ? `${idControle}-ajuda` : undefined
  const idErro = erro ? `${idControle}-erro` : undefined
  const descritores = [idAjuda, idErro].filter(Boolean).join(' ') || undefined
  return { idControle, idAjuda, idErro, descritores }
}

function Mensagens({
  ajuda,
  erro,
  idAjuda,
  idErro,
}: {
  ajuda: ReactNode
  erro: string | undefined
  idAjuda: string | undefined
  idErro: string | undefined
}) {
  return (
    <>
      {ajuda && (
        <span id={idAjuda} className={estilos.ajuda}>
          {ajuda}
        </span>
      )}
      {erro && (
        <span id={idErro} className={estilos.erro}>
          {erro}
        </span>
      )}
    </>
  )
}

export type PropsCampoTexto = PropsComuns &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> & {
    ref?: Ref<HTMLInputElement>
    /** Ícone decorativo dentro do campo (ex.: lupa, calendário). */
    icone?: ReactNode
    posicaoIcone?: 'inicio' | 'fim'
  }

export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  colunas,
  obrigatorio,
  rotuloOculto,
  id,
  icone,
  posicaoIcone = 'inicio',
  ...entrada
}: PropsCampoTexto) {
  return (
    <Campo {...{ rotulo, erro, ajuda, colunas, obrigatorio, rotuloOculto, id }}>
      {({ className, ...controle }) => (
        <div className={estilos.envoltorio}>
          {icone && (
            <span
              className={juntarClasses(
                estilos.icone,
                posicaoIcone === 'inicio' ? estilos.iconeInicio : estilos.iconeFim,
              )}
              aria-hidden="true"
            >
              {icone}
            </span>
          )}
          <input
            className={juntarClasses(
              className,
              Boolean(icone) &&
                (posicaoIcone === 'inicio' ? estilos.comIconeInicio : estilos.comIconeFim),
            )}
            required={obrigatorio}
            {...entrada}
            {...controle}
          />
        </div>
      )}
    </Campo>
  )
}

export type PropsCampoSelecao = PropsComuns &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> & {
    ref?: Ref<HTMLSelectElement>
  }

export function CampoSelecao({
  rotulo,
  erro,
  ajuda,
  colunas,
  obrigatorio,
  rotuloOculto,
  id,
  children,
  ...selecao
}: PropsCampoSelecao) {
  return (
    <Campo {...{ rotulo, erro, ajuda, colunas, obrigatorio, rotuloOculto, id }}>
      {({ className, ...controle }) => (
        <div className={estilos.envoltorio}>
          <select
            className={juntarClasses(className, estilos.selecao)}
            required={obrigatorio}
            {...selecao}
            {...controle}
          >
            {children}
          </select>
          <span className={juntarClasses(estilos.icone, estilos.iconeFim)} aria-hidden="true">
            <ChevronDown size={18} />
          </span>
        </div>
      )}
    </Campo>
  )
}

export type PropsCampoAreaTexto = PropsComuns &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> & {
    ref?: Ref<HTMLTextAreaElement>
  }

export function CampoAreaTexto({
  rotulo,
  erro,
  ajuda,
  colunas,
  obrigatorio,
  rotuloOculto,
  id,
  rows = 4,
  ...area
}: PropsCampoAreaTexto) {
  return (
    <Campo {...{ rotulo, erro, ajuda, colunas, obrigatorio, rotuloOculto, id }}>
      {({ className, ...controle }) => (
        <textarea
          className={juntarClasses(className, estilos.areaTexto)}
          required={obrigatorio}
          rows={rows}
          {...area}
          {...controle}
        />
      )}
    </Campo>
  )
}

export type PropsCampoMarcacao = Omit<PropsComuns, 'obrigatorio' | 'rotuloOculto'> &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'type'> & {
    ref?: Ref<HTMLInputElement>
  }

/** Caixa de marcação com o rótulo ao lado; a linha inteira é o alvo de toque (44px). */
export function CampoMarcacao({
  rotulo,
  erro,
  ajuda,
  colunas = 6,
  id,
  ...entrada
}: PropsCampoMarcacao) {
  const { idControle, idAjuda, idErro, descritores } = useIdsCampo(id, ajuda, erro)

  return (
    <div className={juntarClasses(estilos.campo, estilos[`colunas${colunas}`])}>
      <label htmlFor={idControle} className={estilos.marcacao}>
        <input
          type="checkbox"
          id={idControle}
          className={estilos.caixa}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          {...entrada}
        />
        <span>{rotulo}</span>
      </label>
      <Mensagens {...{ ajuda, erro, idAjuda, idErro }} />
    </div>
  )
}
