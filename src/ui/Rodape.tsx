// Rodapé das telas internas (RF-04).
import estilos from './Rodape.module.css'

export function Rodape() {
  return (
    <footer className={`${estilos.rodape} nao-imprimir`}>
      Judisys · por{' '}
      <a href="https://draft.dev.br" target="_blank" rel="noopener noreferrer">
        Draft
      </a>
    </footer>
  )
}
