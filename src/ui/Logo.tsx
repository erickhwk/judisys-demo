import logo from './logos/judisys-logo.svg'
import logoBranco from './logos/judisys-logo-branco.svg'
import marca from './logos/judisys-marca.svg'
import marcaBranca from './logos/judisys-marca-branca.svg'

export type PropsLogo = {
  /** `completa`: símbolo + nome. `marca`: só o símbolo (menu recolhido, avatar). */
  variante?: 'completa' | 'marca'
  fundo?: 'claro' | 'escuro'
  /** Altura em px. No guia: 52 no login, 38 no menu lateral. */
  altura?: number
  /** Texto alternativo; vazio quando o nome já está escrito ao lado. */
  alt?: string
}

const arquivos = {
  completa: { claro: logo, escuro: logoBranco },
  marca: { claro: marca, escuro: marcaBranca },
} as const

const proporcoes = { completa: 1396 / 449, marca: 327 / 445 } as const

export function Logo({
  variante = 'completa',
  fundo = 'claro',
  altura = 38,
  alt = 'Judisys',
}: PropsLogo) {
  return (
    <img
      src={arquivos[variante][fundo]}
      alt={alt}
      height={altura}
      width={Math.round(altura * proporcoes[variante])}
      style={{ height: altura, width: 'auto' }}
    />
  )
}
