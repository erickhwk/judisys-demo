// AGC: cadastro, presença e instalação (SDD §7.6; DMO-16) com o seed da demo. O processo vitrine
// (prc-001) tem uma AGC agendada para daqui a 6 dias (SED-04).
import { expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

async function entrarComo(page: Page, papel: RegExp): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: papel }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

/** Abre a AGC agendada do vitrine pela aba do processo. */
async function abrirAgcDoVitrine(page: Page): Promise<void> {
  await page.goto('./#/processos/prc-001/agc')
  const lista = page.getByRole('region', { name: 'AGCs do processo' })
  await lista.getByRole('link', { name: '13/11/2026' }).click()
  await expect(page.getByRole('heading', { name: 'AGC de 13/11/2026', level: 1 })).toBeVisible()
}

function linhaDaClasse(page: Page, rotulo: string) {
  return page
    .getByRole('region', { name: 'Quórum de instalação por classe' })
    .getByRole('row')
    .filter({ hasText: rotulo })
}

test('AGC-01, AGC-02 · AGC futura com aviso; "todos da classe" e instalação em 1ª convocação', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirAgcDoVitrine(page)
  await expect(page.getByRole('note')).toContainText('Simulação: a data da AGC ainda não chegou')

  const instalar = page.getByRole('button', { name: 'Instalar em 1ª convocação' })
  await expect(instalar).toBeDisabled()

  // AGC-02: todos os votantes da classe II presentes.
  await page.getByRole('button', { name: 'Todos da classe II · Garantia real' }).click()
  const classeII = linhaDaClasse(page, 'II · Garantia real')
  await expect(classeII).toContainText('Acima de 50%')
  await expect(classeII).toContainText('100,00%')
  await expect(
    page.getByRole('button', { name: 'Desmarcar classe II · Garantia real' }),
  ).toBeVisible()

  const lista = page.getByRole('region', { name: 'Lista de presença', exact: true })
  await page
    .getByRole('region', { name: 'Buscar na lista de presença' })
    .getByLabel('Classe')
    .selectOption({ label: 'II · Garantia real' })
  const caixas = lista.getByRole('checkbox')
  await expect(caixas.first()).toBeChecked()
  const total = await caixas.count()
  for (let i = 0; i < total; i++) await expect(caixas.nth(i)).toBeChecked()

  for (const classe of ['I · Trabalhista', 'III · Quirografário', 'IV · ME/EPP']) {
    await page.getByRole('button', { name: `Todos da classe ${classe}` }).click()
    await expect(linhaDaClasse(page, classe)).toContainText('Acima de 50%')
  }

  await expect(instalar).toBeEnabled()
  await instalar.click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Instalar a AGC em 1ª convocação?' })
  await confirmacao.getByRole('button', { name: 'Instalar' }).click()
  await expect(confirmacao).toBeHidden()

  await expect(page.getByText('Instalada em 1ª convocação')).toBeVisible()
  await expect(caixas.first()).toBeDisabled()
  await expect(page.getByRole('button', { name: /^Todos da classe/ })).toHaveCount(0)
})

test('AGC-24 · quem não vota aparece desabilitado com o motivo; votante marca e desmarca', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Administrador/)
  await abrirAgcDoVitrine(page)
  const lista = page.getByRole('region', { name: 'Lista de presença', exact: true })
  const filtros = page.getByRole('region', { name: 'Buscar na lista de presença' })

  await filtros.getByLabel('Classe').selectOption({ label: 'Sem direito a voto' })
  const semVoto = lista.getByRole('checkbox').first()
  await expect(semVoto).toBeDisabled()
  await expect(semVoto).toHaveAccessibleDescription(/credor não sujeito|valor zero|sem direito/)
  await expect(lista.getByText(/^Não vota: /).first()).toBeVisible()

  await filtros.getByLabel('Classe').selectOption({ label: 'I · Trabalhista' })
  const votante = lista.getByRole('checkbox').first()
  await expect(votante).toBeEnabled()
  await expect(votante).not.toBeChecked()
  await votante.check()
  await expect(votante).toBeChecked()
  await expect(lista).toContainText(/(^|\D)1 de \d+ credores votantes presentes/)
  await votante.uncheck()
  await expect(votante).not.toBeChecked()
})

test('RF-31 · nova AGC pela aba; analista só lê', async ({ page }) => {
  await entrarComo(page, /Entrar como Administrador/)
  await page.goto('./#/processos/prc-001/agc')
  await page.getByRole('button', { name: 'Nova AGC' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nova AGC' })
  await dialogo.getByLabel('1ª convocação').fill('2026-12-10')
  await dialogo.getByLabel('2ª convocação').fill('2026-12-03')
  await dialogo.getByLabel('Pauta').fill('Aditamento ao plano')
  await dialogo.getByRole('button', { name: 'Cadastrar AGC' }).click()
  await expect(dialogo.getByText('A 2ª convocação não pode ser antes da 1ª')).toBeVisible()
  await dialogo.getByLabel('2ª convocação').fill('2026-12-17')
  await dialogo.getByRole('button', { name: 'Cadastrar AGC' }).click()

  await expect(page.getByRole('heading', { name: 'AGC de 10/12/2026', level: 1 })).toBeVisible()
  await expect(page.getByText('Aditamento ao plano')).toBeVisible()
  await expect(page.getByRole('note')).toContainText('Simulação')

  await entrarComo(page, /Entrar como Analista/)
  await page.goto('./#/processos/prc-001/agc')
  await expect(page.getByRole('region', { name: 'AGCs do processo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nova AGC' })).toHaveCount(0)
})
