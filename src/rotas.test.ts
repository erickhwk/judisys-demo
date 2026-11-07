// Rotas da SDD §5.6 e a permissão de cada uma (RF-40, PER-04, PER-06, PER-07).
import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { type DefinicaoRota, type RegistroDoModulo, rota } from './definicaoRotas'
import { ABAS } from './modulos/processos/abas'
import { type Papel, pode } from './regras/permissoes'
import { juntarRegistros, ROTAS, ROTAS_SEM_LAYOUT } from './rotas'

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
  // As rotas de antes do AJ-05 e a permissão de cada uma. Rota nova não precisa entrar aqui (o
  // `rotas.tsx` do módulo basta): a tabela guarda que as existentes não mudaram de permissão.
  it.each([
    ['/', 'ler', 'dashboard'],
    ['/processos', 'ler', 'processos'],
    ['/processos/novo', 'editar', 'processos'],
    ['/processos/prc-001/editar', 'editar', 'processos'],
    ['/processos/prc-001/visao-geral', 'ler', 'processos'],
    ['/processos/prc-001/empresas', 'ler', 'empresas'],
    ['/processos/prc-001/credores', 'ler', 'credores'],
    ['/processos/prc-001/prazos', 'ler', 'prazos'],
    ['/processos/prc-001/agc', 'ler', 'agc'],
    ['/processos/prc-001/informes', 'ler', 'informes'],
    ['/processos/prc-001/historico', 'ler', 'logs'],
    ['/processos/prc-001/credores/crd-0001', 'ler', 'credores'],
    ['/processos/prc-001/agc/agc-01', 'ler', 'agc'],
    ['/processos/prc-001/qgc', 'ler', 'credores'],
    ['/empresas', 'ler', 'empresas'],
    ['/empresas/novo', 'editar', 'empresas'],
    ['/empresas/emp-001', 'ler', 'empresas'],
    ['/informes', 'ler', 'informes'],
    ['/informes/novo', 'editar', 'informes'],
    ['/informes/inf-001', 'ler', 'informes'],
    ['/agenda', 'ler', 'prazos'],
    ['/usuarios', 'ler', 'usuarios'],
    ['/logs', 'ler', 'logs'],
  ])('%s está registrada, com permissão %s/%s', (caminho, acao, modulo) => {
    expect(rotaDe(caminho)).toMatchObject({ acao, modulo })
  })

  it('o QGC abre sem o layout (impressão)', () => {
    expect(ROTAS_SEM_LAYOUT.map((rota) => rota.caminho)).toContain('/processos/:id/qgc')
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

const Vazio = () => null

describe('juntarRegistros (AJ-05)', () => {
  const todas = Object.fromEntries(ABAS.map((aba) => [aba, Vazio]))
  const lista = rota('/lista', 'ler', 'processos', null)

  it('junta as rotas dos módulos e gera uma rota por aba, com o conteúdo do módulo dono', () => {
    const { credores, ...resto } = todas
    const { rotas, rotasSemLayout } = juntarRegistros([
      ['a/rotas.tsx', { abas: resto, rotas: [lista] }],
      [
        'b/rotas.tsx',
        { abas: { credores }, rotasSemLayout: [rota('/imp', 'ler', 'credores', null)] },
      ],
      ['c/rotas.ts', {}],
    ])
    expect(rotas.map((r) => r.caminho)).toEqual([
      '/lista',
      ...ABAS.map((aba) => `/processos/:id/${aba}`),
    ])
    expect(rotasSemLayout.map((r) => r.caminho)).toEqual(['/imp'])
  })

  it('arquivo sem o export `registro` é erro, com o nome do arquivo', () => {
    expect(() =>
      juntarRegistros([
        ['a/rotas.tsx', { abas: todas }],
        ['b/rotas.tsx', undefined],
      ]),
    ).toThrow('b/rotas.tsx não exporta `registro`')
  })

  it('aba sem conteúdo é erro', () => {
    const { agc: _, ...semAgc } = todas
    expect(() => juntarRegistros([['a/rotas.tsx', { abas: semAgc }]])).toThrow(
      'abas sem conteúdo: agc',
    )
  })

  it('aba fora de ABAS é erro', () => {
    const abas = { ...todas, credor: Vazio } as RegistroDoModulo['abas']
    expect(() => juntarRegistros([['a/rotas.tsx', { abas }]])).toThrow(
      'aba "credor" de a/rotas.tsx não está em ABAS',
    )
  })

  it('aba declarada por dois módulos é erro', () => {
    expect(() =>
      juntarRegistros([
        ['a/rotas.tsx', { abas: todas }],
        ['b/rotas.tsx', { abas: { agc: Vazio } }],
      ]),
    ).toThrow('aba "agc" declarada em a/rotas.tsx e em b/rotas.tsx')
  })

  it('caminho registrado duas vezes é erro, inclusive contra a rota de uma aba', () => {
    expect(() =>
      juntarRegistros([
        ['a/rotas.tsx', { abas: todas, rotas: [lista] }],
        ['b/rotas.tsx', { rotasSemLayout: [lista] }],
      ]),
    ).toThrow('rota "/lista" registrada duas vezes')
    expect(() =>
      juntarRegistros([
        ['a/rotas.tsx', { abas: todas, rotas: [rota('/processos/:id/agc', 'ler', 'agc', null)] }],
      ]),
    ).toThrow('rota "/processos/:id/agc" registrada duas vezes')
  })
})
