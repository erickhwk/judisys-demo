// Avançar fase e desfazer marco nas duas implementações de Armazenamento (SDD §7.3, §10).
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { comFalhaEm } from '../../../tests/fixtures/falhas'
import { carregarSeedMini, ESCRITORIO_ID, seedMini } from '../../../tests/fixtures/seed-mini'
import { ERRO_DATA_ANTERIOR_AO_ULTIMO_MARCO } from '../../regras/fases'
import type { Papel } from '../../regras/permissoes'
import { TITULO_RMA } from '../../regras/prazos'
import type { Armazenamento } from '../armazenamento'
import { type ContextoGravacao, ErroPermissao, ErroValidacao } from '../repositorio'
import type { Log, Tipos } from '../schemas'
import { ErroRegra } from './comum'
import {
  avancarFase,
  desfazerMarco,
  ERRO_FASE_INDISPONIVEL,
  ERRO_MARCO_NAO_E_O_ULTIMO,
  ERRO_PRIMEIRO_MARCO,
  previaDesfazerMarco,
} from './marcos'
import { cumprirPrazo } from './prazos'

const AGORA = '2026-11-07T10:00:00'

function contexto(papel: Papel = 'aj', usuarioId = 'usr-aj'): ContextoGravacao {
  return { usuario: { id: usuarioId, escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

describe.each(IMPLEMENTACOES)('serviços de marcos sobre %s', (_nome, criar) => {
  let armazenamento: Armazenamento
  const logsNovos = async () =>
    (await armazenamento.todos<Log>('logs')).filter((log) => log.id !== 'log-001')
  const prazosDe = (processoId: string) =>
    armazenamento.porIndice<Tipos['prazos']>('prazos', 'processoId', processoId)
  const marcosDe = (processoId: string) =>
    armazenamento.porIndice<Tipos['marcosDeFase']>('marcosDeFase', 'processoId', processoId)
  const faseDe = async (processoId: string) =>
    (await armazenamento.get<Tipos['processos']>('processos', processoId))?.faseAtual
  const rmasAbertos = async (processoId: string) =>
    (await prazosDe(processoId)).filter((p) => p.titulo === TITULO_RMA && p.status === 'aberto')

  /** RJ nova em "pedido" (marco em 01/09/2026), sem prazos. */
  async function rjEmPedido(): Promise<string> {
    const [base] = seedMini().processos
    if (!base) throw new Error('seed sem processo')
    await armazenamento.put('processos', { ...base, id: 'prc-010', faseAtual: 'pedido' })
    await armazenamento.put('marcosDeFase', {
      ...seedMini().marcosDeFase[0],
      id: 'mrc-010',
      processoId: 'prc-010',
      fase: 'pedido',
      data: '2026-09-01',
    })
    return 'prc-010'
  }

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  describe('avancarFase', () => {
    it('PRC-02 · "processamento deferido" cria stay, plano, AGC e RMA ligados ao marco', async () => {
      const id = await rjEmPedido()
      const { marco, prazos } = await avancarFase(armazenamento, contexto())(id, {
        fase: 'processamento-deferido',
        data: '2026-09-10',
      })
      expect(prazos.map((p) => [p.titulo, p.vencimento])).toEqual([
        ['Stay period', '2027-03-09'],
        ['Apresentação do plano', '2026-11-09'],
        ['Realização da AGC', '2027-02-07'],
        [TITULO_RMA, '2026-09-15'],
      ])
      expect(prazos.every((p) => p.marcoId === marco.id && p.origem === 'automatico')).toBe(true)
    })

    it('PRC-01 · grava marco, muda a fase e cria os prazos do edital, com logs', async () => {
      const id = await rjEmPedido()
      const avancar = avancarFase(armazenamento, contexto())
      await avancar(id, { fase: 'processamento-deferido', data: '2026-09-10' })
      const antes = new Set((await logsNovos()).map((l) => l.id))

      const { marco, prazos } = await avancar(id, { fase: 'edital-publicado', data: '2026-10-01' })

      expect(marco).toMatchObject({ processoId: id, fase: 'edital-publicado', data: '2026-10-01' })
      expect(await faseDe(id)).toBe('edital-publicado')
      expect(prazos.map((p) => [p.titulo, p.vencimento, p.marcoId])).toEqual([
        ['Habilitações e divergências', '2026-10-16', marco.id],
        ['Relação do AJ', '2026-11-30', marco.id],
      ])
      const logs = (await logsNovos()).filter((l) => !antes.has(l.id))
      expect(logs.map((l) => [l.acao, l.colecao]).sort()).toEqual(
        [
          ['criou', 'marcosDeFase'],
          ['editou', 'processos'],
          ['criou', 'prazos'],
          ['criou', 'prazos'],
        ].sort(),
      )
      expect(logs.find((l) => l.colecao === 'processos')?.mudancas).toEqual([
        { campo: 'faseAtual', de: 'processamento-deferido', para: 'edital-publicado' },
      ])
      expect(logs.every((l) => l.processoId === id && l.usuarioId === 'usr-aj')).toBe(true)
    })

    it('PRC-07 · pular de "processamento deferido" para o plano cria só as objeções (T-28)', async () => {
      const id = await rjEmPedido()
      const avancar = avancarFase(armazenamento, contexto())
      await avancar(id, { fase: 'processamento-deferido', data: '2026-09-10' })
      const { prazos } = await avancar(id, { fase: 'plano-apresentado', data: '2026-10-05' })
      expect(prazos.map((p) => [p.titulo, p.vencimento])).toEqual([
        ['Objeções ao plano', '2026-11-04'],
      ])
    })

    it('PRC-08 · data anterior ao último marco: erro no campo e nada gravado', async () => {
      const erro = await avancarFase(armazenamento, contexto())('prc-001', {
        fase: 'prazo-objecoes',
        data: '2026-10-19',
      }).catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas).toEqual([
        { campo: 'data', mensagem: ERRO_DATA_ANTERIOR_AO_ULTIMO_MARCO },
      ])
      expect(await marcosDe('prc-001')).toHaveLength(2)
      expect(await logsNovos()).toEqual([])
    })

    it('T-27 · fase anterior à atual ou processo em fase final não avançam', async () => {
      const avancar = avancarFase(armazenamento, contexto())
      await expect(
        avancar('prc-001', { fase: 'edital-publicado', data: '2026-11-01' }),
      ).rejects.toThrow(ERRO_FASE_INDISPONIVEL)
      await avancar('prc-001', { fase: 'convolada-falencia', data: '2026-11-01' })
      await expect(avancar('prc-001', { fase: 'encerrada', data: '2026-11-02' })).rejects.toThrow(
        ERRO_FASE_INDISPONIVEL,
      )
    })

    it('INV-02 · analista não avança fase e nada é gravado', async () => {
      await expect(
        avancarFase(armazenamento, contexto('analista', 'usr-ana'))('prc-001', {
          fase: 'prazo-objecoes',
          data: '2026-11-01',
        }),
      ).rejects.toBeInstanceOf(ErroPermissao)
      expect(await logsNovos()).toEqual([])
    })

    it('INV-01 · falha ao gravar um prazo desfaz o marco, a fase e os logs', async () => {
      const id = await rjEmPedido()
      const falha = comFalhaEm(armazenamento, 'put', 'prazos')
      await expect(
        avancarFase(falha, contexto())(id, { fase: 'processamento-deferido', data: '2026-09-10' }),
      ).rejects.toThrow('falha simulada')
      expect(await faseDe(id)).toBe('pedido')
      expect(await marcosDe(id)).toHaveLength(1)
      expect(await prazosDe(id)).toEqual([])
      expect(await logsNovos()).toEqual([])
    })
  })

  describe('desfazerMarco', () => {
    beforeEach(async () => {
      // O marco do plano (mrc-002) criou dois prazos: as objeções (abertas) e um já cumprido.
      await armazenamento.put('prazos', {
        ...seedMini().prazos[0],
        id: 'prz-003',
        titulo: 'Prazo cumprido do plano',
        status: 'cumprido',
        marcoId: 'mrc-002',
      })
    })

    it('PRC-10 · prévia lista o prazo aberto; desfazer mantém o cumprido e grava log', async () => {
      const previa = await previaDesfazerMarco(armazenamento)('prc-001')
      expect(previa.marco.id).toBe('mrc-002')
      expect(previa.faseAnterior).toBe('pedido')
      expect(previa.prazos.map((p) => p.titulo)).toEqual(['Objeções ao plano'])
      expect(await logsNovos()).toEqual([])

      const feito = await desfazerMarco(armazenamento, contexto())('prc-001', 'mrc-002')

      expect(feito).toEqual(previa)
      expect(await faseDe('prc-001')).toBe('pedido')
      expect((await marcosDe('prc-001')).map((m) => m.id)).toEqual(['mrc-001'])
      expect((await prazosDe('prc-001')).map((p) => p.id)).toEqual(['prz-003'])
      const logs = await logsNovos()
      expect(logs.map((l) => [l.acao, l.colecao, l.registroId]).sort()).toEqual(
        [
          ['excluiu', 'prazos', 'prz-001'],
          ['excluiu', 'marcosDeFase', 'mrc-002'],
          ['editou', 'processos', 'prc-001'],
        ].sort(),
      )
    })

    it('PRC-11 · o primeiro marco não se desfaz', async () => {
      await expect(previaDesfazerMarco(armazenamento)('prc-002')).rejects.toThrow(
        ERRO_PRIMEIRO_MARCO,
      )
      const erro = await desfazerMarco(armazenamento, contexto())('prc-002').catch((e) => e)
      expect(erro).toBeInstanceOf(ErroRegra)
      expect(await marcosDe('prc-002')).toHaveLength(1)
      expect(await logsNovos()).toEqual([])
    })

    it('marco da confirmação que já não é o último: nada é desfeito', async () => {
      await expect(desfazerMarco(armazenamento, contexto())('prc-001', 'mrc-001')).rejects.toThrow(
        ERRO_MARCO_NAO_E_O_ULTIMO,
      )
      expect(await marcosDe('prc-001')).toHaveLength(2)
      expect(await logsNovos()).toEqual([])
    })

    it('INV-02 · analista não desfaz', async () => {
      await expect(
        desfazerMarco(armazenamento, contexto('analista', 'usr-ana'))('prc-001'),
      ).rejects.toBeInstanceOf(ErroPermissao)
      expect(await marcosDe('prc-001')).toHaveLength(2)
    })

    it('marcos na mesma data: desfaz o de fase posterior (INV-04)', async () => {
      const avancar = avancarFase(armazenamento, contexto())
      await avancar('prc-001', { fase: 'prazo-objecoes', data: '2026-10-20' })
      const previa = await previaDesfazerMarco(armazenamento)('prc-001')
      expect(previa.marco.fase).toBe('prazo-objecoes')
      expect(previa.faseAnterior).toBe('plano-apresentado')
    })

    it('INV-01 · falha no meio do desfazer não remove nada', async () => {
      const falha = comFalhaEm(armazenamento, 'put', 'processos')
      await expect(desfazerMarco(falha, contexto())('prc-001')).rejects.toThrow('falha simulada')
      expect(await marcosDe('prc-001')).toHaveLength(2)
      expect(await prazosDe('prc-001')).toHaveLength(2)
      expect(await faseDe('prc-001')).toBe('plano-apresentado')
      expect(await logsNovos()).toEqual([])
    })
  })

  describe('INV-05 · um único RMA aberto ao desfazer e refazer', () => {
    it('desfazer "processamento deferido" remove o RMA seguinte; refazer deixa um só', async () => {
      const id = await rjEmPedido()
      const avancar = avancarFase(armazenamento, contexto())
      const deferido = { fase: 'processamento-deferido', data: '2026-09-10' } as const
      const { prazos } = await avancar(id, deferido)
      const rma = prazos.find((p) => p.titulo === TITULO_RMA)
      if (!rma) throw new Error('sem RMA')
      await cumprirPrazo(armazenamento, contexto())(rma.id)

      const previa = await previaDesfazerMarco(armazenamento)(id)
      expect(previa.prazos.filter((p) => p.titulo === TITULO_RMA)).toHaveLength(1)
      await desfazerMarco(armazenamento, contexto())(id)
      expect(await rmasAbertos(id)).toEqual([])
      // O cumprido fica como histórico.
      expect((await prazosDe(id)).map((p) => [p.titulo, p.status])).toEqual([
        [TITULO_RMA, 'cumprido'],
      ])

      await avancar(id, deferido)
      expect(await rmasAbertos(id)).toHaveLength(1)
    })

    it('RMA aberto sem marco (vindo do seed) também sai ao desfazer "processamento deferido"', async () => {
      const id = await rjEmPedido()
      const { marco } = await avancarFase(armazenamento, contexto())(id, {
        fase: 'processamento-deferido',
        data: '2026-09-10',
      })
      for (const prazo of await rmasAbertos(id)) {
        await armazenamento.put('prazos', { ...prazo, marcoId: undefined })
      }
      await desfazerMarco(armazenamento, contexto())(id, marco.id)
      expect(await rmasAbertos(id)).toEqual([])
    })

    it('RMA já aberto não é duplicado ao avançar para "processamento deferido"', async () => {
      const id = await rjEmPedido()
      await armazenamento.put('prazos', {
        ...seedMini().prazos[0],
        id: 'prz-010',
        processoId: id,
        titulo: TITULO_RMA,
        vencimento: '2026-09-15',
        marcoId: undefined,
      })
      const { prazos } = await avancarFase(armazenamento, contexto())(id, {
        fase: 'processamento-deferido',
        data: '2026-09-10',
      })
      expect(prazos.map((p) => p.titulo)).not.toContain(TITULO_RMA)
      expect(await rmasAbertos(id)).toHaveLength(1)
    })

    it('desfazer "encerrada" depois de cumprir o RMA cria o seguinte', async () => {
      const id = await rjEmPedido()
      const avancar = avancarFase(armazenamento, contexto())
      const { marco, prazos } = await avancar(id, {
        fase: 'processamento-deferido',
        data: '2026-09-10',
      })
      await avancar(id, { fase: 'encerrada', data: '2026-10-01' })
      const rma = prazos.find((p) => p.titulo === TITULO_RMA)
      if (!rma) throw new Error('sem RMA')
      await cumprirPrazo(armazenamento, contexto())(rma.id)
      expect(await rmasAbertos(id)).toEqual([])

      await desfazerMarco(armazenamento, contexto())(id)

      expect(await faseDe(id)).toBe('processamento-deferido')
      expect((await rmasAbertos(id)).map((p) => [p.vencimento, p.marcoId])).toEqual([
        ['2026-10-15', marco.id],
      ])
    })
  })
})
