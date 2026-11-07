// Layout das telas internas (RF-01, RF-04, RF-06; DESIGN.md §Dashboard): faixa da demo fixa no
// topo, menu lateral (recolhível; gaveta no celular), topo com o menu da conta, conteúdo e rodapé.
// A faixa fica fora da área que rola, então nunca sai da tela.
import { Menu } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { NOMES_PAPEIS } from '../modulos/entrada/papeis'
import { useSessao } from '../modulos/entrada/sessao'
import { FaixaDemo } from './FaixaDemo'
import estilos from './Layout.module.css'
import { MenuConta } from './MenuConta'
import { MenuLateral } from './MenuLateral'
import { useMoldura } from './Moldura'
import { Rodape } from './Rodape'

export function Layout() {
  const { sessao, sair } = useSessao()
  const { pedirReset } = useMoldura()
  const navegar = useNavigate()
  const idMenu = useId()
  const [recolhido, setRecolhido] = useState(false)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const coluna = useRef<HTMLDivElement>(null)
  const botaoMenu = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  // A coluna é que rola: ao trocar de tela, volta ao topo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o efeito é a reação à troca de rota
  useEffect(() => {
    coluna.current?.scrollTo(0, 0)
  }, [pathname])

  // Gaveta aberta: o foco entra no primeiro link e, ao fechar, volta ao botão que a abriu.
  const fecharGaveta = useCallback(() => {
    setGavetaAberta(false)
    botaoMenu.current?.focus()
  }, [])

  useEffect(() => {
    if (!gavetaAberta) return
    document.getElementById(idMenu)?.querySelector<HTMLElement>('a')?.focus()
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fecharGaveta()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [gavetaAberta, idMenu, fecharGaveta])

  // A rota só renderiza o Layout com sessão (ExigeSessao).
  if (!sessao) return null

  const trocarDePapel = () => {
    sair()
    navegar('/entrar', { replace: true })
  }

  return (
    <div className={estilos.app}>
      <FaixaDemo />
      <div className={estilos.corpo}>
        <MenuLateral
          id={idMenu}
          papel={sessao.papel}
          recolhido={recolhido}
          aoAlternarRecolhido={() => setRecolhido((valor) => !valor)}
          gavetaAberta={gavetaAberta}
          aoFecharGaveta={fecharGaveta}
        />
        {gavetaAberta && (
          <div className={estilos.fundoGaveta} aria-hidden="true" onClick={fecharGaveta} />
        )}
        <div className={estilos.coluna} ref={coluna}>
          <header className={`${estilos.topo} nao-imprimir`}>
            <button
              ref={botaoMenu}
              type="button"
              className={estilos.abrirMenu}
              aria-label="Abrir menu"
              aria-expanded={gavetaAberta}
              aria-controls={idMenu}
              onClick={() => setGavetaAberta(true)}
            >
              <Menu size={24} aria-hidden="true" />
            </button>
            <MenuConta
              nome={sessao.nome}
              papel={NOMES_PAPEIS[sessao.papel]}
              aoTrocarDePapel={trocarDePapel}
              aoResetar={pedirReset}
            />
          </header>
          <main className={estilos.conteudo}>
            <Outlet />
          </main>
          <Rodape />
        </div>
      </div>
    </div>
  )
}
