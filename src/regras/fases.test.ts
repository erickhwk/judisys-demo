import { describe, expect, it } from 'vitest'
import {
  ERRO_DATA_ANTERIOR_AO_ULTIMO_MARCO,
  FASES_FALENCIA,
  FASES_FINAIS,
  FASES_RJ,
  type Fase,
  fasesDoTipo,
  fasesSeguintes,
  ROTULOS_FASE,
  validarDataDoMarco,
} from './fases'

describe('fases (RF-14)', () => {
  it('RJ e falência na ordem do RF-14', () => {
    expect(FASES_RJ[0]).toBe('pedido')
    expect(FASES_RJ.at(-1)).toBe('encerrada')
    expect(FASES_RJ).toHaveLength(10)
    expect(FASES_FALENCIA).toEqual([
      'decretada',
      'arrecadacao',
      'quadro-credores',
      'realizacao-ativo',
      'pagamentos',
      'prestacao-contas',
      'encerrada',
    ])
  })

  it('fases finais: encerrada, convolada e desistência', () => {
    expect([...FASES_FINAIS].sort()).toEqual(['convolada-falencia', 'desistencia', 'encerrada'])
  })

  it('toda fase tem rótulo', () => {
    for (const fase of [...fasesDoTipo('rj'), ...fasesDoTipo('falencia')]) {
      expect(ROTULOS_FASE[fase]).toBeTruthy()
    }
  })
})

describe('fasesSeguintes (T-27)', () => {
  it('RJ: só posteriores (pode pular) e as finais alternativas', () => {
    expect(fasesSeguintes('rj', 'plano-homologado')).toEqual([
      'fiscalizacao',
      'encerrada',
      'convolada-falencia',
      'desistencia',
    ])
    expect(fasesSeguintes('rj', 'pedido')).toHaveLength(9 + 2)
    expect(fasesSeguintes('rj', 'edital-publicado')).not.toContain('processamento-deferido')
  })

  it('falência: só posteriores, sem finais alternativas', () => {
    expect(fasesSeguintes('falencia', 'pagamentos')).toEqual(['prestacao-contas', 'encerrada'])
  })

  it.each<[Parameters<typeof fasesSeguintes>[0], Fase]>([
    ['rj', 'encerrada'],
    ['rj', 'convolada-falencia'],
    ['rj', 'desistencia'],
    ['falencia', 'encerrada'],
  ])('PRC-09 · %s em "%s" não tem seguintes', (tipo, fase) => {
    expect(fasesSeguintes(tipo, fase)).toEqual([])
  })

  it('fase de outro tipo não tem seguintes', () => {
    expect(fasesSeguintes('falencia', 'plano-apresentado')).toEqual([])
    expect(fasesSeguintes('rj', 'arrecadacao')).toEqual([])
  })
})

describe('validarDataDoMarco (T-27)', () => {
  const marcos = [{ data: '2026-03-01' }, { data: '2026-05-10' }, { data: '2026-04-02' }]

  it('PRC-08 · data anterior ao último marco é recusada', () => {
    expect(validarDataDoMarco('2026-05-09', marcos)).toBe(ERRO_DATA_ANTERIOR_AO_ULTIMO_MARCO)
    expect(ERRO_DATA_ANTERIOR_AO_ULTIMO_MARCO).toBe('A data não pode ser anterior ao último marco.')
  })

  it('mesma data ou posterior é aceita; sem marcos, qualquer data', () => {
    expect(validarDataDoMarco('2026-05-10', marcos)).toBeNull()
    expect(validarDataDoMarco('2026-06-01', marcos)).toBeNull()
    expect(validarDataDoMarco('2020-01-01', [])).toBeNull()
  })
})
