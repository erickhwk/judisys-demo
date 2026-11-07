// Menu da conta (RF-06): nome, papel, Trocar de papel (volta ao login) e Resetar demo.
// Botão que abre um painel (padrão "disclosure"): Esc e clique fora fecham.
import { ChevronDown, Repeat, RotateCcw, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { juntarClasses } from './classes'
import estilos from './MenuConta.module.css'

export type PropsMenuConta = {
  nome: string
  papel: string
  aoTrocarDePapel: () => void
  aoResetar: () => void
}

export function MenuConta({ nome, papel, aoTrocarDePapel, aoResetar }: PropsMenuConta) {
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
    <div className={estilos.raiz} ref={raiz}>
      <button
        ref={botao}
        type="button"
        className={estilos.botao}
        aria-label="Menu da conta"
        aria-expanded={aberto}
        aria-controls={idPainel}
        onClick={() => setAberto((valor) => !valor)}
      >
        <span className={estilos.avatar} aria-hidden="true">
          <UserRound size={20} strokeWidth={1.8} />
        </span>
        <span className={estilos.nomeCurto}>{nome}</span>
        <ChevronDown
          size={16}
          strokeWidth={2.2}
          aria-hidden="true"
          className={juntarClasses(estilos.seta, aberto && estilos.setaAberta)}
        />
      </button>
      <div id={idPainel} className={estilos.painel} hidden={!aberto}>
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
