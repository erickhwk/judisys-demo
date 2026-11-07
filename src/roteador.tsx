// Roteador hash (T-03) com as guardas da SDD §5.6: sem sessão vai ao login (PER-08); sem permissão
// mostra "Seu papel não permite esta ação" (RF-40, PER-04); qualquer outra rota, "Página não
// encontrada". As rotas em si vêm de rotas.tsx, que junta as de cada módulo.
import type { ReactNode } from 'react'
import { createHashRouter, Navigate, Outlet, type RouteObject } from 'react-router'
import type { DefinicaoRota } from './definicaoRotas'
import { Entrar } from './modulos/entrada/Entrar'
import { useSessao } from './modulos/entrada/sessao'
import { pode } from './regras/permissoes'
import { ROTAS, ROTAS_SEM_LAYOUT } from './rotas'
import { Layout } from './ui/Layout'
import { MolduraProvider } from './ui/Moldura'
import { NaoEncontrada, SemPermissao } from './ui/TelasDeAviso'

function Raiz() {
  return (
    <MolduraProvider>
      <Outlet />
    </MolduraProvider>
  )
}

function ExigeSessao() {
  const { sessao } = useSessao()
  return sessao ? <Outlet /> : <Navigate to="/entrar" replace />
}

function ComPermissao({ rota, children }: { rota: DefinicaoRota; children: ReactNode }) {
  const { sessao } = useSessao()
  if (!sessao || !pode(sessao.papel, rota.acao, rota.modulo)) return <SemPermissao />
  return children
}

function paraRota(rota: DefinicaoRota): RouteObject {
  return { path: rota.caminho, element: <ComPermissao rota={rota}>{rota.tela}</ComPermissao> }
}

// Catálogo dos componentes (DMO-09), só em dev: o import dinâmico some do build de produção.
const rotasDeDesenvolvimento: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/catalogo',
        lazy: async () => ({ Component: (await import('./ui/catalogo/Catalogo')).Catalogo }),
      },
    ]
  : []

export function criarRoteador() {
  return createHashRouter([
    {
      element: <Raiz />,
      children: [
        { path: '/entrar', element: <Entrar /> },
        ...rotasDeDesenvolvimento,
        {
          element: <ExigeSessao />,
          children: [
            {
              element: <Layout />,
              children: [...ROTAS.map(paraRota), { path: '*', element: <NaoEncontrada /> }],
            },
            ...ROTAS_SEM_LAYOUT.map(paraRota),
          ],
        },
      ],
    },
  ])
}
