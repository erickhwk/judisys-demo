// AGC: votação, painel do art. 45, cram down e registro do resultado (SDD §7.6; DMO-17) com o seed
// da demo. O processo vitrine (prc-001) tem uma AGC agendada para daqui a 6 dias (SED-04).
import { expect, type Page, test } from '@playwright/test'
import { AGORA, abrirAgcDoVitrine, entrarComo, instalar, todosDaClasse } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const resultadoGeral = (page: Page) => page.locator('[data-resultado-geral]')

test('AGC-19, AGC-21, AGC-22 · roteiro: cram down na tela, registrar cria a ata, AGC encerrada só leitura', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await abrirAgcDoVitrine(page)
  for (const classe of [
    'I · Trabalhista',
    'II · Garantia real',
    'III · Quirografário',
    'IV · ME/EPP',
  ]) {
    await todosDaClasse(page, classe)
  }
  await instalar(page, 1)

  // T-33: sem votos, o registro fica bloqueado com o aviso no painel.
  const registrar = page.getByRole('button', { name: 'Registrar resultado' })
  await expect(registrar).toBeDisabled()
  await expect(
    page.getByRole('status').filter({ hasText: /^Falta o voto de \d+ presentes/ }),
  ).toBeVisible()

  // AGC-19: cenário de cram down preenche os votos; uma classe rejeita e os três requisitos fecham.
  await page.getByRole('button', { name: 'Aprovação por cram down' }).click()
  await expect(resultadoGeral(page)).toHaveAttribute('data-resultado-geral', 'cram-down')
  await expect(resultadoGeral(page)).toContainText('Passível de cram down')
  await expect(page.locator('[data-resultado="rejeitada"]')).toHaveCount(1)
  const cramDown = page.locator('[data-cram-down]')
  await expect(cramDown).toHaveAttribute('data-cram-down', 'cumprido')
  await expect(cramDown.locator('[data-cumprido="true"]')).toHaveCount(3)
  await expect(page.getByText(/Falta o voto/)).toHaveCount(0)

  // AGC-21: registrar → confirmar.
  await expect(registrar).toBeEnabled()
  await registrar.click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Registrar o resultado da AGC?' })
  await expect(confirmacao).toContainText('passível de cram down')
  await confirmacao.getByRole('button', { name: 'Registrar' }).click()
  await expect(confirmacao).toBeHidden()

  // AGC-22: encerrada, só leitura.
  await expect(
    page.getByText('Resultado registrado: presença e votos ficam só leitura.'),
  ).toBeVisible()
  await expect(page.getByText('Encerrada', { exact: true }).first()).toBeVisible()
  await expect(registrar).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aprovação por cram down' })).toHaveCount(0)
  const mesa = page.getByRole('region', { name: 'Votos dos presentes' })
  await expect(mesa.getByRole('radio').first()).toBeDisabled()
  const lista = page.getByRole('region', { name: 'Lista de presença', exact: true })
  await expect(lista.getByRole('checkbox').first()).toBeDisabled()
  await expect(resultadoGeral(page)).toHaveAttribute('data-resultado-geral', 'cram-down')

  // A ata em Informes, com o resumo acima do PDF genérico (T-30).
  await page.getByRole('link', { name: 'Ver a ata em Informes' }).click()
  await expect(
    page.getByRole('heading', { name: 'Ata da assembleia geral de credores', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('Atas de AGC').first()).toBeVisible()
  const resumo = page.getByRole('region', { name: 'Resumo' })
  await expect(resumo).toContainText('AGC de 13/11/2026, instalada em 1ª convocação.')
  await expect(resumo).toContainText('III · Quirografário: rejeitada')
  await expect(resumo).toContainText('passível de cram down (art. 58, §1º)')
  await expect(resumo).toContainText('Cram down (art. 58, §1º):')
  await expect(page.getByRole('button', { name: 'Visualizar Ata da AGC.pdf' })).toBeVisible()
})

test('AGC-20 · cenário de cram down com uma única classe presente mostra a mensagem e não muda nada', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await abrirAgcDoVitrine(page)
  await todosDaClasse(page, 'I · Trabalhista')
  await instalar(page, 2)

  const mesa = page.getByRole('region', { name: 'Votos dos presentes' })
  const topo = page.getByText(/^0 de \d+ presentes com voto lançado$/)
  await expect(topo).toBeVisible()
  await page.getByRole('button', { name: 'Aprovação por cram down' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Este cenário não é possível com as presenças atuais',
  )
  await expect(topo).toBeVisible()
  await expect(mesa.getByRole('radio', { checked: true })).toHaveCount(0)

  // Voto manual some com o aviso e conta no painel.
  await mesa.getByRole('radio', { name: 'Sim' }).first().check()
  await expect(page.getByText(/^1 de \d+ presentes com voto lançado$/)).toBeVisible()
  await expect(page.getByText('Este cenário não é possível com as presenças atuais')).toHaveCount(0)
  await expect(page.locator('[data-classe="trabalhista"][data-resultado="aprovada"]')).toBeVisible()
})

test('AGC-23 · AGC não instalada: "Registrar resultado" desabilitado com o motivo', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await abrirAgcDoVitrine(page)
  await expect(page.getByText('A votação abre depois da instalação')).toBeVisible()
  const registrar = page.getByRole('button', { name: 'Registrar resultado' })
  await expect(registrar).toBeDisabled()
  await expect(registrar).toHaveAccessibleDescription(/Instale a AGC para abrir a votação/)
})
