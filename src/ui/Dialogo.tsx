import { X } from 'lucide-react'
import { type ReactNode, useEffect, useId, useReducer, useRef } from 'react'
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
  // O navegador pode fechar o <dialog> sozinho (ex.: Esc repetido no Chrome). Um novo render
  // ressincroniza com `aberto` e reabre se quem usa recusou fechar (ex.: Confirmacao ocupada).
  const [, ressincronizar] = useReducer((n: number) => n + 1, 0)
  // Clique fora só conta se o botão foi apertado e solto no fundo (arrastar de dentro não fecha).
  const apertouNoFundo = useRef(false)

  // Sem lista de dependências: roda a cada render e só age quando o DOM difere de `aberto`.
  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) {
      dialogo.showModal()
      // `data-foco-inicial` escolhe quem recebe o foco (o padrão do navegador é o primeiro focável).
      dialogo.querySelector<HTMLElement>('[data-foco-inicial]')?.focus()
    }
    if (!aberto && dialogo.open) dialogo.close()
  })

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
        if (!aberto) return
        aoFechar()
        ressincronizar()
      }}
      onPointerDown={(evento) => {
        apertouNoFundo.current = evento.target === evento.currentTarget
      }}
      onClick={(evento) => {
        const noFundo = apertouNoFundo.current && evento.target === evento.currentTarget
        apertouNoFundo.current = false
        if (fecharAoClicarFora && noFundo) aoFechar()
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
