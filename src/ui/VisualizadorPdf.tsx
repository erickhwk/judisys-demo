import { ExternalLink, FileText } from 'lucide-react'
import type { CSSProperties } from 'react'
import { juntarClasses } from './classes'
import estilos from './VisualizadorPdf.module.css'

export type PropsVisualizadorPdf = {
  /** URL de blob (upload) ou caminho público (`anexos/*.pdf`). */
  url: string
  /** Título do documento: nome acessível do iframe. */
  titulo: string
  altura?: number
}

/**
 * PDF em `<iframe>` com "Abrir em nova aba / baixar" (T-09). O link existe porque
 * alguns navegadores (Safari no celular) não mostram o PDF inteiro no iframe.
 */
export function VisualizadorPdf({ url, titulo, altura = 640 }: PropsVisualizadorPdf) {
  return (
    <div className={estilos.visualizador}>
      <div className={juntarClasses(estilos.barra, 'nao-imprimir')}>
        <span className={estilos.nome}>
          <FileText size={18} aria-hidden="true" />
          <span>{titulo}</span>
        </span>
        <a className={estilos.link} href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={18} aria-hidden="true" />
          Abrir em nova aba / baixar
          <span className="somente-leitor"> (abre em nova aba)</span>
        </a>
      </div>
      <iframe
        className={estilos.quadro}
        src={url}
        title={titulo}
        style={{ '--altura-quadro': `${altura}px` } as CSSProperties}
      />
    </div>
  )
}
