import { describe, expect, it } from 'vitest'
import { paginasVisiveis } from './paginas'

describe('paginasVisiveis', () => {
  it('primeira de 10, como no guia: 1 2 3 … 10', () => {
    expect(paginasVisiveis(1, 10)).toEqual([1, 2, 3, 'reticencias', 10])
  })

  it('no meio mostra as vizinhas e reticências dos dois lados', () => {
    expect(paginasVisiveis(5, 10)).toEqual([1, 'reticencias', 4, 5, 6, 'reticencias', 10])
  })

  it('última de 10: 1 … 8 9 10', () => {
    expect(paginasVisiveis(10, 10)).toEqual([1, 'reticencias', 8, 9, 10])
  })

  it('não usa reticências para pular uma página só', () => {
    expect(paginasVisiveis(4, 10)).toEqual([1, 2, 3, 4, 5, 'reticencias', 10])
    expect(paginasVisiveis(7, 10)).toEqual([1, 'reticencias', 6, 7, 8, 9, 10])
  })

  it('poucas páginas aparecem todas', () => {
    expect(paginasVisiveis(1, 1)).toEqual([1])
    expect(paginasVisiveis(2, 3)).toEqual([1, 2, 3])
  })

  it('sem páginas devolve lista vazia e página fora do intervalo é limitada', () => {
    expect(paginasVisiveis(1, 0)).toEqual([])
    expect(paginasVisiveis(99, 3)).toEqual([1, 2, 3])
  })
})
