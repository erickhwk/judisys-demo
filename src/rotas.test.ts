// Rotas da SDD §5.6 e a permissão de cada uma (RF-40, PER-04, PER-06, PER-07).
import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { type Papel, pode } from './regras/permissoes'
import { type DefinicaoRota, ROTAS, ROTAS_SEM_LAYOUT } from './rotas'

const TODAS = [...ROTAS, ...ROTAS_SEM_LAYOUT]

/** A definição que o roteador usa para `caminho`, ou `undefined` (página não encontrada). */
function rotaDe(caminho: string): DefinicaoRota | undefined {
  const casadas = matchRoutes(
    TODAS.map((rota) => ({ path: rota.caminho, rota })),
    caminho,
  )
  return casadas?.at(-1)?.route.rota
}

function abre(papel: Papel, caminho: string): boolean {
  const rota = rotaDe(caminho)
  if (!rota) throw new Error(`rota não registrada: ${caminho}`)
  return pode(papel, rota.acao, rota.modulo)
}

describe('rotas (SDD §5.6)', () => {
  it.each([
    '/',
    '/processos',
    '/processos/novo',
    '/processos/prc-001/editar',
    '/processos/prc-001/visao-geral',
    '/processos/prc-001/empresas',
    '/processos/prc-001/credores',
    '/processos/prc-001/prazos',
    '/processos/prc-001/agc',
    '/processos/prc-001/informes',
    '/processos/prc-001/historico',
    '/processos/prc-001/credores/crd-0001',
    '/processos/prc-001/agc/agc-01',
    '/processos/prc-001/qgc',
    '/empresas',
    '/empresas/novo',
    '/empresas/emp-001',
    '/informes',
    '/informes/novo',
    '/informes/inf-001',
    '/agenda',
    '/usuarios',
    '/logs',
  ])('%s está registrada', (caminho) => {
    expect(rotaDe(caminho)).toBeDefined()
  })

  it('caminho fora da tabela não casa com nenhuma rota (página não encontrada)', () => {
    expect(rotaDe('/nao-existe')).toBeUndefined()
    expect(rotaDe('/processos/prc-001/outra-aba')).toBeUndefined()
  })

  it('cada caminho aparece uma vez', () => {
    const caminhos = TODAS.map((rota) => rota.caminho)
    expect(new Set(caminhos).size).toBe(caminhos.length)
  })

  it('"novo" casa com o formulário, não com o detalhe', () => {
    expect(rotaDe('/empresas/novo')?.acao).toBe('editar')
    expect(rotaDe('/informes/novo')?.acao).toBe('editar')
  })

  it('PER-04 · analista não abre as rotas de edição de processos, empresas e informes', () => {
    expect(abre('analista', '/processos/novo')).toBe(false)
    expect(abre('analista', '/processos/prc-001/editar')).toBe(false)
    expect(abre('analista', '/empresas/novo')).toBe(false)
    expect(abre('analista', '/informes/novo')).toBe(false)
    expect(abre('aj', '/processos/novo')).toBe(true)
    expect(abre('advogado', '/processos/novo')).toBe(true)
  })

  it('PER-06 · usuários: advogado lê, analista não', () => {
    expect(abre('aj', '/usuarios')).toBe(true)
    expect(abre('advogado', '/usuarios')).toBe(true)
    expect(abre('analista', '/usuarios')).toBe(false)
  })

  it('PER-07 · analista abre logs, histórico, dashboard e as telas de consulta', () => {
    for (const caminho of [
      '/',
      '/logs',
      '/processos/prc-001/historico',
      '/processos/prc-001/visao-geral',
      '/processos/prc-001/agc/agc-01',
      '/processos/prc-001/qgc',
      '/empresas/emp-001',
      '/informes/inf-001',
      '/agenda',
    ]) {
      expect(abre('analista', caminho), caminho).toBe(true)
    }
  })
})
