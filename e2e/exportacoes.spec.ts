// Exportações CSV das listas de processos, credores e prazos (DMO-22; PRD RF-44; SDD CSV-01,
// CRD-11). Empresas fica em empresas.spec.ts. Usa só o seed: as contagens vêm da própria tela, e
// o arquivo precisa ter todas as linhas do filtro, não só as 50 da página.
import { readFile } from 'node:fs/promises'
import { type Download, expect, type Page, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'))
})

async function entrarComo(page: Page, papel: RegExp): Promise<void> {
  await page.goto('./#/entrar')
  await page.getByRole('button', { name: papel }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible()
}

async function exportar(page: Page): Promise<Download> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Exportar CSV' }).click(),
  ])
  return download
}

/** Cabeçalho e linhas do arquivo baixado (sem a quebra final), conferindo o BOM. */
async function ler(download: Download): Promise<{ cabecalho: string; linhas: string[] }> {
  const conteudo = await readFile(await download.path(), 'utf8')
  expect(conteudo.startsWith('﻿')).toBe(true)
  const [cabecalho = '', ...linhas] = conteudo.slice(1).split('\r\n')
  expect(linhas.pop()).toBe('')
  return { cabecalho, linhas }
}

/** Número num texto da tela: o primeiro ("612 credores") ou o último ("Mostrando 1–3 de 3"). */
function numero(texto: string | null, posicao: 'primeiro' | 'ultimo' = 'primeiro'): number {
  const numeros = texto?.match(/\d+/g) ?? []
  return Number(posicao === 'primeiro' ? numeros[0] : numeros.at(-1))
}

test('CRD-11, CSV-01 · credores da classe III: todas as linhas, com o apelido no nome do arquivo', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Analista/)
  await page.goto('./#/processos/prc-001/credores?classe=quirografario')
  const lista = page.getByRole('region', { name: 'Credores' })
  await expect(lista.locator('tbody tr')).toHaveCount(50)
  const total = numero(await page.getByText(/^\d+ credores$/).textContent())
  expect(total).toBeGreaterThan(50)

  const download = await exportar(page)
  expect(download.suggestedFilename()).toMatch(/^judisys-credores-[a-z0-9-]+-2026-11-07\.csv$/)
  const { cabecalho, linhas } = await ler(download)
  expect(cabecalho).toBe('Credor;CPF/CNPJ;Classe;Natureza;Relação do devedor;Relação do AJ;QGC')
  expect(linhas).toHaveLength(total)
  for (const linha of linhas) expect(linha).toContain(';III · Quirografário;')
})

test('CSV-01 · processos: o que passa no tipo, com CNJ pontuado; analista também exporta', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Analista/)
  await page.goto('./#/processos?tipo=falencia')
  await expect(page.getByRole('heading', { name: 'Processos', level: 1 })).toBeVisible()
  const total = numero(await page.getByText(/^Mostrando /).textContent(), 'ultimo')

  const download = await exportar(page)
  expect(download.suggestedFilename()).toBe('judisys-processos-2026-11-07.csv')
  const { cabecalho, linhas } = await ler(download)
  expect(cabecalho.split(';').slice(0, 4)).toEqual(['Apelido', 'Número CNJ', 'Tipo', 'Fase'])
  expect(linhas).toHaveLength(total)
  for (const linha of linhas) {
    const [, cnj, tipo] = linha.split(';')
    expect(cnj).toMatch(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/)
    expect(tipo).toBe('Falência')
  }
})

test('CSV-01 · agenda: todos os prazos do período, além da página, com datas dd/mm/aaaa', async ({
  page,
}) => {
  await entrarComo(page, /Entrar como Analista/)
  await page.goto('./#/agenda?periodo=todos')
  await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()
  const total = numero(await page.getByText(/^\d+ prazos no filtro$/).textContent())

  const download = await exportar(page)
  expect(download.suggestedFilename()).toBe('judisys-prazos-2026-11-07.csv')
  const { cabecalho, linhas } = await ler(download)
  expect(cabecalho).toBe('Vencimento;Prazo;Base legal;Processo;Responsável;Origem;Situação')
  expect(linhas).toHaveLength(total)
  for (const linha of linhas) expect(linha).toMatch(/^\d{2}\/\d{2}\/\d{4};/)

  // No calendário o botão não aparece: a exportação é da lista.
  await page.getByRole('button', { name: 'Calendário' }).click()
  await expect(page.getByRole('button', { name: 'Exportar CSV' })).toHaveCount(0)
})
