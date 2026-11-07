import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { Boot } from './dados/boot'
import './estilos/global.css'
import { iniciarTema } from './ui/tema'

// O index.html já aplicou o tema antes de pintar; aqui entram as escutas (sistema e outras abas).
iniciarTema()

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado')

createRoot(raiz).render(
  <StrictMode>
    <Boot>
      <App />
    </Boot>
  </StrictMode>,
)
