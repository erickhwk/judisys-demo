// Guarda de rolagem (AJ-02): o app rola dentro da coluna de conteúdo do Layout, e a página nunca.
// Abre todas as rotas do registro (as `rotas` de cada `src/modulos/<m>/rotas.tsx` e as abas do
// processo de `src/modulos/processos/abas.ts`) no computador e no celular e confere que o documento
// não passa da janela (scrollHeight/scrollWidth ≤ janela) e que a coluna não rola na horizontal.
// Algo absoluto que escapa da coluna (ex.: um `.somente-leitor`) faz a página rolar, e um que escapa
// de uma rolagem interna alarga a coluna: os dois são pegos aqui. As telas sem layout (impressão)
// rolam como documento comum e ficam de fora.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { AGORA, entrarComo } from './apoio'

/** Ids do seed para as rotas com parâmetro. Parâmetro novo sem id aqui derruba o teste. */
const IDS_DO_SEED: Record<string, string> = {
  id: 'prc-001',
  agcId: 'agc-001',
  credorId: 'crd-0001',
}
/** Rotas `/:id` fora de processos usam o id da própria coleção. */
const ID_POR_COLECAO: Record<string, string> = {
  empresas: 'emp-001',
  informes: 'inf-001',
}

/** Vistas que a rota sozinha não abre (estado na URL) e que já escaparam da coluna antes. */
const VISTAS_EXTRAS = ['/agenda?vista=calendario']

const JANELAS = [
  { nome: 'computador', width: 1440, height: 900 },
  { nome: 'celular', width: 390, height: 844 },
]

const MODULOS = join(import.meta.dirname, '..', 'src', 'modulos')

/** Caminhos de `rota('...')` dentro de `rotas: [...]` (sem os de `rotasSemLayout`). */
function caminhosDoRegistro(): string[] {
  const caminhos: string[] = []
  for (const modulo of readdirSync(MODULOS)) {
    const arquivo = ['rotas.tsx', 'rotas.ts']
      .map((nome) => join(MODULOS, modulo, nome))
      .find(existsSync)
    if (!arquivo) continue
    const fonte = readFileSync(arquivo, 'utf8')
    // Corta o registro nas chaves de primeiro nível (`  rotas:`, `  rotasSemLayout:`, `  abas:`),
    // sem contar colchetes: um `[...]` dentro de uma tela não corta a lista de rotas.
    const partes = fonte.split(/^ {2}(\w+):/m)
    for (let i = 1; i < partes.length; i += 2) {
      if (partes[i] !== 'rotas') continue
      for (const [, caminho] of (partes[i + 1] ?? '').matchAll(/rota\(\s*'([^']+)'/g)) {
        caminhos.push(caminho)
      }
    }
  }
  const abas = readFileSync(join(MODULOS, 'processos', 'abas.ts'), 'utf8')
  const definicoes = /const definicoes = \{([\s\S]*?)\} satisfies/.exec(abas)?.[1] ?? ''
  for (const [, aba] of definicoes.matchAll(/^\s*'?([\w-]+)'?:\s*\{/gm)) {
    caminhos.push(`/processos/:id/${aba}`)
  }
  return caminhos
}

function preencher(caminho: string): string {
  const colecao = caminho.split('/')[1] ?? ''
  return caminho.replace(/:(\w+)/g, (_, parametro: string) => {
    const valor =
      parametro === 'id' && colecao !== 'processos'
        ? ID_POR_COLECAO[colecao]
        : IDS_DO_SEED[parametro]
    if (!valor) throw new Error(`sem id do seed para :${parametro} em ${caminho}`)
    return valor
  })
}

const CAMINHOS = caminhosDoRegistro()
const ENDERECOS = [...CAMINHOS.map(preencher), ...VISTAS_EXTRAS]

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

/** Espera a tela assentar: título, nada carregando e o tamanho da página parado por 3 quadros. */
async function esperarTela(page: Page): Promise<void> {
  // Id do seed que não bate mais (ex.: AGC de outro processo) abre a tela de aviso, e a guarda
  // mediria a tela errada.
  await expect(page.locator('main h1').first()).toBeVisible()
  await expect(page.locator('main h1').first()).not.toHaveText(/não encontrad|Acesso restrito/)
  await expect(page.locator('main').getByText(/Registro não existe mais/)).toHaveCount(0)
  await expect(page.locator('main').getByText(/Carregando/)).toHaveCount(0)
  await page.waitForFunction(
    () =>
      new Promise<boolean>((pronto) => {
        const medida = () =>
          `${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}x${document.querySelector('main')?.scrollHeight}`
        const antes = medida()
        requestAnimationFrame(() =>
          requestAnimationFrame(() => requestAnimationFrame(() => pronto(medida() === antes))),
        )
      }),
  )
}

test('o registro tem as rotas conhecidas e todas têm id do seed', () => {
  expect(CAMINHOS).toEqual(
    expect.arrayContaining(['/', '/processos', '/agenda', '/logs', '/processos/:id/agc']),
  )
  expect(CAMINHOS).not.toContain('/processos/:id/qgc')
  expect(ENDERECOS.length).toBeGreaterThan(20)
})

for (const janela of JANELAS) {
  test(`nenhuma rota faz a página rolar no ${janela.nome} (${janela.width}×${janela.height})`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: janela.width, height: janela.height })
    await entrarComo(page, 'aj')
    for (const endereco of ENDERECOS) {
      await page.goto(`./#${endereco}`)
      await esperarTela(page)
      const medidas = await page.evaluate(() => {
        // A coluna do Layout é o pai do <main>: ela rola na vertical, nunca na horizontal.
        const coluna = document.querySelector('main')?.parentElement
        return {
          documento: {
            largura: document.documentElement.scrollWidth,
            altura: document.documentElement.scrollHeight,
          },
          sobraHorizontalDaColuna: coluna ? coluna.scrollWidth - coluna.clientWidth : -1,
        }
      })
      expect
        .soft(medidas.documento, `${endereco} rola a página`)
        .toEqual({ largura: janela.width, altura: janela.height })
      expect
        .soft(medidas.sobraHorizontalDaColuna, `${endereco} rola a coluna na horizontal`)
        .toBe(0)
    }
  })
}
