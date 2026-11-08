// Captura do modo Personalizar do início (INI-03): a faixa, a recusa (cortada e toda fora do grid) e
// um arrasto aceito, em 1280, 1440 e 1920, nos dois temas. Fica fora do capturar.sh porque depende de
// estado. Usa o playwright-core que o capturar.sh da skill comparacao-visual instala.
// Uso, com o preview no ar: node scripts/capturar-personalizar.mjs http://localhost:4329/ docs/capturas/<COD>/depois
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'

const cache = join(homedir(), '.cache/comparacao-visual')
const { chromium } = createRequire(join(cache, 'package.json'))('playwright-core')
const [, , url, saida] = process.argv
const browser = await chromium.launch({ channel: 'chrome', headless: true })

for (const [largura, altura] of [
  [1280, 900],
  [1440, 1100],
  [1920, 1100],
]) {
  for (const tema of ['claro', 'escuro']) {
    const ctx = await browser.newContext({
      viewport: { width: largura, height: altura },
      locale: 'pt-BR',
      reducedMotion: 'reduce',
    })
    await ctx.addInitScript(
      ([v]) => {
        try {
          localStorage.setItem('tema', v)
        } catch {}
      },
      [tema === 'escuro' ? 'dark' : 'light'],
    )
    const page = await ctx.newPage()
    await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
    await page.goto(url)
    await page.getByRole('button', { name: /Entrar como Advogado/ }).click()
    await page.locator('[data-resumo]').waitFor()
    await page.getByRole('button', { name: 'Personalizar', exact: true }).click()
    await page.getByRole('region', { name: 'Personalizar o início' }).waitFor()
    await page.mouse.move(0, 0)
    const sufixo = `${tema === 'escuro' ? '-escuro' : ''}-${largura}x${altura}`
    await page.screenshot({ path: join(saida, `personalizar${sufixo}.png`) })

    // Recusa: Passivo (2×1) levado à 4ª coluna, com o botão apertado.
    const grade = await page.locator('[data-colunas="4"]').boundingBox()
    const celula = await page.locator('[data-celula="passivo"]').boundingBox()
    const alca = await page.locator('[data-celula="passivo"] [data-alca]').boundingBox()
    const unidade = (grade.width - 48) / 4
    const ox = alca.x + alca.width / 2
    const oy = alca.y + alca.height / 2
    await page.mouse.move(ox, oy)
    await page.mouse.down()
    await page.mouse.move(grade.x + 3 * (unidade + 16) + (ox - celula.x), oy + 20, { steps: 10 })
    await page.screenshot({ path: join(saida, `personalizar-recusa${sufixo}.png`) })
    // Arrasto aceito: Prazos sobre a Próxima AGC, a sombra do destino e a AGC descendo.
    await page.mouse.up()
    const prazos = await page.locator('[data-celula="prazos"] [data-alca]').boundingBox()
    await page.mouse.move(prazos.x + 5, prazos.y + 5)
    await page.mouse.down()
    await page.mouse.move(prazos.x + 5 + unidade + 16, prazos.y + 25, { steps: 10 })
    await page.screenshot({ path: join(saida, `personalizar-arrasto${sufixo}.png`) })
    await page.mouse.up()
    // Recusa de um 1×1 todo fora do grid: Próxima AGC puxada duas colunas à esquerda (faixa na borda).
    const agc = await page.locator('[data-celula="agc"] [data-alca]').boundingBox()
    await page.mouse.move(agc.x + 5, agc.y + 5)
    await page.mouse.down()
    await page.mouse.move(agc.x + 5 - 3 * (unidade + 16), agc.y + 25, { steps: 10 })
    await page.screenshot({ path: join(saida, `personalizar-recusa-fora${sufixo}.png`) })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    console.log('ok', sufixo)
    await ctx.close()
  }
}
await browser.close()
