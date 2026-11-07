// Telas de empresas (DMO-13; PRD RF-16, RF-17; SDD T-23, BUS-03, CSV-01). Usa só o seed; cada
// teste começa com o armazenamento limpo (contexto novo do Playwright).
import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

async function entrarComo(page: Page, papel: RegExp): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: papel }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

async function abrirEmpresas(page: Page): Promise<void> {
  await page.goto('./#/empresas')
  await expect(page.getByRole('heading', { name: 'Empresas', level: 1 })).toBeVisible()
}

function busca(page: Page) {
  return page.getByRole('searchbox', { name: 'Buscar por razão social, nome fantasia ou CNPJ' })
}

function linhas(page: Page) {
  return page.getByRole('region', { name: 'Lista de empresas' }).locator('tbody tr')
}

test('RF-16 · lista com as 40 empresas do seed e busca por razão social, nome fantasia e CNPJ', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Analista/)
  await abrirEmpresas(page)
  await expect(page.getByText('40 empresas cadastradas')).toBeVisible()
  await expect(linhas(page)).toHaveCount(40)

  // Razão social, sem acento e em minúsculas.
  await busca(page).fill('fundicao sapo')
  await expect(linhas(page)).toHaveCount(1)
  await expect(linhas(page).first()).toContainText('Fundição Sapo-Cururu Ltda.')

  // Nome fantasia.
  await busca(page).fill('Lontra Log')
  await expect(linhas(page)).toHaveCount(1)
  await expect(linhas(page).first()).toContainText('Lontra Azul Logística Ltda.')

  // BUS-03: CNPJ com e sem pontuação.
  await busca(page).fill('26.682.973/0001-41')
  await expect(linhas(page)).toHaveCount(1)
  await expect(linhas(page).first()).toContainText('Lontra Azul Alimentos Ltda.')
  await busca(page).fill('26682973000141')
  await expect(linhas(page)).toHaveCount(1)
  await expect(linhas(page).first()).toContainText('26.682.973/0001-41')

  await busca(page).fill('nada casa com isto')
  await expect(page.getByText('Nenhuma empresa encontrada')).toBeVisible()
  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(linhas(page)).toHaveCount(40)
})

test('CSV-01 · exportar empresas baixa o que passa na busca, com BOM e `;`', async ({ page }) => {
  await entrarComo(page, /Entrar como Advogado/)
  await abrirEmpresas(page)
  await busca(page).fill('lontra')
  await expect(linhas(page)).toHaveCount(5)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('judisys-empresas-2026-11-07.csv')
  const conteudo = await readFile(await download.path(), 'utf8')
  expect(conteudo.startsWith('﻿Razão social;Nome fantasia;CNPJ;')).toBe(true)
  const corpo = conteudo.trim().split('\r\n').slice(1)
  expect(corpo).toHaveLength(5)
  expect(corpo).toContain(
    'Lontra Azul Alimentos Ltda.;Lontra Azul;26.682.973/0001-41;Demais;Campinas;SP;1091-1/01',
  )
})

test('CNPJ inválido recusado; empresa válida criada e excluída', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirEmpresas(page)
  await page.getByRole('button', { name: 'Nova empresa' }).click()
  await expect(page.getByRole('heading', { name: 'Nova empresa', level: 1 })).toBeVisible()

  await page.getByLabel('Razão social').fill('Arara Vermelha Comércio Ltda.')
  await page.getByLabel('Nome fantasia').fill('Arara Vermelha')
  await page.getByLabel('CNPJ').fill('11.222.333/0001-00')
  await page.getByLabel('Cidade').fill('Sorocaba')
  await page.getByLabel('UF').selectOption('SP')
  await page.getByRole('button', { name: 'Salvar' }).click()

  // Dígito verificador errado: fica no formulário, com o erro no campo.
  await expect(page.getByLabel('CNPJ')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('CNPJ inválido')).toBeVisible()
  await expect(page).toHaveURL(/#\/empresas\/novo$/)

  await page.getByLabel('CNPJ').fill('11222333000181')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/#\/empresas$/)
  await expect(page.getByText('41 empresas cadastradas')).toBeVisible()
  await busca(page).fill('11.222.333/0001-81')
  await expect(linhas(page)).toHaveCount(1)
  await expect(linhas(page).first()).toContainText('Arara Vermelha Comércio Ltda.')

  // Sem processo, a empresa sai.
  await page.getByRole('button', { name: 'Excluir Arara Vermelha Comércio Ltda.' }).click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Excluir empresa' })
  await confirmacao.getByRole('button', { name: 'Excluir' }).click()
  await expect(confirmacao).toBeHidden()
  await expect(page.getByText('Nenhuma empresa encontrada')).toBeVisible()
})

test('AJ-03 · CNPJ de outra empresa recusado, com o erro no campo', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirEmpresas(page)
  await page.getByRole('button', { name: 'Nova empresa' }).click()
  await expect(page.getByRole('heading', { name: 'Nova empresa', level: 1 })).toBeVisible()

  await page.getByLabel('Razão social').fill('Arara Vermelha Comércio Ltda.')
  // CNPJ da Lontra Azul Alimentos, sem pontuação.
  await page.getByLabel('CNPJ').fill('26682973000141')
  await page.getByLabel('Cidade').fill('Sorocaba')
  await page.getByLabel('UF').selectOption('SP')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByLabel('CNPJ')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Já existe empresa com este CNPJ')).toBeVisible()
  await expect(page).toHaveURL(/#\/empresas\/novo$/)
  await abrirEmpresas(page)
  await expect(page.getByText('40 empresas cadastradas')).toBeVisible()
})

test('T-23 · empresa sem processo excluída pelo formulário volta à lista', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await page.goto('./#/empresas/novo')
  await page.getByLabel('Razão social').fill('Tucano Bico Verde Ltda.')
  await page.getByLabel('CNPJ').fill('11222333000181')
  await page.getByLabel('Cidade').fill('Sorocaba')
  await page.getByLabel('UF').selectOption('SP')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/#\/empresas$/)

  await page.getByRole('link', { name: 'Tucano Bico Verde Ltda.' }).click()
  await expect(page.getByText('A empresa não aparece em nenhum processo.')).toBeVisible()
  await page.getByRole('button', { name: 'Excluir' }).click()
  await page
    .getByRole('alertdialog', { name: 'Excluir empresa' })
    .getByRole('button', { name: 'Excluir' })
    .click()
  await expect(page).toHaveURL(/#\/empresas$/)
  await expect(page.getByText('40 empresas cadastradas')).toBeVisible()
})

test('T-23 · exclusão de empresa vinculada recusada, com os processos na mensagem', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirEmpresas(page)
  await busca(page).fill('sapo-cururu')
  await page.getByRole('button', { name: 'Excluir Fundição Sapo-Cururu Ltda.' }).click()
  await page
    .getByRole('alertdialog', { name: 'Excluir empresa' })
    .getByRole('button', { name: 'Excluir' })
    .click()

  const recusa = page.getByRole('alertdialog', { name: 'Empresa não excluída' })
  await expect(recusa).toContainText('vinculada a processos e não pode ser excluída')
  const processos = recusa.getByRole('list', { name: 'Processos da empresa' })
  await expect(processos.getByRole('link')).toHaveText([
    'Fundição Sapo-Cururu',
    'Fundição Sapo-Cururu (falência)',
  ])
  await recusa.getByRole('button', { name: 'Entendi' }).click()
  await expect(recusa).toBeHidden()
  // Nada saiu: a empresa continua na lista.
  await expect(page.getByRole('link', { name: 'Fundição Sapo-Cururu Ltda.' })).toBeVisible()
})

test('RF-17 · na edição, os processos da empresa com link para a visão geral', async ({ page }) => {
  await entrarComo(page, /Entrar como Advogado/)
  await page.goto('./#/empresas/emp-025')
  await expect(
    page.getByRole('heading', { name: 'Fundição Sapo-Cururu Ltda.', level: 1 }),
  ).toBeVisible()
  await expect(page.getByLabel('CNPJ')).toHaveValue('63.323.339/0001-49')

  const processos = page.getByRole('list', { name: 'Processos da empresa' })
  await expect(processos.getByRole('listitem')).toHaveCount(2)
  await expect(
    processos.getByRole('link', { name: 'Fundição Sapo-Cururu (falência)' }),
  ).toHaveAttribute('href', /#\/processos\/prc-011\/visao-geral$/)

  // Editar e salvar volta à lista com o novo nome fantasia.
  await page.getByLabel('Nome fantasia').fill('Sapo Fundição')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page).toHaveURL(/#\/empresas$/)
  await busca(page).fill('sapo fundicao')
  await expect(linhas(page)).toHaveCount(1)
})

test('PER-03 · analista consulta empresas sem botões de criar, editar ou excluir', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Analista/)
  await abrirEmpresas(page)
  await expect(page.getByRole('button', { name: 'Nova empresa' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^(Editar|Excluir) / })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Exportar CSV' })).toBeVisible()

  await page.getByRole('link', { name: 'Fundição Sapo-Cururu Ltda.' }).click()
  await expect(
    page.getByRole('heading', { name: 'Fundição Sapo-Cururu Ltda.', level: 1 }),
  ).toBeVisible()
  await expect(page.getByLabel('Razão social')).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Salvar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Excluir' })).toHaveCount(0)
  await expect(
    page.getByRole('list', { name: 'Processos da empresa' }).getByRole('link'),
  ).toHaveCount(2)

  // PER-04: a criação aberta direto continua bloqueada pela rota.
  await page.goto('./#/empresas/novo')
  await expect(page.getByRole('alert')).toContainText('Seu papel não permite esta ação')
})
