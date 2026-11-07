// Texto do histórico do processo (RF-13, RF-41).
import { describe, expect, it } from 'vitest'
import { mudancasLegiveis, type Nomes } from './historico'

const NOMES: Nomes = {
  usuarios: new Map([['usr-aj', 'Helena Prado']]),
  empresas: new Map([
    ['emp-01', 'Aurora Têxtil Ltda.'],
    ['emp-02', 'Fiação Boreal S.A.'],
  ]),
}

describe('mudancasLegiveis', () => {
  it('formata moeda, data, fase, responsável e empresas', () => {
    const mudancas = mudancasLegiveis(
      {
        mudancas: [
          { campo: 'passivoDeclarado', de: 100, para: 123456 },
          { campo: 'vencimento', de: '2026-11-19', para: '2026-12-01' },
          { campo: 'faseAtual', de: 'pedido', para: 'processamento-deferido' },
          { campo: 'responsavelId', de: 'usr-x', para: 'usr-aj' },
          { campo: 'empresas', de: ['emp-01'], para: ['emp-01', 'emp-02'] },
        ],
      },
      NOMES,
    )
    expect(mudancas).toEqual([
      { campo: 'Passivo declarado', de: 'R$ 1,00', para: 'R$ 1.234,56' },
      { campo: 'Vencimento', de: '19/11/2026', para: '01/12/2026' },
      { campo: 'Fase atual', de: 'Pedido', para: 'Processamento deferido' },
      { campo: 'Responsável', de: 'usr-x', para: 'Helena Prado' },
      {
        campo: 'Empresas',
        de: 'Aurora Têxtil Ltda.',
        para: 'Aurora Têxtil Ltda., Fiação Boreal S.A.',
      },
    ])
  })

  it('`de` null ou undefined aparece vazio; campos de ligação somem', () => {
    const mudancas = mudancasLegiveis(
      {
        mudancas: [
          { campo: 'titulo', de: undefined, para: 'Stay period' },
          { campo: 'honorariosValor', de: null, para: 500 },
          { campo: 'processoId', de: undefined, para: 'prc-001' },
        ],
      },
      NOMES,
    )
    expect(mudancas).toEqual([
      { campo: 'Título', de: '', para: 'Stay period' },
      { campo: 'Honorários (R$)', de: '', para: 'R$ 5,00' },
    ])
  })

  it('contagem da exclusão em cascata', () => {
    expect(
      mudancasLegiveis({ mudancas: [{ campo: 'cascata.credores', de: 55, para: 0 }] }, NOMES),
    ).toEqual([{ campo: 'Excluídos junto: credor', de: '55', para: '0' }])
  })
})
