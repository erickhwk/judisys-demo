import { ChevronLeft, ChevronRight } from 'lucide-react'
import { juntarClasses } from './classes'
import estilos from './Paginacao.module.css'
import { paginasVisiveis } from './paginas'

export type PropsPaginacao = {
  pagina: number
  totalPaginas: number
  aoMudar: (pagina: number) => void
}

/** "Página X de Y" e os botões de página (44px, atual em azul). Some com uma página só. */
export function Paginacao({ pagina, totalPaginas, aoMudar }: PropsPaginacao) {
  if (totalPaginas <= 1) return null

  return (
    <div className={juntarClasses(estilos.paginacao, 'nao-imprimir')}>
      <span className={estilos.resumo}>
        Página {pagina} de {totalPaginas}
      </span>
      <nav aria-label="Paginação" className={estilos.botoes}>
        <button
          type="button"
          className={estilos.botao}
          aria-label="Página anterior"
          disabled={pagina <= 1}
          onClick={() => aoMudar(pagina - 1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        {paginasVisiveis(pagina, totalPaginas).map((item, indice) =>
          item === 'reticencias' ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: reticências não têm identidade própria
            <span key={`reticencias-${indice}`} className={estilos.reticencias} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={juntarClasses(estilos.botao, item === pagina && estilos.atual)}
              aria-label={`Página ${item}`}
              aria-current={item === pagina ? 'page' : undefined}
              onClick={() => aoMudar(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={estilos.botao}
          aria-label="Próxima página"
          disabled={pagina >= totalPaginas}
          onClick={() => aoMudar(pagina + 1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </nav>
    </div>
  )
}
