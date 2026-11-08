// Faixa do Personalizar (RF-18, SDD-INI §5.1), conforme o artboard "INI · Personalizar": a ajuda,
// Restaurar padrão, Cancelar e Concluir, e o catálogo dos quadros que estão fora, cada um com o seu
// tamanho. Clicar num quadro do catálogo o põe no primeiro lugar livre (RF-20). Na ordem do Tab,
// vem antes da grade (PRS-14).
import { Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Botao } from '../../ui/Botao'
import estilos from './CatalogoEdicao.module.css'
import type { DefinicaoQuadro, IdQuadro } from './montagem'

export interface PropsCatalogoEdicao {
  /** Quadros que o papel pode pôr e que não estão no rascunho, na ordem do catálogo. */
  fora: readonly DefinicaoQuadro[]
  aoAdicionar: (quadro: IdQuadro) => void
  aoRestaurar: () => void
  aoCancelar: () => void
  aoConcluir: () => void
}

export function CatalogoEdicao({
  fora,
  aoAdicionar,
  aoRestaurar,
  aoCancelar,
  aoConcluir,
}: PropsCatalogoEdicao) {
  const faixaRef = useRef<HTMLElement>(null)
  const catalogoRef = useRef<HTMLDivElement>(null)
  // Índice do botão do catálogo que recebe o foco depois de adicionar (o clicado some).
  const focarEm = useRef<number | null>(null)

  // O Personalizar some ao entrar no modo: o foco vem para a faixa.
  useEffect(() => {
    faixaRef.current?.focus()
  }, [])

  useEffect(() => {
    const indice = focarEm.current
    if (indice === null) return
    focarEm.current = null
    const botoes = catalogoRef.current?.querySelectorAll('button')
    const alvo = botoes && botoes.length > 0 ? botoes[Math.min(indice, botoes.length - 1)] : null
    ;(alvo ?? faixaRef.current)?.focus()
  })

  return (
    <section
      ref={faixaRef}
      aria-label="Personalizar o início"
      className={estilos.faixa}
      tabIndex={-1}
    >
      <div className={estilos.topo}>
        <p className={estilos.ajuda}>
          <strong>Personalizando o início.</strong>{' '}
          <span className={estilos.apoio}>
            Arraste os quadros pela alça. Nada muda até você concluir.
          </span>
        </p>
        <div className={estilos.acoes}>
          <Botao variante="fantasma" className={estilos.botao} onClick={aoRestaurar}>
            Restaurar padrão
          </Botao>
          <Botao className={estilos.botao} onClick={aoCancelar}>
            Cancelar
          </Botao>
          <Botao variante="primario" className={estilos.botao} onClick={aoConcluir}>
            Concluir
          </Botao>
        </div>
      </div>
      <div ref={catalogoRef} className={estilos.catalogo}>
        <span className={estilos.rotulo} id="catalogo-do-inicio">
          Catálogo:
        </span>
        {fora.length === 0 ? (
          <span className={estilos.apoio}>todos os quadros já estão no início.</span>
        ) : (
          <ul aria-labelledby="catalogo-do-inicio" className={estilos.lista}>
            {fora.map((quadro, indice) => (
              <li key={quadro.id}>
                <button
                  type="button"
                  className={estilos.item}
                  onClick={() => {
                    focarEm.current = indice
                    aoAdicionar(quadro.id)
                  }}
                >
                  <Plus size={13} strokeWidth={2.4} aria-hidden="true" />
                  {quadro.titulo}
                  <span className={estilos.tamanho}>
                    <span className="somente-leitor">, tamanho </span>
                    {`${quadro.w}×${quadro.h}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
