// Q-12 · Carteira por fase no navegador (INI-09): o clique na fase abre Processos filtrada
// (QDR-14) e as três variantes ficam sem estouro de texto nos extremos de largura da SDD-INI §5.3
// (QDR-16). A contagem do seed e o estado vazio (QDR-13, QDR-15) estão em
// src/modulos/inicio/quadros/QuadroCarteira.test.tsx.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const carteira = (page: Page) => page.locator('[data-quadro="carteira"]')

test('QDR-14 · clicar numa fase abre Processos filtrada por tipo e fase', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  // O AJ tem a carteira no topo (RF-17).
  await entrarComo(page, 'aj')
  const falencia = carteira(page).getByRole('list', { name: 'Fases: falência' })
  await falencia.getByRole('link', { name: 'Realização do ativo: 1 processo' }).click()

  await expect(page).toHaveURL(/#\/processos\?tipo=falencia&fase=realizacao-ativo$/)
  await expect(page.getByRole('combobox', { name: 'Fase' })).toHaveValue('realizacao-ativo')
  const linhas = page.getByRole('table').locator('tbody tr')
  await expect(linhas).toHaveCount(1)
  await expect(linhas.first()).toContainText('Realização do ativo')
})

test('QDR-14 · fase vazia fica apagada e sem link', async ({ page }) => {
  await entrarComo(page, 'aj')
  const rj = carteira(page).getByRole('list', { name: 'Fases: recuperação judicial' })
  await expect(rj.getByRole('link')).toHaveCount(6)
  await expect(rj.locator('[data-fase="agc"]')).not.toHaveAttribute('href')
})

/**
 * Larguras de janela que dão os extremos do contêiner da grade (SDD-INI §5.3). A casca (menu,
 * margens e barra de rolagem) é medida a 1440px, como em inicio.spec.ts.
 */
const EXTREMOS = [
  { nome: 'desktop, unidade de 208px', conteiner: 880, variante: 'desktop' },
  { nome: 'desktop, 1280px com o menu aberto', janela: 1280, variante: 'desktop' },
  { nome: 'desktop, unidade de 298px', janela: 1920, variante: 'desktop' },
  { nome: 'tablet, unidade de 292px', conteiner: 600, variante: 'tablet' },
  { nome: 'tablet, unidade de 432px', conteiner: 879, variante: 'tablet' },
  { nome: 'celular de 320px', janela: 320, variante: 'celular' },
  { nome: 'celular, contêiner de 599px', conteiner: 599, variante: 'celular' },
] as const

test('QDR-16 · três variantes sem estouro nos extremos de largura', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await entrarComo(page, 'aj')
  const grade = page.locator('[data-colunas]')
  const casca = 1440 - ((await grade.boundingBox())?.width ?? 0)

  for (const extremo of EXTREMOS) {
    const janela = 'janela' in extremo ? extremo.janela : extremo.conteiner + casca
    await page.setViewportSize({ width: janela, height: 900 })
    await expect(carteira(page)).toHaveAttribute('data-variante', extremo.variante)
    await expect(carteira(page).locator('a[data-fase]')).toHaveCount(10)
    // Texto cortado (reticências), fileira mais larga que o quadro ou corpo mais alto que a célula.
    const estouros = await carteira(page).evaluate((quadro) => {
      const cortados = [
        ...quadro.querySelectorAll('ol, [data-tipo], [data-fase], [data-fase] *, p *'),
      ]
        .filter((e) => !e.closest('.somente-leitor') && e.scrollWidth > e.clientWidth + 0.5)
        .filter((e) => getComputedStyle(e).display !== 'inline')
        .map((e) => e.textContent)
      const alto = quadro.scrollHeight > quadro.clientHeight + 0.5 ? ['altura do quadro'] : []
      return [...cortados, ...alto]
    })
    expect(estouros, extremo.nome).toEqual([])
  }
})
