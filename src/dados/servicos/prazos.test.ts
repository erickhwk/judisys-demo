// Cumprir prazo e o RMA seguinte nas duas implementações de Armazenamento (SDD §7.4, §10).
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { comFalhaEm } from '../../../tests/fixtures/falhas'
import { carregarSeedMini, ESCRITORIO_ID, seedMini } from '../../../tests/fixtures/seed-mini'
import type { Papel } from '../../regras/permissoes'
import { BASE_LEGAL_RMA, TITULO_RMA } from '../../regras/prazos'
import type { Armazenamento } from '../armazenamento'
import { type ContextoGravacao, ErroPermissao } from '../repositorio'
import type { Log, Tipos } from '../schemas'
import { avancarFase } from './marcos'
import { cumprirPrazo, ERRO_PRAZO_JA_CUMPRIDO } from './prazos'

const AGORA = '2026-11-07T10:00:00'

function contexto(papel: Papel = 'aj', usuarioId = 'usr-aj'): ContextoGravacao {
  return { usuario: { id: usuarioId, escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

describe.each(IMPLEMENTACOES)('cumprirPrazo sobre %s', (_nome, criar) => {
  let armazenamento: Armazenamento
  const logsNovos = async () =>
    (await armazenamento.todos<Log>('logs')).filter((log) => log.id !== 'log-001')
  const prazosDe = (processoId: string) =>
    armazenamento.porIndice<Tipos['prazos']>('prazos', 'processoId', processoId)

  /** RMA aberto do prc-001 (RJ), ligado a um marco "Processamento deferido". */
  async function rmaAberto(vencimento: string, faseAtual = 'plano-apresentado') {
    const [processo] = seedMini().processos
    if (!processo) throw new Error('seed sem processo')
    await armazenamento.put('processos', { ...processo, faseAtual })
    await armazenamento.put('marcosDeFase', {
      ...seedMini().marcosDeFase[0],
      id: 'mrc-009',
      fase: 'processamento-deferido',
      data: '2026-03-20',
    })
    await armazenamento.put('prazos', {
      ...seedMini().prazos[0],
      id: 'prz-rma',
      titulo: TITULO_RMA,
      baseLegal: BASE_LEGAL_RMA,
      vencimento,
      marcoId: 'mrc-009',
    })
    return 'prz-rma'
  }

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  it('PRZ-01 · cumprir o RMA de 15/11 cria o de 15/12, ligado ao mesmo marco', async () => {
    const id = await rmaAberto('2026-11-15')
    const { prazo, proximoRma } = await cumprirPrazo(armazenamento, contexto())(id)
    expect(prazo.status).toBe('cumprido')
    expect(proximoRma).toMatchObject({
      processoId: 'prc-001',
      titulo: TITULO_RMA,
      baseLegal: BASE_LEGAL_RMA,
      vencimento: '2026-12-15',
      origem: 'automatico',
      status: 'aberto',
      marcoId: 'mrc-009',
    })
    const logs = await logsNovos()
    expect(logs.map((l) => [l.acao, l.colecao]).sort()).toEqual([
      ['criou', 'prazos'],
      ['editou', 'prazos'],
    ])
    expect(logs.find((l) => l.acao === 'editou')?.mudancas).toEqual([
      { campo: 'status', de: 'aberto', para: 'cumprido' },
    ])
  })

  it('PRZ-02 · RMA de 15/12 cumprido: o próximo vence em 15/01 do ano seguinte', async () => {
    const id = await rmaAberto('2026-12-15')
    const { proximoRma } = await cumprirPrazo(armazenamento, contexto())(id)
    expect(proximoRma?.vencimento).toBe('2027-01-15')
  })

  it('PRZ-03 · processo convolado em falência não gera RMA novo', async () => {
    const id = await rmaAberto('2026-11-15', 'convolada-falencia')
    const resultado = await cumprirPrazo(armazenamento, contexto())(id)
    expect(resultado.proximoRma).toBeUndefined()
    expect((await prazosDe('prc-001')).filter((p) => p.titulo === TITULO_RMA)).toHaveLength(1)
  })

  it('PRZ-04 · avançar para "encerrada" mantém o RMA aberto; cumprido, não gera outro', async () => {
    const id = await rmaAberto('2026-11-15')
    await avancarFase(armazenamento, contexto())('prc-001', {
      fase: 'encerrada',
      data: '2026-11-01',
    })
    expect((await armazenamento.get<Tipos['prazos']>('prazos', id))?.status).toBe('aberto')

    const resultado = await cumprirPrazo(armazenamento, contexto())(id)
    expect(resultado.proximoRma).toBeUndefined()
    expect((await prazosDe('prc-001')).filter((p) => p.titulo === TITULO_RMA)).toHaveLength(1)
  })

  it('INV-05 · se a RJ já tem outro RMA aberto, não cria mais um', async () => {
    const id = await rmaAberto('2026-11-15')
    await armazenamento.put('prazos', {
      ...seedMini().prazos[0],
      id: 'prz-rma-2',
      titulo: TITULO_RMA,
      vencimento: '2026-12-15',
    })
    const resultado = await cumprirPrazo(armazenamento, contexto())(id)
    expect(resultado.proximoRma).toBeUndefined()
  })

  it('prazo que não é RMA: só muda o status', async () => {
    const resultado = await cumprirPrazo(armazenamento, contexto())('prz-001')
    expect(resultado).toEqual({ prazo: expect.objectContaining({ status: 'cumprido' }) })
    expect(await prazosDe('prc-001')).toHaveLength(1)
  })

  it('prazo já cumprido: erro e nenhum log', async () => {
    await expect(cumprirPrazo(armazenamento, contexto())('prz-002')).rejects.toThrow(
      ERRO_PRAZO_JA_CUMPRIDO,
    )
    expect(await logsNovos()).toEqual([])
  })

  it('INV-02 · analista não cumpre prazo', async () => {
    await expect(
      cumprirPrazo(armazenamento, contexto('analista', 'usr-ana'))('prz-001'),
    ).rejects.toBeInstanceOf(ErroPermissao)
    expect((await armazenamento.get<Tipos['prazos']>('prazos', 'prz-001'))?.status).toBe('aberto')
  })

  it('INV-01 · falha ao gravar o log do RMA novo desfaz o cumprimento', async () => {
    const id = await rmaAberto('2026-11-15')
    const falha = comFalhaEm(armazenamento, 'put', 'logs')
    await expect(cumprirPrazo(falha, contexto())(id)).rejects.toThrow('falha simulada')
    expect((await armazenamento.get<Tipos['prazos']>('prazos', id))?.status).toBe('aberto')
    expect((await prazosDe('prc-001')).filter((p) => p.titulo === TITULO_RMA)).toHaveLength(1)
  })
})
