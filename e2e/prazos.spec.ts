// Agenda: lista com filtros, calendário mensal, prazo manual, editar vencimento e marcar cumprido
// (SDD §7.4, DMO-14). A aba Prazos do processo usa a mesma lista e ações; enquanto ela não tem
// rota (TelaDoProcesso, DMO-12), é testada em src/modulos/prazos/AbaPrazos.test.tsx.
import { expect, type Locator, type Page, test } from '@playwright/test'
import { AGORA, entrarComo, trocarPara } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

async function abrirAgenda(page: Page, consulta = ''): Promise<Locator> {
  await page.goto(`./#/agenda${consulta}`)
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()
  return page.getByRole('region', { name: 'Prazos da agenda' })
}

/** dd/mm/aaaa → aaaa-mm-dd, para comparar datas da tabela. */
function iso(texto: string): string {
  const [dia, mes, ano] = texto.trim().split('/')
  return `${ano}-${mes}-${dia}`
}

async function vencimentos(lista: Locator): Promise<string[]> {
  return (await lista.locator('tbody tr td:first-child').allTextContents()).map(iso)
}

/**
 * Os vencimentos da lista depois que o filtro aplicou: espera ter linhas e todas passarem em `ok`.
 * Ler logo depois de trocar o filtro pega a lista vazia ou a do filtro anterior (AJ-06).
 */
async function vencimentosFiltrados(lista: Locator, ok: (data: string) => boolean) {
  await expect
    .poll(async () => {
      const datas = await vencimentos(lista)
      return datas.length > 0 && datas.every(ok)
    })
    .toBe(true)
  return vencimentos(lista)
}

test('PRZ-08 · filtros "7 dias" e "vencidos" da agenda', async ({ page }) => {
  await entrarComo(page, 'analista')
  const lista = await abrirAgenda(page)

  await page.getByLabel('Período').selectOption({ label: 'Próximos 7 dias' })
  await expect(page).toHaveURL(/periodo=7-dias/)
  await vencimentosFiltrados(lista, (data) => data >= '2026-11-07' && data <= '2026-11-14')
  await expect(lista.getByText('Cumprido', { exact: true })).toHaveCount(0)

  await page.getByLabel('Período').selectOption({ label: 'Vencidos' })
  await expect(page).toHaveURL(/periodo=vencidos/)
  const vencidos = await vencimentosFiltrados(lista, (data) => data < '2026-11-07')
  // PRZ-06: todo vencido aberto aparece com o selo "Vencido".
  await expect(lista.getByText('Vencido', { exact: true })).toHaveCount(vencidos.length)

  // Por processo: só os prazos dele; o link leva à aba Prazos do processo.
  await page.getByLabel('Período').selectOption({ label: 'Todos, inclusive cumpridos' })
  await page.getByLabel('Processo').selectOption({ label: 'Grupo Lontra Azul' })
  await expect(lista.locator('tbody tr')).toHaveCount(12)
  await expect(lista.getByRole('link', { name: 'Grupo Lontra Azul' })).toHaveCount(12)

  // Limpar volta ao padrão (todos em aberto).
  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(page).toHaveURL(/#\/agenda$/)
  await expect(page.getByLabel('Período')).toHaveValue('abertos')
})

test('PRZ-09 · calendário mensal: prazos por dia, navegação e link para o prazo', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  await abrirAgenda(page)
  await page.getByRole('button', { name: 'Calendário' }).click()
  await expect(page).toHaveURL(/vista=calendario/)

  const calendario = page.getByRole('region', { name: 'novembro de 2026' })
  await expect(calendario).toBeVisible()
  // RMA do Grupo Lontra Azul no dia 15 (T-34).
  const dia15 = calendario.getByRole('listitem').filter({ hasText: '15 de novembro de 2026' })
  const rma = dia15.getByRole('link', { name: /Relatório mensal de atividades.*Grupo Lontra Azul/ })
  await expect(rma).toBeVisible()

  await page.getByRole('button', { name: 'Próximo mês' }).click()
  await expect(page.getByRole('heading', { name: 'dezembro de 2026' })).toBeVisible()
  await expect(page).toHaveURL(/mes=2026-12/)
  await page.getByRole('button', { name: 'Mês anterior' }).click()
  await page.getByRole('button', { name: 'Mês anterior' }).click()
  await expect(page.getByRole('heading', { name: 'outubro de 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Mês atual' }).click()
  await expect(page.getByRole('heading', { name: 'novembro de 2026' })).toBeVisible()

  await rma.click()
  await expect(page).toHaveURL(/#\/processos\/prc-001\/prazos\?prazo=prz-0012$/)
})

test('PRZ-10 · prazo manual sem base legal', async ({ page }) => {
  await entrarComo(page, 'advogado')
  const lista = await abrirAgenda(page, '?processo=prc-003')
  // Espera a lista carregar antes de contar.
  await expect(lista.locator('tbody tr').first()).toBeVisible()
  const antes = await lista.locator('tbody tr').count()

  await page.getByRole('button', { name: 'Novo prazo' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo prazo' })
  await dialogo.getByRole('button', { name: 'Salvar' }).click()
  await expect(dialogo.getByText('Campo obrigatório')).toHaveCount(3)

  await dialogo.getByLabel('Processo').selectOption({ label: 'Tecelagem Pé-de-Moleque' })
  await dialogo.getByLabel('Título').fill('Reunião com o comitê de credores')
  await dialogo.getByLabel('Vencimento').fill('2026-11-09')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(dialogo).toBeHidden()
  await expect(page.getByRole('status')).toContainText('criado')
  await expect(lista.locator('tbody tr')).toHaveCount(antes + 1)
  const linha = lista.getByRole('row', { name: /Reunião com o comitê de credores/ })
  await expect(linha).toContainText('09/11/2026')
  // D+2: urgente (PRZ-06).
  await expect(linha).toContainText('Vence em 2 dias')
})

test('PRZ-11 · editar vencimento de prazo automático (título travado)', async ({ page }) => {
  await entrarComo(page, 'aj')
  const lista = await abrirAgenda(page, '?processo=prc-001')

  await lista.getByRole('button', { name: 'Editar "Stay period"' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Editar prazo' })
  await expect(dialogo.getByLabel('Título')).toHaveValue('Stay period')
  await expect(dialogo.getByLabel('Título')).not.toBeEditable()
  await expect(dialogo.getByLabel('Base legal')).not.toBeEditable()
  await dialogo.getByLabel('Vencimento').fill('2027-07-05')
  await dialogo.getByRole('button', { name: 'Salvar' }).click()

  await expect(dialogo).toBeHidden()
  const linha = lista.getByRole('row', { name: /Stay period/ })
  await expect(linha).toContainText('05/07/2027')
  await expect(linha).toContainText('art. 6º, §4º')
})

test('PRZ-01 · marcar o RMA como cumprido cria o seguinte; analista não vê as ações', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  const lista = await abrirAgenda(page, '?processo=prc-001')
  const rma = 'Relatório mensal de atividades (RMA)'

  await lista.getByRole('button', { name: `Marcar "${rma}" como cumprido` }).click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Marcar como cumprido' })
  await expect(confirmacao).toContainText('O próximo RMA será criado com vencimento em 15/12/2026')
  await confirmacao.getByRole('button', { name: 'Marcar como cumprido' }).click()

  await expect(page.getByRole('status')).toContainText(
    'Próximo RMA criado com vencimento em 15/12/2026',
  )
  const linhaRma = lista.getByRole('row', { name: new RegExp(rma.replace(/[()]/g, '\\$&')) })
  await expect(linhaRma).toHaveCount(1)
  await expect(linhaRma).toContainText('15/12/2026')

  await trocarPara(page, 'analista')
  await abrirAgenda(page)
  await expect(page.getByRole('button', { name: 'Novo prazo' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /como cumprido/ })).toHaveCount(0)
})

test('aba Prazos dentro da tela do processo (RF-13)', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await page.goto('#/processos/prc-001/prazos')
  await expect(page.getByRole('navigation', { name: 'Seções do processo' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Prazos', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo prazo' })).toBeVisible()
  await expect(page.locator('tbody tr').first()).toBeVisible()
})
