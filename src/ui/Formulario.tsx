import { type FormHTMLAttributes, type ReactNode, useId } from 'react'
import { juntarClasses } from './classes'
import estilos from './Formulario.module.css'

export type PropsFormulario = Omit<FormHTMLAttributes<HTMLFormElement>, 'className'> & {
  /** Botões do rodapé (ex.: "Voltar" e "Salvar"). */
  acoes?: ReactNode
  children: ReactNode
}

/** Formulário em seções, como `processo-novo.html`: cards de seção e barra de ações no fim. */
export function Formulario({ acoes, children, noValidate = true, ...resto }: PropsFormulario) {
  return (
    <form className={estilos.formulario} noValidate={noValidate} {...resto}>
      {children}
      {acoes && <div className={juntarClasses(estilos.acoes, 'nao-imprimir')}>{acoes}</div>}
    </form>
  )
}

export type PropsSecaoFormulario = {
  titulo: string
  descricao?: ReactNode
  /** Campos (`Campo`, `CampoTexto`...), numa grade de 6 colunas. */
  children: ReactNode
}

export function SecaoFormulario({ titulo, descricao, children }: PropsSecaoFormulario) {
  const idTitulo = useId()
  return (
    <section className={estilos.secao} aria-labelledby={idTitulo}>
      <div className={estilos.cabecalho}>
        <h2 id={idTitulo} className={estilos.titulo}>
          {titulo}
        </h2>
        {descricao && <p className={estilos.descricao}>{descricao}</p>}
      </div>
      <div className={estilos.campos}>{children}</div>
    </section>
  )
}
