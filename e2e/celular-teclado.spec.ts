// Celular e teclado (DMO-23; D-13, RNF-01): o roteiro da seção 3 do PRD feito em 390×844 só com o
// teclado. Cada passo chega ao controle com Tab (ou Shift+Tab) e o aciona com Enter ou Espaço, sem
// clique. A cada parada do foco, o controle precisa estar na janela e com o foco visível (contorno
// ou anel); o que falhar entra na lista do fim do teste.
// A rolagem horizontal da página no celular é conferida pela guarda de `rolagem.spec.ts` (AJ-02).
import { expect, type Locator, type Page, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

/** Paradas do foco sem contorno visível ou fora da janela, para o relatório do fim. */
type Falhas = string[]

/** Descreve e confere o elemento com foco: visível na janela e com o foco desenhado. */
async function conferirFoco(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el || el === document.body) return null
    const regiao = el.parentElement?.closest('[aria-label]')?.getAttribute('aria-label')
    const nome = `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 50)}" (${regiao ?? location.hash})`
    const r = el.getBoundingClientRect()
    const naJanela =
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < window.innerHeight &&
      r.left < window.innerWidth
    if (!naJanela) return `${nome} fora da janela: ${Math.round(r.left)},${Math.round(r.top)}`
    // O foco pode ser desenhado no próprio controle ou no rótulo/opção que o envolve (rádios).
    const desenhado = (alvo: Element | null) => {
      if (!alvo) return false
      const estilo = getComputedStyle(alvo)
      const contorno = estilo.outlineStyle !== 'none' && Number.parseFloat(estilo.outlineWidth) > 0
      // Sombra só conta como anel (deslocamento 0 e espalhamento), não a sombra comum de card.
      const anel = /0px 0px 0px [1-9]/.test(estilo.boxShadow)
      return contorno || anel
    }
    if (desenhado(el) || desenhado(el.closest('label')) || desenhado(el.parentElement)) return null
    return `${nome} sem foco visível`
  })
}

/**
 * Tab até o `alvo` ter o foco (no máximo `limite` paradas), conferindo cada parada no caminho.
 * O alvo precisa ser alcançável pelo teclado: se não for, o teste falha aqui.
 */
async function tabAte(
  page: Page,
  alvo: Locator,
  falhas: Falhas,
  { limite = 120, voltar = false }: { limite?: number; voltar?: boolean } = {},
): Promise<void> {
  const elemento = alvo.first()
  await expect(elemento).toBeAttached()
  for (let i = 0; i < limite; i++) {
    await page.keyboard.press(voltar ? 'Shift+Tab' : 'Tab')
    const falha = await conferirFoco(page)
    if (falha && !falhas.includes(falha)) falhas.push(falha)
    if (await elemento.evaluate((el) => el === document.activeElement)) return
  }
  throw new Error(`não chegou com Tab a ${elemento} em ${limite} paradas`)
}

async function entrarPeloTeclado(page: Page, falhas: Falhas): Promise<void> {
  await page.goto('./#/entrar')
  await tabAte(page, page.getByRole('button', { name: /Entrar como Administrador/ }), falhas)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

/** Abre a gaveta do menu pelo teclado e escolhe um item. */
async function irPeloMenu(page: Page, item: string, falhas: Falhas): Promise<void> {
  const abrir = page.getByRole('button', { name: 'Abrir menu' })
  await page.keyboard.press('Escape')
  await tabAte(page, abrir, falhas, { voltar: true, limite: 400 })
  await page.keyboard.press('Enter')
  const menu = page.getByRole('complementary', { name: 'Menu' })
  // O foco entra no primeiro link da gaveta.
  await expect(menu.getByRole('link').first()).toBeFocused()
  // A gaveta desliza por 0,2 s: as paradas seguintes são conferidas com ela já na janela.
  await expect.poll(async () => (await menu.boundingBox())?.x).toBe(0)
  await tabAte(page, menu.getByRole('link', { name: item, exact: true }), falhas, { limite: 10 })
  await page.keyboard.press('Enter')
  await expect(abrir).toHaveAttribute('aria-expanded', 'false')
}

test('CEL-01 · roteiro da seção 3 do PRD no celular, só com o teclado', async ({ page }) => {
  test.setTimeout(180_000)
  const falhas: Falhas = []

  // 1. Entra como AJ e vê o dashboard.
  await entrarPeloTeclado(page, falhas)
  for (const indicador of [/Processos ativos/i, /Passivo sob administração/i, /Prazos/i]) {
    await expect(page.locator('main').getByText(indicador).first()).toBeVisible()
  }
  await expect(page.locator('main').getByText(/AGC/).first()).toBeVisible()

  // 2. Processo vitrine pelo menu (gaveta) e a linha do tempo com os prazos.
  await irPeloMenu(page, 'Processos', falhas)
  await expect(page.getByRole('heading', { name: 'Processos', level: 1 })).toBeVisible()
  await tabAte(page, page.getByRole('link', { name: 'Grupo Lontra Azul', exact: true }), falhas)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Grupo Lontra Azul', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Fases' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Próximos prazos' })).toBeVisible()

  // 3. Credores: busca o credor com impugnação pendente e acolhe a impugnação.
  const abas = page.getByRole('navigation', { name: 'Seções do processo' })
  await tabAte(page, abas.getByRole('link', { name: 'Credores' }), falhas)
  await page.keyboard.press('Enter')
  const buscaCredores = page.getByRole('searchbox', { name: 'Buscar por nome ou CPF/CNPJ' })
  await tabAte(page, buscaCredores.or(page.getByLabel('Buscar por nome ou CPF/CNPJ')), falhas, {
    limite: 60,
  })
  await page.keyboard.type('Isadora Costa', { delay: 80 })
  const isadora = page.getByRole('link', { name: 'Isadora Costa Batista' })
  // A coluna do nome não encolhe a ponto de quebrar letra a letra (Tabela, DMO-23): até duas linhas.
  await expect(isadora).toBeVisible()
  expect((await isadora.boundingBox())?.height ?? 999).toBeLessThan(50)
  await tabAte(page, isadora, falhas)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Isadora Costa Batista', level: 1 })).toBeVisible()
  const pedidos = page.getByRole('region', { name: /Pedidos de crédito de Isadora/ })
  await tabAte(page, pedidos.getByRole('button', { name: /^Acolher impugnação/ }), falhas)
  await page.keyboard.press('Enter')
  const acolher = page.getByRole('alertdialog', { name: 'Acolher o pedido?' })
  await expect(acolher).toBeVisible()
  await tabAte(page, acolher.getByRole('button', { name: 'Acolher' }), falhas, { limite: 6 })
  await page.keyboard.press('Enter')
  await expect(acolher).toBeHidden()
  await expect(page.locator('[data-valor="qgc"]')).toContainText('R$ 65.203,58')

  // 4. AGC: presença por classe, instalação, cenário de cram down, resultado e a ata.
  await tabAte(page, page.getByRole('link', { name: 'Grupo Lontra Azul' }), falhas, {
    voltar: true,
    limite: 60,
  })
  await page.keyboard.press('Enter')
  await tabAte(page, abas.getByRole('link', { name: 'AGC' }), falhas)
  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('link', { name: '13/11/2026' }), falhas)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'AGC de 13/11/2026', level: 1 })).toBeVisible()
  // Defeito conhecido da instalação: "Trabalhi/sta" quebrava no meio da palavra no celular.
  for (const classe of ['trabalhista', 'quirografario']) {
    const celula = page.locator(`[data-classe="${classe}"]`).first()
    expect((await celula.boundingBox())?.height ?? 999, classe).toBeLessThan(30)
  }
  for (const classe of [
    'I · Trabalhista',
    'II · Garantia real',
    'III · Quirografário',
    'IV · ME/EPP',
  ]) {
    await tabAte(page, page.getByRole('button', { name: `Todos da classe ${classe}` }), falhas)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: `Desmarcar classe ${classe}` })).toBeVisible()
  }
  await tabAte(page, page.getByRole('button', { name: 'Instalar em 1ª convocação' }), falhas)
  await page.keyboard.press('Enter')
  const instalar = page.getByRole('alertdialog', { name: 'Instalar a AGC em 1ª convocação?' })
  await tabAte(page, instalar.getByRole('button', { name: 'Instalar' }), falhas, { limite: 6 })
  await page.keyboard.press('Enter')
  await expect(page.getByText('Instalada em 1ª convocação')).toBeVisible()

  await tabAte(page, page.getByRole('button', { name: 'Aprovação por cram down' }), falhas, {
    limite: 400,
  })
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-resultado-geral]')).toHaveAttribute(
    'data-resultado-geral',
    'cram-down',
  )
  await expect(page.locator('[data-cram-down]')).toHaveAttribute('data-cram-down', 'cumprido')
  await tabAte(page, page.getByRole('button', { name: 'Registrar resultado' }), falhas, {
    limite: 400,
  })
  await page.keyboard.press('Enter')
  const registrar = page.getByRole('alertdialog', { name: 'Registrar o resultado da AGC?' })
  await tabAte(page, registrar.getByRole('button', { name: 'Registrar' }), falhas, { limite: 6 })
  await page.keyboard.press('Enter')
  await expect(registrar).toBeHidden()
  const ata = page.getByRole('link', { name: 'Ver a ata em Informes' })
  await tabAte(page, ata, falhas, { limite: 400 })
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { name: 'Ata da assembleia geral de credores', level: 1 }),
  ).toBeVisible()

  // 5. Busca global pelo atalho: pula para um credor.
  await page.keyboard.press('Control+k')
  const busca = page.getByRole('dialog', { name: 'Busca global' })
  await expect(busca.getByRole('combobox')).toBeFocused()
  await page.keyboard.type('Maria Helena Silva')
  await expect(busca.locator('[data-grupo="credores"]').getByRole('option').first()).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Maria Helena Silva', level: 1 })).toBeVisible()

  expect(falhas, 'paradas do foco com problema').toEqual([])
})

test('CEL-02 · gaveta do menu: Esc fecha e devolve o foco ao botão; o menu fechado não recebe foco', async ({
  page,
}) => {
  const falhas: Falhas = []
  await entrarPeloTeclado(page, falhas)
  const abrir = page.getByRole('button', { name: 'Abrir menu' })
  await tabAte(page, abrir, falhas, { limite: 20 })
  await page.keyboard.press('Enter')
  const menu = page.getByRole('complementary', { name: 'Menu' })
  await expect(menu.getByRole('link').first()).toBeFocused()
  // Aberta, o resto da tela fica inerte: o Tab não sai do menu para trás do fundo escuro.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    const fora = await page.evaluate(() => {
      const ativo = document.activeElement
      const gaveta = document.querySelector('aside[aria-label="Menu"]')
      return ativo && ativo !== document.body && !gaveta?.contains(ativo) ? ativo.outerHTML : null
    })
    expect(fora, 'foco fora da gaveta aberta').toBeNull()
  }
  await page.keyboard.press('Escape')
  await expect(abrir).toBeFocused()
  await expect(abrir).toHaveAttribute('aria-expanded', 'false')

  // Fechada, a gaveta fica fora da ordem do Tab: o foco nunca para num link dela. (Escondida, ela sai
  // da árvore de acessibilidade, e o `getByRole` não a acha mais.)
  const gaveta = page.locator('aside[aria-label="Menu"]')
  // Ela some no fim da transição de 0,2 s (com movimento reduzido, na hora).
  await expect(gaveta).toBeHidden()
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    expect(await gaveta.evaluate((el) => el.contains(document.activeElement))).toBe(false)
  }
  expect(falhas).toEqual([])
})

test('CEL-03 · diálogos no celular: o foco entra, Esc fecha e volta ao botão que abriu', async ({
  page,
}) => {
  const falhas: Falhas = []
  await entrarPeloTeclado(page, falhas)
  await page.goto('./#/processos/prc-001/credores/crd-0001')
  const registrar = page.getByRole('button', { name: 'Registrar pedido' })
  await tabAte(page, registrar, falhas, { limite: 40 })
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: /Pedido de crédito de Maria Helena Silva/ })
  await expect(dialogo).toBeVisible()
  expect(await dialogo.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  // O diálogo cabe na largura do celular.
  const caixa = await dialogo.boundingBox()
  expect(caixa?.x ?? -1).toBeGreaterThanOrEqual(0)
  expect((caixa?.x ?? 0) + (caixa?.width ?? 999)).toBeLessThanOrEqual(390)
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  await expect(registrar).toBeFocused()
  expect(falhas).toEqual([])
})

/** Entra pelo teclado e abre a gaveta do menu; devolve o botão que a abre. */
async function abrirGaveta(page: Page): Promise<Locator> {
  const falhas: Falhas = []
  await entrarPeloTeclado(page, falhas)
  const abrir = page.getByRole('button', { name: 'Abrir menu' })
  await tabAte(page, abrir, falhas, { limite: 20 })
  await page.keyboard.press('Enter')
  await expect(abrir).toHaveAttribute('aria-expanded', 'true')
  expect(falhas).toEqual([])
  return abrir
}

test('CEL-04 · gaveta aberta: Ctrl+K fecha a gaveta e a busca recebe o foco e a digitação', async ({
  page,
}) => {
  const abrir = await abrirGaveta(page)
  await page.keyboard.press('Control+k')
  await expect(abrir).toHaveAttribute('aria-expanded', 'false')
  const campo = page.getByRole('dialog', { name: 'Busca global' }).getByRole('combobox')
  await expect(campo).toBeFocused()
  await page.keyboard.type('Maria Helena')
  await expect(campo).toHaveValue('Maria Helena')
})

test('CEL-05 · gaveta aberta e a tela alarga (giro do tablet): a gaveta fecha e nada fica inerte', async ({
  page,
}) => {
  await abrirGaveta(page)
  await page.setViewportSize({ width: 1280, height: 800 })
  // No computador o botão fica escondido e sai da árvore de acessibilidade: localizado pelo atributo.
  await expect(page.locator('button[aria-label="Abrir menu"]')).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(page.locator('[inert]')).toHaveCount(0)
})
