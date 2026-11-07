// Menu lateral (DESIGN.md §Dashboard): seções Principal e Administração, item ativo em dourado.
// Recolhível no desktop (só os ícones); no celular vira gaveta (o Layout decide). Itens sem
// permissão de leitura não aparecem (RF-40).
import {
  Building2,
  CalendarDays,
  FileText,
  Gauge,
  History,
  type LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Users,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router'
import { type Modulo, type Papel, pode } from '../regras/permissoes'
import { juntarClasses } from './classes'
import { Logo } from './Logo'
import estilos from './MenuLateral.module.css'

interface Item {
  rotulo: string
  caminho: string
  modulo: Modulo
  icone: LucideIcon
}

const SECOES: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Principal',
    itens: [
      { rotulo: 'Dashboard', caminho: '/', modulo: 'dashboard', icone: Gauge },
      { rotulo: 'Processos', caminho: '/processos', modulo: 'processos', icone: Scale },
      { rotulo: 'Empresas', caminho: '/empresas', modulo: 'empresas', icone: Building2 },
      { rotulo: 'Informes', caminho: '/informes', modulo: 'informes', icone: FileText },
      { rotulo: 'Agenda', caminho: '/agenda', modulo: 'prazos', icone: CalendarDays },
    ],
  },
  {
    titulo: 'Administração',
    itens: [
      { rotulo: 'Usuários', caminho: '/usuarios', modulo: 'usuarios', icone: Users },
      { rotulo: 'Logs', caminho: '/logs', modulo: 'logs', icone: History },
    ],
  },
]

export type PropsMenuLateral = {
  id: string
  papel: Papel
  /** Desktop: só os ícones. */
  recolhido: boolean
  aoAlternarRecolhido: () => void
  /** Celular: gaveta aberta. */
  gavetaAberta: boolean
  aoFecharGaveta: () => void
}

export function MenuLateral({
  id,
  papel,
  recolhido,
  aoAlternarRecolhido,
  gavetaAberta,
  aoFecharGaveta,
}: PropsMenuLateral) {
  return (
    <aside
      id={id}
      className={juntarClasses(
        estilos.menu,
        recolhido && estilos.recolhido,
        gavetaAberta && estilos.gavetaAberta,
        'nao-imprimir',
      )}
      aria-label="Menu"
    >
      <div className={estilos.topo}>
        <span className={estilos.logoCompleta}>
          <Logo fundo="escuro" altura={38} />
        </span>
        <span className={estilos.logoMarca}>
          <Logo variante="marca" fundo="escuro" altura={34} />
        </span>
        <button
          type="button"
          className={juntarClasses(estilos.botaoTopo, estilos.recolher)}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          aria-pressed={recolhido}
          onClick={aoAlternarRecolhido}
        >
          {recolhido ? (
            <PanelLeftOpen size={22} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={22} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={juntarClasses(estilos.botaoTopo, estilos.fecharGaveta)}
          aria-label="Fechar menu"
          onClick={aoFecharGaveta}
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <div className={estilos.secoes}>
        {SECOES.map((secao) => {
          const itens = secao.itens.filter((item) => pode(papel, 'ler', item.modulo))
          if (itens.length === 0) return null
          return (
            <nav key={secao.titulo} aria-label={secao.titulo} className={estilos.secao}>
              <span className={estilos.tituloSecao}>{secao.titulo}</span>
              {itens.map(({ rotulo, caminho, icone: Icone }) => (
                <NavLink
                  key={caminho}
                  to={caminho}
                  end={caminho === '/'}
                  className={estilos.item}
                  title={recolhido ? rotulo : undefined}
                  onClick={aoFecharGaveta}
                >
                  <Icone size={20} strokeWidth={1.8} aria-hidden="true" />
                  <span className={estilos.rotulo}>{rotulo}</span>
                </NavLink>
              ))}
            </nav>
          )
        })}
      </div>
    </aside>
  )
}
