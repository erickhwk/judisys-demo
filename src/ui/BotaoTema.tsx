// Botão do modo escuro (AJ-11): lua no claro, sol no escuro; o nome diz o que o clique faz.
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
