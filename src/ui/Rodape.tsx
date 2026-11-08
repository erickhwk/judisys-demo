// Rodapé das telas internas (RF-04). Alinhado à direita, com a marca da Draft no lugar do nome (AJ-11).
// A linha de cima vai de ponta a ponta, mas a marca para na borda direita do conteúdo (AJ-22).
import type { CSSProperties } from 'react'
import { LARGURA_CONTEUDO } from './larguras'
import { MarcaDraft } from './MarcaDraft'
import estilos from './Rodape.module.css'

const TETO = { '--largura-conteudo': `${LARGURA_CONTEUDO}px` } as CSSProperties

export function Rodape() {
  return (
    <footer className={`${estilos.rodape} nao-imprimir`} style={TETO}>
      Judisys · por
      <a
        href="https://draft.dev.br"
        target="_blank"
        rel="noopener noreferrer"
        className={estilos.marca}
      >
        <MarcaDraft />
      </a>
    </footer>
  )
}
