// Filtros e destino da tela de logs (RF-42, LOG-04).
import { describe, expect, it } from 'vitest'
import type { Log } from '../../dados/schemas'
import { destinoDoRegistro, filtrarLogs, MODULOS_COM_LOG } from './consulta'

function log(id: string, campos: Partial<Log>): Log {
  return {
    id,
    escritorioId: 'esc-1',
    criadoEm: '2026-11-01T10:00:00',
    atualizadoEm: '2026-11-01T10:00:00',
    usuarioId: 'usr-aj',
    acao: 'editou',
    colecao: 'credores',
    registroId: 'crd-0001',
    processoId: 'prc-001',
    mudancas: [],
    data: '2026-11-01T10:00:00',
    ...campos,
  }
}

const LOGS = [
  log('log-1', { data: '2026-11-05T23:59:00' }),
  log('log-2', { usuarioId: 'usr-adv', colecao: 'empresas', processoId: undefined }),
  log('log-3', { colecao: 'pedidosDeCredito', processoId: 'prc-002', data: '2026-10-01T08:00' }),
  log('log-4', { colecao: 'votos', data: '2026-09-08T09:00:00' }),
]

const ids = (logs: Log[]) => logs.map((l) => l.id)

describe('filtrarLogs (LOG-04)', () => {
  it('sem filtro, devolve todos na ordem recebida', () => {
    expect(ids(filtrarLogs(LOGS, {}))).toEqual(['log-1', 'log-2', 'log-3', 'log-4'])
  })

  it('por usuário', () => {
    expect(ids(filtrarLogs(LOGS, { usuarioId: 'usr-adv' }))).toEqual(['log-2'])
  })

  it('por módulo: credores cobre credores e pedidos de crédito; AGC cobre os votos', () => {
    expect(ids(filtrarLogs(LOGS, { modulo: 'credores' }))).toEqual(['log-1', 'log-3'])
    expect(ids(filtrarLogs(LOGS, { modulo: 'agc' }))).toEqual(['log-4'])
    expect(ids(filtrarLogs(LOGS, { modulo: 'empresas' }))).toEqual(['log-2'])
  })

  it('por processo', () => {
    expect(ids(filtrarLogs(LOGS, { processoId: 'prc-002' }))).toEqual(['log-3'])
  })

  it('por período, com as duas pontas incluídas', () => {
    expect(ids(filtrarLogs(LOGS, { de: '2026-10-01', ate: '2026-11-05' }))).toEqual([
      'log-1',
      'log-2',
      'log-3',
    ])
    expect(ids(filtrarLogs(LOGS, { ate: '2026-09-30' }))).toEqual(['log-4'])
    expect(ids(filtrarLogs(LOGS, { de: '2026-11-06' }))).toEqual([])
  })

  it('filtros juntos', () => {
    expect(
      ids(filtrarLogs(LOGS, { usuarioId: 'usr-aj', modulo: 'credores', de: '2026-11-01' })),
    ).toEqual(['log-1'])
  })

  it('o filtro de módulo só lista módulos com log', () => {
    expect(MODULOS_COM_LOG).toEqual([
      'processos',
      'empresas',
      'informes',
      'prazos',
      'credores',
      'agc',
      'usuarios',
    ])
  })
})

describe('destinoDoRegistro (RF-42)', () => {
  const de = (campos: Partial<Log>, registro: Record<string, unknown>) =>
    destinoDoRegistro(log('x', campos), registro)

  it('leva cada coleção à sua tela', () => {
    expect(de({ colecao: 'processos' }, { id: 'prc-001' })).toBe('/processos/prc-001/visao-geral')
    expect(de({ colecao: 'marcosDeFase' }, { id: 'mrc-1', processoId: 'prc-001' })).toBe(
      '/processos/prc-001/visao-geral',
    )
    expect(de({ colecao: 'prazos' }, { id: 'prz-1', processoId: 'prc-001' })).toBe(
      '/processos/prc-001/prazos',
    )
    expect(de({ colecao: 'credores' }, { id: 'crd-1', processoId: 'prc-001' })).toBe(
      '/processos/prc-001/credores/crd-1',
    )
    expect(de({ colecao: 'agcs' }, { id: 'agc-1', processoId: 'prc-001' })).toBe(
      '/processos/prc-001/agc/agc-1',
    )
    expect(de({ colecao: 'informes' }, { id: 'inf-1', processoId: 'prc-001' })).toBe(
      '/informes/inf-1',
    )
    expect(de({ colecao: 'empresas', processoId: undefined }, { id: 'emp-1' })).toBe(
      '/empresas/emp-1',
    )
    expect(de({ colecao: 'usuarios', processoId: undefined }, { id: 'usr-1' })).toBe('/usuarios')
  })

  it('pedido vai ao credor dele, ou à aba de credores quando é de fora da lista', () => {
    const pedido = { id: 'ped-1', processoId: 'prc-001' }
    expect(de({ colecao: 'pedidosDeCredito' }, { ...pedido, credorId: 'crd-1' })).toBe(
      '/processos/prc-001/credores/crd-1',
    )
    expect(de({ colecao: 'pedidosDeCredito' }, pedido)).toBe('/processos/prc-001/credores')
  })

  it('presença e voto vão à AGC, com o processo do log', () => {
    expect(de({ colecao: 'votos' }, { id: 'vot-1', agcId: 'agc-1' })).toBe(
      '/processos/prc-001/agc/agc-1',
    )
    expect(
      de({ colecao: 'presencas', processoId: undefined }, { id: 'pre-1', agcId: 'agc-1' }),
    ).toBe(null)
  })

  it('coleção sem tela não tem destino', () => {
    expect(de({ colecao: 'escritorios', processoId: undefined }, { id: 'esc-1' })).toBeNull()
  })
})
