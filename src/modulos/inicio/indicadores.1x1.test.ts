// Cálculos dos quadros 1×1 do início (INI-06, SDD-INI §5.7): prazos por urgência (Q-01), próxima
// AGC (Q-02) e pedidos de crédito por status (Q-03), com dados pequenos e "hoje" por parâmetro. Os
// números do seed (QDR-01, QDR-02, QDR-04) estão em scripts/indicadores.test.ts.
import { describe, expect, it } from 'vitest'
import type { Tipos } from '../../dados/schemas'
import { pedidosPorStatus, prazosPorUrgencia, proximaAgc } from './indicadores'

const HOJE = '2026-11-07'
const base = {
  escritorioId: 'esc-1',
  criadoEm: '2026-11-01T10:00',
  atualizadoEm: '2026-11-01T10:00',
}

function prazo(vencimento: string, status: 'aberto' | 'cumprido' = 'aberto'): Tipos['prazos'] {
  return {
    ...base,
    id: `prz-${vencimento}-${status}`,
    processoId: 'prc-1',
    titulo: 'Prazo',
    vencimento,
    origem: 'manual',
    status,
  }
}

function agc(
  id: string,
  dataPrimeira: string,
  status: Tipos['agcs']['status'] = 'agendada',
): Tipos['agcs'] {
  return {
    ...base,
    id,
    processoId: 'prc-1',
    dataPrimeira,
    dataSegunda: '2026-11-30',
    pauta: 'Plano',
    status,
  }
}

function pedido(
  id: string,
  processoId: string,
  status: Tipos['pedidosDeCredito']['status'],
): Tipos['pedidosDeCredito'] {
  return {
    ...base,
    id,
    processoId,
    credorId: 'crd-1',
    tipo: 'habilitacao',
    valorPedido: 100_00,
    classePedida: 'quirografario',
    status,
    data: '2026-10-01',
  }
}

const ZERADO = { abertos: 0, vencidos: 0, hoje: 0, ate7Dias: 0, ate30Dias: 0, depois: 0 }

describe('prazosPorUrgencia (Q-01)', () => {
  it('conta só os abertos, em faixas que não se cruzam', () => {
    const prazos = [
      prazo('2026-11-06'),
      prazo('2026-08-09'),
      prazo(HOJE),
      prazo('2026-11-08'),
      prazo('2026-11-14'), // D+7: ainda na faixa de 7 dias
      prazo('2026-11-15'), // D+8
      prazo('2026-12-07'), // D+30
      prazo('2026-12-08'), // D+31
      prazo('2026-11-01', 'cumprido'),
      prazo('2026-11-10', 'cumprido'),
    ]
    expect(prazosPorUrgencia(prazos, HOJE)).toEqual({
      abertos: 8,
      vencidos: 2,
      hoje: 1,
      ate7Dias: 2,
      ate30Dias: 2,
      depois: 1,
    })
  })

  it('QDR-15 · sem prazo em aberto, tudo zero', () => {
    expect(prazosPorUrgencia([prazo(HOJE, 'cumprido')], HOJE)).toEqual(ZERADO)
    expect(prazosPorUrgencia([], HOJE)).toEqual(ZERADO)
  })
})

describe('proximaAgc (Q-02)', () => {
  it('a primeira agendada de hoje em diante, pela 1ª convocação e depois pelo id', () => {
    const agcs = [
      agc('agc-c', '2026-11-20'),
      agc('agc-b', '2026-11-13'),
      agc('agc-a', '2026-11-13'),
      agc('agc-passada', '2026-11-06'),
      agc('agc-instalada', '2026-11-08', 'instalada'),
      agc('agc-encerrada', '2026-11-09', 'encerrada'),
    ]
    expect(proximaAgc(agcs, HOJE)?.id).toBe('agc-a')
  })

  it('a de hoje conta', () => {
    expect(proximaAgc([agc('agc-hoje', HOJE)], HOJE)?.id).toBe('agc-hoje')
  })

  it('QDR-03 · sem AGC agendada de hoje em diante, null', () => {
    const agcs = [agc('agc-passada', '2026-11-06'), agc('agc-instalada', '2026-11-20', 'instalada')]
    expect(proximaAgc(agcs, HOJE)).toBeNull()
    expect(proximaAgc([], HOJE)).toBeNull()
  })
})

describe('pedidosPorStatus (Q-03)', () => {
  it('conta por status e acha o processo com mais pendentes', () => {
    const pedidos = [
      pedido('p1', 'prc-2', 'pendente'),
      pedido('p2', 'prc-2', 'pendente'),
      pedido('p3', 'prc-1', 'pendente'),
      pedido('p4', 'prc-1', 'acolhido'),
      pedido('p5', 'prc-1', 'acolhido'),
      pedido('p6', 'prc-3', 'rejeitado'),
    ]
    expect(pedidosPorStatus(pedidos)).toEqual({
      pendentes: 3,
      acolhidos: 2,
      rejeitados: 1,
      maisPendentes: { processoId: 'prc-2', pendentes: 2 },
    })
  })

  it('no empate de pendentes, o processo de menor id', () => {
    const pedidos = [pedido('p1', 'prc-9', 'pendente'), pedido('p2', 'prc-3', 'pendente')]
    expect(pedidosPorStatus(pedidos).maisPendentes).toEqual({ processoId: 'prc-3', pendentes: 1 })
  })

  it('QDR-15 · sem pendentes, sem processo; sem pedidos, tudo zero', () => {
    expect(pedidosPorStatus([pedido('p1', 'prc-1', 'acolhido')]).maisPendentes).toBeNull()
    expect(pedidosPorStatus([])).toEqual({
      pendentes: 0,
      acolhidos: 0,
      rejeitados: 0,
      maisPendentes: null,
    })
  })
})
