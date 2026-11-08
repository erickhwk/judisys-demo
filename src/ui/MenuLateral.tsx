// Menu lateral (INI-01, RF-01): claro, com as seções Principal e Administração, o item ativo em
// azul-claro com o ícone dourado e os contadores de Processos e de prazos vencidos na Agenda. No pé,
// o interruptor de tema e a conta. Recolhível no desktop (só os ícones); abaixo de 901px vira gaveta
// (o Layout decide). Itens sem permissão de leitura não aparecem (RF-40).
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
import { type ComponentType, useId } from 'react'
import { NavLink } from 'react-router'
import { useTodos } from '../dados/contexto'
import { noPeriodo } from '../modulos/prazos/regras'
import { type Modulo, type Papel, pode } from '../regras/permissoes'
import { hoje } from '../regras/relogio'
import { InterruptorTema } from './BotaoTema'
import { juntarClasses } from './classes'
import { Logo } from './Logo'
import { MenuConta } from './MenuConta'
import estilos from './MenuLateral.module.css'

interface Item {
  rotulo: string
  caminho: string
  modulo: Modulo
  icone: LucideIcon
  contador?: ComponentType<PropsContador>
}

interface PropsContador {
  /** Id do texto que descreve o contador para o leitor de tela (`aria-describedby` do link). */
  idDescricao: string
}

/** O número fica `aria-hidden` e chega ao leitor de tela pelo `aria-describedby` do link; o alerta
 * some quando é zero (CAS-03). */
function Numero({
  idDescricao,
  valor,
  descricao,
  alerta = false,
}: PropsContador & { valor: number; descricao: string; alerta?: boolean }) {
  return (
    <>
      {(valor > 0 || !alerta) && (
        <span
          className={juntarClasses(estilos.contador, alerta && estilos.contadorAlerta)}
          data-contador={alerta ? 'vencidos' : 'processos'}
          aria-hidden="true"
        >
          {valor}
        </span>
      )}
      <span id={idDescricao} hidden>
        {descricao}
      </span>
    </>
  )
}

/** Total de processos (RF-01, CAS-02). Mesma consulta do início (`useTodos('processos')`). */
function ContadorProcessos({ idDescricao }: PropsContador) {
  const total = useTodos('processos').data?.length
  if (total === undefined) return null
  return (
    <Numero
      idDescricao={idDescricao}
      valor={total}
      descricao={total === 1 ? '1 processo' : `${total} processos`}
    />
  )
}

/** Prazos vencidos, em vermelho; some sem vencidos (RF-01, CAS-02, CAS-03). */
function ContadorVencidos({ idDescricao }: PropsContador) {
  const prazos = useTodos('prazos').data
  if (!prazos) return null
  const dia = hoje()
  const vencidos = prazos.filter((prazo) => noPeriodo(prazo, 'vencidos', dia)).length
  const descricao =
    vencidos === 0
      ? 'nenhum prazo vencido'
      : vencidos === 1
        ? '1 prazo vencido'
        : `${vencidos} prazos vencidos`
  return <Numero idDescricao={idDescricao} valor={vencidos} descricao={descricao} alerta />
}

const SECOES: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Principal',
    itens: [
      { rotulo: 'Início', caminho: '/', modulo: 'dashboard', icone: Gauge },
      {
        rotulo: 'Processos',
        caminho: '/processos',
        modulo: 'processos',
        icone: Scale,
        contador: ContadorProcessos,
      },
      { rotulo: 'Empresas', caminho: '/empresas', modulo: 'empresas', icone: Building2 },
      { rotulo: 'Informes', caminho: '/informes', modulo: 'informes', icone: FileText },
      {
        rotulo: 'Agenda',
        caminho: '/agenda',
        modulo: 'prazos',
        icone: CalendarDays,
        contador: ContadorVencidos,
      },
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
  /** Conta no pé do menu: nome e papel por extenso. */
  nome: string
  nomePapel: string
  aoTrocarDePapel: () => void
  aoResetar: () => void
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
  nome,
  nomePapel,
  aoTrocarDePapel,
  aoResetar,
  recolhido,
  aoAlternarRecolhido,
  gavetaAberta,
  aoFecharGaveta,
}: PropsMenuLateral) {
  const idBase = useId()
  // A gaveta (abaixo de 901px) mostra sempre o menu inteiro, mesmo recolhido no desktop.
  const soIcones = recolhido && !gavetaAberta
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
          <Logo altura={34} />
        </span>
        <span className={estilos.logoMarca}>
          <Logo variante="marca" altura={32} />
        </span>
        <button
          type="button"
          className={juntarClasses(estilos.botaoTopo, estilos.recolher)}
          aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
          aria-pressed={recolhido}
          onClick={aoAlternarRecolhido}
        >
          {recolhido ? (
            <PanelLeftOpen size={20} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={20} aria-hidden="true" />
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
              {itens.map(({ rotulo, caminho, icone: Icone, contador: Contador }) => {
                const idDescricao = `${idBase}${caminho}`
                return (
                  <NavLink
                    key={caminho}
                    to={caminho}
                    end={caminho === '/'}
                    className={estilos.item}
                    title={soIcones ? rotulo : undefined}
                    aria-describedby={Contador ? idDescricao : undefined}
                    onClick={aoFecharGaveta}
                  >
                    <Icone size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span className={estilos.rotulo}>{rotulo}</span>
                    {Contador && <Contador idDescricao={idDescricao} />}
                  </NavLink>
                )
              })}
            </nav>
          )
        })}
      </div>
      <div className={estilos.pe}>
        <InterruptorTema soIcone={soIcones} className={estilos.tema} />
        <MenuConta
          nome={nome}
          papel={nomePapel}
          aoTrocarDePapel={aoTrocarDePapel}
          aoResetar={aoResetar}
          variante={soIcones ? 'avatar' : 'menu'}
          painelPara="cima"
          className={estilos.conta}
        />
      </div>
    </aside>
  )
}
