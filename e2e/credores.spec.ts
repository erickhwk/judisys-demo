// Credores, pedidos de crédito e QGC (SDD §7.5; DMO-15) com o seed da demo. A aba Credores entra
// na tela do processo (DMO-12); aqui ficam as telas com rota própria: o credor e o QGC.
import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

async function entrarComo(page: Page, papel: RegExp): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: papel }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

/** Cartão de um dos três valores do credor (RF-27). */
function valor(page: Page, qual: 'devedor' | 'aj' | 'qgc') {
  return page.locator(`[data-valor="${qual}"]`)
}

// Isadora Costa Batista, do processo vitrine: impugnação pendente (SED-04), sem QGC.
const CREDOR = './#/processos/prc-001/credores/crd-0066'

test('CRD-02, CRD-04, CRD-09 · três valores; acolher a impugnação muda só o QGC e some a ação', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Administrador/)
  await page.goto(CREDOR)
  await expect(page.getByRole('heading', { name: 'Isadora Costa Batista', level: 1 })).toBeVisible()
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
  await entrarComo(page, /Entrar como Analista/)
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
  await entrarComo(page, /Entrar como Advogado/)
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

test('CRD-12 · QGC para impressão: grupos, subtotais e total geral iguais ao quadro-resumo', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Administrador/)
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
