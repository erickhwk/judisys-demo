import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { BotaoIcone } from './Botao'
import { juntarClasses } from './classes'
import estilos from './Dialogo.module.css'

export type PropsDialogo = {
  aberto: boolean
  /** Chamado no Esc, no botão de fechar e no clique fora. Quem usa decide fechar. */
  aoFechar: () => void
  titulo: ReactNode
  children: ReactNode
  /** Botões do rodapé. */
  acoes?: ReactNode
  /** `alertdialog` para confirmações. */
  papel?: 'dialog' | 'alertdialog'
  largura?: 'normal' | 'larga'
  fecharAoClicarFora?: boolean
}

/** Diálogo modal com `<dialog>` nativo (T-08): foco preso, Esc e fundo escurecido do navegador. */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  children,
  acoes,
  papel = 'dialog',
  largura = 'normal',
  fecharAoClicarFora = true,
}: PropsDialogo) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  const idConteudo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) {
      dialogo.showModal()
      // `data-foco-inicial` escolhe quem recebe o foco (o padrão do navegador é o primeiro focável).
      dialogo.querySelector<HTMLElement>('[data-foco-inicial]')?.focus()
    }
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: o clique fora tem o Esc (evento cancel) como equivalente de teclado
    <dialog
      ref={ref}
      role={papel === 'alertdialog' ? 'alertdialog' : undefined}
      aria-modal="true"
      aria-labelledby={idTitulo}
      aria-describedby={idConteudo}
      className={juntarClasses(estilos.dialogo, largura === 'larga' && estilos.larga)}
      onCancel={(evento) => {
        // O estado de aberto é de quem usa: o Esc só pede para fechar.
        evento.preventDefault()
        aoFechar()
      }}
      onClose={() => {
        if (aberto) aoFechar()
      }}
      onClick={(evento) => {
        if (fecharAoClicarFora && evento.target === evento.currentTarget) aoFechar()
      }}
    >
      {aberto && (
        <div className={estilos.caixa}>
          <header className={estilos.cabecalho}>
            <h2 id={idTitulo} className={estilos.titulo}>
              {titulo}
            </h2>
            <BotaoIcone aria-label="Fechar" icone={<X size={20} />} onClick={aoFechar} />
          </header>
          <div id={idConteudo} className={estilos.conteudo}>
            {children}
          </div>
          {acoes && <footer className={estilos.acoes}>{acoes}</footer>}
        </div>
      )}
    </dialog>
  )
}
