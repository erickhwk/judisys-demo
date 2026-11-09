// Apoio compartilhado dos testes de ponta a ponta (DMO-24): relógio fixo, entrada por papel,
// passos da AGC do vitrine, leitura do IndexedDB, as vigias de console e de rede (INV-09) e a
// medida da grade do início.
// Não é um arquivo de teste (o Playwright só roda `*.spec.ts`).
import { expect, type Locator, type Page } from '@playwright/test'

/** O "hoje" de todos os testes (SDD §10, T-19). */
export const AGORA = new Date('2026-11-07T10:00:00')

export const PAPEIS = {
  aj: /Entrar como Administrador/,
  advogado: /Entrar como Advogado/,
  analista: /Entrar como Analista/,
} as const

/**
 * O `h1` do início: a saudação com o primeiro nome (CAB-01). Vale em qualquer hora, então serve
 * também aos specs sem o relógio fixo.
 */
export function tituloDoInicio(page: Page): Locator {
  return page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite), /, level: 1 })
}

export async function entrarComo(page: Page, papel: keyof typeof PAPEIS): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: PAPEIS[papel] }).click()
  await expect(tituloDoInicio(page)).toBeVisible()
}

/** Troca de papel pelo menu da conta e entra com o outro (PER-02). */
export async function trocarPara(page: Page, papel: keyof typeof PAPEIS): Promise<void> {
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('button', { name: 'Trocar de papel' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  await page.getByRole('button', { name: PAPEIS[papel] }).click()
  await expect(tituloDoInicio(page)).toBeVisible()
}

/** Reseta a demo pela faixa e confirma; espera o diálogo fechar. */
export async function resetarPelaFaixa(page: Page): Promise<void> {
  await page
    .getByRole('region', { name: 'Demonstração' })
    .getByRole('button', { name: 'Resetar demo' })
    .click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Resetar a demo?' })
  await expect(confirmacao).toBeVisible()
  await confirmacao.getByRole('button', { name: 'Resetar demo' }).click()
  await expect(confirmacao).toBeHidden()
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

// --- Buscas que não perdem tecla (AJ-12) ---------------------------------------------------------

/** Valor de `busca` na consulta da rota (depois do `#`), ou null se não houver. */
export function buscaNaUrl(page: Page): string | null {
  const consulta = new URL(page.url()).hash.split('?')[1] ?? ''
  return new URLSearchParams(consulta).get('busca')
}

/** Seleciona o que houver no campo, para o texto digitado em seguida substituí-lo. */
async function selecionarCampo(campo: Locator): Promise<void> {
  await campo.click()
  await campo.press('ControlOrMeta+a')
}

/**
 * Troca o texto do campo digitando sem atraso entre as teclas (o caso que perdia letras) e
 * espera o texto chegar à URL.
 */
export async function digitarBusca(page: Page, campo: Locator, texto: string): Promise<void> {
  await selecionarCampo(campo)
  await page.keyboard.type(texto)
  await expect(campo).toHaveValue(texto)
  await expect.poll(() => buscaNaUrl(page)).toBe(texto)
}

/**
 * Digita e clica "Limpar busca" antes de o texto chegar à URL: o campo esvazia e, passada a pausa
 * da busca adiada (250 ms), nenhuma gravação pendente devolve o texto à URL.
 */
export async function limparBuscaPendente(page: Page, campo: Locator): Promise<void> {
  await selecionarCampo(campo)
  await page.keyboard.type('xyz')
  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(campo).toHaveValue('')
  await page.waitForTimeout(500)
  expect(buscaNaUrl(page)).toBeNull()
  await expect(campo).toHaveValue('')
}

// --- Medida da grade do início (AJ-24, AJ-25) ---------------------------------------------------
// Logo depois de um setViewportSize, o ResizeObserver da grade ainda não mediu: a grade antiga pode
// ser trocada pela nova (outras colunas) no meio de um boundingBox, que volta nulo. E esperar um
// atributo que já valia antes do resize não sincroniza nada. Por isso toda medida da grade passa
// por um poll que espera a largura certa.

/** Largura do contêiner da grade, ou 0 se ela não tem caixa nesse instante. Só dentro de um poll. */
export async function larguraDaGrade(page: Page, colunas?: 1 | 2 | 4): Promise<number> {
  const seletor = colunas ? `[data-colunas="${colunas}"]` : '[data-colunas]'
  return (
    (
      await page
        .locator(seletor)
        .boundingBox()
        .catch(() => null)
    )?.width ?? 0
  )
}

/**
 * Muda a janela e espera a grade com essas colunas e a mesma largura em duas leituras seguidas.
 * Devolve a largura do contêiner.
 */
export async function assentarGrade(
  page: Page,
  janela: number,
  colunas: 1 | 2 | 4,
): Promise<number> {
  await page.setViewportSize({ width: janela, height: 900 })
  let anterior = -1
  await expect
    .poll(async () => {
      const largura = await larguraDaGrade(page, colunas)
      const estavel = largura > 0 && largura === anterior
      anterior = largura
      return estavel
    }, `grade de ${colunas} coluna(s) na janela de ${janela}px`)
    .toBe(true)
  return anterior
}

/**
 * Quanto da janela não é contêiner da grade (menu, margens). A lista do celular tem outras
 * margens: meça uma casca para cada faixa.
 */
export async function casca(page: Page, janela: number, colunas: 1 | 2 | 4): Promise<number> {
  return janela - (await assentarGrade(page, janela, colunas))
}

/** Muda a janela e espera o contêiner da grade chegar à largura pedida antes de medir os quadros. */
export async function conteinerCom(page: Page, janela: number, conteiner: number): Promise<void> {
  await page.setViewportSize({ width: janela, height: 1000 })
  await expect
    .poll(() => larguraDaGrade(page), `contêiner de ${conteiner}px`)
    .toBeCloseTo(conteiner, 0)
}
