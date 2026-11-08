// Caminho das abas da tela do processo (AJ-19): o formato fica num lugar só.
import { describe, expect, it } from 'vitest'
import { ABAS, rotaDoProcesso } from './abas'

describe('rotaDoProcesso', () => {
  it('monta /processos/<id>/<aba>', () => {
    expect(rotaDoProcesso('prc-001', 'visao-geral')).toBe('/processos/prc-001/visao-geral')
    expect(rotaDoProcesso('prc-002', 'agc')).toBe('/processos/prc-002/agc')
  })

  it('serve para todas as abas', () => {
    expect(ABAS.map((aba) => rotaDoProcesso('prc-001', aba))).toEqual([
      '/processos/prc-001/visao-geral',
      '/processos/prc-001/empresas',
      '/processos/prc-001/credores',
      '/processos/prc-001/prazos',
      '/processos/prc-001/agc',
      '/processos/prc-001/informes',
      '/processos/prc-001/historico',
    ])
  })
})
