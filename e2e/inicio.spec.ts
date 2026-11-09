// Início no navegador: o cabeçalho (CAB-01, CAB-03 do SDD do início) e a grade montável nas três
// larguras (GRD, SDD-INI §7.3). As posições exatas de cada papel ficam em
// src/modulos/inicio/grade.test.tsx; aqui vale o que só o navegador mede: a largura do contêiner,
// a unidade e o link do cabeçalho do quadro. O Personalizar está em personalizar.spec.ts.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, assentarGrade, casca, conteinerCom, entrarComo, tituloDoInicio } from './apoio'

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
  test('GRD-03/GRD-04 · contêiner de 880px tem 4 colunas de 208px; de 879px, 2 colunas', async ({
    page,
  }) => {
    // A janela que dá cada largura de contêiner: a casca (menu, margens, barra de rolagem) é medida.
    await page.setViewportSize({ width: 1440, height: 900 })
    await entrarComo(page, 'advogado')
    const cascaDesktop = await casca(page, 1440, 4)

    // As 4 colunas já valiam antes do resize: só a largura do contêiner diz que a grade mediu.
    await conteinerCom(page, 880 + cascaDesktop, 880)
    await expect(grade(page)).toHaveAttribute('data-colunas', '4')
    const prazos = await page.locator('[data-celula="prazos"]').boundingBox()
    expect(prazos?.width).toBe(208)
    expect(prazos?.height).toBe(176)
    await expect(page.locator('[data-celula]')).toHaveCount(8)
    await expect(page.getByRole('button', { name: 'Personalizar' })).toBeVisible()

    await page.setViewportSize({ width: 879 + cascaDesktop, height: 900 })
    await expect(grade(page)).toHaveAttribute('data-colunas', '2')
    await expect(page.getByRole('button', { name: 'Personalizar' })).toHaveCount(0)
  })

  test('GRD-03 · notebook de 1280px com o menu aberto: 4 colunas e Personalizar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await entrarComo(page, 'advogado')
    await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
    // Com o menu de 280px, sobram cerca de 912px: acima dos 880px das 4 colunas (5.3).
    const largura = await assentarGrade(page, 1280, 4)
    expect(largura, `contêiner de ${largura}px`).toBeGreaterThanOrEqual(880)
    await expect(page.getByRole('button', { name: 'Personalizar' })).toBeVisible()
  })

  test('GRD-09 · tela muito larga: grid de 2200px à esquerda, unidade de 538px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 3440, height: 1000 })
    await entrarComo(page, 'advogado')
    const caixa = await grade(page).boundingBox()
    expect(caixa?.width).toBe(2200)
    const prazos = await page.locator('[data-celula="prazos"]').boundingBox()
    expect(prazos?.width).toBe(538)
    // Alinhado à esquerda, com o cabeçalho.
    const titulo = await tituloDoInicio(page).boundingBox()
    expect(prazos?.x).toBe(titulo?.x)
    // As ações do cabeçalho param na borda direita da grade, e não na da janela (AJ-21).
    const busca = await page.getByRole('button', { name: 'Buscar', exact: true }).boundingBox()
    expect((busca?.x ?? 0) + (busca?.width ?? 0)).toBeCloseTo(
      (caixa?.x ?? 0) + (caixa?.width ?? 0),
      0,
    )
  })

  test('AJ-21 · monitor de 2560px com o menu aberto: a grade preenche a coluna', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 2560, height: 1000 })
    await entrarComo(page, 'advogado')
    await expect(page.getByRole('button', { name: 'Recolher menu' })).toBeVisible()
    const caixa = await grade(page).boundingBox()
    const resto = await page.evaluate(() => {
      const grade = document.querySelector('[data-colunas]')
      const coluna = grade?.closest('main')
      return (
        (coluna?.getBoundingClientRect().right ?? 0) - (grade?.getBoundingClientRect().right ?? 0)
      )
    })
    expect(caixa?.width).toBeLessThan(2200)
    // Só a margem do conteúdo à direita, sem vazio.
    expect(resto).toBeLessThanOrEqual(60)
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
