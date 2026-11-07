// Cabeçalho das telas de empresas, como nos guias: caminho opcional, título, apoio e ações.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import estilos from './Empresas.module.css'

export function Cabecalho({
  titulo,
  apoio,
  caminho,
  acoes,
}: {
  titulo: string
  apoio?: ReactNode
  /** Trilha "Empresas / <tela>": o link volta à lista. */
  caminho?: string
  acoes?: ReactNode
}) {
  return (
    <div className={estilos.cabecalho}>
      <div className={estilos.titulos}>
        {caminho && (
          <span className={estilos.caminho}>
            <Link to="/empresas">Empresas</Link>
            {' / '}
            {caminho}
          </span>
        )}
        <h1>{titulo}</h1>
        {apoio && <span className={estilos.apoio}>{apoio}</span>}
      </div>
      {acoes && <div className={estilos.acoes}>{acoes}</div>}
    </div>
  )
}
