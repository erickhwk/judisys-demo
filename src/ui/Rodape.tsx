// Rodapé das telas internas (RF-04). Alinhado à direita, com a marca da Draft no lugar do nome (AJ-11).
import { MarcaDraft } from './MarcaDraft'
import estilos from './Rodape.module.css'

export function Rodape() {
  return (
    <footer className={`${estilos.rodape} nao-imprimir`}>
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
