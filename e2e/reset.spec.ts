// Carga, versão e reset no navegador (SDD §7.1; DMO-08). O reset pelo botão da faixa (CAR-04,
// CAR-05) veio com a DMO-10. Cada teste começa com o armazenamento limpo (contexto novo do
// Playwright).
import { expect, type Page, test } from '@playwright/test'
import {
  AGORA,
  acolherImpugnacao,
  CREDOR_IMPUGNACAO,
  entrarComo,
  type Linha,
  lerTabela,
  pedidosDeIsadora,
} from './apoio'

const CHAVE_VERSAO = 'judisys:versao'

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
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
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
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()

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
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  expect(seed.total).toBe(1)
  const depois = await lerTabela(page, 'processos')
  expect(depois.find((p) => p.id === processo.id)?.apelido).toBe(processo.apelido)
  const versao = await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_VERSAO)
  expect(versao).toMatch(/^1:[0-9a-f]{12}$/)

  // Aviso do RF-03 na faixa, dispensável.
  const aviso = page.getByText('A demo foi atualizada e os dados foram restaurados.')
  await expect(aviso).toBeVisible()
  await page.getByRole('button', { name: 'Dispensar aviso' }).click()
  await expect(aviso).toHaveCount(0)
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
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  expect(await lerTabela(page, 'processos')).toHaveLength(12)
})

test('CAR-10 · sem IndexedDB a demo abre em memória', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true })
  })
  await abrirDemo(page)
  expect(await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_VERSAO)).toBeNull()
  await expect(page.getByText('suas alterações não serão salvas nesta aba')).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
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

/** Entra como AJ e altera um processo direto no banco; devolve o apelido original. */
async function entrarEAlterar(page: Page): Promise<{ id: string; apelido: unknown }> {
  await abrirDemo(page)
  await entrarComo(page, 'aj')
  const [processo] = await lerTabela(page, 'processos')
  if (!processo) throw new Error('seed sem processos')
  await gravarLinha(page, 'processos', { ...processo, apelido: 'Alterado na demo' })
  return { id: processo.id, apelido: processo.apelido }
}

/** Reseta a demo pela faixa e confirma; espera o diálogo fechar. */
async function resetarPelaFaixa(page: Page): Promise<void> {
  await page
    .getByRole('region', { name: 'Demonstração' })
    .getByRole('button', { name: 'Resetar demo' })
    .click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Resetar a demo?' })
  await expect(confirmacao).toBeVisible()
  await confirmacao.getByRole('button', { name: 'Resetar demo' }).click()
  await expect(confirmacao).toBeHidden()
}

test('CAR-04 · Resetar demo → confirmar volta ao seed e ao dashboard', async ({ page }) => {
  const processo = await entrarEAlterar(page)
  await page.goto('./#/logs')
  await resetarPelaFaixa(page)
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
  const depois = await lerTabela(page, 'processos')
  expect(depois.find((p) => p.id === processo.id)?.apelido).toBe(processo.apelido)
  // Sem o aviso de versão (SDD §5.5).
  await expect(page.getByText('A demo foi atualizada e os dados foram restaurados.')).toHaveCount(0)
})

test('CAR-05 · Resetar demo → cancelar não muda nada', async ({ page }) => {
  const processo = await entrarEAlterar(page)
  // Pelo menu da conta (RF-06), o mesmo diálogo da faixa.
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('button', { name: 'Resetar demo' }).last().click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Resetar a demo?' })
  await expect(confirmacao).toBeVisible()
  await confirmacao.getByRole('button', { name: 'Cancelar' }).click()

  await expect(confirmacao).toBeHidden()
  const depois = await lerTabela(page, 'processos')
  expect(depois.find((p) => p.id === processo.id)?.apelido).toBe('Alterado na demo')
})

test('CAR-04 · alteração feita pela tela (acolher a impugnação) é desfeita ao resetar', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  const logsAntes = (await lerTabela(page, 'logs')).length

  await page.goto(CREDOR_IMPUGNACAO.rota)
  await acolherImpugnacao(page)
  expect((await lerTabela(page, 'logs')).length).toBeGreaterThan(logsAntes)

  await resetarPelaFaixa(page)
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()

  // Volta ao seed: o QGC sem valor, a impugnação pendente e o log da decisão desfeito.
  await page.goto(CREDOR_IMPUGNACAO.rota)
  await expect(page.getByRole('heading', { name: CREDOR_IMPUGNACAO.nome, level: 1 })).toBeVisible()
  await expect(page.locator('[data-valor="qgc"]')).toContainText('—')
  await expect(
    pedidosDeIsadora(page).getByRole('button', { name: /^Acolher impugnação/ }),
  ).toBeVisible()
  expect(await lerTabela(page, 'logs')).toHaveLength(logsAntes)
})
