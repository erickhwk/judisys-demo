// Regras do dashboard (RF-07 a RF-10, SDD §7.7) com dados pequenos e "hoje" por parâmetro.
import { describe, expect, it } from 'vitest'
import type { Tipos } from '../../dados/schemas'
import {
  atividadeRecente,
  funilPorFase,
  numerosDoTopo,
  passivoPorClasse,
  proximasAgcs,
  proximosPrazos,
  ultimosInformes,
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

function prazo(id: string, vencimento: string, status: 'aberto' | 'cumprido' = 'aberto') {
  return {
    ...base,
    id,
    processoId: 'prc-1',
    titulo: id,
    vencimento,
    origem: 'manual',
    status,
  } satisfies Tipos['prazos']
}

function agc(
  id: string,
  dataPrimeira: string,
  dataSegunda: string,
  status: Tipos['agcs']['status'] = 'agendada',
): Tipos['agcs'] {
  return { ...base, id, processoId: 'prc-1', dataPrimeira, dataSegunda, pauta: 'Plano', status }
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

describe('numerosDoTopo (RF-07)', () => {
  it('DSH-01 · ativos por tipo, passivo da relação do AJ, credores e prazos', () => {
    const prazos = [
      prazo('vencido', '2026-11-06'),
      prazo('hoje', HOJE),
      prazo('d7', '2026-11-14'),
      prazo('d8', '2026-11-15'),
      prazo('cumprido-vencido', '2026-11-01', 'cumprido'),
      prazo('cumprido-proximo', '2026-11-10', 'cumprido'),
    ]
    expect(numerosDoTopo({ processos: PROCESSOS, credores: CREDORES, prazos }, HOJE)).toEqual({
      ativosRj: 1,
      ativosFalencia: 1,
      passivo: 100_00 + 250_00 + 1_000_00,
      credores: 6,
      prazosVencidos: 1,
      prazosProximos: 2,
    })
  })

  it('DSH-05 · processo em fase final fica fora dos ativos e do passivo', () => {
    const encerrado = PROCESSOS.map((p) =>
      p.id === 'prc-2' ? { ...p, faseAtual: 'encerrada' as const } : p,
    )
    const numeros = numerosDoTopo({ processos: encerrado, credores: CREDORES, prazos: [] }, HOJE)
    expect(numeros).toMatchObject({ ativosRj: 1, ativosFalencia: 0, passivo: 350_00 })
  })
})

describe('funilPorFase (RF-08, T-35)', () => {
  it('toda fase do tipo, na ordem, com zero onde não há processo', () => {
    const rj = funilPorFase(PROCESSOS, 'rj')
    expect(rj.map((e) => e.fase)).toEqual([
      'pedido',
      'processamento-deferido',
      'edital-publicado',
      'relacao-aj-publicada',
      'plano-apresentado',
      'prazo-objecoes',
      'agc',
      'plano-homologado',
      'fiscalizacao',
      'encerrada',
      'convolada-falencia',
      'desistencia',
    ])
    expect(rj.filter((e) => e.quantidade > 0).map((e) => [e.fase, e.quantidade])).toEqual([
      ['plano-apresentado', 1],
      ['encerrada', 1],
      ['convolada-falencia', 1],
    ])
    const falencia = funilPorFase(PROCESSOS, 'falencia')
    expect(falencia).toHaveLength(7)
    expect(falencia[0]).toEqual({ fase: 'decretada', rotulo: 'Decretada', quantidade: 1 })
  })
})

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

describe('proximosPrazos (RF-10)', () => {
  it('DSH-03 · 8 em aberto, vencidos primeiro, depois por data', () => {
    const prazos = [
      prazo('d+20', '2026-11-27'),
      prazo('d-1', '2026-11-06'),
      prazo('d+1', '2026-11-08'),
      prazo('d-30', '2026-10-08'),
      prazo('d0', HOJE),
      prazo('d+3', '2026-11-10'),
      prazo('d+5', '2026-11-12'),
      prazo('d+9', '2026-11-16'),
      prazo('d+60', '2027-01-06'),
      prazo('cumprido', '2026-11-07', 'cumprido'),
    ]
    expect(proximosPrazos(prazos, HOJE).map((p) => p.id)).toEqual([
      'd-30',
      'd-1',
      'd0',
      'd+1',
      'd+3',
      'd+5',
      'd+9',
      'd+20',
    ])
  })
})

describe('proximasAgcs (RF-10)', () => {
  it('DSH-02 · não encerradas, pela próxima convocação; passada a 1ª, vale a 2ª', () => {
    const agcs = [
      agc('agc-d6', '2026-11-13', '2026-11-20'),
      agc('agc-2a', '2026-11-05', '2026-11-12', 'instalada'),
      agc('agc-passada', '2026-10-01', '2026-10-08'),
      agc('agc-encerrada', '2026-11-08', '2026-11-15', 'encerrada'),
    ]
    expect(proximasAgcs(agcs, HOJE).map((p) => [p.agc.id, p.data, p.convocacao])).toEqual([
      ['agc-2a', '2026-11-12', 2],
      ['agc-d6', '2026-11-13', 1],
    ])
  })
})

describe('ultimosInformes e atividadeRecente (RF-10)', () => {
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

  it('logs do mais novo ao mais antigo, 8 no máximo, mantendo a ordem recebida no empate', () => {
    const logs = Array.from(
      { length: 10 },
      (_, i) =>
        ({
          ...base,
          id: `log-${i}`,
          usuarioId: 'usr-aj',
          acao: 'editou',
          colecao: 'credores',
          registroId: 'c1',
          mudancas: [],
          data: i < 2 ? '2026-11-07T09:00:00' : `2026-11-0${(i % 6) + 1}T08:00:00`,
        }) satisfies Tipos['logs'],
    )
    const recentes = atividadeRecente(logs)
    expect(recentes).toHaveLength(8)
    expect(recentes.slice(0, 2).map((l) => l.id)).toEqual(['log-0', 'log-1'])
    const datas = recentes.map((l) => l.data)
    expect(datas).toEqual([...datas].sort().reverse())
  })
})
