// Linha do tempo das fases (RF-13, RF-14, T-27).
import { describe, expect, it } from 'vitest'
import { seedMini } from '../../../tests/fixtures/seed-mini'
import type { Tipos } from '../../dados/schemas'
import type { Fase } from '../../regras/fases'
import { linhaDoTempo } from './linhaDoTempo'

function marcos(...lista: [Fase, string][]): Tipos['marcosDeFase'][] {
  const [base] = seedMini().marcosDeFase
  if (!base) throw new Error('seed sem marco')
  return lista.map(([fase, data], i) => ({ ...base, id: `mrc-${i}`, fase, data }))
}

describe('linhaDoTempo', () => {
  it('marca alcançadas com a data, puladas, a atual e as futuras', () => {
    const passos = linhaDoTempo(
      { tipo: 'rj', faseAtual: 'plano-apresentado' },
      marcos(['pedido', '2026-03-02'], ['plano-apresentado', '2026-10-20']),
    )
    expect(passos.slice(0, 6)).toEqual([
      { fase: 'pedido', estado: 'concluida', data: '2026-03-02' },
      { fase: 'processamento-deferido', estado: 'pulada' },
      { fase: 'edital-publicado', estado: 'pulada' },
      { fase: 'relacao-aj-publicada', estado: 'pulada' },
      { fase: 'plano-apresentado', estado: 'atual', data: '2026-10-20' },
      { fase: 'prazo-objecoes', estado: 'futura' },
    ])
    expect(passos).toHaveLength(10)
  })

  it('final alternativa da RJ: só as alcançadas e a final', () => {
    const passos = linhaDoTempo(
      { tipo: 'rj', faseAtual: 'desistencia' },
      marcos(
        ['pedido', '2026-01-01'],
        ['processamento-deferido', '2026-01-10'],
        ['desistencia', '2026-04-10'],
      ),
    )
    expect(passos.map((p) => [p.fase, p.estado])).toEqual([
      ['pedido', 'concluida'],
      ['processamento-deferido', 'concluida'],
      ['desistencia', 'atual'],
    ])
  })

  it('falência na fase inicial', () => {
    const passos = linhaDoTempo(
      { tipo: 'falencia', faseAtual: 'decretada' },
      marcos(['decretada', '2026-10-01']),
    )
    expect(passos[0]).toEqual({ fase: 'decretada', estado: 'atual', data: '2026-10-01' })
    expect(passos.slice(1).every((p) => p.estado === 'futura')).toBe(true)
  })
})
