// Caminho das abas da tela do processo (AJ-19): o formato fica num lugar só.
import { describe, expect, it } from 'vitest'
import { ABAS, rotaDoProcesso } from './abas'

describe('rotaDoProcesso', () => {
  it('monta /processos/<id>/<aba>', () => {
    expect(rotaDoProcesso('prc-001', 'visao-geral')).toBe('/processos/prc-001/visao-geral')
    expect(rotaDoProcesso('prc-002', 'agc')).toBe('/processos/prc-002/agc')
  })

  it('serve para todas as abas, sem depender da ordem delas', () => {
    for (const aba of ABAS) {
      expect(rotaDoProcesso('prc-001', aba)).toBe(`/processos/prc-001/${aba}`)
    }
  })
})
