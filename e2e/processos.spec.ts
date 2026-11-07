// Telas de processos (SDD §7.3, §7.2; DMO-12): lista, formulário, tela do processo, avançar e
// desfazer fase e exclusão. Usa só o seed; cada teste começa com o armazenamento limpo.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, digitarBusca, entrarComo, limparBuscaPendente } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

async function abrirProcesso(page: Page, apelido: string): Promise<void> {
  await page.goto('./#/processos')
  await page.getByRole('link', { name: apelido, exact: true }).click()
  await expect(page.getByRole('heading', { name: apelido, level: 1 })).toBeVisible()
}

const lista = (page: Page) => page.getByRole('region', { name: 'Lista de processos' })

test('PRC-12 · busca por apelido, número CNJ sem pontuação e razão social de empresa', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/processos')
  await expect(page.getByRole('heading', { name: 'Processos', level: 1 })).toBeVisible()
  await expect(page.getByText('12 processos cadastrados')).toBeVisible()
  const busca = page.getByRole('searchbox', { name: /Buscar por apelido/ })

  // Apelido, sem acento e sem caixa.
  await busca.fill('lontra')
  await expect(lista(page).getByRole('row')).toHaveCount(2)
  await expect(lista(page).getByRole('link', { name: 'Grupo Lontra Azul' })).toBeVisible()

  // Número CNJ só com os dígitos.
  const cnj =
    (await lista(page).getByRole('row').nth(1).getByRole('cell').nth(1).textContent()) ?? ''
  await busca.fill(cnj.replace(/\D/g, ''))
  await expect(lista(page).getByRole('row')).toHaveCount(2)
  await expect(lista(page).getByRole('link', { name: 'Grupo Lontra Azul' })).toBeVisible()

  // Razão social de uma empresa que não aparece no apelido.
  await busca.fill('armazens gerais')
  await expect(lista(page).getByRole('row')).toHaveCount(2)
  await expect(lista(page).getByRole('link', { name: 'Transportes Jabuticaba' })).toBeVisible()

  await page.getByRole('button', { name: 'Limpar busca' }).click()
  await expect(busca).toHaveValue('')
  await expect(lista(page).getByRole('row')).toHaveCount(13)
})

test('RF-11 · abas por tipo e filtro de fase', async ({ page }) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/processos')
  const tipos = page.getByRole('navigation', { name: 'Tipo de processo' })
  await tipos.getByRole('link', { name: /Falência/ }).click()
  await expect(tipos.getByRole('link', { name: /Falência/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(lista(page).getByRole('row')).toHaveCount(5)
  await page.getByRole('combobox', { name: 'Fase' }).selectOption({ label: 'Decretada' })
  await expect(lista(page).getByRole('row')).toHaveCount(2)
  await expect(lista(page).getByRole('link', { name: 'Calçados Tico-Tico' })).toBeVisible()
})

test('PRC-14 · número CNJ com dígito verificador errado mostra erro no campo', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await page.goto('./#/processos/novo')
  await page.getByRole('textbox', { name: /Número do processo/ }).fill('0001234-00.2026.8.26.0100')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText('Número CNJ inválido')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Número do processo/ })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page).toHaveURL(/#\/processos\/novo$/)
})

test('PRC-15 · RJ nova começa em "Pedido", com as empresas e o histórico', async ({ page }) => {
  await entrarComo(page, 'aj')
  await page.goto('./#/processos')
  await page.getByRole('button', { name: 'Novo processo' }).click()
  await expect(page.getByRole('heading', { name: 'Novo processo', level: 1 })).toBeVisible()

  await page.getByRole('textbox', { name: /Apelido/ }).fill('Grupo Teste E2E')
  await page.getByRole('textbox', { name: /Número do processo/ }).fill('0001234-03.2026.8.26.0100')
  await expect(page.getByLabel(/Data do pedido/)).toHaveValue('2026-11-07')
  await page.getByLabel(/Data do pedido/).fill('2026-11-02')
  await page.getByRole('textbox', { name: /Vara/ }).fill('1ª Vara Empresarial')
  await page.getByRole('textbox', { name: /Passivo declarado/ }).fill('1.500.000,00')
  await page.getByRole('textbox', { name: /Comarca/ }).fill('Campinas')
  await page.getByRole('combobox', { name: /UF/ }).selectOption('SP')
  const empresas = page.getByRole('searchbox', { name: /Empresas relacionadas/ })
  await empresas.fill('tatu-bola mineracao')
  // Enter na busca adiciona a primeira sugestão, sem enviar o formulário.
  await empresas.press('Enter')
  await expect(page.getByRole('heading', { name: 'Novo processo', level: 1 })).toBeVisible()
  await expect(empresas).toHaveValue('')
  await expect(
    page.getByRole('button', { name: 'Remover Tatu-Bola Mineração Ltda.' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Salvar' }).click()

  await expect(page.getByRole('heading', { name: 'Grupo Teste E2E', level: 1 })).toBeVisible()
  await expect(page).toHaveURL(/#\/processos\/[^/]+\/visao-geral$/)
  const resumo = page.getByLabel('Resumo do processo')
  await expect(resumo).toContainText('0001234-03.2026.8.26.0100')
  await expect(resumo).toContainText('Recuperação judicial')
  await expect(resumo).toContainText('Pedido')
  await expect(resumo).toContainText('Helena')
  const fases = page.getByRole('list').filter({ hasText: 'Processamento deferido' }).first()
  await expect(fases.locator('[aria-current="step"]')).toContainText('Pedido')
  await expect(fases.locator('[aria-current="step"]')).toContainText('02/11/2026')
  // Sem "Desfazer": o primeiro marco é a criação (PRC-11).
  await expect(page.getByRole('button', { name: 'Desfazer fase' })).toHaveCount(0)

  await page
    .getByRole('navigation', { name: 'Seções do processo' })
    .getByRole('link', { name: 'Empresas' })
    .click()
  await expect(page.getByRole('link', { name: 'Tatu-Bola Mineração Ltda.' })).toHaveAttribute(
    'href',
    /#\/empresas\/.+/,
  )

  await page
    .getByRole('navigation', { name: 'Seções do processo' })
    .getByRole('link', { name: 'Histórico' })
    .click()
  const historico = page.getByRole('region', { name: 'Histórico do processo' })
  // Dados e empresas da criação aparecem como 'Criou processo', sem edição que o usuário não fez.
  await expect(historico.getByText('Criou processo')).toHaveCount(2)
  await expect(historico.getByText('Editou processo')).toHaveCount(0)
  await expect(historico.getByText('Criou marco de fase')).toBeVisible()
  await expect(historico.getByText('Tatu-Bola Mineração Ltda.')).toBeVisible()
})

test('RF-15 · avançar fase cria os prazos; desfazer lista os prazos que saem', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await abrirProcesso(page, 'Cerâmica Tatu-Bola')

  await page.getByRole('button', { name: 'Avançar fase' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Avançar fase' })
  // Só fases posteriores (T-27): "Pedido" não é oferecida.
  const opcoes = dialogo.getByRole('combobox', { name: /Próxima fase/ }).locator('option')
  await expect(opcoes.first()).toHaveText('Processamento deferido')
  await expect(opcoes.filter({ hasText: /^Pedido$/ })).toHaveCount(0)
  // PRC-08: data anterior ao último marco.
  await dialogo.getByLabel(/Data do marco/).fill('2026-10-01')
  await dialogo.getByRole('button', { name: 'Avançar' }).click()
  await expect(dialogo.getByText('A data não pode ser anterior ao último marco.')).toBeVisible()
  await dialogo.getByLabel(/Data do marco/).fill('2026-11-07')
  await dialogo.getByRole('button', { name: 'Avançar' }).click()
  await expect(dialogo).toBeHidden()

  await expect(
    page.getByLabel('Resumo do processo').getByText('Processamento deferido'),
  ).toBeVisible()
  const prazos = page.getByRole('region', { name: 'Próximos prazos' })
  await expect(prazos.getByText('Stay period')).toBeVisible()
  await expect(prazos.getByText('Relatório mensal de atividades (RMA)')).toBeVisible()

  await page.getByRole('button', { name: 'Desfazer fase' }).click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Desfazer “Processamento deferido”?' })
  await expect(confirmacao).toContainText(
    'Serão removidos 4 prazos abertos: Relatório mensal de atividades (RMA), Apresentação do plano, Realização da AGC, Stay period.',
  )
  await expect(confirmacao).toContainText('a fase volta para “Pedido”')
  await confirmacao.getByRole('button', { name: 'Desfazer' }).click()
  await expect(confirmacao).toBeHidden()
  await expect(
    page.getByLabel('Resumo do processo').getByText('Pedido', { exact: true }),
  ).toBeVisible()
  await expect(prazos.getByText('Nenhum prazo aberto')).toBeVisible()
})

test('PRC-13 · excluir processo mostra o que sai em cascata e o tira da lista', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await abrirProcesso(page, 'Calçados Tico-Tico')
  await page.getByRole('button', { name: 'Excluir' }).click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Excluir “Calçados Tico-Tico”?' })
  await expect(confirmacao).toContainText('3 vínculos com empresas')
  await expect(confirmacao).toContainText(/\d+ credor/)
  await confirmacao.getByRole('button', { name: 'Excluir processo' }).click()

  await expect(page).toHaveURL(/#\/processos$/)
  await expect(page.getByText('11 processos cadastrados')).toBeVisible()
  await expect(lista(page).getByRole('link', { name: 'Calçados Tico-Tico' })).toHaveCount(0)
})

test('PER-03 · analista não vê botões de criar, editar, excluir, avançar ou desfazer fase', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/processos')
  await expect(lista(page).getByRole('link', { name: 'Grupo Lontra Azul' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo processo' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Excluir / })).toHaveCount(0)

  await abrirProcesso(page, 'Grupo Lontra Azul')
  for (const nome of ['Avançar fase', 'Desfazer fase', 'Editar', 'Excluir']) {
    await expect(page.getByRole('button', { name: nome }), nome).toHaveCount(0)
  }
  // As abas de consulta continuam abertas, inclusive o Histórico (PER-07).
  const abas = page.getByRole('navigation', { name: 'Seções do processo' })
  await abas.getByRole('link', { name: 'Histórico' }).click()
  await expect(page.getByRole('region', { name: 'Histórico do processo' })).toBeVisible()
})

test('RF-13 · a aba AGC só existe na RJ', async ({ page }) => {
  await entrarComo(page, 'advogado')
  await abrirProcesso(page, 'Grupo Lontra Azul')
  const abas = page.getByRole('navigation', { name: 'Seções do processo' })
  await expect(abas.getByRole('link')).toHaveText([
    'Visão geral',
    'Empresas',
    'Credores',
    'Prazos',
    'AGC',
    'Informes',
    'Histórico',
  ])
  await abrirProcesso(page, 'Gráfica Beija-Flor')
  await expect(abas.getByRole('link', { name: 'AGC' })).toHaveCount(0)
  await page.goto(page.url().replace('visao-geral', 'agc'))
  await expect(page.getByText('A AGC só existe na recuperação judicial.')).toBeVisible()
})

test('editar processo: os dados salvos voltam no formulário e a mudança vai ao histórico', async ({
  page,
}) => {
  await entrarComo(page, 'aj')
  await abrirProcesso(page, 'Gráfica Beija-Flor')
  await page.getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByRole('heading', { name: 'Editar processo', level: 1 })).toBeVisible()
  const apelido = page.getByRole('textbox', { name: /Apelido/ })
  await expect(apelido).toHaveValue('Gráfica Beija-Flor')
  await apelido.fill('Gráfica Beija-Flor Renomeada')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(
    page.getByRole('heading', { name: 'Gráfica Beija-Flor Renomeada', level: 1 }),
  ).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Seções do processo' })
    .getByRole('link', { name: 'Histórico' })
    .click()
  await expect(
    page
      .getByRole('region', { name: 'Histórico do processo' })
      .getByText('Gráfica Beija-Flor Renomeada'),
  ).toBeVisible()
})

test('AJ-12 · digitação rápida na busca de Processos não perde caracteres; a URL guarda o filtro', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  await page.goto('./#/processos')
  await expect(page.getByText('12 processos cadastrados')).toBeVisible()
  const busca = page.getByRole('searchbox', { name: /Buscar por apelido/ })
  const lontra = lista(page).getByRole('link', { name: 'Grupo Lontra Azul' })

  await digitarBusca(page, busca, 'Grupo Lontra Azul')
  await expect(lista(page).getByRole('row')).toHaveCount(2)
  await expect(lontra).toBeVisible()

  // Atualizar a página mantém o filtro.
  await page.reload()
  await expect(busca).toHaveValue('Grupo Lontra Azul')
  await expect(lista(page).getByRole('row')).toHaveCount(2)

  // Ir ao processo e voltar também.
  await lontra.click()
  await expect(page.getByRole('heading', { name: 'Grupo Lontra Azul', level: 1 })).toBeVisible()
  await page.goBack()
  await expect(busca).toHaveValue('Grupo Lontra Azul')
  await expect(lista(page).getByRole('row')).toHaveCount(2)

  // Trocar o texto rápido também chega à URL; "Limpar busca" com texto pendente esvazia tudo.
  await digitarBusca(page, busca, 'armazens gerais')
  await expect(lista(page).getByRole('link', { name: 'Transportes Jabuticaba' })).toBeVisible()
  await limparBuscaPendente(page, busca)
  await expect(lista(page).getByRole('row')).toHaveCount(13)
})
