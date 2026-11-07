// Busca global (SDD §7.8, RF-38; DMO-20) com o seed da demo: atalho e ícone do topo, grupos de
// até 5, setas + Enter e o índice refeito depois de uma gravação.
import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

async function entrarComo(page: Page, papel: RegExp): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: papel }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

function busca(page: Page) {
  return page.getByRole('dialog', { name: 'Busca global' })
}

function campo(page: Page) {
  return busca(page).getByRole('combobox', { name: 'Buscar processos, empresas e credores' })
}

/**
 * Esc e espera o evento `close` do `<dialog>`: ele chega numa tarefa depois do fechamento, e uma
 * reabertura antes dele seria fechada de novo pelo `onClose` do Dialogo.
 */
async function fecharComEsc(page: Page): Promise<void> {
  const dialogo = page.locator('dialog', {
    has: page.getByRole('heading', { name: 'Busca global' }),
  })
  await dialogo.evaluate((elemento) => {
    elemento.dataset.fechou = 'nao'
    elemento.addEventListener('close', () => (elemento.dataset.fechou = 'sim'), { once: true })
  })
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog[data-fechou="sim"]')).toHaveCount(1)
  await expect(busca(page)).toBeHidden()
}

test('BUS-01 · Ctrl+K, ⌘K e o ícone do topo abrem a busca com foco no campo', async ({ page }) => {
  await entrarComo(page, /Entrar como Analista/)

  await page.keyboard.press('Control+k')
  await expect(busca(page)).toBeVisible()
  await expect(campo(page)).toBeFocused()
  await fecharComEsc(page)

  await page.keyboard.press('Meta+k')
  await expect(campo(page)).toBeFocused()
  await fecharComEsc(page)

  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(campo(page)).toBeFocused()
})

test('BUS-04 · 110 credores casam com "silva": o grupo mostra só 5', async ({ page }) => {
  await entrarComo(page, /Entrar como Advogado/)
  await page.keyboard.press('Control+k')
  await campo(page).fill('SILVA')
  const credores = busca(page).locator('[data-grupo="credores"]')
  await expect(credores.getByRole('option')).toHaveCount(5)
  await expect(credores).toContainText('5 de 110')
  await expect(busca(page).getByRole('option')).toHaveCount(5)
})

test('BUS-05 · ↓ ↓ Enter navega até o registro escolhido', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await page.keyboard.press('Control+k')
  // Acentos e maiúsculas não importam: processo e empresas "Lontra Azul".
  await campo(page).fill('lôntra AZUL')
  const opcoes = busca(page).getByRole('option')
  await expect(busca(page).locator('[data-grupo="processos"]').getByRole('option')).toHaveCount(1)
  await expect(opcoes.first()).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  const terceira = opcoes.nth(2)
  await expect(terceira).toHaveAttribute('aria-selected', 'true')
  const destino = await terceira.getAttribute('data-destino')
  const nome = (await terceira.locator('span').first().textContent()) ?? ''
  expect(destino).toMatch(/^\/empresas\/emp-/)

  await page.keyboard.press('Enter')
  await expect(busca(page)).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`#${destino}$`))
  await expect(page.getByRole('heading', { name: nome, level: 1 })).toBeVisible()
})

test('BUS-06 · credor recém-criado aparece na busca', async ({ page }) => {
  await entrarComo(page, /Entrar como Advogado/)
  // Abre a busca antes, para o índice já estar montado quando a gravação acontecer.
  await page.keyboard.press('Control+k')
  await campo(page).fill('quiteria xavante')
  await expect(busca(page)).toContainText('Nada encontrado')
  await page.keyboard.press('Escape')

  await page.goto('./#/processos/prc-001/credores')
  await page.getByRole('button', { name: 'Novo credor' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo credor' })
  await dialogo.getByLabel('Nome').fill('Quitéria Xavante')
  await dialogo.getByLabel('CPF ou CNPJ').fill('529.982.247-25')
  await dialogo.getByLabel('Classe').selectOption({ index: 1 })
  await dialogo.getByLabel('Relação do devedor (R$)').fill('1.000,00')
  await dialogo.getByRole('button', { name: 'Cadastrar credor' }).click()
  await expect(dialogo).toBeHidden()

  await page.keyboard.press('Control+k')
  await campo(page).fill('quiteria xavante')
  const opcao = busca(page).locator('[data-grupo="credores"]').getByRole('option')
  await expect(opcao).toHaveCount(1)
  await expect(opcao).toContainText('Quitéria Xavante')
  await expect(opcao).toContainText('529.982.247-25')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Quitéria Xavante', level: 1 })).toBeVisible()
  await expect(page).toHaveURL(/#\/processos\/prc-001\/credores\/[^/]+$/)
})
