import { expect, test } from '@playwright/test'

test('abre a demo com noindex e pt-BR', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Entrar no Judisys' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})

test('AJ-14 · os ícones declarados no index.html respondem', async ({ page, request }) => {
  await page.goto('./')
  const icones = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href))
  expect(icones).toHaveLength(3)
  for (const icone of icones) {
    const resposta = await request.get(icone)
    expect(resposta.status(), icone).toBe(200)
    expect(resposta.headers()['content-type'], icone).toMatch(/^image\//)
  }
})
