import type { ReactNode } from 'react'
import { Link } from 'react-router'
import estilos from './credores.module.css'

export interface Migalha {
  rotulo: string
  para?: string
}

/** Caminho, título e ações, como no cabeçalho de `processo-novo.html`. */
export function CabecalhoPagina({
  migalhas,
  titulo,
  subtitulo,
  acoes,
}: {
  migalhas: Migalha[]
  titulo: ReactNode
  subtitulo?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <header className={estilos.cabecalho}>
      <div className={estilos.cabecalhoTexto}>
        <p className={estilos.migalhas}>
          {migalhas.map((migalha, indice) => (
            <span key={`${migalha.rotulo}-${migalha.para ?? ''}`}>
              {indice > 0 && <span aria-hidden="true"> / </span>}
              {migalha.para ? <Link to={migalha.para}>{migalha.rotulo}</Link> : migalha.rotulo}
            </span>
          ))}
        </p>
        <h1>{titulo}</h1>
        {subtitulo && <div className={estilos.subtitulo}>{subtitulo}</div>}
      </div>
      {acoes && <div className={estilos.acoesCabecalho}>{acoes}</div>}
    </header>
  )
}
