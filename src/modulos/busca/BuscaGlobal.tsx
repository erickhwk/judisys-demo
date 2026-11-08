// Busca global (RF-38, T-08): Ctrl/⌘+K e o botão de busca abrem um diálogo com o `cmdk`. Os
// resultados vêm do índice em memória (`useIndiceBusca`), agrupados por tipo, até 5 por grupo;
// setas escolhem e Enter vai à tela do registro.
// INI-01 (S-08): o Layout monta a busca uma vez, em volta das telas; o botão que a abre mora no
// `CabecalhoPagina` e no `CabecalhoInicio` (desktop) e na lupa da barra do topo (tablet e celular),
// via `BotaoBuscaGlobal`.
import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'
import type { Papel } from '../../regras/permissoes'
import { juntarClasses } from '../../ui/classes'
import { Dialogo } from '../../ui/Dialogo'
import estilos from './BuscaGlobal.module.css'
import { buscarNoIndice, ROTULOS_GRUPO } from './indice'
import { useIndiceBusca } from './useIndiceBusca'

/** Ctrl+K, ou ⌘K no Mac; com Shift ou Alt é outro atalho (ex.: Ctrl+Shift+K do navegador). */
export function ehAtalhoBusca(
  evento: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
) {
  return (
    (evento.ctrlKey || evento.metaKey) &&
    !evento.shiftKey &&
    !evento.altKey &&
    evento.key.toLowerCase() === 'k'
  )
}

function ehMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
}

/** Abre a busca; `null` fora do Layout (telas renderizadas sozinhas, nos testes). */
const ContextoBusca = createContext<(() => void) | null>(null)

export type PropsBotaoBuscaGlobal = {
  /** Só a lupa (barra do topo do tablet e do celular). */
  compacto?: boolean
  className?: string
}

/** Botão que abre a busca global. Fora do Layout não aparece. */
export function BotaoBuscaGlobal({ compacto = false, className }: PropsBotaoBuscaGlobal) {
  const abrir = useContext(ContextoBusca)
  if (!abrir) return null
  const atalho = ehMac() ? '⌘K' : 'Ctrl K'
  return (
    <button
      type="button"
      className={juntarClasses(compacto ? estilos.lupaTopo : estilos.abrir, className)}
      aria-label="Buscar"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={abrir}
    >
      <Search size={20} aria-hidden="true" />
      {!compacto && (
        <>
          <span className={estilos.rotulo}>Buscar</span>
          <kbd className={estilos.atalho}>{atalho}</kbd>
        </>
      )}
    </button>
  )
}

export type PropsBuscaGlobal = {
  papel: Papel
  /** As telas: o `BotaoBuscaGlobal` dentro delas abre esta busca. */
  children?: ReactNode
}

export function BuscaGlobal({ papel, children }: PropsBuscaGlobal) {
  const [aberta, setAberta] = useState(false)
  const [consulta, setConsulta] = useState('')
  const navegar = useNavigate()
  const indice = useIndiceBusca(papel, aberta)
  // Com erro, o índice antigo do cache não aparece junto da mensagem.
  const grupos = useMemo(
    () => (indice.data && !indice.isError ? buscarNoIndice(indice.data, consulta) : []),
    [indice.data, indice.isError, consulta],
  )
  const abrir = useCallback(() => setAberta(true), [])

  // Layout effect: o atalho já funciona quando a tela aparece (um efeito comum pode rodar depois
  // da pintura e perder o primeiro Ctrl+K).
  useLayoutEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (!ehAtalhoBusca(evento)) return
      evento.preventDefault()
      // Com outro diálogo aberto (formulário, confirmação), a busca não abre por cima dele.
      if (document.querySelector('dialog[open]')) return
      setAberta(true)
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [])

  const fechar = () => {
    setAberta(false)
    setConsulta('')
  }

  const irPara = (destino: string) => {
    fechar()
    navegar(destino)
  }

  const digitou = consulta.trim() !== ''
  // Depois de uma gravação o índice é relido; até lá, "nada encontrado" pode ser só o índice velho.
  const lendo = indice.isFetching

  return (
    <ContextoBusca.Provider value={abrir}>
      {children}
      <Dialogo aberto={aberta} aoFechar={fechar} titulo="Busca global">
        <Command
          label="Buscar processos, empresas e credores"
          shouldFilter={false}
          loop
          className={estilos.comando}
        >
          <div className={estilos.campo}>
            <Search size={18} aria-hidden="true" className={estilos.lupa} />
            <Command.Input
              data-foco-inicial
              value={consulta}
              onValueChange={setConsulta}
              placeholder="Processo, empresa ou credor"
              className={estilos.entrada}
            />
          </div>
          <Command.List className={estilos.lista} label="Resultados da busca">
            {!digitou && (
              <p className={estilos.dica}>
                Apelido ou número CNJ do processo, razão social ou CNPJ da empresa, nome ou CPF/CNPJ
                do credor.
              </p>
            )}
            {digitou && lendo && grupos.length === 0 && (
              <Command.Loading>Carregando…</Command.Loading>
            )}
            {digitou && !lendo && indice.isError && (
              <p className={estilos.dica} role="alert">
                Não foi possível carregar a busca.
              </p>
            )}
            {digitou && !lendo && indice.isSuccess && grupos.length === 0 && (
              <p className={estilos.dica}>Nada encontrado para “{consulta.trim()}”.</p>
            )}
            {grupos.map((grupo) => (
              <Command.Group
                key={grupo.tipo}
                heading={
                  <span className={estilos.cabecalhoGrupo}>
                    {ROTULOS_GRUPO[grupo.tipo]}
                    {grupo.total > grupo.itens.length && (
                      <span className={estilos.contagem}>
                        {grupo.itens.length} de {grupo.total}
                      </span>
                    )}
                  </span>
                }
                className={estilos.grupo}
                data-grupo={grupo.tipo}
              >
                {grupo.itens.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.tipo}:${item.id}`}
                    onSelect={() => irPara(item.destino)}
                    className={estilos.item}
                    data-destino={item.destino}
                  >
                    <span className={estilos.titulo}>{item.titulo}</span>
                    <span className={estilos.detalhe}>{item.detalhe}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </Dialogo>
    </ContextoBusca.Provider>
  )
}
