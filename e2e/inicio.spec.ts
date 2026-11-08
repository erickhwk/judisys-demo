// Início no navegador: o cabeçalho (CAB-01, CAB-03 do SDD do início) e a grade montável nas três
// larguras (GRD, SDD-INI §7.3). As posições exatas de cada papel ficam em
// src/modulos/inicio/grade.test.tsx; aqui vale o que só o navegador mede: a largura do contêiner,
// a unidade e o link do cabeçalho do quadro. O Personalizar está em personalizar.spec.ts.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo, tituloDoInicio } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const grade = (page: Page) => page.locator('[data-colunas]')

test('CAB-01/CAB-03 · saudação, data por extenso e resumo do seed às 10h', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await expect(tituloDoInicio(page)).toHaveText('Bom dia, Otávio')
  await expect(page.getByText('Sábado, 7 de novembro', { exact: true })).toBeVisible()
  await expect(page.locator('[data-resumo]')).toHaveText(
    '3 prazos vencidos, 1 vence hoje e a AGC de Grupo Lontra Azul é na sexta.',
  )
})

test.describe('larguras', () => {
  test('GRD-03/GRD-04 · contêiner de 976px tem 4 colunas de 232px; de 975px, 2 colunas', async ({
    page,
  }) => {
    // A janela que dá cada largura de contêiner: a casca (menu, margens, barra de rolagem) é medida.
    await page.setViewportSize({ width: 1440, height: 900 })
    await entrarComo(page, 'advogado')
    const casca = 1440 - ((await grade(page).boundingBox())?.width ?? 0)

    await page.setViewportSize({ width: 976 + casca, height: 900 })
    await expect(grade(page)).toHaveAttribute('data-colunas', '4')
    expect((await grade(page).boundingBox())?.width).toBe(976)
    const prazos = await page.locator('[data-celula="prazos"]').boundingBox()
    expect(prazos?.width).toBe(232)
    expect(prazos?.height).toBe(176)
    await expect(page.locator('[data-celula]')).toHaveCount(8)
    await expect(page.getByRole('button', { name: 'Personalizar' })).toBeVisible()

    await page.setViewportSize({ width: 975 + casca, height: 900 })
    await expect(grade(page)).toHaveAttribute('data-colunas', '2')
    await expect(page.getByRole('button', { name: 'Personalizar' })).toHaveCount(0)
  })

  test('GRD-09 · tela muito larga: grid de 1240px à esquerda, unidade de 298px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1000 })
    await entrarComo(page, 'advogado')
    const caixa = await grade(page).boundingBox()
    expect(caixa?.width).toBe(1240)
    const prazos = await page.locator('[data-celula="prazos"]').boundingBox()
    expect(prazos?.width).toBe(298)
    // Alinhado à esquerda, com o cabeçalho.
    const titulo = await tituloDoInicio(page).boundingBox()
    expect(prazos?.x).toBe(titulo?.x)
  })

  test('GRD-04/PRS-12 · tablet (834px): 2 colunas, sem Personalizar', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 })
    await entrarComo(page, 'advogado')
    await expect(grade(page)).toHaveAttribute('data-colunas', '2')
    await expect(page.locator('[data-variante="tablet"]')).toHaveCount(8)
    const carteira = await page.locator('[data-celula="carteira"]').boundingBox()
    expect(carteira?.height).toBe(176 * 2 + 16)
    await expect(page.getByRole('button', { name: 'Personalizar' })).toHaveCount(0)
  })

  test('GRD-06 · celular (390px): uma coluna, altura livre, na ordem de leitura', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await entrarComo(page, 'advogado')
    await expect(grade(page)).toHaveAttribute('data-colunas', '1')
    const titulos = page.locator('[data-variante="celular"] h2')
    await expect(titulos).toHaveText([
      'Prazos em aberto',
      'Próxima AGC',
      'Próximos prazos',
      'Calendário do mês',
      'Informes publicados',
      'Passivo sob administração',
      'Passivo por classe (RJ)',
      'Carteira por fase',
    ])
    const lista = await grade(page).boundingBox()
    const prazos = await page.locator('[data-quadro="prazos"]').boundingBox()
    expect(prazos?.width).toBe(lista?.width)
    await expect(page.getByRole('button', { name: 'Personalizar' })).toHaveCount(0)
  })
})

test('GRD-07 · o link do cabeçalho do quadro leva à origem', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await page
    .getByRole('region', { name: 'Prazos em aberto' })
    .getByRole('link', { name: 'Agenda' })
    .click()
  await expect(page).toHaveURL(/#\/agenda$/)
  await page.goto('./#/')
  await page
    .getByRole('region', { name: 'Carteira por fase' })
    .getByRole('link', { name: 'Processos' })
    .click()
  await expect(page).toHaveURL(/#\/processos$/)
})
