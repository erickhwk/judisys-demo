// Busca global (RF-38, T-08): ícone no topo e Ctrl/⌘+K abrem um diálogo com o `cmdk`. Os
// resultados vêm do índice em memória (`useIndiceBusca`), agrupados por tipo, até 5 por grupo;
// setas escolhem e Enter vai à tela do registro.
import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { useLayoutEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Papel } from '../../regras/permissoes'
import { Dialogo } from '../../ui/Dialogo'
import estilos from './BuscaGlobal.module.css'
import { buscarNoIndice, ROTULOS_GRUPO } from './indice'
import { useIndiceBusca } from './useIndiceBusca'

/** Ctrl+K, ou ⌘K no Mac. */
export function ehAtalhoBusca(evento: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey'>) {
  return (evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k'
}

function ehMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
}

export function BuscaGlobal({ papel }: { papel: Papel }) {
  const [aberta, setAberta] = useState(false)
  const [consulta, setConsulta] = useState('')
  const navegar = useNavigate()
  const indice = useIndiceBusca(papel, aberta)
  const grupos = useMemo(
    () => (indice.data ? buscarNoIndice(indice.data, consulta) : []),
    [indice.data, consulta],
  )
  const atalho = ehMac() ? '⌘K' : 'Ctrl K'

  // Layout effect: o atalho já funciona quando a tela aparece (um efeito comum pode rodar depois
  // da pintura e perder o primeiro Ctrl+K).
  useLayoutEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (!ehAtalhoBusca(evento)) return
      evento.preventDefault()
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

  return (
    <>
      <button
        type="button"
        className={estilos.abrir}
        aria-label="Buscar"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => setAberta(true)}
      >
        <Search size={20} aria-hidden="true" />
        <span className={estilos.rotulo}>Buscar</span>
        <kbd className={estilos.atalho}>{atalho}</kbd>
      </button>
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
            {digitou && indice.isPending && <Command.Loading>Carregando…</Command.Loading>}
            {digitou && indice.isError && (
              <p className={estilos.dica} role="alert">
                Não foi possível carregar a busca.
              </p>
            )}
            {digitou && indice.isSuccess && grupos.length === 0 && (
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
    </>
  )
}
