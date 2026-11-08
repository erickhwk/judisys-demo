import type { ReactNode } from 'react'
import { juntarClasses } from './classes'
import estilos from './Selo.module.css'

/**
 * Tons do selo. `azul` e `dourado` seguem o guia (MCAA / Ethos) e o canvas (RJ / falência);
 * `sucesso`, `alerta` e `perigo` marcam situações (cumprido, urgente, vencido).
 */
export type TomSelo = 'neutro' | 'azul' | 'dourado' | 'sucesso' | 'alerta' | 'perigo'

export type PropsSelo = {
  tom?: TomSelo
  /** `pilula`: borda arredondada com ponto colorido (categoria). `etiqueta`: fundo colorido. */
  forma?: 'pilula' | 'etiqueta'
  children: ReactNode
}

export function Selo({ tom = 'neutro', forma = 'etiqueta', children }: PropsSelo) {
  if (forma === 'pilula') {
    return (
      <span className={estilos.pilula}>
        <span
          className={juntarClasses(estilos.ponto, estilos[`ponto_${tom}`])}
          aria-hidden="true"
        />
        {children}
      </span>
    )
  }
  return <span className={juntarClasses(estilos.etiqueta, estilos[tom])}>{children}</span>
}
