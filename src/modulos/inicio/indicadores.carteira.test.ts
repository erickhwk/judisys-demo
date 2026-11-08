// INI-09 · carteiraPorFase (SDD-INI §5.7, Q-12): com dados pequenos e com o seed da demo (QDR-13).
import { describe, expect, it } from 'vitest'
import { gerarSeed } from '../../../scripts/seed/gerar'
import { prepararSeed } from '../../dados/carga'
import type { Tipos } from '../../dados/schemas'
import { FASES_FALENCIA, FASES_RJ } from '../../regras/fases'
import { carteiraPorFase } from './indicadores'

function processo(
  id: string,
  tipo: 'rj' | 'falencia',
  faseAtual: Tipos['processos']['faseAtual'],
): Tipos['processos'] {
  return {
    escritorioId: 'esc-1',
    criadoEm: '2026-11-01T10:00',
    atualizadoEm: '2026-11-01T10:00',
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
    faseAtual,
  }
}

/** Só as fases com processo, como `[fase, quantidade]`. */
const ocupadas = (fases: { fase: string; quantidade: number }[]) =>
  fases.filter((f) => f.quantidade > 0).map((f) => [f.fase, f.quantidade])

describe('carteiraPorFase (Q-12)', () => {
  it('RJ e depois falência, com toda fase da sequência na ordem do RF-14 e zero nas vazias', () => {
    const [rj, falencia] = carteiraPorFase([
      processo('p1', 'rj', 'plano-apresentado'),
      processo('p2', 'rj', 'plano-apresentado'),
      processo('p3', 'falencia', 'arrecadacao'),
    ])
    expect(rj.tipo).toBe('rj')
    expect(rj.fases.map((f) => f.fase)).toEqual([...FASES_RJ])
    expect(ocupadas(rj.fases)).toEqual([['plano-apresentado', 2]])
    expect(rj.fases[4]).toEqual({
      fase: 'plano-apresentado',
      rotulo: 'Plano apresentado',
      quantidade: 2,
    })
    expect(falencia.tipo).toBe('falencia')
    expect(falencia.fases.map((f) => f.fase)).toEqual([...FASES_FALENCIA])
    expect(ocupadas(falencia.fases)).toEqual([['arrecadacao', 1]])
  })

  it('as finais alternativas da RJ ficam fora das fases e dos ativos', () => {
    const [rj] = carteiraPorFase([
      processo('p1', 'rj', 'pedido'),
      processo('p2', 'rj', 'encerrada'),
      processo('p3', 'rj', 'convolada-falencia'),
      processo('p4', 'rj', 'desistencia'),
    ])
    expect(rj.fases.some((f) => f.fase === 'convolada-falencia' || f.fase === 'desistencia')).toBe(
      false,
    )
    expect(ocupadas(rj.fases)).toEqual([
      ['pedido', 1],
      ['encerrada', 1],
    ])
    expect(rj).toMatchObject({ ativos: 1, encerrados: 1 })
  })

  it('QDR-15 · sem processos, as duas trilhas vêm com tudo zerado', () => {
    const carteira = carteiraPorFase([])
    expect(carteira.map((c) => [c.tipo, c.ativos, c.encerrados])).toEqual([
      ['rj', 0, 0],
      ['falencia', 0, 0],
    ])
    expect(carteira.flatMap((c) => c.fases).every((f) => f.quantidade === 0)).toBe(true)
  })

  it('QDR-13 · contagem por fase do seed (números do `pnpm indicadores`)', () => {
    const { processos } = prepararSeed(gerarSeed(), '2026-11-07').tabelas
    const [rj, falencia] = carteiraPorFase(processos)
    expect(ocupadas(rj.fases)).toEqual([
      ['pedido', 1],
      ['processamento-deferido', 1],
      ['edital-publicado', 1],
      ['plano-apresentado', 1],
      ['fiscalizacao', 1],
      ['encerrada', 1],
    ])
    expect(rj).toMatchObject({ ativos: 5, encerrados: 1 })
    expect(ocupadas(falencia.fases)).toEqual([
      ['decretada', 1],
      ['arrecadacao', 1],
      ['realizacao-ativo', 1],
      ['encerrada', 1],
    ])
    expect(falencia).toMatchObject({ ativos: 3, encerrados: 1 })
  })
})
