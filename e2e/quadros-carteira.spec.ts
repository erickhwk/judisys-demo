// Q-12 · Carteira por fase no navegador (INI-09): o clique na fase abre Processos filtrada
// (QDR-14) e as três variantes ficam sem estouro de texto nos extremos de largura da SDD-INI §5.3
// (QDR-16). A contagem do seed e o estado vazio (QDR-13, QDR-15) estão em
// src/modulos/inicio/quadros/QuadroCarteira.test.tsx.
import { expect, type Page, test } from '@playwright/test'
import {
  AGORA,
  aceitaReticencias,
  assentarGrade,
  conteinerCom,
  entrarComo,
  esperarFonte,
  FONTES,
  medirCascas,
  prepararFonte,
} from './apoio'

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
 * Os extremos do contêiner da grade (SDD-INI §5.3), e duas janelas comuns: o notebook de 1280px com
 * o menu aberto e o celular de 320px.
 */
const EXTREMOS = [
  { nome: 'desktop, unidade de 208px', conteiner: 880, variante: 'desktop' },
  { nome: 'desktop, 1280px com o menu aberto', janela: 1280, variante: 'desktop' },
  // Com folga sobre o ultrawide de 3440px com o menu recolhido: sem teto desde a AJ-26.
  { nome: 'desktop, unidade de 813px', conteiner: 3300, variante: 'desktop' },
  { nome: 'tablet, unidade de 292px', conteiner: 600, variante: 'tablet' },
  { nome: 'tablet, unidade de 432px', conteiner: 879, variante: 'tablet' },
  { nome: 'celular de 320px', janela: 320, variante: 'celular' },
  { nome: 'celular, contêiner de 599px', conteiner: 599, variante: 'celular' },
] as const

// A fonte de reserva (FONTES, em e2e/apoio.ts) cobriu o HF-01: sem a Inter, o rótulo de 116px
// quebrava e o corpo cortava o fim de "Falência". Nela, um nome de fase com reticências é a
// degradação prevista (a célula tem o nome no `title` e para o leitor de tela): no tablet de 292px, a
// DejaVu do CI corta "Prestação de contas".
for (const fonte of FONTES) {
  test(`QDR-16 · três variantes sem estouro nos extremos de largura (fonte ${fonte})`, async ({
    page,
  }) => {
    await prepararFonte(page, fonte)
    await page.setViewportSize({ width: 1440, height: 900 })
    await entrarComo(page, 'aj')
    await esperarFonte(page, fonte)
    const cascas = await medirCascas(page)

    for (const extremo of EXTREMOS) {
      if ('conteiner' in extremo) {
        await conteinerCom(page, extremo.conteiner, cascas)
      } else {
        await assentarGrade(page, extremo.janela, extremo.variante === 'celular' ? 1 : 4)
      }
      await expect(carteira(page)).toHaveAttribute('data-variante', extremo.variante)
      await expect(carteira(page).locator('a[data-fase]')).toHaveCount(10)
      // Texto cortado (reticências), fileira mais larga que o quadro ou corpo mais alto que a célula.
      const estouros = await carteira(page).evaluate((quadro, aceita) => {
        const cortados = [
          ...quadro.querySelectorAll('ol, [data-tipo], [data-fase], [data-fase] *, p *'),
        ]
          .filter((e) => !e.closest('.somente-leitor') && e.scrollWidth > e.clientWidth + 0.5)
          .filter((e) => getComputedStyle(e).display !== 'inline')
          .filter((e) => !(aceita && getComputedStyle(e).textOverflow === 'ellipsis'))
          .map((e) => e.textContent)
        // O corpo é quem corta (overflow): o quadro em si não cresce.
        const corpo = quadro.lastElementChild as HTMLElement
        const alto = [quadro, corpo]
          .filter((e) => e.scrollHeight > e.clientHeight + 0.5)
          .map((e) => `altura: ${e.scrollHeight}px em ${e.clientHeight}px`)
        return [...cortados, ...alto]
      }, aceitaReticencias(fonte))
      expect(estouros, extremo.nome).toEqual([])

      // As fases das duas trilhas começam no mesmo x: no HF-01, uma coluna max-content por trilha
      // as desalinhou em uns 12px no desktop.
      const inicios = await carteira(page)
        .locator('[data-tipo] > ol')
        .evaluateAll((listas) => listas.map((ol) => ol.getBoundingClientRect().left))
      expect(inicios, `${extremo.nome}: início das fases`).toHaveLength(2)
      expect(
        Math.max(...inicios) - Math.min(...inicios),
        `${extremo.nome}: início das fases`,
      ).toBeLessThan(0.5)
    }
  })
}
