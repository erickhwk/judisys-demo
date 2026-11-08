// Layout das telas internas (RF-01, RF-04, RF-06; DESIGN.md §Dashboard): faixa da demo fixa no
// topo, menu lateral (recolhível; gaveta abaixo de 901px) com o tema e a conta no pé, conteúdo e
// rodapé. INI-01: o topo do desktop saiu; a busca global abre pelo `CabecalhoPagina` e pelo ⌘K, e
// abaixo de 901px uma barra no topo traz o menu, a logo, a lupa da busca e o avatar da conta.
// A faixa fica fora da área que rola, então nunca sai da tela.
import { Menu } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { BotaoBuscaGlobal, BuscaGlobal, ehAtalhoBusca } from '../modulos/busca/BuscaGlobal'
import { NOMES_PAPEIS } from '../modulos/entrada/papeis'
import { useSessao } from '../modulos/entrada/sessao'
import { FaixaDemo } from './FaixaDemo'
import estilos from './Layout.module.css'
import { Logo } from './Logo'
import { MenuConta } from './MenuConta'
import { MenuLateral } from './MenuLateral'
import { useMoldura } from './Moldura'
import { Rodape } from './Rodape'

/** Largura máxima em que o menu vira gaveta (`@media (max-width: 900px)` dos CSS do Layout e do menu). */
const PONTO_GAVETA = 900

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
  // O `flushSync` tira o `inert` da coluna antes do foco: sem ele, o botão ainda está inerte.
  const fecharGaveta = useCallback(() => {
    flushSync(() => setGavetaAberta(false))
    botaoMenu.current?.focus()
  }, [])

  useEffect(() => {
    if (!gavetaAberta) return
    document.getElementById(idMenu)?.querySelector<HTMLElement>('a')?.focus()
    const aoTeclar = (evento: KeyboardEvent) => {
      // Esc já usado (o painel da conta, no pé do menu, fecha antes): a gaveta fica aberta.
      if (evento.key === 'Escape') {
        if (!evento.defaultPrevented) fecharGaveta()
      }
      // A busca mora na coluna inerte: a gaveta fecha junto, sem roubar o foco do campo da busca.
      else if (ehAtalhoBusca(evento)) setGavetaAberta(false)
    }
    // Acima do ponto da gaveta não há fundo escuro nem botão de fechar: a coluna não fica inerte.
    const telaLarga = window.matchMedia(`(min-width: ${PONTO_GAVETA + 1}px)`)
    const aoAlargar = () => {
      if (telaLarga.matches) setGavetaAberta(false)
    }
    document.addEventListener('keydown', aoTeclar)
    telaLarga.addEventListener('change', aoAlargar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      telaLarga.removeEventListener('change', aoAlargar)
    }
  }, [gavetaAberta, idMenu, fecharGaveta])

  // A rota só renderiza o Layout com sessão (ExigeSessao).
  if (!sessao) return null

  const trocarDePapel = () => {
    sair()
    navegar('/entrar', { replace: true })
  }

  const conta = {
    nome: sessao.nome,
    papel: NOMES_PAPEIS[sessao.papel],
    aoTrocarDePapel: trocarDePapel,
    aoResetar: pedirReset,
  }

  return (
    <BuscaGlobal papel={sessao.papel}>
      <div className={estilos.app}>
        {/* Gaveta aberta: o resto da tela fica inerte, e o Tab não sai do menu para trás do fundo
            escuro (DMO-23). */}
        <div className={estilos.faixa} inert={gavetaAberta}>
          <FaixaDemo />
        </div>
        <div className={estilos.corpo}>
          <MenuLateral
            id={idMenu}
            papel={sessao.papel}
            nome={conta.nome}
            nomePapel={conta.papel}
            aoTrocarDePapel={conta.aoTrocarDePapel}
            aoResetar={conta.aoResetar}
            recolhido={recolhido}
            aoAlternarRecolhido={() => setRecolhido((valor) => !valor)}
            gavetaAberta={gavetaAberta}
            aoFecharGaveta={fecharGaveta}
          />
          {gavetaAberta && (
            <div className={estilos.fundoGaveta} aria-hidden="true" onClick={fecharGaveta} />
          )}
          <div className={estilos.coluna} ref={coluna} inert={gavetaAberta}>
            {/* Só abaixo de 901px (RF-03): no desktop, o menu e o cabeçalho da página fazem esse papel. */}
            <header className={`${estilos.barra} nao-imprimir`}>
              <button
                ref={botaoMenu}
                type="button"
                className={estilos.abrirMenu}
                aria-label="Abrir menu"
                aria-expanded={gavetaAberta}
                aria-controls={idMenu}
                onClick={() => setGavetaAberta(true)}
              >
                <Menu size={22} aria-hidden="true" />
              </button>
              <span className={estilos.logo}>
                <Logo altura={28} />
              </span>
              <BotaoBuscaGlobal compacto />
              <MenuConta {...conta} variante="avatar" />
            </header>
            <main className={estilos.conteudo}>
              <Outlet />
            </main>
            <Rodape />
          </div>
        </div>
      </div>
    </BuscaGlobal>
  )
}
