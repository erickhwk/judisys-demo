// Quadros 1×2 do início no navegador (INI-07, Q-04 a Q-07): o que só o navegador mede, que é o texto
// sem estouro nos extremos de largura de cada variante (QDR-16, SDD-INI §5.3), os links de cada item
// e a volta ao início depois de alterar um prazo (QDR-18, T-22). O conteúdo de cada quadro com o
// seed está em src/modulos/inicio/quadros/quadros1x2.test.tsx.
import { expect, type Page, test } from '@playwright/test'
import {
  AGORA,
  conteinerCom,
  entrarComo,
  esperarFonte,
  FONTES,
  medirCascas,
  prepararFonte,
  tituloDoInicio,
} from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const QUADROS = ['proximos', 'calendario', 'atividade', 'informes'] as const

/** Grava a montagem com os quatro quadros 1×2 lado a lado e recarrega o início. */
async function montarOsQuatro(page: Page): Promise<void> {
  await page.evaluate((quadros) => {
    const sessao = JSON.parse(sessionStorage.getItem('judisys:sessao') ?? '{}')
    const itens = quadros.map((quadro, x) => ({ quadro, x, y: 0 }))
    localStorage.setItem(`judisys:inicio:${sessao.usuarioId}`, JSON.stringify({ versao: 1, itens }))
  }, QUADROS)
  await page.reload()
  await expect(tituloDoInicio(page)).toBeVisible()
  for (const id of QUADROS) {
    await expect(page.locator(`[data-quadro="${id}"]`)).toBeVisible()
  }
  await expect(page.locator('[data-quadro="informes"] li')).toHaveCount(5)
}

/** Quanto o corpo de cada quadro passa da altura dele (0 = cabe) e a largura do quadro. */
async function medir(page: Page) {
  return page.evaluate((ids) => {
    return ids.map((id) => {
      const quadro = document.querySelector(`[data-quadro="${id}"]`) as HTMLElement
      const corpo = quadro.querySelector(':scope > div') as HTMLElement
      // Nenhum texto passa da borda direita do quadro, que o cortaria sem reticências. O que está
      // dentro de uma caixa que já corta (as reticências) é conferido pela própria caixa.
      const direita = quadro.getBoundingClientRect().right
      const cortaAntes = (el: Element) => {
        for (let pai = el.parentElement; pai && pai !== quadro; pai = pai.parentElement) {
          if (getComputedStyle(pai).overflowX !== 'visible') return true
        }
        return false
      }
      const vazaDoLado = [...quadro.querySelectorAll('li, a, p, span, b, strong')].some(
        (el) => !cortaAntes(el) && el.getBoundingClientRect().right > direita + 0.5,
      )
      return {
        id,
        largura: Math.round(quadro.getBoundingClientRect().width),
        estouro: corpo.scrollHeight - corpo.clientHeight,
        vazaDoLado,
      }
    })
  }, QUADROS)
}

test.describe('QDR-16 · sem estouro nos extremos de largura', () => {
  // Contêiner da grade em cada extremo da seção 5.3: unidade de 208 e 538px no desktop, de 292 e
  // 432px no tablet e o celular de 288 a 599px.
  const casos = [
    { conteiner: 880, variante: 'desktop', unidade: 208 },
    { conteiner: 2200, variante: 'desktop', unidade: 538 },
    { conteiner: 600, variante: 'tablet', unidade: 292 },
    { conteiner: 879, variante: 'tablet', unidade: 431 },
    { conteiner: 288, variante: 'celular', unidade: 288 },
    { conteiner: 599, variante: 'celular', unidade: 599 },
  ] as const

  // Com a Inter e com a fonte de reserva (FONTES, em e2e/apoio.ts). O que fica dentro de uma caixa
  // com reticências não conta como vazamento nas duas: a caixa já corta.
  for (const fonte of FONTES) {
    test(`as três variantes nos dois extremos (fonte ${fonte})`, async ({ page }) => {
      await prepararFonte(page, fonte)
      await page.setViewportSize({ width: 1440, height: 900 })
      await entrarComo(page, 'advogado')
      await montarOsQuatro(page)
      await esperarFonte(page, fonte)
      const cascas = await medirCascas(page)

      for (const caso of casos) {
        await conteinerCom(page, caso.conteiner, cascas)
        await expect(page.locator('[data-quadro="proximos"]')).toHaveAttribute(
          'data-variante',
          caso.variante,
        )
        for (const medida of await medir(page)) {
          const onde = `${medida.id} em ${caso.variante} de ${medida.largura}px`
          expect(Math.abs(medida.largura - caso.unidade), onde).toBeLessThanOrEqual(1)
          expect(medida.estouro, onde).toBeLessThanOrEqual(0)
          expect(medida.vazaDoLado, onde).toBe(false)
        }
      }
    })

    test(`mês de seis semanas (agosto de 2026) também cabe no desktop e no tablet (fonte ${fonte})`, async ({
      page,
    }) => {
      await prepararFonte(page, fonte)
      await page.clock.setFixedTime(new Date('2026-08-10T10:00:00'))
      await page.setViewportSize({ width: 1440, height: 900 })
      await entrarComo(page, 'advogado')
      await montarOsQuatro(page)
      await expect(page.locator('[data-semanas="6"]')).toBeVisible()
      await esperarFonte(page, fonte)
      const cascas = await medirCascas(page)
      for (const conteiner of [880, 2200, 600, 879]) {
        await conteinerCom(page, conteiner, cascas)
        // Sem esperar o contêiner e a variante, a medida podia ser a do desenho anterior.
        await expect(page.locator('[data-quadro="calendario"]')).toHaveAttribute(
          'data-variante',
          conteiner >= 880 ? 'desktop' : 'tablet',
        )
        const [, calendario] = await medir(page)
        expect(calendario?.estouro, `calendário em ${conteiner}px`).toBeLessThanOrEqual(0)
      }
    })
  }

  test('celular: as células do calendário têm pelo menos 38px (alvo de toque)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await entrarComo(page, 'advogado')
    const dia = page.locator('[data-quadro="calendario"] [data-dia="2026-11-13"]')
    await dia.scrollIntoViewIfNeeded()
    const caixa = await dia.boundingBox()
    expect(caixa?.height).toBeGreaterThanOrEqual(38)
    expect(caixa?.width).toBeGreaterThanOrEqual(38)
  })
})

test('cada item leva ao registro: prazo, evento do calendário, atividade e informe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await entrarComo(page, 'advogado')
  await montarOsQuatro(page)

  const proximos = page.getByRole('region', { name: 'Próximos prazos' })
  await proximos.getByRole('link', { name: /Relatório do AJ/ }).click()
  await expect(page).toHaveURL(/#\/processos\/[\w-]+\/prazos\?prazo=/)
  await page.goBack()

  const calendario = page.getByRole('region', { name: 'Calendário do mês' })
  await calendario.getByRole('link', { name: /Hoje · 7\/11/i }).click()
  await expect(page).toHaveURL(/#\/processos\/[\w-]+\/prazos\?prazo=/)
  await page.goBack()

  await page
    .getByRole('region', { name: 'Últimos informes' })
    .getByRole('link', { name: /Petição inicial/ })
    .click()
  await expect(page).toHaveURL(/#\/informes\/inf-/)
  await page.goBack()

  await page
    .getByRole('region', { name: 'Atividade recente' })
    .getByRole('link', { name: /cadastrou uma empresa/ })
    .click()
  await expect(page).toHaveURL(/#\/empresas\/emp-/)
})

test('QDR-18 · cumprir o prazo de hoje na agenda reflete no início', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await entrarComo(page, 'advogado')
  const proximos = page.getByRole('region', { name: 'Próximos prazos' })
  const calendario = page.getByRole('region', { name: 'Calendário do mês' })
  await expect(proximos).toContainText('Habilitações e divergências')
  await expect(proximos).toContainText('+ 13 prazos na agenda')
  await expect(calendario.locator('[data-dia="2026-11-07"]')).toHaveAttribute('data-marca', 'hoje')

  await page.getByRole('link', { name: 'Agenda', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()
  await page
    .getByRole('button', { name: 'Marcar "Habilitações e divergências" como cumprido' })
    .click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Marcar como cumprido' })
  await confirmacao.getByRole('button', { name: 'Marcar como cumprido' }).click()
  await expect(confirmacao).toBeHidden()

  await page
    .getByRole('complementary', { name: 'Menu' })
    .getByRole('link', { name: 'Início' })
    .click()
  await expect(tituloDoInicio(page)).toBeVisible()
  await expect(proximos).not.toContainText('Habilitações e divergências')
  await expect(proximos).toContainText('+ 12 prazos na agenda')
  await expect(proximos.locator('li')).toHaveCount(6)
  await expect(calendario.locator('[data-dia="2026-11-07"]')).not.toHaveAttribute('data-marca')
  await expect(calendario).toContainText('Próximo · 12/11')
  await expect(calendario).toContainText('Relatório do AJ')
})
