// Largura do contêiner da grade (SDD-INI §5.3): as colunas vêm dela, e não da janela, porque o
// menu lateral aberto ou recolhido muda o espaço do conteúdo. No jsdom e no HTML do servidor não há
// layout: os testes injetam a largura (`larguraForcada`, SDD §10).
import { type RefObject, useLayoutEffect, useRef, useState } from 'react'

export function useLargura(larguraForcada?: number): {
  ref: RefObject<HTMLDivElement | null>
  largura: number | null
} {
  const ref = useRef<HTMLDivElement>(null)
  const [medida, setMedida] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (larguraForcada !== undefined) return
    const elemento = ref.current
    if (!elemento) return
    // Medida antes da primeira pintura: a grade não pisca na largura errada.
    setMedida(elemento.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(() => setMedida(elemento.clientWidth))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [larguraForcada])

  return { ref, largura: larguraForcada ?? medida }
}
