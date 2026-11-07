// Carga e versão no navegador (SDD §7.1; DMO-08). O reset pelo botão (CAR-04, CAR-05) depende da
// faixa da demo e entra aqui com a DMO-10. Cada teste começa com o armazenamento limpo (contexto
// novo do Playwright).
import { expect, type Page, test } from '@playwright/test'

const CHAVE_VERSAO = 'judisys:versao'

type Linha = Record<string, unknown> & { id: string }

/** Lê uma tabela do IndexedDB da demo direto pela API do navegador. */
function lerTabela(page: Page, tabela: string): Promise<Linha[]> {
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

function gravarLinha(page: Page, tabela: string, linha: Linha): Promise<void> {
  return page.evaluate(
    ([nome, registro]) =>
      new Promise<void>((resolver, rejeitar) => {
        const abertura = indexedDB.open('judisys')
        abertura.onerror = () => rejeitar(abertura.error)
        abertura.onsuccess = () => {
          const db = abertura.result
          const transacao = db.transaction(nome, 'readwrite')
          transacao.objectStore(nome).put(registro)
          transacao.oncomplete = () => {
            db.close()
            resolver()
          }
          transacao.onerror = () => rejeitar(transacao.error)
        }
      }),
    [tabela, linha] as const,
  )
}

/** Conta os pedidos de seed.json feitos pela página. */
function contarSeed(page: Page): { total: number } {
  const contagem = { total: 0 }
  page.on('request', (pedido) => {
    if (new URL(pedido.url()).pathname.endsWith('/seed.json')) contagem.total++
  })
  return contagem
}

async function abrirDemo(page: Page): Promise<void> {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Judisys' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

test('CAR-01 · primeira visita mostra o carregamento, baixa o seed e grava a versão', async ({
  page,
}) => {
  const seed = contarSeed(page)
  // Segura o seed um instante para ver a tela de carregamento.
  await page.route('**/seed.json', async (rota) => {
    await new Promise((pronto) => setTimeout(pronto, 500))
    await rota.continue()
  })
  await page.goto('./')
  await expect(page.getByRole('status')).toHaveText('Carregando a demo…')
  await expect(page.getByRole('heading', { name: 'Judisys' })).toBeVisible()

  expect(seed.total).toBe(1)
  const versao = await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_VERSAO)
  expect(versao).toMatch(/^1:[0-9a-f]{12}$/)
  expect(await lerTabela(page, 'processos')).toHaveLength(12)
  const agcs = await lerTabela(page, 'agcs')
  // Datas convertidas para o "hoje" do relógio (T-24): a AGC da vitrine fica em @+6.
  expect(agcs.map((agc) => agc.dataPrimeira)).toContain('2026-11-13')
})

test('CAR-02 · versão igual não baixa o seed e mantém o que mudou', async ({ page }) => {
  await abrirDemo(page)
  const [processo] = await lerTabela(page, 'processos')
  if (!processo) throw new Error('seed sem processos')
  await gravarLinha(page, 'processos', { ...processo, apelido: 'Alterado na demo' })

  const seed = contarSeed(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Judisys' })).toBeVisible()
  expect(seed.total).toBe(0)
  const depois = await lerTabela(page, 'processos')
  expect(depois.find((p) => p.id === processo.id)?.apelido).toBe('Alterado na demo')
})

test('CAR-03 · versão diferente apaga e recarrega o seed', async ({ page }) => {
  await abrirDemo(page)
  const [processo] = await lerTabela(page, 'processos')
  if (!processo) throw new Error('seed sem processos')
  await gravarLinha(page, 'processos', { ...processo, apelido: 'Alterado na demo' })
  await page.evaluate((chave) => localStorage.setItem(chave, '0:versao-antiga'), CHAVE_VERSAO)

  const seed = contarSeed(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Judisys' })).toBeVisible()
  expect(seed.total).toBe(1)
  const depois = await lerTabela(page, 'processos')
  expect(depois.find((p) => p.id === processo.id)?.apelido).toBe(processo.apelido)
  const versao = await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_VERSAO)
  expect(versao).toMatch(/^1:[0-9a-f]{12}$/)
})

test('CAR-08 · seed inválido mostra a tela de erro, sem banco pela metade', async ({ page }) => {
  await page.route('**/seed.json', (rota) =>
    rota.fulfill({ contentType: 'application/json', body: '{"versao":"x","tabelas":{}}' }),
  )
  await page.goto('./')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a demo')
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_VERSAO)).toBeNull()
})

test('CAR-09 · falha de rede: tela de erro e "Tentar de novo" carrega', async ({ page }) => {
  await page.route('**/seed-versao.json', (rota) => rota.abort('internetdisconnected'))
  await page.goto('./')
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a demo')

  await page.unroute('**/seed-versao.json')
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByRole('heading', { name: 'Judisys' })).toBeVisible()
  expect(await lerTabela(page, 'processos')).toHaveLength(12)
})

test('CAR-10 · sem IndexedDB a demo abre em memória', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true })
  })
  await abrirDemo(page)
  expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_VERSAO)).toBeNull()
})

test('CAR-12 · sem localStorage recarrega o seed a cada abertura', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      configurable: true,
    })
  })
  const seed = contarSeed(page)
  await abrirDemo(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Judisys' })).toBeVisible()
  expect(seed.total).toBe(2)
})

test('T-34 · aberta em outra data, todo RMA aberto vence no dia 15', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2027-01-22T10:00:00'))
  await abrirDemo(page)
  const rmas = (await lerTabela(page, 'prazos')).filter(
    (p) =>
      p.origem === 'automatico' &&
      p.titulo === 'Relatório mensal de atividades (RMA)' &&
      p.status === 'aberto',
  )
  expect(rmas.length).toBeGreaterThan(0)
  for (const rma of rmas) expect(String(rma.vencimento), rma.id).toMatch(/^\d{4}-\d{2}-15$/)
  // As demais datas seguem o deslocamento do T-24: a AGC da vitrine fica em @+6.
  const agcs = await lerTabela(page, 'agcs')
  expect(agcs.map((agc) => agc.dataPrimeira)).toContain('2027-01-28')
})
