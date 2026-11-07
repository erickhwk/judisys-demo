import { expect, test } from '@playwright/test'

test('abre a demo com noindex e pt-BR', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Judisys' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})
