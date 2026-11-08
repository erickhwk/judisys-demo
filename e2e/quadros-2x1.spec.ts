// Quadros 2×1 do início no navegador (INI-08: Q-08 a Q-11): os números do seed no relógio fixo
// (QDR-09 a QDR-12, de `pnpm indicadores`), os links e o que só o navegador mede: nenhum quadro
// estoura nos extremos de largura de cada variante (QDR-16, SDD-INI §5.3). O HTML de cada variante
// está em src/modulos/inicio/quadros/quadros2x1.test.tsx.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo, tituloDoInicio } from './apoio'

const QUADROS = ['passivo', 'publicados', 'cumpridos', 'classes'] as const

/** Os quatro quadros nas duas primeiras linhas da grade. */
const MONTAGEM = [
  { quadro: 'passivo', x: 0, y: 0 },
  { quadro: 'publicados', x: 2, y: 0 },
  { quadro: 'cumpridos', x: 0, y: 1 },
  { quadro: 'classes', x: 2, y: 1 },
]

const grade = (page: Page) => page.locator('[data-colunas]')
const quadro = (page: Page, id: (typeof QUADROS)[number]) => page.locator(`[data-quadro="${id}"]`)

/** Grava a montagem do advogado como se fosse um Concluir anterior e recarrega o início. */
async function montar(page: Page): Promise<void> {
  const chave = await page.evaluate(
    () =>
      `judisys:inicio:${JSON.parse(sessionStorage.getItem('judisys:sessao') ?? '{}').usuarioId}`,
  )
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [
    chave,
    JSON.stringify({ versao: 1, itens: MONTAGEM }),
  ] as const)
  await page.reload()
  await expect(tituloDoInicio(page)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
  await entrarComo(page, 'advogado')
  await montar(page)
})

test('QDR-09 · passivo: total do topo, quatro processos e os sem relação', async ({ page }) => {
  const passivo = quadro(page, 'passivo')
  await expect(passivo.locator('header')).toContainText('R$ 546,5 mi')
  await expect(passivo.locator('[data-barra]')).toHaveCount(4)
  await expect(passivo.getByRole('img')).toHaveAccessibleName(
    /^Relação do AJ dos maiores processos ativos: Grupo Lontra Azul R\$ 325,1 mi, Gráfica Beija-Flor R\$ 81,8 mi, Fundição Sapo-Cururu \(falência\) R\$ 75,2 mi, Moinho Quero-Quero R\$ 64,4 mi$/,
  )
  await expect(passivo).toContainText('Fora da soma: 4 processos ainda sem relação do AJ.')
})

test('QDR-10 · informes publicados: 12 meses; no celular, os 6 últimos', async ({ page }) => {
  const publicados = quadro(page, 'publicados')
  await expect(publicados.locator('header')).toContainText('43 em 12 meses')
  await expect(publicados.getByRole('img')).toHaveAccessibleName(
    /: dez 1, jan 5, fev 3, mar 1, abr 3, mai 0, jun 3, jul 5, ago 5, set 8, out 8, nov 1$/,
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(grade(page)).toHaveAttribute('data-colunas', '1')
  await expect(publicados.getByRole('img')).toHaveAccessibleName(
    /: jun 3, jul 5, ago 5, set 8, out 8, nov 1$/,
  )
  await expect(publicados).toContainText('30 informes em 6 meses')
})

test('QDR-11 · prazos cumpridos por mês de vencimento, recorde em setembro', async ({ page }) => {
  const cumpridos = quadro(page, 'cumpridos')
  await expect(cumpridos.locator('header')).toContainText('40 em 12 meses')
  await expect(cumpridos).toContainText('por mês de vencimento')
  await expect(cumpridos.getByRole('img')).toHaveAccessibleName(
    /: nov\/25 3, dez 2, jan 2, fev 3, mar 5, abr 2, mai 1, jun 2, jul 5, ago 4, set 6, out 5$/,
  )
  await expect(cumpridos.locator('[data-marca="10"]')).toBeVisible()
  await expect(cumpridos).toContainText('set: recorde (6)')
})

test('QDR-12 · passivo por classe: cinco classes somando R$ 389,5 mi', async ({ page }) => {
  const classes = quadro(page, 'classes')
  await expect(classes.locator('header')).toContainText('R$ 389,5 mi')
  await expect(classes.locator('[data-segmento]')).toHaveCount(5)
  await expect(classes.getByRole('listitem')).toHaveText([
    /Quirografário\s*R\$ 219,3 mi\s*56%/,
    /Garantia real\s*R\$ 78,2 mi\s*20%/,
    /Não sujeito\s*R\$ 48,4 mi\s*13%/,
    /Trabalhista\s*R\$ 28 mi\s*7%/,
    /ME\/EPP\s*R\$ 15,5 mi\s*4%/,
  ])
})

test('os links do cabeçalho levam à origem', async ({ page }) => {
  await quadro(page, 'cumpridos').getByRole('link', { name: 'Agenda' }).click()
  await expect(page).toHaveURL(/#\/agenda$/)
  await page.goto('./#/')
  await quadro(page, 'publicados').getByRole('link', { name: 'Informes' }).click()
  await expect(page).toHaveURL(/#\/informes$/)
})

// ---------------------------------------------------------------------------------------------
// QDR-16: os extremos de largura de cada variante (SDD-INI §5.3)

/** Largura do contêiner depois que a troca de faixa (menu, barra do topo) assenta. */
async function larguraEstavel(page: Page): Promise<number> {
  let anterior = -1
  for (let i = 0; i < 20; i++) {
    const atual = await grade(page).evaluate(
      (el) =>
        new Promise<number>((pronto) =>
          requestAnimationFrame(() => pronto(Math.round(el.getBoundingClientRect().width))),
        ),
    )
    if (atual === anterior) return atual
    anterior = atual
  }
  return anterior
}

/** Ajusta a janela até o contêiner da grade ter a largura pedida (a casca muda com a faixa). */
async function conteinerCom(page: Page, largura: number, altura = 900): Promise<void> {
  let janela = largura + 400
  const medidas: string[] = []
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    await page.setViewportSize({ width: janela, height: altura })
    await expect(grade(page)).toBeVisible()
    const medida = await larguraEstavel(page)
    if (medida === largura) return
    medidas.push(`${janela}→${medida}`)
    janela += largura - medida
  }
  throw new Error(`não chegou ao contêiner de ${largura}px: ${medidas.join(', ')}`)
}

/** O que sai da moldura, ou o texto que deveria caber inteiro e foi cortado. */
async function estouros(page: Page, id: string): Promise<string[]> {
  const secao = page.locator(`[data-quadro="${id}"]`)
  await secao.scrollIntoViewIfNeeded()
  return secao.evaluate((s) => {
    const caixa = s.getBoundingClientRect()
    const achados: string[] = []
    for (const el of s.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (
        r.left < caixa.left - 0.5 ||
        r.right > caixa.right + 0.5 ||
        r.top < caixa.top - 0.5 ||
        r.bottom > caixa.bottom + 0.5
      ) {
        achados.push(`fora da moldura: ${el.tagName} "${el.textContent?.slice(0, 30)}"`)
      }
    }
    // O título, o destaque e a legenda cabem inteiros; o nome do processo nas barras pode ter
    // reticências (o canvas corta o nome longo também).
    for (const el of s.querySelectorAll('h2, header > span, li > span')) {
      const intervalo = document.createRange()
      intervalo.selectNodeContents(el)
      const texto = intervalo.getBoundingClientRect().width
      if (texto > el.getBoundingClientRect().width + 0.05) {
        achados.push(`cortado: "${el.textContent}"`)
      }
    }
    return achados
  })
}

const EXTREMOS = [
  { variante: 'desktop', conteiner: 880, colunas: '4' },
  { variante: 'desktop', conteiner: 2200, colunas: '4' },
  { variante: 'tablet', conteiner: 600, colunas: '2' },
  { variante: 'tablet', conteiner: 879, colunas: '2' },
  { variante: 'celular', conteiner: 288, colunas: '1' },
  { variante: 'celular', conteiner: 599, colunas: '1' },
] as const

for (const { variante, conteiner, colunas } of EXTREMOS) {
  test(`QDR-16 · ${variante} com contêiner de ${conteiner}px: nada estoura`, async ({ page }) => {
    await conteinerCom(page, conteiner)
    await expect(grade(page)).toHaveAttribute('data-colunas', colunas)
    for (const id of QUADROS) {
      await expect(quadro(page, id)).toHaveAttribute('data-variante', variante)
      await expect(quadro(page, id).locator('[data-grafico]')).toBeVisible()
      expect(await estouros(page, id), id).toEqual([])
    }
  })
}
