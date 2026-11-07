// CSV da agenda (RF-25, RF-44; SDD CSV-01): recebe os prazos já filtrados pela agenda, todas as
// páginas.
import { describe, expect, it } from 'vitest'
import { seedMini } from '../../../tests/fixtures/seed-mini'
import type { Tipos } from '../../dados/schemas'
import { exportarPrazos } from './exportacao'
import { filtrarAgenda } from './regras'

const HOJE = '2026-11-07'
const seed = seedMini()
const processos = new Map(seed.processos.map((p) => [p.id, p]))
const responsaveis = new Map(seed.usuarios.map((u) => [u.id, u.nome]))

describe('exportarPrazos', () => {
  it('CSV-01 · BOM, separador, nome do arquivo e data em dd/mm/aaaa', () => {
    const prazos = filtrarAgenda(
      seed.prazos,
      processos,
      { periodo: 'todos', processoId: '', responsavelId: '' },
      HOJE,
    )
    const arquivo = exportarPrazos(prazos, processos, responsaveis, HOJE)
    expect(arquivo.nome).toBe('judisys-prazos-2026-11-07.csv')
    expect(arquivo.conteudo.split('\r\n')).toEqual([
      '﻿Vencimento;Prazo;Base legal;Processo;Responsável;Origem;Situação',
      '10/11/2026;Reunião com o comitê;;Boreal;Otávio Reis;Manual;Cumprido',
      '19/11/2026;Objeções ao plano;art. 55;Grupo Aurora;Helena Prado;Automático;Em aberto',
      '',
    ])
  })

  it('leva todas as linhas que recebe, além das 50 da página', () => {
    const base = seed.prazos[0] as Tipos['prazos']
    const muitos = Array.from({ length: 120 }, (_, n) => ({ ...base, id: `prz-x${n}` }))
    const linhas = exportarPrazos(muitos, processos, responsaveis, HOJE).conteudo.split('\r\n')
    expect(linhas.slice(1, -1)).toHaveLength(120)
  })
})
