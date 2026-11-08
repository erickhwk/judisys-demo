// `pnpm indicadores` (SDD-INI §10): roda o script de verdade e confere os números do topo e o
// passivo por classe contra a conta do teste do dashboard (DSH-01), feita aqui à mão sobre o seed.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { TabelasSeed } from '../src/dados/carga'
import { somarDias } from '../src/regras/datas'
import { ehFaseFinal } from '../src/regras/fases'
import { CLASSES_RJ, rotuloClasse } from '../src/regras/qgc'
import { HOJE_FIXO, tabelasDoSeed } from './indicadores'

const raiz = join(import.meta.dirname, '..')

let saida: string
let tabelas: TabelasSeed

beforeAll(() => {
  saida = execFileSync(join(raiz, 'node_modules', '.bin', 'tsx'), ['scripts/indicadores.ts'], {
    cwd: raiz,
    encoding: 'utf8',
  })
  tabelas = tabelasDoSeed(HOJE_FIXO)
}, 60_000)

/** Linhas `rótulo: valor` do bloco cujo título começa com `titulo`. */
function bloco(titulo: string): Map<string, string> {
  const inicio = saida.indexOf(`## ${titulo}`)
  if (inicio === -1) throw new Error(`bloco ${titulo} não encontrado`)
  const fim = saida.indexOf('\n## ', inicio + 1)
  const linhas = saida
    .slice(inicio, fim === -1 ? undefined : fim)
    .split('\n')
    .slice(1)
  return new Map(
    linhas
      .filter((l) => l.includes(': '))
      .map((l) => [l.slice(0, l.indexOf(': ')), l.slice(l.indexOf(': ') + 2)]),
  )
}

const centavos = (valor: string | undefined) => Number(/^(\d+) centavos/.exec(valor ?? '')?.[1])

describe('pnpm indicadores', () => {
  it('imprime também quando o caminho do script passa por um link simbólico', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'indicadores-'))
    try {
      const link = join(pasta, 'repo')
      symlinkSync(raiz, link)
      const viaLink = execFileSync(
        join(raiz, 'node_modules', '.bin', 'tsx'),
        [join(link, 'scripts', 'indicadores.ts')],
        { cwd: raiz, encoding: 'utf8' },
      )
      expect(viaLink).toBe(saida)
    } finally {
      rmSync(pasta, { recursive: true, force: true })
    }
  }, 60_000)

  it(`usa o relógio fixo dos e2e (${HOJE_FIXO})`, () => {
    expect(saida.split('\n')[0]).toBe('Indicadores do seed com hoje = 2026-11-07')
  })

  it('DSH-01 · números do topo iguais à conta do teste do dashboard', () => {
    const topo = bloco('Números do topo')
    const ativos = tabelas.processos.filter((p) => !ehFaseFinal(p.faseAtual))
    const idsAtivos = new Set(ativos.map((p) => p.id))
    const abertos = tabelas.prazos.filter((p) => p.status === 'aberto')
    const ateD7 = somarDias(HOJE_FIXO, 7)

    expect(Number(topo.get('RJ ativas'))).toBe(ativos.filter((p) => p.tipo === 'rj').length)
    expect(Number(topo.get('Falências ativas'))).toBe(
      ativos.filter((p) => p.tipo === 'falencia').length,
    )
    expect(Number(topo.get('Processos ativos'))).toBe(ativos.length)
    expect(Number(topo.get('Credores'))).toBe(tabelas.credores.length)
    expect(centavos(topo.get('Passivo (relação do AJ, ativos)'))).toBe(
      tabelas.credores
        .filter((c) => idsAtivos.has(c.processoId))
        .reduce((soma, c) => soma + (c.valorAj ?? 0), 0),
    )
    expect(Number(topo.get('Prazos vencidos'))).toBe(
      abertos.filter((p) => p.vencimento < HOJE_FIXO).length,
    )
    expect(Number(topo.get('Prazos nos próximos 7 dias'))).toBe(
      abertos.filter((p) => p.vencimento >= HOJE_FIXO && p.vencimento <= ateD7).length,
    )
    for (const [rotulo, valor] of topo)
      expect(Number.parseInt(valor, 10), rotulo).toBeGreaterThan(0)
  })

  it('passivo por classe das RJ ativas igual à soma da relação do AJ por classe (F-10)', () => {
    const classes = bloco('Passivo por classe')
    const rjsAtivas = new Set(
      tabelas.processos
        .filter((p) => p.tipo === 'rj' && !ehFaseFinal(p.faseAtual))
        .map((p) => p.id),
    )
    let total = 0
    for (const classe of CLASSES_RJ) {
      const soma = tabelas.credores
        .filter((c) => rjsAtivas.has(c.processoId) && c.classe === classe)
        .reduce((s, c) => s + (c.valorAj ?? 0), 0)
      total += soma
      expect(centavos(classes.get(rotuloClasse(classe, 'rj'))), classe).toBe(soma)
    }
    expect(centavos(classes.get('Total'))).toBe(total)
    expect(classes.get('Total')).toContain('R$ 389,5 mi')
  })

  it('imprime a frase-resumo do início igual à do CAB-03', () => {
    const resumo = bloco('Frase-resumo do início')
    expect(resumo.get('Prazos vencidos')).toBe('3')
    expect(resumo.get('Prazos de hoje')).toBe('1')
    expect(resumo.get('AGC nos próximos 7 dias')).toBe('2026-11-13 · Grupo Lontra Azul')
  })

  it('QDR-01/QDR-02/QDR-04 · imprime os números dos quadros 1×1 (INI-06)', () => {
    expect(Object.fromEntries(bloco('Prazos em aberto por urgência'))).toEqual({
      'Em aberto': '19',
      Vencidos: '3',
      Hoje: '1',
      'De D+1 a D+7': '1',
      'De D+8 a D+30': '6',
      Depois: '8',
    })
    expect(Object.fromEntries(bloco('Próxima AGC agendada'))).toEqual({
      Processo: 'Grupo Lontra Azul',
      '1ª convocação': '2026-11-13',
      '2ª convocação': '2026-11-20',
    })
    expect(Object.fromEntries(bloco('Pedidos de crédito por status'))).toEqual({
      Pendentes: '8',
      Acolhidos: '25',
      Rejeitados: '17',
      'Processo com mais pendentes': 'Transportes Jabuticaba (5)',
    })
  })
})
