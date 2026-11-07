// Apoio compartilhado dos testes de ponta a ponta (DMO-24): relógio fixo, entrada por papel,
// passos da AGC do vitrine, leitura do IndexedDB e as vigias de console e de rede (INV-09).
// Não é um arquivo de teste (o Playwright só roda `*.spec.ts`).
import { expect, type Page } from '@playwright/test'

/** O "hoje" de todos os testes (SDD §10, T-19). */
export const AGORA = new Date('2026-11-07T10:00:00')

export const PAPEIS = {
  aj: /Entrar como Administrador/,
  advogado: /Entrar como Advogado/,
  analista: /Entrar como Analista/,
} as const

export async function entrarComo(page: Page, papel: keyof typeof PAPEIS): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: PAPEIS[papel] }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

/** Troca de papel pelo menu da conta e entra com o outro (PER-02). */
export async function trocarPara(page: Page, papel: keyof typeof PAPEIS): Promise<void> {
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('button', { name: 'Trocar de papel' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  await page.getByRole('button', { name: PAPEIS[papel] }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

// --- Credor do vitrine com impugnação pendente --------------------------------------------------

/** Isadora Costa Batista, do vitrine: impugnação pendente e sem valor no QGC (SED-04). */
export const CREDOR_IMPUGNACAO = {
  rota: './#/processos/prc-001/credores/crd-0066',
  nome: 'Isadora Costa Batista',
  qgcAcolhido: 'R$ 65.203,58',
} as const

export const pedidosDeIsadora = (page: Page) =>
  page.getByRole('region', { name: /Pedidos de crédito de Isadora/ })

/** Acolhe a impugnação pendente na tela do credor (já aberta) e espera o QGC mudar (RF-29). */
export async function acolherImpugnacao(page: Page): Promise<void> {
  await pedidosDeIsadora(page)
    .getByRole('button', { name: /^Acolher impugnação/ })
    .click()
  const acolher = page.getByRole('alertdialog', { name: 'Acolher o pedido?' })
  await acolher.getByRole('button', { name: 'Acolher' }).click()
  await expect(acolher).toBeHidden()
  await expect(page.locator('[data-valor="qgc"]')).toContainText(CREDOR_IMPUGNACAO.qgcAcolhido)
}

// --- AGC do vitrine (prc-001, AGC em @+6 = 13/11/2026 no relógio fixo) -----------------------

export const CLASSES_DO_VITRINE = [
  'I · Trabalhista',
  'II · Garantia real',
  'III · Quirografário',
  'IV · ME/EPP',
] as const

/** Abre a AGC agendada do vitrine pela lista da aba AGC (a página já deve estar nessa aba). */
export async function abrirAgcDaLista(page: Page): Promise<void> {
  const lista = page.getByRole('region', { name: 'AGCs do processo' })
  await lista.getByRole('link', { name: '13/11/2026' }).click()
  await expect(page.getByRole('heading', { name: 'AGC de 13/11/2026', level: 1 })).toBeVisible()
}

export async function todosDaClasse(page: Page, classe: string): Promise<void> {
  await page.getByRole('button', { name: `Todos da classe ${classe}` }).click()
  await expect(page.getByRole('button', { name: `Desmarcar classe ${classe}` })).toBeVisible()
}

export async function instalar(page: Page, convocacao: 1 | 2): Promise<void> {
  if (convocacao === 2) await page.getByRole('radio', { name: /^2ª convocação/ }).check()
  await page.getByRole('button', { name: `Instalar em ${convocacao}ª convocação` }).click()
  const confirmacao = page.getByRole('alertdialog', {
    name: `Instalar a AGC em ${convocacao}ª convocação?`,
  })
  await confirmacao.getByRole('button', { name: 'Instalar' }).click()
  await expect(confirmacao).toBeHidden()
  await expect(page.getByText(`Instalada em ${convocacao}ª convocação`)).toBeVisible()
}

// --- IndexedDB da demo -------------------------------------------------------------------------

export type Linha = Record<string, unknown> & { id: string }

/** Lê uma tabela do IndexedDB da demo direto pela API do navegador. */
export function lerTabela(page: Page, tabela: string): Promise<Linha[]> {
  return page.evaluate(
    (nome) =>
      new Promise<Linha[]>((resolver, rejeitar) => {
        const abertura = indexedDB.open('judisys')
        abertura.onerror = () => rejeitar(abertura.error)
        abertura.onsuccess = () => {
          const db = abertura.result
          const pedido = db.transaction(nome).objectStore(nome).getAll()
          pedido.onsuccess = () => {
            db.close()
            resolver(pedido.result as Linha[])
          }
          pedido.onerror = () => rejeitar(pedido.error)
        }
      }),
    tabela,
  )
}

// --- Vigias: console e rede ----------------------------------------------------------------------

/** Junta os erros de console e as exceções não tratadas da página, para conferir no fim. */
export function vigiarConsole(page: Page): string[] {
  const erros: string[] = []
  page.on('console', (mensagem) => {
    if (mensagem.type() === 'error') erros.push(`console: ${mensagem.text()}`)
  })
  page.on('pageerror', (erro) => erros.push(`exceção: ${erro.message}`))
  return erros
}

/** Hosts fora do site que o INV-09 permite: Google Fonts e o link do WhatsApp aberto pelo usuário. */
const HOSTS_PERMITIDOS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'wa.me',
  'api.whatsapp.com',
])

/**
 * INV-09: registra toda requisição da página e devolve as que saem do permitido. Do próprio site
 * vale só o que está sob a base do Vite (`/`: bundle, `seed.json`,
 * `seed-versao.json`, `anexos/`); `data:` e `blob:` não vão à rede.
 *
 * O Google Fonts é respondido com um CSS vazio: a requisição continua registrada (e permitida),
 * mas o teste não depende da rede externa, e uma fonte que falhasse não viraria erro de console.
 * O que não é permitido é abortado, para nada sair da máquina.
 */
export async function vigiarRede(page: Page, baseURL: string): Promise<string[]> {
  const base = new URL(baseURL)
  const fora: string[] = []
  const permitida = (endereco: string): boolean => {
    const url = new URL(endereco)
    if (url.protocol === 'data:' || url.protocol === 'blob:') return true
    if (url.origin === base.origin) return url.pathname.startsWith(base.pathname)
    return url.protocol === 'https:' && HOSTS_PERMITIDOS.has(url.hostname)
  }
  page.on('request', (pedido) => {
    if (!permitida(pedido.url())) fora.push(`${pedido.method()} ${pedido.url()}`)
  })
  await page.route(
    (url) => url.origin !== base.origin,
    (rota) => {
      const url = new URL(rota.request().url())
      if (url.hostname.startsWith('fonts.') && HOSTS_PERMITIDOS.has(url.hostname)) {
        return rota.fulfill({ status: 200, contentType: 'text/css', body: '' })
      }
      if (permitida(url.href)) return rota.continue()
      return rota.abort('blockedbyclient')
    },
  )
  return fora
}

// --- Atalhos dos specs por módulo (AJ-09) -------------------------------------------------------

/** Abre a AGC agendada do vitrine pela aba AGC do processo (agc, agc-votacao e analista). */
export async function abrirAgcDoVitrine(page: Page): Promise<void> {
  await page.goto('./#/processos/prc-001/agc')
  await abrirAgcDaLista(page)
}
