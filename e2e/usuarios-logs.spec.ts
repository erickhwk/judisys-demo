// Telas de usuários e logs (DMO-21; PRD RF-39, RF-41 a RF-43; SDD T-23, PER-06, PER-07, LOG-03,
// LOG-04). Usa o seed; cada teste começa com o armazenamento limpo (contexto novo do Playwright).
import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo, tituloDoInicio } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const usuarios = (page: Page) =>
  page.getByRole('region', { name: 'Lista de usuários' }).locator('tbody tr')
const permissoes = (page: Page) =>
  page.getByRole('region', { name: 'Tabela de permissões' }).locator('tbody tr')
const logs = (page: Page) => page.getByRole('region', { name: 'Lista de logs' }).locator('tbody tr')

interface LogDoSeed {
  usuarioId: string
  colecao: string
  processoId?: string
  data: string
}

/** Logs do seed gerado (`pnpm seed`), com a data relativa (T-24) em dias antes de hoje. */
async function logsDoSeed(): Promise<(LogDoSeed & { diasAtras: number })[]> {
  const seed = JSON.parse(await readFile('public/seed.json', 'utf8'))
  return (seed.tabelas.logs as LogDoSeed[]).map((log) => ({
    ...log,
    diasAtras: -Number(/^@([+-]\d+)/.exec(log.data)?.[1]),
  }))
}

test('PER-06 · advogado vê usuários e a tabela de permissões, sem botões de edição', async ({
  page,
}) => {
  await entrarComo(page, 'advogado')
  await page.goto('./#/usuarios')
  await expect(page.getByRole('heading', { name: 'Usuários', level: 1 })).toBeVisible()
  await expect(usuarios(page)).toHaveCount(6)
  await expect(page.getByText('6 usuários no escritório')).toBeVisible()
  await expect(permissoes(page)).toHaveCount(9)
  await expect(permissoes(page).filter({ hasText: 'Usuários' })).toContainText(
    /Editar\s*Ler\s*Sem acesso/,
  )
  await expect(page.getByRole('button', { name: 'Novo usuário' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Excluir / })).toHaveCount(0)
})

test('RF-39 · AJ cria, edita e exclui usuário; T-23 recusa o responsável por processo', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await page.goto('./#/usuarios')
  await expect(usuarios(page)).toHaveCount(6)
  // Ninguém exclui a si mesmo: a própria linha não tem o botão.
  await expect(page.getByRole('button', { name: 'Excluir Helena Prado' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Novo usuário' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo usuário' })
  await dialogo.getByRole('button', { name: 'Cadastrar usuário' }).click()
  await expect(dialogo.getByText('Campo obrigatório').first()).toBeVisible()
  await dialogo.getByLabel('Nome').fill('Beatriz Nunes')
  await dialogo.getByLabel('E-mail').fill('beatriz@exemplo.test')
  await dialogo.getByLabel('Papel').selectOption({ label: 'Analista' })
  await dialogo.getByRole('button', { name: 'Cadastrar usuário' }).click()
  await expect(dialogo).toBeHidden()
  await expect(usuarios(page)).toHaveCount(7)
  await expect(usuarios(page).filter({ hasText: 'Beatriz Nunes' })).toContainText('Analista')

  await page.getByRole('button', { name: 'Editar Beatriz Nunes' }).click()
  const edicao = page.getByRole('dialog', { name: 'Editar usuário' })
  await expect(edicao.getByLabel('Nome')).toHaveValue('Beatriz Nunes')
  await edicao.getByLabel('Papel').selectOption({ label: 'Advogado(a)' })
  await edicao.getByRole('button', { name: 'Salvar' }).click()
  await expect(edicao).toBeHidden()
  await expect(usuarios(page).filter({ hasText: 'Beatriz Nunes' })).toContainText('Advogado(a)')

  // Responsável por processo: recusado, com os processos dele.
  await page.getByRole('button', { name: 'Excluir Otávio Reis' }).click()
  await page
    .getByRole('alertdialog', { name: 'Excluir usuário' })
    .getByRole('button', {
      name: 'Excluir',
    })
    .click()
  const recusa = page.getByRole('alertdialog', { name: 'Usuário não excluído' })
  await expect(recusa).toContainText('responsável por processos')
  await expect(
    recusa.getByRole('link', { name: 'Fundição Sapo-Cururu', exact: true }),
  ).toBeVisible()
  await recusa.getByRole('button', { name: 'Entendi' }).click()
  await expect(usuarios(page)).toHaveCount(7)

  await page.getByRole('button', { name: 'Excluir Beatriz Nunes' }).click()
  await page
    .getByRole('alertdialog', { name: 'Excluir usuário' })
    .getByRole('button', {
      name: 'Excluir',
    })
    .click()
  await expect(usuarios(page)).toHaveCount(6)
  await expect(page.getByText('Beatriz Nunes')).toHaveCount(0)
})

test('PER-07 · analista vê a tela de logs, a aba Histórico e o início', async ({ page }) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/logs')
  await expect(page.getByRole('heading', { name: 'Logs', level: 1 })).toBeVisible()
  await expect(logs(page)).toHaveCount(50)

  await page.goto('./#/processos/prc-004/historico')
  await expect(
    page.getByRole('region', { name: 'Histórico do processo' }).locator('tbody tr').first(),
  ).toBeVisible()

  await page.goto('./#/')
  await expect(tituloDoInicio(page)).toBeVisible()

  // Usuários fica fora para o analista (RF-39).
  await page.goto('./#/usuarios')
  await expect(page.getByText('Seu papel não permite esta ação')).toBeVisible()
})

test('LOG-04 · ~60 dias de histórico do seed e filtros por usuário, módulo, processo e período', async ({
  page,
}) => {
  const doSeed = await logsDoSeed()
  expect(Math.max(...doSeed.map((log) => log.diasAtras))).toBeGreaterThanOrEqual(55)

  await entrarComo(page, 'advogado')
  await page.goto('./#/logs')
  await expect(logs(page)).toHaveCount(50)
  await expect(page.getByText(`Mostrando 1–50 de ${doSeed.length}`)).toBeVisible()

  const contagem = (filtro: (log: (typeof doSeed)[number]) => boolean) =>
    doSeed.filter(filtro).length
  // Espera a lista voltar ao total antes do próximo filtro (a URL muda numa transição).
  const limpar = async () => {
    await page.getByRole('button', { name: 'Limpar busca' }).click()
    await expect(resumo(doSeed.length)).toBeVisible()
  }
  const resumo = (total: number) => page.getByText(`Mostrando 1–${Math.min(total, 50)} de ${total}`)

  await page.getByLabel('Usuário', { exact: true }).selectOption({ label: 'Marina Albuquerque' })
  const daMarina = contagem((log) => log.usuarioId === 'usr-04')
  await expect(resumo(daMarina)).toBeVisible()
  await expect(logs(page).first()).toContainText('Marina Albuquerque')

  await page
    .getByLabel('Módulo', { exact: true })
    .selectOption({ label: 'Credores e pedidos de crédito' })
  const credoresDaMarina = contagem(
    (log) => log.usuarioId === 'usr-04' && ['credores', 'pedidosDeCredito'].includes(log.colecao),
  )
  await expect(resumo(credoresDaMarina)).toBeVisible()

  await limpar()
  await page.getByLabel('Processo', { exact: true }).selectOption({ label: 'Calçados Tico-Tico' })
  await expect(resumo(contagem((log) => log.processoId === 'prc-009'))).toBeVisible()
  await expect(logs(page).first()).toContainText('Calçados Tico-Tico')

  await limpar()
  await page.getByLabel('De', { exact: true }).fill('2026-10-31')
  await expect(resumo(contagem((log) => log.diasAtras <= 7))).toBeVisible()
  await page.getByLabel('Até', { exact: true }).fill('2026-11-05')
  await expect(resumo(contagem((log) => log.diasAtras >= 2 && log.diasAtras <= 7))).toBeVisible()

  // Link para o registro que existe.
  await limpar()
  await page.getByLabel('Módulo', { exact: true }).selectOption({ label: 'Empresas' })
  await expect(logs(page)).toHaveCount(contagem((log) => log.colecao === 'empresas'))
  await logs(page).first().getByRole('link', { name: 'Abrir empresa' }).click()
  await expect(page).toHaveURL(/#\/empresas\/emp-/)
})

test('LOG-03 · registro excluído: "Registro não existe mais", sem erro', async ({ page }) => {
  const erros: string[] = []
  page.on('pageerror', (erro) => erros.push(erro.message))

  await entrarComo(page, 'aj')
  await page.goto('./#/usuarios')
  await page.getByRole('button', { name: 'Novo usuário' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo usuário' })
  await dialogo.getByLabel('Nome').fill('Usuário Temporário')
  await dialogo.getByLabel('E-mail').fill('temporario@exemplo.test')
  await dialogo.getByLabel('Papel').selectOption({ label: 'Analista' })
  await dialogo.getByRole('button', { name: 'Cadastrar usuário' }).click()
  await page.getByRole('button', { name: 'Excluir Usuário Temporário' }).click()
  await page
    .getByRole('alertdialog', { name: 'Excluir usuário' })
    .getByRole('button', {
      name: 'Excluir',
    })
    .click()
  await expect(usuarios(page)).toHaveCount(6)

  await page.goto('./#/logs?modulo=usuarios')
  await expect(logs(page)).toHaveCount(2)
  // Relógio fixo: os dois logs têm o mesmo carimbo e a ordem entre eles sai do id (UUID).
  const excluiu = logs(page).filter({ hasText: 'Excluiu usuário' })
  const criou = logs(page).filter({ hasText: 'Criou usuário' })
  await expect(excluiu).toContainText('Nome: Usuário Temporário')
  await expect(excluiu).toContainText('Registro não existe mais')
  await expect(criou).toContainText('Papel: Analista')
  await expect(criou).toContainText('Registro não existe mais')
  await expect(page.getByRole('link', { name: 'Abrir usuário' })).toHaveCount(0)
  expect(erros).toEqual([])
})

test('AJ edita o próprio nome: o menu da conta acompanha', async ({ page }) => {
  await entrarComo(page, 'aj')
  await page.goto('./#/usuarios')
  await page.getByRole('button', { name: 'Editar Helena Prado' }).click()
  const edicao = page.getByRole('dialog', { name: 'Editar usuário' })
  await edicao.getByLabel('Nome').fill('Helena Prado Souza')
  await edicao.getByRole('button', { name: 'Salvar' }).click()
  await expect(edicao).toBeHidden()
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toContainText(
    'Helena Prado Souza',
  )
})
