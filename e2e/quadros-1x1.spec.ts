// Quadros 1×1 do início no navegador (INI-06, SDD-INI §7.4): Q-01 prazos em aberto, Q-02 próxima
// AGC e Q-03 pedidos de crédito com o seed no relógio fixo, os links (F-08) e o que só o navegador
// mede: nada estoura nos extremos de largura da seção 5.3 (QDR-16). Os números saem do
// `pnpm indicadores`; o HTML de cada variante está em src/modulos/inicio/quadros/quadros1x1.test.tsx.
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo } from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const quadro = (page: Page, titulo: string) => page.getByRole('region', { name: titulo })

test('QDR-01 · prazos em aberto do seed; os vencidos levam à agenda filtrada', async ({ page }) => {
  await entrarComo(page, 'advogado')
  const prazos = quadro(page, 'Prazos em aberto')
  await expect(prazos.locator('[data-total]')).toHaveText('19')
  await expect(prazos).toContainText('3 vencidos · 1 hoje')
  await expect(prazos.getByRole('img')).toHaveAccessibleName(
    'Prazos em aberto por urgência: Vencidos 3 (16%), Hoje 1 (5%), Até 7 dias 1 (5%), ' +
      'De 8 a 30 dias 6 (32%), Depois de 30 dias 8 (42%)',
  )

  await prazos.getByRole('link', { name: '3 vencidos' }).click()
  await expect(page).toHaveURL(/#\/agenda\?periodo=vencidos$/)
  await expect(page.getByLabel('Período')).toHaveValue('vencidos')
})

test('QDR-02 · próxima AGC do seed, e o Abrir leva à AGC', async ({ page }) => {
  await entrarComo(page, 'advogado')
  const agc = quadro(page, 'Próxima AGC')
  await expect(agc).toContainText('Grupo Lontra Azul')
  await expect(agc).toContainText('sexta · em 6 dias')
  await expect(agc).toContainText('1ª convocação13/11')
  await expect(agc).toContainText('2ª convocação20/11')

  await agc.getByRole('link', { name: 'Abrir' }).click()
  await expect(page.getByRole('heading', { name: 'AGC de 13/11/2026', level: 1 })).toBeVisible()
})

test('QDR-04 · pedidos de crédito do seed, e o Ver leva aos credores do processo', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  const pedidos = quadro(page, 'Pedidos de crédito')
  await expect(pedidos.getByRole('img')).toHaveAccessibleName(
    'Pedidos de crédito por status: Pendentes 8, Acolhidos 25, Rejeitados 17',
  )
  await expect(pedidos).toContainText('Mais pendentes: Transportes Jabuticaba (5)')

  await pedidos.getByRole('link', { name: 'Ver' }).click()
  await expect(page).toHaveURL(/#\/processos\/[\w-]+\/credores$/)
  await expect(
    page.getByRole('heading', { name: 'Transportes Jabuticaba', level: 1 }),
  ).toBeVisible()
})

// --- QDR-16 · sem estouro nos extremos de largura (SDD-INI §5.3) -------------------------------

/** Contêiner da grade nos extremos de cada faixa: unidade de 208 e 298 (4 colunas), 292 e 432
 * (2 colunas) e a lista do celular de 288 a 599. */
const EXTREMOS = [880, 1240, 600, 879, 288, 599]

/** Ajusta a janela até o contêiner da grade ter `alvo` px (a casca muda com a faixa). */
async function conteinerCom(page: Page, alvo: number): Promise<void> {
  let janela = alvo + 400
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    await page.setViewportSize({ width: janela, height: 1000 })
    // Dois quadros de animação: o ResizeObserver da grade mede e o React redesenha.
    await page.evaluate(
      () => new Promise((pronto) => requestAnimationFrame(() => requestAnimationFrame(pronto))),
    )
    const largura = (await page.locator('[data-colunas]').boundingBox())?.width ?? 0
    if (Math.abs(largura - alvo) < 0.5) return
    janela = Math.max(300, Math.round(janela + alvo - largura))
  }
  throw new Error(`contêiner de ${alvo}px não alcançado`)
}

/** O que sai da moldura do quadro, ou texto cortado com reticências. */
async function estouros(page: Page, id: string): Promise<string[]> {
  return page.locator(`[data-quadro="${id}"]`).evaluate((secao) => {
    const caixa = secao.getBoundingClientRect()
    const problemas: string[] = []
    for (const el of secao.querySelectorAll<HTMLElement>('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.right > caixa.right - 0.5 || r.bottom > caixa.bottom - 0.5 || r.left < caixa.left) {
        problemas.push(`fora da moldura: ${el.tagName} "${el.textContent?.slice(0, 30)}"`)
      }
      if (getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth) {
        problemas.push(`cortado: "${el.textContent}"`)
      }
    }
    const corpo = secao.lastElementChild as HTMLElement
    if (corpo.scrollHeight > corpo.clientHeight) problemas.push('corpo mais alto que o quadro')
    return problemas
  })
}

for (const [papel, ids] of [
  ['advogado', ['prazos', 'agc']],
  ['analista', ['pedidos']],
] as const) {
  test(`QDR-16 · ${ids.join(', ')} sem estouro nos extremos de largura`, async ({ page }) => {
    await entrarComo(page, papel)
    for (const alvo of EXTREMOS) {
      await conteinerCom(page, alvo)
      for (const id of ids) {
        // A variante muda depois da medida do contêiner (ResizeObserver): espera o novo desenho.
        const variante = alvo >= 880 ? 'desktop' : alvo >= 600 ? 'tablet' : 'celular'
        await expect(page.locator(`[data-quadro="${id}"]`)).toHaveAttribute(
          'data-variante',
          variante,
        )
        expect(await estouros(page, id), `${id} com contêiner de ${alvo}px`).toEqual([])
      }
    }
  })
}
