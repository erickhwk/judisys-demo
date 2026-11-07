import { describe, expect, it } from 'vitest'
import { diferencas } from './diff'

const credor = {
  id: 'crd-0001',
  nome: 'Maria Souza',
  valorAj: 100000,
  classe: 'III',
  tags: ['a', 'b'],
  endereco: { cidade: 'São Paulo' },
  criadoEm: '2026-11-01T10:00:00',
  atualizadoEm: '2026-11-01T10:00:00',
}

describe('diferencas', () => {
  it('LOG-02 · sem mudanças devolve lista vazia', () => {
    expect(diferencas(credor, { ...credor })).toEqual([])
  })

  it('LOG-02 · só atualizadoEm mudou: lista vazia', () => {
    expect(diferencas(credor, { ...credor, atualizadoEm: '2026-11-07T09:00:00' })).toEqual([])
  })

  it('LOG-01 · devolve {campo, de, para} do que mudou', () => {
    expect(
      diferencas(credor, { ...credor, valorAj: 120000, atualizadoEm: '2026-11-07T09:00:00' }),
    ).toEqual([{ campo: 'valorAj', de: 100000, para: 120000 }])
  })

  it('várias mudanças, na ordem dos campos', () => {
    expect(diferencas(credor, { ...credor, classe: 'II', nome: 'Maria S.' })).toEqual([
      { campo: 'nome', de: 'Maria Souza', para: 'Maria S.' },
      { campo: 'classe', de: 'III', para: 'II' },
    ])
  })

  it('compara arrays e objetos pelo conteúdo', () => {
    expect(
      diferencas(credor, { ...credor, tags: ['a', 'b'], endereco: { cidade: 'São Paulo' } }),
    ).toEqual([])
    expect(diferencas(credor, { ...credor, tags: ['a'] })).toEqual([
      { campo: 'tags', de: ['a', 'b'], para: ['a'] },
    ])
  })

  it('campo novo ou removido aparece com undefined do outro lado', () => {
    const antes: Record<string, unknown> = { id: '1', obs: 'x' }
    const depois: Record<string, unknown> = { id: '1', valorQgc: 500 }
    expect(diferencas(antes, depois)).toEqual([
      { campo: 'obs', de: 'x', para: undefined },
      { campo: 'valorQgc', de: undefined, para: 500 },
    ])
  })

  it('campo ausente e campo undefined são iguais; null é diferente', () => {
    expect(diferencas<Record<string, unknown>>({ id: '1' }, { id: '1', a: undefined })).toEqual([])
    expect(diferencas<Record<string, unknown>>({ id: '1', a: null }, { id: '1' })).toEqual([
      { campo: 'a', de: null, para: undefined },
    ])
  })
})
