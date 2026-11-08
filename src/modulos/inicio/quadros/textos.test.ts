// Textos curtos dos quadros 1×2 (INI-07): data relativa dos próximos prazos (QDR-05), iniciais e
// frase da atividade recente (QDR-07).
import { describe, expect, it } from 'vitest'
import { acaoDaAtividade, dataRelativa, diaEMes, iniciais } from './textos'

const HOJE = '2026-11-07'

describe('dataRelativa', () => {
  it.each([
    ['2026-08-09', 'há 90 dias'],
    ['2026-11-05', 'há 2 dias'],
    ['2026-11-06', 'ontem'],
    [HOJE, 'hoje'],
    ['2026-11-08', 'amanhã'],
    ['2026-11-12', 'em 5 dias'],
  ])('%s → %s', (data, esperado) => {
    expect(dataRelativa(data, HOJE)).toBe(esperado)
  })
})

describe('diaEMes', () => {
  it('data ou carimbo viram dd/mm', () => {
    expect(diaEMes('2026-08-09')).toBe('09/08')
    expect(diaEMes('2026-11-05T11:14:00')).toBe('05/11')
  })
})

describe('iniciais', () => {
  it.each([
    ['Marina Albuquerque', 'MA'],
    ['Rodrigo de Souza Vasconcelos', 'RV'],
    ['  helena  ', 'H'],
    ['', ''],
  ])('%j → %j', (nome, esperado) => {
    expect(iniciais(nome)).toBe(esperado)
  })
})

describe('acaoDaAtividade', () => {
  it('verbo, artigo e coleção, com "em" quando há processo', () => {
    expect(acaoDaAtividade({ acao: 'editou', colecao: 'credores', processoId: 'prc-1' })).toBe(
      'editou um credor em',
    )
    expect(acaoDaAtividade({ acao: 'criou', colecao: 'agcs', processoId: 'prc-1' })).toBe(
      'cadastrou uma AGC em',
    )
    expect(acaoDaAtividade({ acao: 'criou', colecao: 'empresas', processoId: undefined })).toBe(
      'cadastrou uma empresa',
    )
  })

  it('o próprio processo: "editou o processo"', () => {
    expect(acaoDaAtividade({ acao: 'editou', colecao: 'processos', processoId: 'prc-1' })).toBe(
      'editou o processo',
    )
  })
})
