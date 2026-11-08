// Sessão, papéis e guardas de rota (SDD §7.2, §5.6; DMO-10). Cada teste começa com o armazenamento
// limpo (contexto novo do Playwright).
import { expect, test } from '@playwright/test'
import { AGORA, entrarComo, tituloDoInicio, trocarPara } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

test('PER-01 · entrar como analista vai ao início e o menu da conta mostra nome e papel', async ({
  page,
}) => {
  await page.goto('./')
  await expect(page).toHaveURL(/#\/entrar$/)
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  // Um cartão por papel, com o nome fictício do seed (RF-05).
  await expect(page.getByRole('button', { name: /Entrar como/ })).toHaveCount(3)
  await page.getByRole('button', { name: /Entrar como Analista/ }).click()

  await expect(page).toHaveURL(/#\/$/)
  await expect(tituloDoInicio(page)).toBeVisible()
  const sessao = await page.evaluate(() => sessionStorage.getItem('judisys:sessao'))
  expect(JSON.parse(sessao ?? '{}')).toMatchObject({ nome: 'Lia Campos', papel: 'analista' })

  // INI-01: a conta mora no pé do menu, que já mostra nome e papel; o painel repete os dois.
  const conta = page.getByRole('button', { name: 'Menu da conta' })
  await conta.click()
  const painel = page.locator(`[id="${await conta.getAttribute('aria-controls')}"]`)
  await expect(painel.getByText('Lia Campos', { exact: true })).toBeVisible()
  await expect(painel.getByText('Analista', { exact: true })).toBeVisible()
  // Analista não vê Usuários no menu (RF-40: sem permissão, escondido).
  await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Logs' })).toBeVisible()
})

test('PER-02 · trocar de papel limpa a sessão e volta ao login', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await page.getByRole('button', { name: 'Menu da conta' }).click()
  await page.getByRole('button', { name: 'Trocar de papel' }).click()

  await expect(page).toHaveURL(/#\/entrar$/)
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('judisys:sessao'))).toBeNull()

  // Sem sessão, a rota interna volta ao login.
  await page.goto('./#/processos')
  await expect(page).toHaveURL(/#\/entrar$/)
})

test('PER-04 · rota de edição aberta direto pelo analista mostra "Seu papel não permite esta ação"', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/processos/novo')
  await expect(page.getByRole('alert')).toContainText('Seu papel não permite esta ação')
  await page.goto('./#/usuarios')
  await expect(page.getByRole('alert')).toContainText('Seu papel não permite esta ação')

  // Quem pode, abre.
  await trocarPara(page, 'aj')
  await page.goto('./#/processos/novo')
  await expect(page.getByRole('heading', { name: 'Novo processo' })).toBeVisible()
  await expect(page.getByText('Seu papel não permite esta ação')).toHaveCount(0)
})

test('PER-08 · sem sessão, qualquer rota interna vai ao login', async ({ page }) => {
  for (const rota of ['#/', '#/processos/prc-001/visao-geral', '#/usuarios', '#/nao-existe']) {
    await page.goto(`./${rota}`)
    await expect(page, rota).toHaveURL(/#\/entrar$/)
    await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  }
})

test('PER-09 · a sessão é por aba: outra aba pede login', async ({ page, context }) => {
  await entrarComo(page, 'analista')
  const outra = await context.newPage()
  await outra.clock.setFixedTime(AGORA)
  await outra.goto('./#/')
  await expect(outra).toHaveURL(/#\/entrar$/)
  await expect(outra.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()

  // A primeira aba continua dentro.
  await page.reload()
  await expect(tituloDoInicio(page)).toBeVisible()
})

test('rota desconhecida com sessão mostra "Página não encontrada"', async ({ page }) => {
  await entrarComo(page, 'aj')
  await page.goto('./#/nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(tituloDoInicio(page)).toBeVisible()
})

test('moldura: faixa da demo, link do WhatsApp e rodapé com a Draft', async ({ page }) => {
  await entrarComo(page, 'aj')
  const faixa = page.getByRole('region', { name: 'Demonstração' })
  await expect(faixa).toContainText('Ambiente de demonstração · dados fictícios')
  const whatsapp = faixa.getByRole('link', { name: 'Falar com a Draft' })
  await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/5511999606775\?text=.+Judisys/)
  await expect(whatsapp).toHaveAttribute('target', '_blank')
  await expect(whatsapp).toHaveAttribute('rel', /noopener/)
  const draft = page.getByRole('contentinfo').getByRole('link', { name: 'Draft' })
  await expect(draft).toHaveAttribute('href', 'https://draft.dev.br')
})

test('celular: o menu lateral abre como gaveta e fecha ao navegar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await entrarComo(page, 'aj')
  const processos = page.getByRole('link', { name: 'Processos' })
  await expect(processos).toBeHidden()
  const abrirMenu = page.getByRole('button', { name: 'Abrir menu' })
  // Teclado: o foco entra na gaveta e, com Esc, volta ao botão que a abriu.
  await abrirMenu.click()
  await expect(page.getByRole('link', { name: 'Início' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(processos).toBeHidden()
  await expect(abrirMenu).toBeFocused()

  await abrirMenu.click()
  await expect(processos).toBeVisible()
  await processos.click()
  await expect(page.getByRole('heading', { name: 'Processos', level: 1 })).toBeVisible()
  await expect(processos).toBeHidden()
})
