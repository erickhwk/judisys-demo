// Informes e anexos (DMO-19; PRD RF-18 a RF-21; SDD §7.11, T-09, T-30). Usa só o seed; cada teste
// começa com o armazenamento limpo (contexto novo do Playwright). A aba Informes do processo ainda
// não tem rota (é ligada depois na TelaDoProcesso); aqui entram as telas com rota própria.
import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

const MB = 1024 * 1024

async function entrarComo(page: Page, papel: RegExp): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: papel }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

function linhas(page: Page) {
  return page.getByRole('region', { name: 'Lista de informes' }).locator('tbody tr')
}

/** `dd/mm/aaaa` → `aaaa-mm-dd`, para comparar a ordem. */
function iso(data: string): string {
  const [dia, mes, ano] = data.trim().split('/')
  return `${ano}-${mes}-${dia}`
}

/** PDF genérico do seed completado com espaços até `tamanho` bytes (continua abrindo). */
async function pdfCom(tamanho: number): Promise<Buffer> {
  const base = await readFile(new URL('../public/anexos/edital.pdf', import.meta.url))
  return Buffer.concat([base, Buffer.alloc(Math.max(0, tamanho - base.length), ' ')])
}

async function abrirNovo(page: Page, processo = 'prc-001'): Promise<void> {
  await page.goto(`./#/informes/novo?processo=${processo}`)
  await expect(page.getByRole('heading', { name: 'Novo informe', level: 1 })).toBeVisible()
}

test('INF-06 · lista geral: mais recentes primeiro e selo "Publicado no site"', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Analista/)
  await page.goto('./#/informes')
  await expect(page.getByRole('heading', { name: 'Informes', level: 1 })).toBeVisible()
  await expect(linhas(page)).toHaveCount(50)
  await expect(page.getByText('77 informes, mais recentes primeiro')).toBeVisible()
  // Analista só lê (PER-03).
  await expect(page.getByRole('button', { name: 'Novo informe' })).toHaveCount(0)

  const datas = (await linhas(page).locator('td:first-child').allInnerTexts()).map(iso)
  expect(datas).toEqual([...datas].sort().reverse())
  expect(datas[0]).toBe('2026-11-02')

  await expect(linhas(page).nth(0)).toContainText('Petição inicial')
  await expect(linhas(page).nth(0)).toContainText('Publicado no site')
  await expect(linhas(page).nth(2)).toContainText('Edital de convocação de credores')
  await expect(linhas(page).nth(2)).toContainText('Não publicado')

  // Filtro por categoria e busca por título.
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('atas-agc')
  await expect(linhas(page).first()).toContainText('Atas de AGC')
  await page.getByRole('searchbox', { name: 'Buscar informe por título' }).fill('nada casa')
  await expect(page.getByText('Nenhum informe encontrado')).toBeVisible()
})

test('INF-01 e INF-02 · fase do processo preenchida e "Data da AGC" só em Atas de AGC', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Advogado/)
  await abrirNovo(page)

  const fase = page.getByRole('combobox', { name: 'Fase' })
  await expect(fase).toHaveValue('plano-apresentado')
  // Trocar de processo traz a fase do outro; a fase continua editável.
  await page
    .getByRole('combobox', { name: 'Processo' })
    .selectOption({ label: 'Gráfica Beija-Flor' })
  await expect(fase).toHaveValue('arrecadacao')
  await fase.selectOption('decretada')
  await expect(fase).toHaveValue('decretada')

  const dataAgc = page.getByLabel('Data da AGC')
  const categoria = page.getByRole('combobox', { name: 'Categoria' })
  await expect(dataAgc).toHaveCount(0)
  await categoria.selectOption('atas-agc')
  await expect(dataAgc).toBeVisible()
  await categoria.selectOption('editais')
  await expect(dataAgc).toHaveCount(0)
})

test('INF-03 · PDF de 2 MB: salvar e abrir no visualizador', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirNovo(page)
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('relatorios')
  await page.getByLabel('Título').fill('Relatório mensal de atividades')
  await page.getByLabel('Publicado no site').check()
  await page.getByLabel('Anexar arquivos').setInputFiles({
    name: 'relatorio.pdf',
    mimeType: 'application/pdf',
    buffer: await pdfCom(2 * MB),
  })
  await expect(page.getByRole('list', { name: 'Anexos do informe' })).toContainText('2,0 MB')
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(
    page.getByRole('heading', { name: 'Relatório mensal de atividades', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('Publicado no site').first()).toBeVisible()
  const visualizador = page.locator('iframe[title="relatorio.pdf"]')
  await expect(visualizador).toBeVisible()
  await expect(visualizador).toHaveAttribute('src', /^blob:/)

  // Continua lá depois de recarregar (IndexedDB) e aparece no topo da lista.
  await page.reload()
  await expect(page.locator('iframe[title="relatorio.pdf"]')).toBeVisible()
  await page.goto('./#/informes')
  await expect(linhas(page)).toHaveCount(50)
  await expect(linhas(page).first()).toContainText('Relatório mensal de atividades')
  await expect(linhas(page).first()).toContainText('07/11/2026')
})

test('INF-04 · arquivo acima de 10 MB é recusado', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirNovo(page)
  await page.getByLabel('Anexar arquivos').setInputFiles({
    name: 'grande.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(11 * MB),
  })
  await expect(page.getByText('Arquivo acima de 10 MB.')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Anexos do informe' })).toHaveCount(0)
})

test('INF-05 · anexo .docx é baixado', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirNovo(page)
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('outros-documentos')
  await page.getByLabel('Título').fill('Parecer técnico')
  await page.getByLabel('Anexar arquivos').setInputFiles({
    name: 'parecer.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('conteúdo do parecer'),
  })
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: 'Parecer técnico', level: 1 })).toBeVisible()
  await expect(page.locator('iframe')).toHaveCount(0)

  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Baixar parecer.docx' }).click()
  expect((await download).suggestedFilename()).toBe('parecer.docx')
})

test('T-30 · ata do seed: resumo acima do PDF genérico; editar tira a data da AGC', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Administrador/)
  await page.goto('./#/informes/inf-024')
  await expect(
    page.getByRole('heading', { name: 'Ata da assembleia geral de credores', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('Plano aprovado em todas as classes.')).toBeVisible()
  await expect(page.locator('iframe[title="Ata da AGC.pdf"]')).toHaveAttribute(
    'src',
    /anexos\/ata-agc\.pdf$/,
  )

  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByLabel('Data da AGC')).toBeVisible()
  await page.getByRole('combobox', { name: 'Categoria' }).selectOption('outros-documentos')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible()
  await expect(page.getByText('Outros Documentos').first()).toBeVisible()
  await expect(page.getByText('Data da AGC')).toHaveCount(0)
  // O anexo do seed e o resumo continuam.
  await expect(page.locator('iframe[title="Ata da AGC.pdf"]')).toBeVisible()
  await expect(page.getByText('Plano aprovado em todas as classes.')).toBeVisible()
})
