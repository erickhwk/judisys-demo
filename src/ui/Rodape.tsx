// Rodapé das telas internas (RF-04). Alinhado à direita, com a marca da Draft no lugar do nome (AJ-11).
// A marca fica na borda direita da coluna, como as ações do cabeçalho (AJ-26).
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
