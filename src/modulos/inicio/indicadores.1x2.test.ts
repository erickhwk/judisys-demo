// Cálculos dos quadros 1×2 do início (INI-07, SDD-INI §5.7, C-05): próximos prazos do quadro,
// calendário do mês e o destaque do pé do calendário. Dados pequenos e "hoje" por parâmetro; os
// casos do seed (QDR-05, QDR-06) usam o relógio fixo dos e2e, os mesmos números do `pnpm indicadores`.
import { describe, expect, it } from 'vitest'
import { HOJE_FIXO, tabelasDoSeed } from '../../../scripts/indicadores'
import type { Tipos } from '../../dados/schemas'
import {
  datasDeAgc,
  destaqueDoMes,
  LIMITE_PROXIMOS_DO_QUADRO,
  prazosDoMes,
  proximosDoQuadro,
} from './indicadores'

const HOJE = '2026-11-07'
const base = {
  escritorioId: 'esc-1',
  criadoEm: '2026-11-01T10:00',
  atualizadoEm: '2026-11-01T10:00',
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
  extra: Partial<Pick<Tipos['agcs'], 'status' | 'convocacaoInstalada'>> = {},
): Tipos['agcs'] {
  return {
    ...base,
    id,
    processoId: 'prc-1',
    dataPrimeira,
    dataSegunda,
    pauta: 'Plano',
    status: 'agendada',
    ...extra,
  }
}

describe('proximosDoQuadro (Q-04, C-05)', () => {
  it('seis prazos em aberto, vencidos primeiro, e quantos sobram', () => {
    const prazos = [
      prazo('d+20', '2026-11-27'),
      prazo('d-1', '2026-11-06'),
      prazo('d+1', '2026-11-08'),
      prazo('d-30', '2026-10-08'),
      prazo('d0', HOJE),
      prazo('d+3', '2026-11-10'),
      prazo('d+5', '2026-11-12'),
      prazo('d+9', '2026-11-16'),
      prazo('cumprido', '2026-11-07', 'cumprido'),
    ]
    const { prazos: mostrados, restantes } = proximosDoQuadro(prazos, HOJE)
    expect(mostrados.map((p) => p.id)).toEqual(['d-30', 'd-1', 'd0', 'd+1', 'd+3', 'd+5'])
    expect(restantes).toBe(2)
  })

  it('com menos de seis, mostra todos e não sobra nenhum', () => {
    const { prazos: mostrados, restantes } = proximosDoQuadro([prazo('a', '2026-11-08')], HOJE)
    expect(mostrados).toHaveLength(1)
    expect(restantes).toBe(0)
  })

  it('QDR-05 · seed: seis prazos, vencidos primeiro, e "+ 13" na agenda', () => {
    const tabelas = tabelasDoSeed(HOJE_FIXO)
    const { prazos: mostrados, restantes } = proximosDoQuadro(tabelas.prazos, HOJE_FIXO)
    expect(mostrados).toHaveLength(LIMITE_PROXIMOS_DO_QUADRO)
    expect(mostrados.map((p) => p.vencimento)).toEqual([
      '2026-08-09',
      '2026-10-15',
      '2026-11-05',
      '2026-11-07',
      '2026-11-12',
      '2026-11-15',
    ])
    expect(restantes).toBe(13)
  })
})

describe('datasDeAgc (Q-05)', () => {
  const datas = (a: Tipos['agcs']) =>
    datasDeAgc(a, HOJE).map((c) => `${Number(c.data.slice(8))} (${c.convocacao}ª)`)

  it('agendada: as convocações de hoje em diante', () => {
    expect(datas(agc('a', '2026-11-13', '2026-11-20'))).toEqual(['13 (1ª)', '20 (2ª)'])
    expect(datas(agc('b', '2026-11-05', '2026-11-12'))).toEqual(['12 (2ª)'])
  })

  it('as duas convocações no mesmo dia contam como um evento só, o da 1ª', () => {
    expect(datas(agc('mesmo-dia', '2026-11-13', '2026-11-13'))).toEqual(['13 (1ª)'])
  })

  it('instalada (ou já encerrada): só a data da convocação instalada', () => {
    const instalada = agc('c', '2026-11-05', '2026-11-12', {
      status: 'encerrada',
      convocacaoInstalada: 2,
    })
    expect(datas(instalada)).toEqual(['12 (2ª)'])
    const noMesmoDia = agc('e', '2026-11-12', '2026-11-12', { convocacaoInstalada: 2 })
    expect(datas(noMesmoDia)).toEqual(['12 (2ª)'])
  })

  it('encerrada sem instalação: nenhuma', () => {
    expect(datas(agc('d', '2026-11-13', '2026-11-20', { status: 'encerrada' }))).toEqual([])
  })
})

describe('prazosDoMes (Q-05)', () => {
  it('vencido, hoje e prazo pelos em aberto do mês; AGC pelas convocações', () => {
    const prazos = [
      prazo('vencido', '2026-11-05'),
      prazo('hoje', HOJE),
      prazo('futuro', '2026-11-12'),
      prazo('cumprido', '2026-11-10', 'cumprido'),
      prazo('outubro', '2026-10-30'),
      prazo('dezembro', '2026-12-01'),
    ]
    const agcs = [agc('agc', '2026-11-13', '2026-11-20')]
    expect(Object.fromEntries(prazosDoMes(prazos, agcs, HOJE))).toEqual({
      '2026-11-05': 'vencido',
      '2026-11-07': 'hoje',
      '2026-11-12': 'prazo',
      '2026-11-13': 'agc',
      '2026-11-20': 'agc',
    })
  })

  it('no mesmo dia vale a marca mais urgente: vencido e hoje antes da AGC, AGC antes do prazo', () => {
    const prazos = [prazo('p', '2026-11-13'), prazo('v', '2026-11-03'), prazo('h', HOJE)]
    const agcs = [
      agc('a', '2026-11-13', '2026-11-20'),
      agc('b', '2026-11-03', HOJE, { status: 'instalada', convocacaoInstalada: 1 }),
      agc('c', '2026-11-01', HOJE),
    ]
    expect(Object.fromEntries(prazosDoMes(prazos, agcs, HOJE))).toEqual({
      '2026-11-03': 'vencido',
      '2026-11-07': 'hoje',
      '2026-11-13': 'agc',
      '2026-11-20': 'agc',
    })
  })

  it('o mapa vem em ordem de dia', () => {
    const prazos = [prazo('b', '2026-11-20'), prazo('a', '2026-11-09')]
    expect([...prazosDoMes(prazos, [], HOJE).keys()]).toEqual(['2026-11-09', '2026-11-20'])
  })

  it('QDR-06 · seed: novembro com 5 vencido, 7 hoje, 12, 15 e 27 prazo, 13 e 20 AGC', () => {
    const tabelas = tabelasDoSeed(HOJE_FIXO)
    expect(Object.fromEntries(prazosDoMes(tabelas.prazos, tabelas.agcs, HOJE_FIXO))).toEqual({
      '2026-11-05': 'vencido',
      '2026-11-07': 'hoje',
      '2026-11-12': 'prazo',
      '2026-11-13': 'agc',
      '2026-11-15': 'prazo',
      '2026-11-20': 'agc',
      '2026-11-27': 'prazo',
    })
  })
})

describe('destaqueDoMes (pé do calendário)', () => {
  it('hoje com prazo: o primeiro prazo do dia e quantos outros eventos há nele', () => {
    const prazos = [prazo('b', HOJE), prazo('a', HOJE), prazo('depois', '2026-11-08')]
    const agcs = [agc('agc', HOJE, '2026-11-14')]
    const destaque = destaqueDoMes(prazos, agcs, HOJE)
    expect(destaque).toMatchObject({ tipo: 'prazo', data: HOJE, outros: 2 })
    expect(destaque?.tipo === 'prazo' && destaque.prazo.id).toBe('a')
  })

  it('sem nada hoje: o próximo dia do mês, com a AGC se ela vier antes do prazo', () => {
    const prazos = [prazo('vencido', '2026-11-02'), prazo('p', '2026-11-20')]
    const agcs = [agc('agc', '2026-11-13', '2026-11-20')]
    expect(destaqueDoMes(prazos, agcs, HOJE)).toMatchObject({
      tipo: 'agc',
      data: '2026-11-13',
      convocacao: 1,
      outros: 0,
    })
  })

  it('a 2ª convocação conta como AGC daquele dia', () => {
    const agcs = [agc('agc', '2026-11-01', '2026-11-08')]
    expect(destaqueDoMes([], agcs, HOJE)).toMatchObject({ tipo: 'agc', convocacao: 2 })
  })

  it('AGC instalada na 2ª com as duas datas iguais: "2ª convocação" e nenhum outro evento', () => {
    const agcs = [agc('agc', '2026-11-13', '2026-11-13', { convocacaoInstalada: 2 })]
    expect(destaqueDoMes([], agcs, HOJE)).toMatchObject({ convocacao: 2, outros: 0 })
    const naoInstalada = [agc('agc', '2026-11-13', '2026-11-13')]
    expect(destaqueDoMes([], naoInstalada, HOJE)).toMatchObject({ convocacao: 1, outros: 0 })
  })

  it('resto do mês livre (só vencidos, ou eventos no mês que vem): null', () => {
    const prazos = [prazo('vencido', '2026-11-02'), prazo('dezembro', '2026-12-01')]
    expect(destaqueDoMes(prazos, [agc('dez', '2026-12-03', '2026-12-10')], HOJE)).toBeNull()
  })
})
