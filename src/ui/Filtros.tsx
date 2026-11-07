import { RotateCcw, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Botao } from './Botao'
import { CampoTexto, type PropsCampoTexto } from './Campo'
import { juntarClasses } from './classes'
import estilos from './Filtros.module.css'

export type PropsFiltros = {
  /** Campos de busca e filtro (`CampoBusca`, `CampoSelecao` com `rotuloOculto`...). */
  children: ReactNode
  /** Mostra "Limpar busca" quando informado. */
  aoLimpar?: () => void
  titulo?: string
}

/** Card de busca e filtros das listas, como em `processos-lista.html`. */
export function Filtros({ children, aoLimpar, titulo = 'Buscar' }: PropsFiltros) {
  return (
    <section className={juntarClasses(estilos.filtros, 'nao-imprimir')} aria-label={titulo}>
      <span className={estilos.titulo} aria-hidden="true">
        {titulo}
      </span>
      <div className={estilos.linha}>
        {children}
        {aoLimpar && (
          <Botao variante="fantasma" icone={<RotateCcw size={18} />} onClick={aoLimpar}>
            Limpar busca
          </Botao>
        )}
      </div>
    </section>
  )
}

/** Campo de busca com lupa; o rótulo fica só para leitor de tela. */
export function CampoBusca(props: Omit<PropsCampoTexto, 'icone' | 'posicaoIcone' | 'type'>) {
  return (
    <CampoTexto
      type="search"
      rotuloOculto
      icone={<Search size={18} />}
      autoComplete="off"
      {...props}
    />
  )
}
