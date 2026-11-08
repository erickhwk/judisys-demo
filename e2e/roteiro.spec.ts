// Roteiro da demo do começo ao fim (PRD §3 e §10, SDD §10; DMO-24), num teste só, com relógio
// fixo e só dados do seed. Critério de pronto: nenhum erro no console e nenhuma requisição fora
// das permitidas (INV-09). Os detalhes de cada tela ficam nos testes do módulo (agc-votacao,
// credores, dashboard, busca); aqui se confere que o caminho inteiro anda.
import { expect, test } from '@playwright/test'
import {
  AGORA,
  abrirAgcDaLista,
  acolherImpugnacao,
  CLASSES_DO_VITRINE,
  CREDOR_IMPUGNACAO,
  entrarComo,
  instalar,
  todosDaClasse,
  vigiarConsole,
  vigiarRede,
} from './apoio'

test('roteiro do PRD §3: AJ → vitrine → credores → AGC → cram down → ata em Informes → busca, sem erro de console e sem rede fora do INV-09', async ({
  page,
  baseURL,
}) => {
  // O roteiro inteiro passa de 30 s numa máquina lenta.
  test.setTimeout(90_000)
  if (!baseURL) throw new Error('baseURL não configurada')
  await page.clock.setFixedTime(AGORA)
  const erros = vigiarConsole(page)
  const foraDoPermitido = await vigiarRede(page, baseURL)

  // 1. Entra como AJ e vê o início: carteira, passivo, prazos e a AGC da semana que vem.
  await entrarComo(page, 'aj')
  await expect(page.locator('[data-stat="processos-ativos"]')).toContainText(/\d/)
  await expect(page.locator('[data-stat="passivo"]')).toContainText('R$')
  await expect(page.getByRole('region', { name: 'Próximos prazos' }).getByRole('link')).toHaveCount(
    8,
  )
  const proximasAgcs = page.getByRole('region', { name: 'Próximas AGCs' })
  await expect(proximasAgcs.getByRole('link', { name: /Grupo Lontra Azul/ })).toContainText(
    '13/11/2026',
  )

  // 2. Abre o processo vitrine pela lista: timeline de fases e prazos.
  await page.getByRole('navigation').getByRole('link', { name: 'Processos', exact: true }).click()
  await page
    .getByRole('region', { name: 'Lista de processos' })
    .getByRole('link', { name: 'Grupo Lontra Azul', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Grupo Lontra Azul', level: 1 })).toBeVisible()
  const fases = page.getByRole('region', { name: 'Fases' })
  await expect(fases.locator('[aria-current="step"]')).toHaveCount(1)
  await expect(fases.locator('[aria-current="step"]')).toContainText('fase atual')
  await expect(page.getByRole('region', { name: 'Próximos prazos' })).toBeVisible()
  const abas = page.getByRole('navigation', { name: 'Seções do processo' })
  await abas.getByRole('link', { name: 'Prazos' }).click()
  await expect(page.getByRole('heading', { name: 'Prazos', level: 2 })).toBeVisible()

  // 3. Credores: a impugnação pendente de Isadora (SED-04); acolher muda o QGC.
  await abas.getByRole('link', { name: 'Credores' }).click()
  await page.getByRole('searchbox', { name: 'Buscar por nome ou CPF/CNPJ' }).fill('Isadora Costa')
  await page.getByRole('link', { name: CREDOR_IMPUGNACAO.nome }).click()
  await expect(page.getByRole('heading', { name: CREDOR_IMPUGNACAO.nome, level: 1 })).toBeVisible()
  await expect(page.locator('[data-valor="qgc"]')).toContainText('—')
  await acolherImpugnacao(page)

  // 4. AGC daqui a 6 dias, conduzida antes da data com o aviso (RF-31).
  // Volta ao processo pela trilha da tela do credor.
  await page
    .getByRole('navigation', { name: 'Trilha' })
    .getByRole('link', { name: 'Grupo Lontra Azul', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Grupo Lontra Azul', level: 1 })).toBeVisible()
  await abas.getByRole('link', { name: 'AGC' }).click()
  await abrirAgcDaLista(page)
  await expect(page.getByRole('note')).toContainText('Simulação: a data da AGC ainda não chegou')

  // Presença: todos de cada classe; instala em 1ª convocação.
  for (const classe of CLASSES_DO_VITRINE) await todosDaClasse(page, classe)
  await instalar(page, 1)

  // Cenário de cram down: painel do art. 45 com uma classe rejeitada e os três requisitos cumpridos.
  await page.getByRole('button', { name: 'Aprovação por cram down' }).click()
  const geral = page.locator('[data-resultado-geral]')
  await expect(geral).toHaveAttribute('data-resultado-geral', 'cram-down')
  await expect(page.locator('[data-resultado="rejeitada"]')).toHaveCount(1)
  await expect(page.locator('[data-cram-down]')).toHaveAttribute('data-cram-down', 'cumprido')

  // Registra o resultado.
  await page.getByRole('button', { name: 'Registrar resultado' }).click()
  const registrar = page.getByRole('alertdialog', { name: 'Registrar o resultado da AGC?' })
  await registrar.getByRole('button', { name: 'Registrar' }).click()
  await expect(registrar).toBeHidden()
  await expect(
    page.getByText('Resultado registrado: presença e votos ficam só leitura.'),
  ).toBeVisible()

  // A ata nos informes: resumo e o PDF genérico no visualizador (anexos/ do próprio site).
  await page.getByRole('link', { name: 'Ver a ata em Informes' }).click()
  await expect(
    page.getByRole('heading', { name: 'Ata da assembleia geral de credores', level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resumo' })).toContainText(
    'passível de cram down (art. 58, §1º)',
  )
  await page.getByRole('button', { name: 'Visualizar Ata da AGC.pdf' }).click()
  await expect(page.locator('iframe')).toBeVisible()

  // 5. Busca global (⌘K) para pular a uma empresa.
  await page.keyboard.press('Meta+k')
  const busca = page.getByRole('dialog', { name: 'Busca global' })
  await busca
    .getByRole('combobox', { name: 'Buscar processos, empresas e credores' })
    .fill('lontra azul')
  const empresa = busca.locator('[data-grupo="empresas"]').getByRole('option').first()
  const nome = (await empresa.locator('span').first().textContent()) ?? ''
  await empresa.click()
  await expect(busca).toBeHidden()
  await expect(page.getByRole('heading', { name: nome, level: 1 })).toBeVisible()

  expect(erros, 'erros no console').toEqual([])
  expect(foraDoPermitido, 'requisições fora do INV-09').toEqual([])
})
