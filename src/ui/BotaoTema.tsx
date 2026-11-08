// Botão do modo escuro (AJ-11): lua no claro, sol no escuro; o nome diz o que o clique faz.
// No pé do menu lateral, o mesmo comportamento vira interruptor (`InterruptorTema`, INI-01).
import { Moon, Sun } from 'lucide-react'
import estilos from './BotaoTema.module.css'
import { juntarClasses } from './classes'
import { alternarTema, useTema } from './tema'

export function BotaoTema() {
  const tema = useTema()
  const escuro = tema === 'dark'
  return (
    <button
      type="button"
      className={juntarClasses(estilos.botao, 'nao-imprimir')}
      aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={alternarTema}
    >
      {escuro ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
    </button>
  )
}

export type PropsInterruptorTema = {
  /** Menu recolhido: só o ícone, com o nome no `aria-label`. */
  soIcone?: boolean
  className?: string
}

/** Interruptor "Tema escuro" (`role="switch"`): ligado no tema escuro (INI-01, RF-01). */
export function InterruptorTema({ soIcone = false, className }: PropsInterruptorTema) {
  const escuro = useTema() === 'dark'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={escuro}
      aria-label={soIcone ? 'Tema escuro' : undefined}
      title={soIcone ? 'Tema escuro' : undefined}
      className={juntarClasses(estilos.interruptor, soIcone && estilos.soIcone, className)}
      onClick={alternarTema}
    >
      <Moon size={18} strokeWidth={1.8} aria-hidden="true" />
      {!soIcone && (
        <>
          <span className={estilos.rotulo}>Tema escuro</span>
          <span className={estilos.trilho} aria-hidden="true">
            <span className={estilos.pino} />
          </span>
        </>
      )}
    </button>
  )
}
