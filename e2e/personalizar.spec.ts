// Personalizar o início no navegador (SDD-INI §7.5, PRS-01 a PRS-14): faixa, catálogo, ×, arrastar
// com o mouse (com passos, depois de a tela parar de carregar, SDD §10), recusa e persistência. As
// regras puras do arrasto (coluna pelo ponteiro, recusa, empurrão) estão em arrasto.test.ts.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo, tituloDoInicio } from './apoio'

interface Item {
  quadro: string
  x: number
  y: number
}

/** Padrão do advogado (RF-17), na ordem de leitura. */
const PADRAO_ADVOGADO: Item[] = [
  { quadro: 'prazos', x: 0, y: 0 },
  { quadro: 'agc', x: 1, y: 0 },
  { quadro: 'proximos', x: 2, y: 0 },
  { quadro: 'calendario', x: 3, y: 0 },
  { quadro: 'publicados', x: 0, y: 1 },
  { quadro: 'passivo', x: 0, y: 2 },
  { quadro: 'classes', x: 2, y: 2 },
  { quadro: 'carteira', x: 0, y: 3 },
]

const ordenar = (itens: Item[]) => [...itens].sort((a, b) => a.y - b.y || a.x - b.x)

test.use({ viewport: { width: 1440, height: 1400 } })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
  await entrarComo(page, 'advogado')
  await expect(page.locator('[data-resumo]')).toBeVisible()
})

const faixa = (page: Page) => page.getByRole('region', { name: 'Personalizar o início' })
const botao = (page: Page, nome: string) => page.getByRole('button', { name: nome, exact: true })

async function chave(page: Page): Promise<string> {
  const id = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem('judisys:sessao') ?? '{}').usuarioId as string,
  )
  return `judisys:inicio:${id}`
}

/** A montagem gravada no localStorage, ou `null`. */
async function gravada(page: Page): Promise<Item[] | null> {
  const nome = await chave(page)
  const texto = await page.evaluate((k) => localStorage.getItem(k), nome)
  return texto ? (JSON.parse(texto).itens as Item[]) : null
}

/** Grava uma montagem como se fosse um Concluir anterior e recarrega o início. */
async function montar(page: Page, itens: Item[]): Promise<void> {
  const nome = await chave(page)
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [
    nome,
    JSON.stringify({ versao: 1, itens }),
  ] as const)
  await page.reload()
  await expect(tituloDoInicio(page)).toBeVisible()
  await expect(page.locator('[data-resumo]')).toBeVisible()
}

/** Posições na tela, lidas das células da grade, em ordem de leitura. */
async function posicoes(page: Page): Promise<Item[]> {
  const itens = await page.locator('[data-celula]').evaluateAll((celulas) =>
    celulas.map((c) => ({
      quadro: c.getAttribute('data-celula') ?? '',
      x: Number(c.getAttribute('data-x')),
      y: Number(c.getAttribute('data-y')),
    })),
  )
  return ordenar(itens)
}

async function personalizar(page: Page): Promise<void> {
  await botao(page, 'Personalizar').click()
  await expect(faixa(page)).toBeVisible()
}

/**
 * Pega o quadro pela alça e leva o canto dele até a célula (x, y). A coluna pode ficar fora do
 * grid, para a recusa. Sem `soltar`, deixa o botão do mouse apertado.
 */
async function arrastar(page: Page, quadro: string, x: number, y: number, soltar = true) {
  const caixaGrade = await page.locator('[data-colunas="4"]').boundingBox()
  const caixaCelula = await page.locator(`[data-celula="${quadro}"]`).boundingBox()
  const caixaAlca = await page.locator(`[data-celula="${quadro}"] [data-alca]`).boundingBox()
  if (!caixaGrade || !caixaCelula || !caixaAlca) throw new Error(`sem a alça de ${quadro}`)
  const unidade = (caixaGrade.width - 3 * 16) / 4
  const origemX = caixaAlca.x + caixaAlca.width / 2
  const origemY = caixaAlca.y + caixaAlca.height / 2
  const destinoX = caixaGrade.x + x * (unidade + 16) + (origemX - caixaCelula.x)
  const destinoY = caixaGrade.y + y * (176 + 16) + (origemY - caixaCelula.y)
  await page.mouse.move(origemX, origemY)
  await page.mouse.down()
  await page.mouse.move(destinoX, destinoY, { steps: 10 })
  if (soltar) await page.mouse.up()
}

test('PRS-01 · Personalizar: faixa, catálogo com tamanhos, guias, alça e ×, links desligados', async ({
  page,
}) => {
  await personalizar(page)
  await expect(faixa(page)).toContainText('Personalizando o início.')
  for (const nome of ['Restaurar padrão', 'Cancelar', 'Concluir']) {
    await expect(faixa(page).getByRole('button', { name: nome })).toBeVisible()
  }
  const catalogo = faixa(page).getByRole('list', { name: 'Catálogo:' }).getByRole('button')
  await expect(catalogo).toHaveText([
    /Pedidos de crédito.*1×1/,
    /Atividade recente.*1×2/,
    /Últimos informes.*1×2/,
    /Prazos cumpridos.*2×1/,
  ])
  // Guias até a base da montagem mais uma linha: 5 linhas de 4 células.
  await expect(page.locator('[data-guia]')).toHaveCount(20)
  await expect(page.locator('[data-alca]')).toHaveCount(8)
  await expect(page.getByRole('button', { name: /^Tirar .* do início$/ })).toHaveCount(8)
  await expect(page.locator('[data-colunas] a')).toHaveCount(0)
  await expect(botao(page, 'Personalizar')).toHaveCount(0)
})

test('PRS-02 · arrastar para lugar livre: o quadro vai para lá e nada mais se move', async ({
  page,
}) => {
  const semCarteira = PADRAO_ADVOGADO.filter((i) => i.quadro !== 'carteira')
  await montar(page, semCarteira)
  await personalizar(page)
  // O caminho passa por cima de Informes publicados e do Passivo: nenhum deles fica empurrado.
  await arrastar(page, 'prazos', 2, 3)
  expect(await posicoes(page)).toEqual(
    ordenar([
      ...semCarteira.filter((i) => i.quadro !== 'prazos'),
      { quadro: 'prazos', x: 2, y: 3 },
    ]),
  )
})

test('PRS-03 · arrastar sobre outro quadro empurra o outro para baixo', async ({ page }) => {
  await personalizar(page)
  await arrastar(page, 'prazos', 1, 0)
  const depois = await posicoes(page)
  expect(depois).toContainEqual({ quadro: 'prazos', x: 1, y: 0 })
  expect(depois).toContainEqual({ quadro: 'agc', x: 1, y: 1 })
  // Quem não estava no caminho fica.
  expect(depois).toContainEqual({ quadro: 'proximos', x: 2, y: 0 })
  expect(depois).toContainEqual({ quadro: 'calendario', x: 3, y: 0 })
})

test('PRS-04 · recusa: sombra vermelha cortada na borda, aviso e volta ao soltar', async ({
  page,
}) => {
  await personalizar(page)
  const antes = await posicoes(page)
  await arrastar(page, 'passivo', 3, 2, false)
  const status = page.locator('[data-colunas="4"]').getByRole('status')
  await expect(status).toHaveText('Não cabe aqui: este quadro ocupa 2 colunas.')
  const sombra = page.locator('[data-recusa]')
  await expect(sombra).toBeVisible()
  const caixaSombra = await sombra.boundingBox()
  const caixaGrade = await page.locator('[data-colunas="4"]').boundingBox()
  if (!caixaSombra || !caixaGrade) throw new Error('sem a sombra')
  // Cortada na borda: só a 4ª coluna, sem passar da direita do grid.
  expect(caixaSombra.x + caixaSombra.width).toBeCloseTo(caixaGrade.x + caixaGrade.width, 0)
  expect(caixaSombra.width).toBeCloseTo((caixaGrade.width - 48) / 4, 0)
  await page.mouse.up()
  await expect(sombra).toHaveCount(0)
  await expect(status).toHaveText('')
  expect(await posicoes(page)).toEqual(antes)
})

test('PRS-05/PRS-07 · × tira o quadro e o devolve ao catálogo; o catálogo põe no primeiro lugar livre', async ({
  page,
}) => {
  await personalizar(page)
  await botao(page, 'Tirar Carteira por fase do início').click()
  await expect(page.getByRole('region', { name: 'Carteira por fase' })).toHaveCount(0)
  const catalogo = faixa(page).getByRole('list', { name: 'Catálogo:' })
  await expect(catalogo.getByRole('button', { name: /Carteira por fase/ })).toBeVisible()

  await catalogo.getByRole('button', { name: /Pedidos de crédito/ }).click()
  expect(await posicoes(page)).toContainEqual({ quadro: 'pedidos', x: 0, y: 3 })
  await expect(catalogo.getByRole('button', { name: /Pedidos de crédito/ })).toHaveCount(0)
})

test('PRS-06 · adicionar sem lugar livre vai para a base, na coluna 1', async ({ page }) => {
  await personalizar(page)
  await faixa(page)
    .getByRole('button', { name: /Prazos cumpridos/ })
    .click()
  expect(await posicoes(page)).toContainEqual({ quadro: 'cumpridos', x: 0, y: 4 })
})

test('PRS-08 · Concluir grava, e recarregar mostra a montagem nova', async ({ page }) => {
  await personalizar(page)
  await botao(page, 'Tirar Próxima AGC do início').click()
  expect(await gravada(page)).toBeNull()
  await botao(page, 'Concluir').click()
  await expect(faixa(page)).toHaveCount(0)
  await expect(botao(page, 'Personalizar')).toBeFocused()
  const esperado = PADRAO_ADVOGADO.filter((i) => i.quadro !== 'agc')
  expect(ordenar((await gravada(page)) ?? [])).toEqual(esperado)

  await page.reload()
  await expect(tituloDoInicio(page)).toBeVisible()
  expect(await posicoes(page)).toEqual(esperado)
})

test('PRS-09 · Cancelar descarta, e nada é gravado', async ({ page }) => {
  await personalizar(page)
  await botao(page, 'Tirar Próxima AGC do início').click()
  await arrastar(page, 'prazos', 1, 0)
  await botao(page, 'Cancelar').click()
  await expect(faixa(page)).toHaveCount(0)
  expect(await posicoes(page)).toEqual(PADRAO_ADVOGADO)
  expect(await gravada(page)).toBeNull()
})

test('PRS-10 · Restaurar e Cancelar não muda nada; Restaurar e Concluir grava o padrão', async ({
  page,
}) => {
  const salva: Item[] = [
    { quadro: 'pedidos', x: 0, y: 0 },
    { quadro: 'passivo', x: 2, y: 0 },
  ]
  await montar(page, salva)
  await personalizar(page)
  await botao(page, 'Restaurar padrão').click()
  expect(await posicoes(page)).toEqual(PADRAO_ADVOGADO)
  await botao(page, 'Cancelar').click()
  expect(await posicoes(page)).toEqual(salva)
  expect(await gravada(page)).toEqual(salva)

  await personalizar(page)
  await botao(page, 'Restaurar padrão').click()
  await botao(page, 'Concluir').click()
  expect(ordenar((await gravada(page)) ?? [])).toEqual(PADRAO_ADVOGADO)
})

test('PRS-11 · tirar todos mostra o aviso; Concluir grava a montagem vazia', async ({ page }) => {
  await personalizar(page)
  const tirar = page.getByRole('button', { name: /^Tirar .* do início$/ })
  while ((await tirar.count()) > 0) await tirar.first().click()
  const aviso = page.getByText('Nenhum quadro no início')
  await expect(aviso).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restaurar padrão' })).toHaveCount(2)
  await botao(page, 'Concluir').click()
  expect(await gravada(page)).toEqual([])

  await page.reload()
  await expect(tituloDoInicio(page)).toBeVisible()
  await expect(aviso).toBeVisible()
  // Fora do modo, o Restaurar abre o Personalizar com o padrão; só o Concluir grava (INV-03).
  await botao(page, 'Restaurar padrão').click()
  await expect(faixa(page)).toBeVisible()
  expect(await posicoes(page)).toEqual(PADRAO_ADVOGADO)
  expect(await gravada(page)).toEqual([])
})

test('PRS-12 · sem Personalizar em 2 colunas', async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 })
  await expect(page.locator('[data-colunas="2"]')).toBeVisible()
  await expect(botao(page, 'Personalizar')).toHaveCount(0)
  await expect(page.locator('[data-alca]')).toHaveCount(0)
})

test('PRS-13 · o contêiner encolhe durante a edição: sai do modo e descarta o rascunho', async ({
  page,
}) => {
  await personalizar(page)
  await botao(page, 'Tirar Próxima AGC do início').click()
  await page.setViewportSize({ width: 1100, height: 1400 })
  await expect(page.locator('[data-colunas="2"]')).toBeVisible()
  await expect(faixa(page)).toHaveCount(0)
  await expect(
    page.getByRole('status').filter({ hasText: 'Personalizar só em telas largas' }),
  ).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1400 })
  await expect(page.locator('[data-colunas="4"]')).toBeVisible()
  expect(await posicoes(page)).toEqual(PADRAO_ADVOGADO)
  expect(await gravada(page)).toBeNull()
})

test('PRS-14 · Tab: Restaurar, Cancelar, Concluir, catálogo e os ×; a alça não recebe foco', async ({
  page,
}) => {
  await personalizar(page)
  await expect(faixa(page)).toBeFocused()
  const esperados = [
    'Restaurar padrão',
    'Cancelar',
    'Concluir',
    'Pedidos de crédito, tamanho 1×1',
    'Atividade recente, tamanho 1×2',
    'Últimos informes, tamanho 1×2',
    'Prazos cumpridos, tamanho 2×1',
    'Tirar Prazos em aberto do início',
    'Tirar Próxima AGC do início',
    'Tirar Próximos prazos do início',
    'Tirar Calendário do mês do início',
    'Tirar Informes publicados do início',
    'Tirar Passivo sob administração do início',
    'Tirar Passivo por classe (RJ) do início',
    'Tirar Carteira por fase do início',
  ]
  const vistos: string[] = []
  for (const _ of esperados) {
    await page.keyboard.press('Tab')
    vistos.push(
      await page.evaluate(() => {
        const ativo = document.activeElement as HTMLElement | null
        if (!ativo) return ''
        if (ativo.hasAttribute('data-alca')) return 'alça'
        return (ativo.getAttribute('aria-label') ?? ativo.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
      }),
    )
  }
  expect(vistos).toEqual(esperados)
})
