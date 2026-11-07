/**
 * Gera os favicons da demo (AJ-14) a partir do símbolo do Judisys (`src/ui/logos/judisys-marca-branca.svg`):
 * o símbolo branco e dourado centrado num quadrado azul-marinho, legível em aba clara e escura.
 *
 * Saída, commitada em `public/`: `favicon.svg`, `favicon-512.png` e `apple-touch-icon.png` (180×180).
 * Rode com `pnpm favicons` quando o símbolo mudar. Os PNGs saem do mesmo SVG, pelo Chromium do Playwright.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const AZUL_900 = '#0a1f4d' // --cor-azul-900 (src/estilos/tokens.css)
const LADO = 512
const MARGEM = 72 // respiro em volta do símbolo, em unidades do quadrado de 512

const simbolo = readFileSync('src/ui/logos/judisys-marca-branca.svg', 'utf8')
const viewBox = simbolo.match(/viewBox="([^"]+)"/)?.[1]
const miolo = simbolo.match(/<svg[^>]*>([\s\S]*)<\/svg>\s*$/)?.[1]
if (!viewBox || !miolo) throw new Error('judisys-marca-branca.svg sem viewBox ou conteúdo')

/** `cantos`: o SVG da aba tem cantos arredondados; o apple-touch-icon é quadrado (o iOS arredonda). */
const montar = (cantos: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LADO} ${LADO}"><title>Judisys</title>` +
  `<rect width="${LADO}" height="${LADO}" rx="${cantos}" fill="${AZUL_900}"/>` +
  `<svg x="${MARGEM}" y="${MARGEM}" width="${LADO - 2 * MARGEM}" height="${LADO - 2 * MARGEM}" viewBox="${viewBox}">${miolo}</svg>` +
  `</svg>\n`

const favicon = montar(96)
writeFileSync('public/favicon.svg', favicon)

const navegador = await chromium.launch()
const pagina = await navegador.newPage()
for (const [arquivo, lado, svg] of [
  ['public/favicon-512.png', 512, favicon],
  ['public/apple-touch-icon.png', 180, montar(0)],
] as const) {
  await pagina.setViewportSize({ width: lado, height: lado })
  await pagina.setContent(
    `<html><body style="margin:0;background:transparent">` +
      `<img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${lado}" height="${lado}" style="display:block">` +
      `</body></html>`,
  )
  await pagina.screenshot({ path: arquivo, omitBackground: true })
}
await navegador.close()
console.log('favicons gerados em public/')
