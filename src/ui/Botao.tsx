import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link } from 'react-router'
import estilos from './Botao.module.css'
import { juntarClasses } from './classes'

export type VarianteBotao = 'primario' | 'secundario' | 'fantasma' | 'perigo'

type PropsBase = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  ref?: Ref<HTMLButtonElement>
}

export type PropsBotao = PropsBase & {
  variante?: VarianteBotao
  icone?: ReactNode
  children: ReactNode
}

export function Botao({
  variante = 'secundario',
  icone,
  type = 'button',
  className,
  children,
  ...resto
}: PropsBotao) {
  return (
    <button
      type={type}
      className={juntarClasses(estilos.botao, estilos[variante], className)}
      {...resto}
    >
      {icone && <span aria-hidden="true">{icone}</span>}
      {children}
    </button>
  )
}

/** Link com cara de botão: navega em vez de agir (ex.: "QGC para impressão", "Voltar"). */
export function BotaoLink({
  para,
  variante = 'secundario',
  icone,
  children,
}: {
  para: string
  variante?: VarianteBotao
  icone?: ReactNode
  children: ReactNode
}) {
  return (
    <Link to={para} className={juntarClasses(estilos.botao, estilos[variante])}>
      {icone && <span aria-hidden="true">{icone}</span>}
      {children}
    </Link>
  )
}

/** Botão só de ícone: o `aria-label` é obrigatório (RNF-01). Alvo de 44×44px. */
export type PropsBotaoIcone = PropsBase & {
  'aria-label': string
  icone: ReactNode
  perigo?: boolean
}

export function BotaoIcone({
  icone,
  perigo = false,
  type = 'button',
  className,
  ...resto
}: PropsBotaoIcone) {
  return (
    <button
      type={type}
      className={juntarClasses(estilos.icone, perigo && estilos.iconePerigo, className)}
      {...resto}
    >
      <span aria-hidden="true">{icone}</span>
    </button>
  )
}
