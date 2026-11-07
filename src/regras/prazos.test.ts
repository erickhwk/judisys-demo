import { describe, expect, it } from 'vitest'
import type { Fase } from './fases'
import {
  type MarcoParaPrazos,
  type NovoPrazoAutomatico,
  novoRma,
  prazosDoMarco,
  proximoRma,
  situacao,
  TITULO_OBJECOES,
  TITULO_RMA,
} from './prazos'

const rj = { id: 'prc-001', tipo: 'rj' as const }
const falencia = { id: 'prc-002', tipo: 'falencia' as const }
const D = '2026-11-07'

function marco(fase: Fase, data: string, id?: string): MarcoParaPrazos {
  return id === undefined ? { fase, data } : { id, fase, data }
}

/** `titulo → vencimento`, para comparar sem depender da ordem. */
function vencimentos(prazos: NovoPrazoAutomatico[]): Record<string, string> {
  return Object.fromEntries(prazos.map((p) => [p.titulo, p.vencimento]))
}

describe('prazosDoMarco (RF-22, C-02 a C-06)', () => {
  it('PRC-01 · edital → habilitações D+15 e relação do AJ D+60', () => {
    const edital = marco('edital-publicado', D)
    const prazos = prazosDoMarco(rj, edital, [
      marco('processamento-deferido', '2026-10-01'),
      edital,
    ])
    expect(vencimentos(prazos)).toEqual({
      'Habilitações e divergências': '2026-11-22',
      'Relação do AJ': '2027-01-06',
    })
  })

  it('PRC-02 · processamento deferido → stay, plano, AGC e RMA', () => {
    const prazos = prazosDoMarco(rj, marco('processamento-deferido', D), [marco('pedido', D)])
    expect(vencimentos(prazos)).toEqual({
      'Stay period': '2027-05-06',
      'Apresentação do plano': '2027-01-06',
      'Realização da AGC': '2027-04-06',
      [TITULO_RMA]: '2026-11-15',
    })
  })

  it('cada prazo leva base legal, origem automática, status aberto, processo e marco', () => {
    const prazos = prazosDoMarco(rj, marco('processamento-deferido', D, 'mrc-1'), [])
    expect(prazos.map((p) => p.baseLegal)).toEqual([
      'art. 6º, §4º',
      'art. 53',
      'art. 56, §1º',
      'art. 22, II, "c"',
    ])
    for (const prazo of prazos) {
      expect(prazo).toMatchObject({
        processoId: 'prc-001',
        origem: 'automatico',
        status: 'aberto',
        marcoId: 'mrc-1',
      })
    }
  })

  it('marco sem id não leva marcoId', () => {
    const [prazo] = prazosDoMarco(rj, marco('relacao-aj-publicada', D), [])
    expect(prazo).not.toHaveProperty('marcoId')
  })

  it('relação do AJ → impugnações D+10 (art. 8º)', () => {
    const prazos = prazosDoMarco(rj, marco('relacao-aj-publicada', D), [])
    expect(prazos).toEqual([
      expect.objectContaining({
        titulo: 'Impugnações',
        baseLegal: 'art. 8º',
        vencimento: '2026-11-17',
      }),
    ])
  })

  it('C-03 · plano homologado → fim da supervisão judicial em 2 anos (art. 61)', () => {
    const prazos = prazosDoMarco(rj, marco('plano-homologado', D), [])
    expect(prazos).toEqual([
      expect.objectContaining({
        titulo: 'Fim do prazo de supervisão judicial',
        baseLegal: 'art. 61',
        vencimento: '2028-11-07',
      }),
    ])
  })

  it('PRC-03 · objeções contadas do plano (plano posterior à relação)', () => {
    const relacao = marco('relacao-aj-publicada', '2026-10-01')
    const plano = marco('plano-apresentado', D)
    const prazos = prazosDoMarco(rj, plano, [relacao, plano])
    expect(prazos).toEqual([
      expect.objectContaining({
        titulo: TITULO_OBJECOES,
        baseLegal: 'art. 55',
        vencimento: '2026-12-07',
      }),
    ])
  })

  it('PRC-04 · objeções contadas da relação do AJ, criadas pelo marco da relação', () => {
    const plano = marco('plano-apresentado', '2026-10-01')
    const relacao = marco('relacao-aj-publicada', D)
    expect(vencimentos(prazosDoMarco(rj, relacao, [plano]))).toEqual({
      Impugnações: '2026-11-17',
      [TITULO_OBJECOES]: '2026-12-07',
    })
  })

  it('relação do AJ sem plano apresentado não cria objeções', () => {
    const prazos = prazosDoMarco(rj, marco('relacao-aj-publicada', D), [marco('pedido', D)])
    expect(prazos.map((p) => p.titulo)).not.toContain(TITULO_OBJECOES)
  })

  it('PRC-05 · falência decretada → D+15, D+40, D+60 (C-02, C-06)', () => {
    const prazos = prazosDoMarco(falencia, marco('decretada', D), [])
    expect(prazos.map((p) => [p.titulo, p.baseLegal, p.vencimento])).toEqual([
      ['Habilitações', 'art. 7º, §1º', '2026-11-22'],
      ['Relatório do AJ', 'art. 22, III, "e"', '2026-12-17'],
      ['Plano detalhado de realização dos ativos', 'art. 99, §3º', '2027-01-06'],
    ])
  })

  it('PRC-06 · arrecadação → realização dos ativos D+180 (C-02)', () => {
    const prazos = prazosDoMarco(falencia, marco('arrecadacao', D), [
      marco('decretada', '2026-10-01'),
    ])
    expect(prazos.map((p) => [p.titulo, p.baseLegal, p.vencimento])).toEqual([
      ['Realização dos ativos', 'art. 99, §3º', '2027-05-06'],
    ])
  })

  it('PRC-07 · fase pulada não gera prazos (T-28)', () => {
    // De "processamento deferido" direto para "plano apresentado": só as objeções do plano.
    const plano = marco('plano-apresentado', D)
    const prazos = prazosDoMarco(rj, plano, [marco('processamento-deferido', '2026-09-01'), plano])
    expect(prazos.map((p) => p.titulo)).toEqual([TITULO_OBJECOES])
    expect(prazos[0]?.vencimento).toBe('2026-12-07')
  })

  it.each<Fase>([
    'pedido',
    'prazo-objecoes',
    'agc',
    'fiscalizacao',
    'encerrada',
    'convolada-falencia',
  ])('RJ "%s" não cria prazos', (fase) => {
    expect(prazosDoMarco(rj, marco(fase, D), [])).toEqual([])
  })

  it('fase de RJ num processo de falência não cria prazos', () => {
    expect(prazosDoMarco(falencia, marco('processamento-deferido', D), [])).toEqual([])
    expect(prazosDoMarco(falencia, marco('plano-apresentado', D), [])).toEqual([])
  })
})

describe('proximoRma (RF-22)', () => {
  it('antes do dia 15 → dia 15 do mesmo mês', () => {
    expect(proximoRma('2026-11-07')).toBe('2026-11-15')
    expect(proximoRma('2026-11-14')).toBe('2026-11-15')
  })

  it('PRZ-05 · marco no dia 15 → RMA no dia 15 do mês seguinte', () => {
    expect(proximoRma('2026-11-15')).toBe('2026-12-15')
    expect(prazosDoMarco(rj, marco('processamento-deferido', '2026-11-15'), [])).toContainEqual(
      expect.objectContaining({ titulo: TITULO_RMA, vencimento: '2026-12-15' }),
    )
  })

  it('depois do dia 15 → dia 15 do mês seguinte', () => {
    expect(proximoRma('2026-11-30')).toBe('2026-12-15')
  })

  it('PRZ-02 · RMA de dezembro → janeiro do ano seguinte', () => {
    expect(proximoRma('2026-12-15')).toBe('2027-01-15')
    expect(novoRma('prc-001', '2026-12-15')).toEqual({
      processoId: 'prc-001',
      titulo: TITULO_RMA,
      baseLegal: 'art. 22, II, "c"',
      vencimento: '2027-01-15',
      origem: 'automatico',
      status: 'aberto',
    })
  })
})

describe('situacao (RF-24)', () => {
  const hoje = '2026-11-07'
  const aberto = (vencimento: string) => ({ status: 'aberto' as const, vencimento })

  it('PRZ-06 · vencido / D+3 / D+4', () => {
    expect(situacao(aberto('2026-11-06'), hoje)).toBe('vencido')
    expect(situacao(aberto('2026-11-10'), hoje)).toBe('urgente')
    expect(situacao(aberto('2026-11-11'), hoje)).toBe('normal')
  })

  it('vence hoje é urgente, não vencido', () => {
    expect(situacao(aberto(hoje), hoje)).toBe('urgente')
  })

  it('PRZ-07 · cumprido vencido sem destaque', () => {
    expect(situacao({ status: 'cumprido', vencimento: '2026-10-01' }, hoje)).toBe('cumprido')
  })
})
