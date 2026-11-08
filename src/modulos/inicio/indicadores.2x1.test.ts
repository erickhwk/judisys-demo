// Cálculos dos quadros 2×1 do início (INI-08, SDD-INI §5.7): passivo por processo, informes e
// prazos cumpridos por mês, com dados pequenos e "hoje" por parâmetro, e os números do seed no
// relógio fixo dos e2e (QDR-09 a QDR-12, conferidos com `pnpm indicadores`).
import { beforeAll, describe, expect, it } from 'vitest'
import { HOJE_FIXO, tabelasDoSeed } from '../../../scripts/indicadores'
import type { TabelasSeed } from '../../dados/carga'
import type { Tipos } from '../../dados/schemas'
import { percentuaisArredondados } from '../../ui/graficos/calculos'
import {
  cumpridosPorMes,
  informesPorMes,
  numerosDoTopo,
  passivoPorClasse,
  passivoPorProcesso,
  rotuloDoMes,
} from './indicadores'

const HOJE = '2026-11-07'
const base = {
  escritorioId: 'esc-1',
  criadoEm: '2026-11-01T10:00',
  atualizadoEm: '2026-11-01T10:00',
}

function processo(id: string, tipo: 'rj' | 'falencia', faseAtual: string): Tipos['processos'] {
  return {
    ...base,
    id,
    apelido: `Processo ${id}`,
    numeroCnj: '0',
    tipo,
    comarca: 'X',
    uf: 'SP',
    vara: 'V',
    email: '',
    consolidacao: 'nenhuma',
    passivoDeclarado: 0,
    responsavelId: 'usr-aj',
    faseAtual: faseAtual as Tipos['processos']['faseAtual'],
  }
}

function credor(id: string, processoId: string, valorAj?: number | null): Tipos['credores'] {
  return {
    ...base,
    id,
    processoId,
    nome: id,
    documento: '0',
    classe: 'quirografario',
    natureza: '',
    valorDevedor: 1,
    ...(valorAj === undefined ? {} : { valorAj }),
  }
}

function prazo(id: string, vencimento: string, status: 'aberto' | 'cumprido'): Tipos['prazos'] {
  return { ...base, id, processoId: 'prc-1', titulo: id, vencimento, origem: 'manual', status }
}

function informe(id: string, data: string, publicadoNoSite = true): Tipos['informes'] {
  return {
    ...base,
    id,
    processoId: 'prc-1',
    titulo: id,
    categoria: 'editais',
    publicadoNoSite,
    data,
    anexos: [],
  }
}

describe('passivoPorProcesso (Q-08)', () => {
  const processos = [
    processo('a', 'rj', 'plano-apresentado'),
    processo('b', 'falencia', 'decretada'),
    processo('c', 'rj', 'deferido'),
    processo('d', 'rj', 'deferido'),
    processo('e', 'rj', 'deferido'),
    processo('f', 'rj', 'pedido'),
    processo('fim', 'rj', 'encerrada'),
    processo('vazio', 'rj', 'pedido'),
  ]
  const credores = [
    credor('a1', 'a', 300_00),
    credor('a2', 'a', 200_00),
    credor('b1', 'b', 900_00),
    credor('c1', 'c', 100_00),
    credor('d1', 'd', 50_00),
    credor('e1', 'e', 10_00),
    // Relação do AJ ainda sem esse credor: não soma, mas o processo tem relação pelo outro.
    credor('e2', 'e', null),
    // Credores sem valor na relação: o processo conta como "sem relação".
    credor('f1', 'f', null),
    credor('f2', 'f'),
    // Encerrado não entra, nem na soma nem na contagem.
    credor('fim1', 'fim', 5000_00),
  ]

  it('os quatro maiores ativos, do maior para o menor, e os ativos sem relação', () => {
    const passivo = passivoPorProcesso(processos, credores)
    expect(passivo.maiores.map((p) => [p.processoId, p.valor])).toEqual([
      ['b', 900_00],
      ['a', 500_00],
      ['c', 100_00],
      ['d', 50_00],
    ])
    expect(passivo.maiores[0]).toMatchObject({ apelido: 'Processo b' })
    expect(passivo.semRelacao).toBe(2)
    expect(passivo.total).toBe(1560_00)
  })

  it('o total é o passivo dos números do topo (QDR-09)', () => {
    const { total } = passivoPorProcesso(processos, credores)
    expect(total).toBe(numerosDoTopo({ processos, credores, prazos: [] }, HOJE).passivo)
  })

  it('relação com valor zero conta como relação', () => {
    const passivo = passivoPorProcesso([processo('z', 'rj', 'pedido')], [credor('z1', 'z', 0)])
    expect(passivo.maiores).toEqual([{ processoId: 'z', apelido: 'Processo z', valor: 0 }])
    expect(passivo.semRelacao).toBe(0)
  })

  it('QDR-15 · sem processo ativo, nada a desenhar', () => {
    expect(passivoPorProcesso([processo('fim', 'rj', 'encerrada')], credores)).toEqual({
      maiores: [],
      semRelacao: 0,
      total: 0,
    })
  })
})

describe('informesPorMes (Q-09)', () => {
  it('os 12 meses até o de hoje, inclusive, com zero nos meses sem informe', () => {
    const meses = informesPorMes(
      [
        informe('fora-antes', '2025-11-30'),
        informe('dez', '2025-12-01'),
        informe('jun-1', '2026-06-10'),
        informe('jun-2', '2026-06-30', false),
        informe('nov', '2026-11-07'),
        // Depois de hoje, no mesmo mês: o mês de hoje conta o que tem data nele.
        informe('nov-depois', '2026-11-20'),
        informe('fora-depois', '2026-12-01'),
      ],
      HOJE,
    )
    expect(meses).toHaveLength(12)
    expect(meses[0]).toEqual({ mes: '2025-12', quantidade: 1 })
    expect(meses.find((m) => m.mes === '2026-06')?.quantidade).toBe(2)
    expect(meses.at(-1)).toEqual({ mes: '2026-11', quantidade: 2 })
    expect(meses.reduce((soma, m) => soma + m.quantidade, 0)).toBe(5)
  })

  it('a virada do ano: em janeiro, a série começa em fevereiro do ano anterior', () => {
    const meses = informesPorMes([], '2027-01-31').map((m) => m.mes)
    expect(meses[0]).toBe('2026-02')
    expect(meses.at(-1)).toBe('2027-01')
  })
})

describe('cumpridosPorMes (Q-10, C-01)', () => {
  it('os 12 meses fechados antes do de hoje, pelo mês do vencimento, só os cumpridos', () => {
    const meses = cumpridosPorMes(
      [
        prazo('fora', '2025-10-31', 'cumprido'),
        prazo('nov-1', '2025-11-01', 'cumprido'),
        prazo('nov-2', '2025-11-30', 'cumprido'),
        prazo('aberto', '2026-03-10', 'aberto'),
        prazo('out', '2026-10-31', 'cumprido'),
        // O mês de hoje ainda não fechou.
        prazo('hoje', '2026-11-02', 'cumprido'),
      ],
      HOJE,
    )
    expect(meses.map((m) => m.mes)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ])
    expect(meses.map((m) => m.quantidade)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
  })

  it('em 31 de março, o último mês fechado é fevereiro', () => {
    expect(cumpridosPorMes([], '2027-03-31').at(-1)?.mes).toBe('2027-02')
  })
})

describe('rotuloDoMes', () => {
  it('nome curto e, com o ano, o ano de dois dígitos', () => {
    expect(rotuloDoMes('2026-09')).toBe('set')
    expect(rotuloDoMes('2025-11', true)).toBe('nov/25')
    expect(rotuloDoMes('2026-01')).toBe('jan')
  })
})

describe('números do seed no relógio fixo (pnpm indicadores)', () => {
  let tabelas: TabelasSeed

  beforeAll(() => {
    tabelas = tabelasDoSeed(HOJE_FIXO)
  })

  it('QDR-09 · total igual ao do topo, quatro barras e 4 processos sem relação do AJ', () => {
    const passivo = passivoPorProcesso(tabelas.processos, tabelas.credores)
    expect(passivo.total).toBe(numerosDoTopo(tabelas, HOJE_FIXO).passivo)
    expect(passivo.total).toBe(54_647_924_641)
    expect(passivo.maiores.map((p) => p.apelido)).toEqual([
      'Grupo Lontra Azul',
      'Gráfica Beija-Flor',
      'Fundição Sapo-Cururu (falência)',
      'Moinho Quero-Quero',
    ])
    expect(passivo.semRelacao).toBe(4)
  })

  it('QDR-10 · informes por mês de dez/25 a nov/26; as 6 últimas no celular', () => {
    const meses = informesPorMes(tabelas.informes, HOJE_FIXO)
    expect(meses[0]?.mes).toBe('2025-12')
    expect(meses.at(-1)?.mes).toBe('2026-11')
    expect(meses.map((m) => m.quantidade)).toEqual([1, 5, 3, 1, 3, 0, 3, 5, 5, 8, 8, 1])
    expect(meses.slice(-6).map((m) => m.quantidade)).toEqual([3, 5, 5, 8, 8, 1])
  })

  it('QDR-11 · prazos cumpridos de nov/25 a out/26, recorde em setembro', () => {
    const meses = cumpridosPorMes(tabelas.prazos, HOJE_FIXO)
    const quantidades = meses.map((m) => m.quantidade)
    expect(meses[0]?.mes).toBe('2025-11')
    expect(meses.at(-1)?.mes).toBe('2026-10')
    expect(quantidades).toEqual([3, 2, 2, 3, 5, 2, 1, 2, 5, 4, 6, 5])
    expect(meses[quantidades.indexOf(Math.max(...quantidades))]?.mes).toBe('2026-09')
  })

  // O QDR-12 lista 56, 20, 12, 7 e 4 (arredondamento simples, que soma 99). A Barra100 usa os maiores
  // restos (somam 100, INI-05), e o Não sujeito (12,44%) leva o ponto que falta: 13%.
  it('QDR-12 · cinco classes somando R$ 389,5 mi, com 56, 20, 13, 7 e 4%', () => {
    const classes = passivoPorClasse(tabelas.processos, tabelas.credores)
      .map((c) => c.valor)
      .sort((a, b) => b - a)
    expect(classes).toHaveLength(5)
    expect(classes.reduce((soma, v) => soma + v, 0)).toBe(38_945_563_679)
    expect(percentuaisArredondados(classes)).toEqual([56, 20, 13, 7, 4])
  })
})
