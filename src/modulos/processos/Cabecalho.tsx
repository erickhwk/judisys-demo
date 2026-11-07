// Cabeçalho das telas de processo, como em `processos-lista.html` e `processo-novo.html`: trilha
// opcional, título, linha de apoio e ações à direita.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import estilos from './processos.module.css'

export interface PropsCabecalho {
  titulo: ReactNode
  subtitulo?: ReactNode
  /** "Processos / Novo processo": cada item com link, menos o último (a tela atual). */
  trilha?: { rotulo: string; para?: string }[]
  acoes?: ReactNode
}

export function Cabecalho({ titulo, subtitulo, trilha, acoes }: PropsCabecalho) {
  return (
    <header className={estilos.cabecalho}>
      <div className={estilos.cabecalhoTexto}>
        {trilha && (
          <nav aria-label="Trilha" className={estilos.trilha}>
            <ol>
              {trilha.map((item) => (
                <li key={item.rotulo}>
                  {item.para ? (
                    <Link to={item.para}>{item.rotulo}</Link>
                  ) : (
                    <span aria-current="page">{item.rotulo}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1>{titulo}</h1>
        {subtitulo && <div className={estilos.subtitulo}>{subtitulo}</div>}
      </div>
      {acoes && <div className={estilos.acoesCabecalho}>{acoes}</div>}
    </header>
  )
}
