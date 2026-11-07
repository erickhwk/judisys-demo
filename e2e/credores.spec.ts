// Credores, pedidos de crédito e QGC (SDD §7.5; DMO-15) com o seed da demo. A aba Credores entra
// na tela do processo (DMO-12); aqui ficam as telas com rota própria: o credor e o QGC.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, CREDOR_IMPUGNACAO, entrarComo } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

/** Cartão de um dos três valores do credor (RF-27). */
function valor(page: Page, qual: 'devedor' | 'aj' | 'qgc') {
  return page.locator(`[data-valor="${qual}"]`)
}

test('CRD-02, CRD-04, CRD-09 · três valores; acolher a impugnação muda só o QGC e some a ação', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await page.goto(CREDOR_IMPUGNACAO.rota)
  await expect(page.getByRole('heading', { name: CREDOR_IMPUGNACAO.nome, level: 1 })).toBeVisible()
  await expect(valor(page, 'devedor')).toContainText('R$ 52.162,86')
  await expect(valor(page, 'aj')).toContainText('R$ 52.162,86')
  await expect(valor(page, 'qgc')).toContainText('—')
  await expect(page.getByText('0,00%')).toBeVisible()

  const pedidos = page.getByRole('region', { name: /Pedidos de crédito de Isadora/ })
  await pedidos.getByRole('button', { name: /^Acolher impugnação/ }).click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Acolher o pedido?' })
  await expect(confirmacao).toContainText('vão para o QGC; a relação do AJ fica como está')
  await confirmacao.getByRole('button', { name: 'Acolher' }).click()
  await expect(confirmacao).toBeHidden()

  await expect(valor(page, 'qgc')).toContainText('R$ 65.203,58')
  await expect(valor(page, 'aj')).toContainText('R$ 52.162,86')
  await expect(page.getByText('+25,00%')).toBeVisible()
  await expect(pedidos.getByText('Acolhido')).toBeVisible()
  await expect(pedidos.getByRole('button', { name: /^Acolher/ })).toHaveCount(0)
})

test('CRD-10 · com a relação do AJ publicada, o pedido registrado é impugnação', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/processos/prc-001/credores/crd-0001')
  await page.getByRole('button', { name: 'Registrar pedido' }).click()
  const dialogo = page.getByRole('dialog', { name: /Pedido de crédito de Maria Helena Silva/ })
  const tipo = dialogo.getByLabel('Tipo')
  await expect(tipo.locator('option')).toHaveText(['Impugnação'])
  await dialogo.getByLabel('Valor pedido (R$)').fill('60.000,00')
  await dialogo.getByRole('button', { name: 'Registrar pedido' }).click()
  await expect(dialogo).toBeHidden()

  const pedidos = page.getByRole('region', { name: /Pedidos de crédito de Maria/ })
  await expect(pedidos.getByText('R$ 60.000,00')).toBeVisible()
  await expect(pedidos.getByText('Pendente')).toBeVisible()
})

test('CRD-16 · CPF com dígito inválido: erro no campo e nada gravado', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await page.goto('./#/processos/prc-001/credores/crd-0001')
  await page.getByRole('button', { name: 'Editar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar credor' })
  const documento = dialogo.getByLabel('CPF ou CNPJ')
  await documento.fill('456.306.950-71')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialogo.getByText('CPF ou CNPJ inválido')).toBeVisible()
  await expect(documento).toHaveAttribute('aria-invalid', 'true')
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByText('456.306.950-70')).toBeVisible()
})

test('AJ-04 · CPF de outro credor do processo recusado na edição, com o erro no campo', async ({
  page,
}) => {
  await entrarComo(page, 'advogado')
  await page.goto('./#/processos/prc-001/credores/crd-0001')
  await page.getByRole('button', { name: 'Editar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar credor' })
  const documento = dialogo.getByLabel('CPF ou CNPJ')
  // CPF de Benjamin Moraes Albuquerque (crd-0002), sem pontuação.
  await documento.fill('89391986463')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(
    dialogo.getByText('Já existe credor com este CPF/CNPJ nesta classe do processo').first(),
  ).toBeVisible()
  await expect(documento).toHaveAttribute('aria-invalid', 'true')
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(page.getByText('456.306.950-70')).toBeVisible()
})

test('CRD-12 · QGC para impressão: grupos, subtotais e total geral iguais ao quadro-resumo', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await page.goto('./#/processos/prc-001/qgc')
  await expect(page.getByRole('heading', { name: 'Grupo Lontra Azul', level: 1 })).toBeVisible()
  await expect(page.getByText('Quadro-geral de credores')).toBeVisible()
  // Sem o layout: nem menu lateral nem faixa da demo.
  await expect(page.getByRole('link', { name: 'Processos' })).toHaveCount(0)

  for (const classe of ['I · Trabalhista', 'II · Garantia real', 'III · Quirografário']) {
    await expect(page.getByRole('heading', { name: classe, level: 2 })).toBeVisible()
  }
  // Cada subtotal e o total geral batem com a linha do quadro-resumo.
  for (const classe of ['trabalhista', 'garantia-real', 'quirografario', 'me-epp']) {
    const subtotal = (await page.locator(`[data-subtotal="${classe}"]`).textContent()) ?? ''
    await expect(page.locator(`tr[data-classe="${classe}"]`)).toContainText(subtotal)
  }
  const total = (await page.locator('[data-total="geral"]').textContent()) ?? ''
  await expect(page.locator('tr[data-classe="total"]')).toContainText(total)

  // Na impressão, botões e links de navegação somem; os dados ficam.
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: /Imprimir/ })).toBeHidden()
  await expect(page.getByRole('link', { name: 'Voltar ao processo' })).toBeHidden()
  await expect(page.locator('[data-total="geral"]')).toBeVisible()
})

test('aba Credores dentro da tela do processo (RF-13)', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await page.goto('#/processos/prc-001/credores')
  await expect(page.getByRole('navigation', { name: 'Seções do processo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo credor' })).toBeVisible()
  await expect(page.locator('tbody tr').first()).toBeVisible()
})

/** A busca da aba Credores como está no hash da URL (o app usa HashRouter). */
function buscaNaUrl(page: Page): string | null {
  const consulta = new URL(page.url()).hash.split('?')[1] ?? ''
  return new URLSearchParams(consulta).get('busca')
}

test('AJ-07 · digitação rápida na busca de Credores não perde caracteres; a URL guarda o filtro', async ({
  page,
}) => {
  await entrarComo(page, 'advogado')
  await page.goto('#/processos/prc-001/credores')
  const campo = page.getByRole('searchbox', { name: 'Buscar por nome ou CPF/CNPJ' })
  const isadora = page.getByRole('link', { name: 'Isadora Costa Batista' })
  const linhas = page.getByRole('region', { name: 'Credores', exact: true }).locator('tbody tr')
  await expect(linhas.first()).toBeVisible()

  // Sem atraso entre as teclas: é o caso que perdia letras com o campo preso à URL.
  await campo.click()
  await page.keyboard.type('Isadora Costa Batista')
  await expect(campo).toHaveValue('Isadora Costa Batista')
  await expect.poll(() => buscaNaUrl(page)).toBe('Isadora Costa Batista')
  await expect(linhas).toHaveCount(1)
  await expect(isadora).toBeVisible()

  // Atualizar a página mantém o filtro.
  await page.reload()
  await expect(campo).toHaveValue('Isadora Costa Batista')
  await expect(linhas).toHaveCount(1)

  // Ir ao credor e voltar também.
  await isadora.click()
  await expect(page.getByRole('heading', { name: 'Isadora Costa Batista', level: 1 })).toBeVisible()
  await page.goBack()
  await expect(campo).toHaveValue('Isadora Costa Batista')
  await expect(linhas).toHaveCount(1)

  // Trocar o texto rápido também chega à URL, e "Limpar busca" esvazia o campo.
  await campo.press('ControlOrMeta+a')
  await page.keyboard.type('Maria Helena')
  await expect(campo).toHaveValue('Maria Helena')
  await expect.poll(() => buscaNaUrl(page)).toBe('Maria Helena')
  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(campo).toHaveValue('')
  await expect.poll(() => buscaNaUrl(page)).toBeNull()
})

test('AJ-13 · na trilha do credor, o processo leva à visão geral e Credores à aba', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await page.goto(CREDOR_IMPUGNACAO.rota)
  const trilha = page.getByRole('navigation', { name: 'Trilha' })
  const processo = trilha.getByRole('link', { name: 'Grupo Lontra Azul', exact: true })
  const credores = trilha.getByRole('link', { name: 'Credores', exact: true })
  await expect(processo).toHaveAttribute('href', '#/processos/prc-001/visao-geral')
  await expect(credores).toHaveAttribute('href', '#/processos/prc-001/credores')

  await processo.click()
  await expect(page).toHaveURL(/#\/processos\/prc-001\/visao-geral$/)
  await expect(page.getByRole('heading', { name: 'Grupo Lontra Azul', level: 1 })).toBeVisible()
  await expect(
    page
      .getByRole('navigation', { name: 'Seções do processo' })
      .getByRole('link', { name: 'Visão geral' }),
  ).toHaveAttribute('aria-current', 'page')

  await page.goBack()
  await expect(page.getByRole('heading', { name: CREDOR_IMPUGNACAO.nome, level: 1 })).toBeVisible()
  await credores.click()
  await expect(page).toHaveURL(/#\/processos\/prc-001\/credores$/)
})
