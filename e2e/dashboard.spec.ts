// Início no navegador: o cabeçalho (CAB-01, CAB-03 do SDD do início) e, abaixo dele, o conteúdo do
// antigo dashboard (SDD §7.7 da demo, DMO-18): números, listas com link, gráfico e a volta ao
// início depois de editar (T-22). Os casos com contagem exata ficam em
// src/modulos/inicio/inicio.test.tsx e resumo.test.ts.
import { expect, test } from '@playwright/test'
import { AGORA, entrarComo, tituloDoInicio } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

test('CAB-01/CAB-03 · saudação, data por extenso e resumo do seed às 10h', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await expect(tituloDoInicio(page)).toHaveText('Bom dia, Otávio')
  await expect(page.getByText('Sábado, 7 de novembro', { exact: true })).toBeVisible()
  await expect(page.locator('[data-resumo]')).toHaveText(
    '3 prazos vencidos, 1 vence hoje e a AGC do Grupo Lontra Azul é na sexta.',
  )
})

test('DSH-01/DSH-02 · números do topo e AGC do vitrine em D+6, com link', async ({ page }) => {
  await entrarComo(page, 'advogado')
  for (const nome of ['processos-ativos', 'credores', 'prazos-vencidos', 'prazos-7-dias']) {
    const texto = await page.locator(`[data-stat="${nome}"]`).textContent()
    expect(Number(texto?.replace(/\D/g, '')), nome).toBeGreaterThan(0)
  }
  expect(
    Number(await page.locator('[data-stat="passivo"]').getAttribute('data-valor')),
  ).toBeGreaterThan(0)
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible()

  const agcs = page.getByRole('region', { name: 'Próximas AGCs' })
  const vitrine = agcs.getByRole('link', { name: /Grupo Lontra Azul/ })
  await expect(vitrine).toContainText('13/11/2026')
  await vitrine.click()
  await expect(page).toHaveURL(/#\/processos\/prc-001\/agc\/agc-\d+$/)
})

test('DSH-03 · 8 próximos prazos; o link leva à aba Prazos do processo', async ({ page }) => {
  await entrarComo(page, 'analista')
  const prazos = page.getByRole('region', { name: 'Próximos prazos' }).getByRole('link')
  await expect(prazos).toHaveCount(8)
  await expect(prazos.first()).toContainText('Vencido')
  await prazos.first().click()
  await expect(page).toHaveURL(/#\/processos\/prc-\d+\/prazos$/)
})

test('DSH-04 · editar um credor aparece na atividade recente ao voltar', async ({ page }) => {
  await entrarComo(page, 'advogado')
  const antes = Number(await page.locator('[data-stat="passivo"]').getAttribute('data-valor'))

  await page.goto('./#/processos/prc-001/credores/crd-0001')
  await page.getByRole('button', { name: 'Editar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar credor' })
  await dialogo.getByLabel('Relação do AJ (R$)').fill('9.999.999,00')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialogo).toBeHidden()

  await page.goto('./#/')
  const atividade = page.getByRole('region', { name: 'Atividade recente' }).getByRole('listitem')
  await expect(atividade.first()).toContainText('Editou credor')
  await expect(atividade.first()).toContainText('Grupo Lontra Azul')
  const depois = Number(await page.locator('[data-stat="passivo"]').getAttribute('data-valor'))
  expect(depois).not.toBe(antes)
})
