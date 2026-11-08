// Analista só lê, menos credores (RF-39, RF-40; SDD PER-03 e PER-04; DMO-24). Percorre as telas de
// edição de cada módulo: sem os botões para o analista e com eles para o AJ (assim um rótulo
// trocado não deixa o "sem botão" passar à toa). As rotas de edição abertas direto ficam
// bloqueadas para o analista e abrem para o AJ.
import { expect, type Locator, type Page, test } from '@playwright/test'
import {
  AGORA,
  abrirAgcDaLista,
  abrirAgcDoVitrine,
  CREDOR_IMPUGNACAO,
  entrarComo,
  lerTabela,
  tituloDoInicio,
  trocarPara,
} from './apoio'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA)
})

const VITRINE = './#/processos/prc-001'

interface Tela {
  nome: string
  /** Abre a tela e espera o conteúdo carregar (sem isso, "nenhum botão" passaria antes da hora). */
  abrir: (page: Page) => Promise<void>
  botoes: (page: Page) => Locator[]
}

const botao = (page: Page, nome: string | RegExp) =>
  page.getByRole('button', { name: nome, exact: typeof nome === 'string' })

/**
 * Passa pelo início antes de abrir a rota. Entre rotas da SPA o goto só troca o hash, e a tela
 * anterior continua no DOM até a nova renderizar: sem a parada, uma asserção de "tem 0" (ou uma
 * linha de tabela) passaria olhando a tela velha.
 */
async function irPara(page: Page, rota: string): Promise<void> {
  await page.goto('./#/')
  await expect(tituloDoInicio(page)).toBeVisible()
  await page.goto(rota)
}

async function abrirComLinhas(page: Page, rota: string): Promise<void> {
  await irPara(page, rota)
  await expect(page.locator('tbody tr').first()).toBeVisible()
}

const TELAS: Tela[] = [
  {
    nome: 'lista de processos',
    abrir: (page) => abrirComLinhas(page, './#/processos'),
    botoes: (page) => [
      botao(page, 'Novo processo'),
      botao(page, /^Editar /),
      botao(page, /^Excluir /),
    ],
  },
  {
    nome: 'visão geral do processo',
    abrir: async (page) => {
      await page.goto(`${VITRINE}/visao-geral`)
      await expect(page.getByRole('region', { name: 'Fases' })).toBeVisible()
    },
    botoes: (page) =>
      ['Avançar fase', 'Desfazer fase', 'Editar', 'Excluir'].map((n) => botao(page, n)),
  },
  {
    nome: 'aba Prazos',
    abrir: (page) => abrirComLinhas(page, `${VITRINE}/prazos`),
    botoes: (page) => [
      botao(page, 'Novo prazo'),
      botao(page, /^Marcar ".+" como cumprido$/),
      botao(page, /^Editar "/),
    ],
  },
  {
    nome: 'agenda',
    abrir: (page) => abrirComLinhas(page, './#/agenda'),
    botoes: (page) => [botao(page, 'Novo prazo'), botao(page, /^Editar "/)],
  },
  {
    nome: 'lista de empresas',
    abrir: (page) => abrirComLinhas(page, './#/empresas'),
    botoes: (page) => [botao(page, 'Nova empresa'), botao(page, /^(Editar|Excluir) /)],
  },
  {
    nome: 'empresa',
    abrir: async (page) => {
      await page.goto('./#/empresas')
      await page.getByRole('link', { name: 'Fundição Sapo-Cururu Ltda.' }).click()
      await expect(page.getByLabel('Razão social')).toHaveValue('Fundição Sapo-Cururu Ltda.')
    },
    botoes: (page) => [botao(page, 'Salvar'), botao(page, 'Excluir')],
  },
  {
    nome: 'lista de informes',
    abrir: (page) => abrirComLinhas(page, './#/informes'),
    botoes: (page) => [botao(page, 'Novo informe')],
  },
  {
    nome: 'aba Informes',
    abrir: (page) => abrirComLinhas(page, `${VITRINE}/informes`),
    botoes: (page) => [botao(page, 'Novo informe')],
  },
  {
    nome: 'informe',
    abrir: async (page) => {
      await abrirComLinhas(page, './#/informes')
      await page.locator('tbody tr').first().getByRole('link').first().click()
      await expect(page.getByRole('heading', { name: 'Anexos' })).toBeVisible()
    },
    botoes: (page) => [botao(page, 'Editar')],
  },
  {
    nome: 'aba AGC',
    abrir: async (page) => {
      await page.goto(`${VITRINE}/agc`)
      const lista = page.getByRole('region', { name: 'AGCs do processo' })
      await expect(lista.getByRole('link', { name: '13/11/2026' })).toBeVisible()
    },
    botoes: (page) => [botao(page, 'Nova AGC')],
  },
  {
    nome: 'AGC agendada',
    abrir: async (page) => {
      await abrirAgcDoVitrine(page)
      const lista = page.getByRole('region', { name: 'Lista de presença', exact: true })
      await expect(lista.getByRole('checkbox').first()).toBeVisible()
    },
    botoes: (page) => [
      botao(page, 'Editar'),
      botao(page, /^Todos da classe /),
      botao(page, /^Instalar em /),
      botao(page, 'Registrar resultado'),
    ],
  },
]

test('PER-03 · analista não vê botões de edição; credores continuam editáveis', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  for (const tela of TELAS) {
    await test.step(tela.nome, async () => {
      await tela.abrir(page)
      for (const alvo of tela.botoes(page)) await expect(alvo, tela.nome).toHaveCount(0)
    })
  }
  await test.step('presença da AGC só leitura', async () => {
    await irPara(page, `${VITRINE}/agc`)
    await abrirAgcDaLista(page)
    const lista = page.getByRole('region', { name: 'Lista de presença', exact: true })
    await expect(lista.getByRole('checkbox').first()).toBeDisabled()
  })
  await test.step('menu sem Usuários', async () => {
    await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
  })

  // Credores: o analista edita (RF-39).
  await test.step('credores', async () => {
    await page.goto(`${VITRINE}/credores`)
    await expect(botao(page, 'Novo credor')).toBeVisible()
    await page.goto(CREDOR_IMPUGNACAO.rota)
    await expect(page.getByRole('heading', { name: CREDOR_IMPUGNACAO.nome })).toBeVisible()
    await expect(botao(page, 'Editar')).toBeVisible()
    await expect(botao(page, 'Registrar pedido')).toBeVisible()
  })
})

test('PER-03 · o AJ vê os mesmos botões (contraprova dos rótulos)', async ({ page }) => {
  await entrarComo(page, 'aj')
  for (const tela of TELAS) {
    await test.step(tela.nome, async () => {
      await tela.abrir(page)
      for (const alvo of tela.botoes(page)) await expect(alvo.first(), tela.nome).toBeVisible()
    })
  }
})

/** Rotas de edição (acao 'editar' nos `rotas.tsx`) e Usuários, que o analista nem lê. */
const ROTAS_DE_EDICAO = [
  { rota: './#/processos/novo', titulo: 'Novo processo' },
  { rota: `${VITRINE}/editar`, titulo: 'Editar processo' },
  { rota: './#/empresas/novo', titulo: 'Nova empresa' },
  { rota: './#/informes/novo', titulo: 'Novo informe' },
  { rota: './#/usuarios', titulo: 'Usuários' },
]

test('PER-04 · rotas de edição abertas direto: bloqueadas para o analista, abertas para o AJ', async ({
  page,
}) => {
  await entrarComo(page, 'analista')
  for (const { rota, titulo } of ROTAS_DE_EDICAO) {
    await test.step(`analista em ${rota}`, async () => {
      await irPara(page, rota)
      await expect(page.getByRole('alert'), rota).toContainText('Seu papel não permite esta ação')
      await expect(page.getByRole('heading', { name: titulo, level: 1 })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Salvar' })).toHaveCount(0)
    })
  }

  // O modo de edição do informe pela URL (`?editar=1`) fica só leitura.
  const [informe] = await lerTabela(page, 'informes')
  if (!informe) throw new Error('seed sem informes')
  const edicaoDoInforme = `./#/informes/${informe.id}?editar=1`
  await irPara(page, edicaoDoInforme)
  await expect(page.getByRole('heading', { name: 'Anexos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)

  await trocarPara(page, 'aj')
  // Contraprova: a mesma URL abre o formulário para o AJ.
  await irPara(page, edicaoDoInforme)
  await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible()
  for (const { rota, titulo } of ROTAS_DE_EDICAO) {
    await test.step(`AJ em ${rota}`, async () => {
      await irPara(page, rota)
      await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
      await expect(page.getByText('Seu papel não permite esta ação')).toHaveCount(0)
    })
  }
})
