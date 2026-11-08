// Regras do início (antes dashboard: RF-07 a RF-10, SDD §7.7) com dados pequenos e "hoje" por parâmetro.
import { describe, expect, it } from 'vitest'
import type { Tipos } from '../../dados/schemas'
import { passivoPorClasse, ultimosInformes } from './indicadores'

const base = {
  escritorioId: 'esc-1',
  criadoEm: '2026-11-01T10:00',
  atualizadoEm: '2026-11-01T10:00',
}

function processo(id: string, tipo: 'rj' | 'falencia', faseAtual: string): Tipos['processos'] {
  return {
    ...base,
    id,
    apelido: id,
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

function credor(
  id: string,
  processoId: string,
  classe: Tipos['credores']['classe'],
  valorAj: number | null,
): Tipos['credores'] {
  return {
    ...base,
    id,
    processoId,
    nome: id,
    documento: '0',
    classe,
    natureza: '',
    valorDevedor: 1,
    valorAj,
  }
}

const PROCESSOS = [
  processo('prc-1', 'rj', 'plano-apresentado'),
  processo('prc-2', 'falencia', 'decretada'),
  processo('prc-3', 'rj', 'encerrada'),
  processo('prc-4', 'rj', 'convolada-falencia'),
]
const CREDORES = [
  credor('c1', 'prc-1', 'trabalhista', 100_00),
  credor('c2', 'prc-1', 'quirografario', 250_00),
  credor('c3', 'prc-1', 'quirografario', null),
  credor('c4', 'prc-2', 'tributario', 1_000_00),
  credor('c5', 'prc-3', 'trabalhista', 9_999_00),
  credor('c6', 'prc-4', 'quirografario', 7_777_00),
]

describe('passivoPorClasse (RF-09)', () => {
  it('soma a relação do AJ das RJs ativas por classe, com as cinco classes da RJ', () => {
    expect(passivoPorClasse(PROCESSOS, CREDORES)).toEqual([
      { classe: 'trabalhista', rotulo: 'I · Trabalhista', valor: 100_00 },
      { classe: 'garantia-real', rotulo: 'II · Garantia real', valor: 0 },
      { classe: 'quirografario', rotulo: 'III · Quirografário', valor: 250_00 },
      { classe: 'me-epp', rotulo: 'IV · ME/EPP', valor: 0 },
      { classe: 'nao-sujeito', rotulo: 'Não sujeito', valor: 0 },
    ])
  })
})

describe('ultimosInformes (RF-10)', () => {
  it('informes do mais novo ao mais antigo, 5 no máximo', () => {
    const informes = [
      '2026-10-01',
      '2026-11-05',
      '2026-09-01',
      '2026-11-06',
      '2026-08-01',
      '2026-11-01',
    ].map(
      (data, i) =>
        ({
          ...base,
          id: `inf-${i}`,
          processoId: 'prc-1',
          titulo: data,
          categoria: 'editais',
          publicadoNoSite: true,
          data,
          anexos: [],
        }) satisfies Tipos['informes'],
    )
    expect(ultimosInformes(informes).map((i) => i.data)).toEqual([
      '2026-11-06',
      '2026-11-05',
      '2026-11-01',
      '2026-10-01',
      '2026-09-01',
    ])
  })
})
