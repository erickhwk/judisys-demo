// Menu da conta (RF-06): nome, papel, Trocar de papel (volta ao login) e Resetar demo.
// Botão que abre um painel (padrão "disclosure"): Esc e clique fora fecham.
// INI-01: mora no pé do menu lateral (avatar, nome e papel; o painel abre para cima) e, no tablet e
// no celular, também no avatar da barra do topo.
import { ChevronsUpDown, Repeat, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { juntarClasses } from './classes'
import estilos from './MenuConta.module.css'

export type PropsMenuConta = {
  nome: string
  papel: string
  aoTrocarDePapel: () => void
  aoResetar: () => void
  /**
   * `menu`: pé do menu lateral, com nome e papel; o painel abre para cima.
   * `avatar`: só o avatar (menu recolhido e barra do topo).
   */
  variante?: 'menu' | 'avatar'
  /** Para onde o painel abre (padrão: para cima no `menu`, para baixo no `avatar`). */
  painelPara?: 'cima' | 'baixo'
  className?: string
}

/** Iniciais do avatar: primeira letra do primeiro e do último nome ("Otávio Reis" → "OR"). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? '') : ''
  return `${primeira}${ultima}`.toLocaleUpperCase('pt-BR')
}

export function MenuConta({
  nome,
  papel,
  aoTrocarDePapel,
  aoResetar,
  variante = 'menu',
  painelPara = variante === 'menu' ? 'cima' : 'baixo',
  className,
}: PropsMenuConta) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const idPainel = useId()

  useEffect(() => {
    if (!aberto) return
    const aoApertar = (evento: PointerEvent) => {
      if (!raiz.current?.contains(evento.target as Node)) setAberto(false)
    }
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return
      setAberto(false)
      botao.current?.focus()
    }
    document.addEventListener('pointerdown', aoApertar)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('pointerdown', aoApertar)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  const escolher = (acao: () => void) => () => {
    setAberto(false)
    acao()
  }

  return (
    <div className={juntarClasses(estilos.raiz, className)} ref={raiz}>
      <button
        ref={botao}
        type="button"
        className={juntarClasses(estilos.botao, variante === 'avatar' && estilos.soAvatar)}
        aria-label="Menu da conta"
        aria-expanded={aberto}
        aria-controls={idPainel}
        title={variante === 'avatar' ? nome : undefined}
        onClick={() => setAberto((valor) => !valor)}
      >
        <span className={estilos.avatar} aria-hidden="true">
          {iniciais(nome)}
        </span>
        {variante === 'menu' && (
          <>
            <span className={estilos.identidade}>
              <span className={estilos.nomeCurto}>{nome}</span>
              <span className={estilos.papelCurto}>{papel}</span>
            </span>
            <ChevronsUpDown size={16} strokeWidth={2} aria-hidden="true" className={estilos.seta} />
          </>
        )}
      </button>
      <div
        id={idPainel}
        className={juntarClasses(estilos.painel, painelPara === 'cima' && estilos.paraCima)}
        hidden={!aberto}
      >
        <div className={estilos.quem}>
          <p className={estilos.nome}>{nome}</p>
          <p className={estilos.papel}>{papel}</p>
        </div>
        <button type="button" className={estilos.opcao} onClick={escolher(aoTrocarDePapel)}>
          <Repeat size={18} aria-hidden="true" />
          Trocar de papel
        </button>
        <button type="button" className={estilos.opcao} onClick={escolher(aoResetar)}>
          <RotateCcw size={18} aria-hidden="true" />
          Resetar demo
        </button>
      </div>
    </div>
  )
}
