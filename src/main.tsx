import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { Boot } from './dados/boot'
import './estilos/global.css'

// Catálogo dos componentes (DMO-09), só em dev: fora do build de produção.
const Catalogo = import.meta.env.DEV
  ? lazy(() => import('./ui/catalogo/Catalogo').then((m) => ({ default: m.Catalogo })))
  : null

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado')

createRoot(raiz).render(
  <StrictMode>
    {Catalogo && location.hash === '#/catalogo' ? (
      <Suspense>
        <Catalogo />
      </Suspense>
    ) : (
      <Boot>
        <App />
      </Boot>
    )}
  </StrictMode>,
)
