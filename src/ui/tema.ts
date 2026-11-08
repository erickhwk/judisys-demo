// Tema claro/escuro (AJ-11), com o mesmo comportamento do site da Draft (draft-site/tema.js).
// O script inline do index.html aplica o `data-theme` antes de pintar; aqui ficam a troca pelo botão
// e as escutas. Sem escolha salva, o tema segue o sistema e acompanha a mudança dele. A escolha fica
// no localStorage ('tema'), é preferência do navegador e sobrevive ao reset da demo.
import { useSyncExternalStore } from 'react'

export type Tema = 'light' | 'dark'

/** Chave da escolha no localStorage; a mesma do script do index.html. */
export const CHAVE_TEMA = 'tema'

const CONSULTA_ESCURO = '(prefers-color-scheme: dark)'

function ehTema(valor: unknown): valor is Tema {
  return valor === 'light' || valor === 'dark'
}

export function temaDoSistema(): Tema {
  return window.matchMedia(CONSULTA_ESCURO).matches ? 'dark' : 'light'
}

/** Escolha salva, ou `null` se não há (ou se o navegador não deixa ler o localStorage). */
export function temaSalvo(): Tema | null {
  try {
    const valor = window.localStorage.getItem(CHAVE_TEMA)
    return ehTema(valor) ? valor : null
  } catch {
    return null
  }
}

/** O tema aplicado agora no `<html>`. */
export function temaAtual(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function aplicar(tema: Tema): void {
  document.documentElement.dataset.theme = tema
}

/** Alterna o tema. Escolher o mesmo tema do sistema apaga a escolha: volta a seguir o sistema. */
export function alternarTema(): void {
  const novo: Tema = temaAtual() === 'dark' ? 'light' : 'dark'
  try {
    if (novo === temaDoSistema()) window.localStorage.removeItem(CHAVE_TEMA)
    else window.localStorage.setItem(CHAVE_TEMA, novo)
  } catch {
    // Sem localStorage, a troca vale só para esta aba.
  }
  aplicar(novo)
}

/**
 * Aplica o tema e liga as escutas: mudança do sistema (sem escolha salva) e escolha feita em outra
 * aba (evento `storage`). Devolve a função que desliga as escutas.
 */
export function iniciarTema(): () => void {
  const consulta = window.matchMedia(CONSULTA_ESCURO)
  aplicar(temaSalvo() ?? temaDoSistema())
  const aoMudarSistema = () => {
    if (!temaSalvo()) aplicar(temaDoSistema())
  }
  const aoMudarOutraAba = (evento: StorageEvent) => {
    if (evento.key === CHAVE_TEMA || evento.key === null) aplicar(temaSalvo() ?? temaDoSistema())
  }
  consulta.addEventListener('change', aoMudarSistema)
  window.addEventListener('storage', aoMudarOutraAba)
  return () => {
    consulta.removeEventListener('change', aoMudarSistema)
    window.removeEventListener('storage', aoMudarOutraAba)
  }
}

function assinar(avisar: () => void): () => void {
  const observador = new MutationObserver(avisar)
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  return () => observador.disconnect()
}

/** O tema aplicado, atualizado quando o `data-theme` do `<html>` muda (botão, sistema, outra aba). */
export function useTema(): Tema {
  return useSyncExternalStore(assinar, temaAtual, () => 'light')
}
