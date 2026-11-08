// Modo escuro (AJ-11): sem escolha salva o tema segue o sistema; o botão alterna e salva a escolha
// no localStorage ('tema'); escolher o tema do sistema apaga a escolha; a escolha vale nas outras
// abas e sobrevive ao recarregar e ao reset da demo; o script do <head> aplica o tema sem o app;
// a impressão fica clara.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo, resetarPelaFaixa, tituloDoInicio } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const html = (page: Page) => page.locator('html')
const botaoEscuro = (page: Page) => page.getByRole('button', { name: 'Ativar modo escuro' })
const botaoClaro = (page: Page) => page.getByRole('button', { name: 'Ativar modo claro' })
const interruptorDoMenu = (page: Page) =>
  page.getByRole('complementary', { name: 'Menu' }).getByRole('switch', { name: 'Tema escuro' })
const escolhaSalva = (page: Page) => page.evaluate(() => localStorage.getItem('tema'))

test('TEM-01 · sem escolha salva, segue o sistema e acompanha a mudança dele', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('./#/entrar')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await expect(botaoClaro(page)).toBeVisible()

  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
  await expect(botaoEscuro(page)).toBeVisible()
  expect(await escolhaSalva(page)).toBeNull()
})

test('TEM-02 · o botão alterna o tema, e a escolha salva sobrevive ao recarregar', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await entrarComo(page, 'advogado')
  // INI-01: na área logada, o tema é o interruptor do pé do menu lateral.
  const interruptor = interruptorDoMenu(page)
  await expect(interruptor).toHaveAttribute('aria-checked', 'false')
  await interruptor.click()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await expect(interruptor).toHaveAttribute('aria-checked', 'true')
  expect(await escolhaSalva(page)).toBe('dark')
  // O fundo troca de verdade (tokens do tema escuro).
  const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(fundo).toBe('rgb(10, 22, 48)')

  await page.reload()
  await expect(tituloDoInicio(page)).toBeVisible()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  // A escolha vence o sistema.
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
})

test('TEM-03 · escolher o mesmo tema do sistema apaga a escolha', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('./#/entrar')
  await botaoClaro(page).click()
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
  expect(await escolhaSalva(page)).toBe('light')

  await botaoEscuro(page).click()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  expect(await escolhaSalva(page)).toBeNull()
  // Sem escolha, volta a acompanhar o sistema.
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html(page)).toHaveAttribute('data-theme', 'light')
})

test('TEM-04 · a escolha feita numa aba vale nas outras', async ({ context, page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('./#/entrar')
  const outra = await context.newPage()
  await outra.emulateMedia({ colorScheme: 'light' })
  await outra.goto('./#/entrar')
  await expect(html(outra)).toHaveAttribute('data-theme', 'light')

  await botaoEscuro(page).click()
  await expect(html(outra)).toHaveAttribute('data-theme', 'dark')
  await expect(botaoClaro(outra)).toBeVisible()
})

test('TEM-05 · o reset da demo mantém a escolha de tema', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await entrarComo(page, 'aj')
  await interruptorDoMenu(page).click()
  await resetarPelaFaixa(page)
  await expect(tituloDoInicio(page)).toBeVisible()

  expect(await escolhaSalva(page)).toBe('dark')
  await page.reload()
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
})

test('TEM-06 · o script do <head> aplica o tema antes do app (sem piscar o claro)', async ({
  page,
}) => {
  // Sem o JavaScript do app, só o script inline roda.
  await page.route('**/assets/*.js', (rota) => rota.abort())
  await page.addInitScript(() => localStorage.setItem('tema', 'dark'))
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('./')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
})

test('TEM-07 · a impressão fica clara mesmo no tema escuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await entrarComo(page, 'advogado')
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ media: 'print' })
  const cores = await page.evaluate(() => ({
    fundo: getComputedStyle(document.body).backgroundColor,
    texto: getComputedStyle(document.documentElement).getPropertyValue('--cor-texto').trim(),
  }))
  expect(cores).toEqual({ fundo: 'rgb(255, 255, 255)', texto: '#0a1f4d' })
})
