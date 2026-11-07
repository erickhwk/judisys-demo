// Cabeçalho de página de todas as telas, como nos guias: trilha opcional ("Processos / Novo
// processo", `processo-novo.html`), título, linha de apoio (`processos-lista.html`) e ações à direita.
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import estilos from './CabecalhoPagina.module.css'
import { juntarClasses } from './classes'

export interface ItemTrilha {
  rotulo: string
  /** Sem `para`, o item é a tela atual. */
  para?: string
}

export interface PropsCabecalhoPagina {
  titulo: ReactNode
  /** Caminho até a tela: cada item com link, menos o da tela atual. */
  trilha?: ItemTrilha[]
  /** Linha abaixo do título (contagem, resumo). Itens soltos com selos: use `<ApoioEmLinha>`. */
  apoio?: ReactNode
  acoes?: ReactNode
}

export function CabecalhoPagina({ titulo, trilha, apoio, acoes }: PropsCabecalhoPagina) {
  return (
    <header className={estilos.cabecalho}>
      <div className={juntarClasses(estilos.texto, trilha && estilos.comTrilha)}>
        {trilha && (
          <nav aria-label="Trilha" className={estilos.trilha}>
            <ol>
              {trilha.map((item) => (
                <li key={`${item.rotulo}-${item.para ?? ''}`}>
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
        {apoio && <div className={estilos.apoio}>{apoio}</div>}
      </div>
      {acoes && <div className={estilos.acoes}>{acoes}</div>}
    </header>
  )
}

/** Apoio em itens lado a lado, em texto menor (ex.: documento, selo da classe e natureza). */
export function ApoioEmLinha({ children }: { children: ReactNode }) {
  return <span className={estilos.emLinha}>{children}</span>
}
