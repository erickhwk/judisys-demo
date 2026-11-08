// Casca nova (INI-01, SDD §7.1) no navegador: menu claro com "Início", contadores e o pé com o
// tema e a conta; a busca no cabeçalho da página e no ⌘K; a barra do topo abaixo de 901px; o menu
// no tema escuro.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const menu = (page: Page) => page.getByRole('complementary', { name: 'Menu' })
const busca = (page: Page) => page.getByRole('dialog', { name: 'Busca global' })

/** Cor de fundo calculada do elemento, em `rgb(...)`. */
const fundo = (page: Page, seletor: string) =>
  page.locator(seletor).evaluate((el) => getComputedStyle(el).backgroundColor)

test('CAS-01 · menu claro com "Início", pé com o tema e a conta, sem o topo antigo', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await entrarComo(page, 'advogado')
  await page.goto('./#/processos')
  await expect(page.getByRole('heading', { name: 'Processos', level: 1 })).toBeVisible()

  await expect(menu(page).getByRole('link', { name: 'Início', exact: true })).toBeVisible()
  await expect(menu(page).getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
  await expect(menu(page).getByRole('switch', { name: 'Tema escuro' })).toBeVisible()
  await expect(menu(page).getByRole('button', { name: 'Menu da conta' })).toContainText(
    'Otávio Reis',
  )
  // Menu claro: o fundo é branco.
  expect(await fundo(page, 'aside[aria-label="Menu"]')).toBe('rgb(255, 255, 255)')
  // Sem o topo antigo: no desktop não há barra (banner) nem o botão de abrir o menu.
  await expect(page.getByRole('banner')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeHidden()

  // A conta do pé abre o menu da conta de sempre.
  await menu(page).getByRole('button', { name: 'Menu da conta' }).click()
  await expect(page.getByRole('button', { name: 'Trocar de papel' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Trocar de papel' })).toBeHidden()
})

test('CAS-02 · contadores de Processos (12) e Agenda (3)', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await expect(menu(page).locator('[data-contador="processos"]')).toHaveText('12')
  await expect(menu(page).locator('[data-contador="vencidos"]')).toHaveText('3')
  await expect(
    menu(page).getByRole('link', { name: 'Agenda', exact: true }),
  ).toHaveAccessibleDescription('3 prazos vencidos')
})

test('CAS-04 · a busca global abre pelo cabeçalho da página e pelo ⌘K', async ({ page }) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/processos')
  const cabecalho = page.locator('main header').first()
  await cabecalho.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(busca(page).getByRole('combobox')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(busca(page)).toBeHidden()

  await page.keyboard.press('Meta+k')
  await expect(busca(page).getByRole('combobox')).toBeFocused()
  await busca(page).getByRole('combobox').fill('Lontra Azul')
  await expect(busca(page).locator('[data-grupo="processos"]').getByRole('option')).toHaveCount(1)
})

test('CAS-05 · em 834px, a barra do topo tem o menu, a logo, a lupa e o avatar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1112 })
  await entrarComo(page, 'advogado')
  await page.goto('./#/processos')
  const barra = page.getByRole('banner')
  await expect(barra.getByRole('button', { name: 'Abrir menu' })).toBeVisible()
  await expect(barra.getByRole('img', { name: 'Judisys' })).toBeVisible()
  await expect(barra.getByRole('button', { name: 'Menu da conta' })).toBeVisible()
  // A busca do cabeçalho some; a lupa da barra abre a mesma busca.
  await expect(page.getByRole('button', { name: 'Buscar', exact: true })).toHaveCount(1)
  await barra.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(busca(page).getByRole('combobox')).toBeFocused()
  await page.keyboard.press('Escape')

  // O avatar abre o menu da conta.
  await barra.getByRole('button', { name: 'Menu da conta' }).click()
  await expect(page.getByRole('button', { name: 'Trocar de papel' })).toBeVisible()
  await page.keyboard.press('Escape')

  // O botão do menu abre a gaveta de sempre, com o tema e a conta no pé.
  await barra.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(menu(page).getByRole('link', { name: 'Início', exact: true })).toBeFocused()
  await expect(menu(page).getByRole('switch', { name: 'Tema escuro' })).toBeVisible()
  await expect(menu(page).getByRole('button', { name: 'Fechar menu' })).toBeVisible()

  // Na gaveta, o Esc fecha primeiro só o painel da conta; o segundo fecha a gaveta.
  const contaDoMenu = menu(page).getByRole('button', { name: 'Menu da conta' })
  await contaDoMenu.click()
  await expect(menu(page).getByRole('button', { name: 'Trocar de papel' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu(page).getByRole('button', { name: 'Trocar de papel' })).toBeHidden()
  await expect(contaDoMenu).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu(page).getByRole('link', { name: 'Início', exact: true })).toBeHidden()
  await expect(barra.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
})

test('CAS-06 · no tema escuro, o menu fica um tom acima do fundo', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await entrarComo(page, 'advogado')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(menu(page).getByRole('switch', { name: 'Tema escuro' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  // --cor-menu-fundo #0d1a36 sobre o --cor-fundo #0a1630.
  expect(await fundo(page, 'aside[aria-label="Menu"]')).toBe('rgb(13, 26, 54)')
  expect(await fundo(page, 'body')).toBe('rgb(10, 22, 48)')
})

test('CAS-07 · menu recolhido: o pé mostra só os ícones, com nome acessível', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await menu(page).getByRole('button', { name: 'Recolher menu' }).click()
  const interruptor = menu(page).getByRole('switch', { name: 'Tema escuro' })
  await expect(interruptor).toBeVisible()
  await expect(interruptor).toHaveText('')
  const conta = menu(page).getByRole('button', { name: 'Menu da conta' })
  await expect(conta).toHaveText('OR')
  // O painel da conta abre por cima do conteúdo, sem ser cortado pelo menu estreito.
  await conta.click()
  await expect(page.getByRole('button', { name: 'Trocar de papel' })).toBeVisible()
  await page.getByRole('button', { name: 'Trocar de papel' }).click()
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
})
