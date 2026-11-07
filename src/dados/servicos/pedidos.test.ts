// Pedidos de crédito (RF-29, SDD §7.5) nas duas implementações de Armazenamento (SDD §10).
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { comFalhaEm } from '../../../tests/fixtures/falhas'
import {
  CARIMBO_SEED,
  carregarSeedMini,
  cpfDoCredor,
  ESCRITORIO_ID,
} from '../../../tests/fixtures/seed-mini'
import type { Papel } from '../../regras/permissoes'
import type { Armazenamento } from '../armazenamento'
import { type ContextoGravacao, ErroPermissao } from '../repositorio'
import type { Log, Tipos } from '../schemas'
import { ErroRegra } from './comum'
import {
  AVISO_DOCUMENTO_EXISTENTE,
  credorComDocumento,
  decidirPedido,
  ERRO_CLASSE_DO_TIPO,
  ERRO_PEDIDO_JA_DECIDIDO,
  ERRO_SO_ANTES_DA_RELACAO,
  ERRO_SO_IMPUGNACAO,
  ERRO_SO_REJEITAR_DEPOIS_DA_RELACAO,
  ERRO_TIPO_PARA_CREDOR,
  ERRO_TIPO_PARA_REQUERENTE,
  type NovoPedido,
  registrarPedido,
  relacaoAjPublicada,
  tiposDePedidoPermitidos,
} from './pedidos'

const AGORA = '2026-11-07T10:00:00'

function contexto(papel: Papel = 'aj', usuarioId = 'usr-aj'): ContextoGravacao {
  return { usuario: { id: usuarioId, escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

describe('relacaoAjPublicada', () => {
  it('RJ: publicada a partir do marco "Relação do AJ publicada", inclusive pulado', () => {
    expect(relacaoAjPublicada('rj', [{ fase: 'pedido' }, { fase: 'edital-publicado' }])).toBe(false)
    expect(relacaoAjPublicada('rj', [{ fase: 'relacao-aj-publicada' }])).toBe(true)
    // T-28: o marco da relação pode ter sido pulado; a fase posterior já vale.
    expect(relacaoAjPublicada('rj', [{ fase: 'pedido' }, { fase: 'plano-apresentado' }])).toBe(true)
  })

  it('RJ: convolada ou desistência sozinhas não publicam a relação', () => {
    expect(relacaoAjPublicada('rj', [{ fase: 'pedido' }, { fase: 'convolada-falencia' }])).toBe(
      false,
    )
    expect(
      relacaoAjPublicada('rj', [{ fase: 'relacao-aj-publicada' }, { fase: 'desistencia' }]),
    ).toBe(true)
  })

  it('falência: publicada a partir do "Quadro de credores"', () => {
    expect(relacaoAjPublicada('falencia', [{ fase: 'decretada' }, { fase: 'arrecadacao' }])).toBe(
      false,
    )
    expect(relacaoAjPublicada('falencia', [{ fase: 'quadro-credores' }])).toBe(true)
    expect(relacaoAjPublicada('falencia', [{ fase: 'pagamentos' }])).toBe(true)
  })

  it('CRD-10 · depois da relação do AJ, só impugnação é oferecida', () => {
    expect(tiposDePedidoPermitidos(true, true)).toEqual(['impugnacao'])
    expect(tiposDePedidoPermitidos(true, false)).toEqual(['impugnacao'])
    expect(tiposDePedidoPermitidos(false, true)).toEqual(['divergencia'])
    expect(tiposDePedidoPermitidos(false, false)).toEqual(['habilitacao'])
  })
})

describe.each(IMPLEMENTACOES)('pedidos de crédito sobre %s', (_nome, criar) => {
  let armazenamento: Armazenamento
  const logsNovos = async () =>
    (await armazenamento.todos<Log>('logs')).filter((log) => log.id !== 'log-001')
  const credor = async (id: string) => armazenamento.get<Tipos['credores']>('credores', id)
  const pedido = async (id: string) =>
    armazenamento.get<Tipos['pedidosDeCredito']>('pedidosDeCredito', id)
  const credoresDoRj = async () =>
    armazenamento.porIndice<Tipos['credores']>('credores', 'processoId', 'prc-001')

  async function erroDe(promessa: Promise<unknown>): Promise<ErroRegra> {
    const erro = await promessa.catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroRegra)
    return erro as ErroRegra
  }

  /** prc-001 volta para "Edital publicado": a relação do AJ ainda não saiu. */
  async function antesDaRelacao() {
    await armazenamento.delete('marcosDeFase', 'mrc-002')
    await armazenamento.put('marcosDeFase', {
      id: 'mrc-009',
      escritorioId: ESCRITORIO_ID,
      criadoEm: CARIMBO_SEED,
      atualizadoEm: CARIMBO_SEED,
      processoId: 'prc-001',
      fase: 'edital-publicado',
      data: '2026-10-01',
    })
    const processo = await armazenamento.get<Tipos['processos']>('processos', 'prc-001')
    if (!processo) throw new Error('seed sem prc-001')
    await armazenamento.put('processos', { ...processo, faseAtual: 'edital-publicado' })
  }

  /** Pedido gravado direto (sem serviço nem log), para decidir. */
  async function pedidoPendente(campos: Partial<Tipos['pedidosDeCredito']>) {
    const novo: Tipos['pedidosDeCredito'] = {
      id: 'ped-100',
      escritorioId: ESCRITORIO_ID,
      criadoEm: CARIMBO_SEED,
      atualizadoEm: CARIMBO_SEED,
      processoId: 'prc-001',
      tipo: 'divergencia',
      valorPedido: 4_321_00,
      classePedida: 'garantia-real',
      status: 'pendente',
      data: '2026-10-05',
      ...campos,
    }
    await armazenamento.put('pedidosDeCredito', novo)
    return novo
  }

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  describe('decidirPedido', () => {
    it('CRD-03 · acolher divergência atualiza valor e classe na relação do AJ, com log de/para', async () => {
      await antesDaRelacao()
      // crd-0003: quirografário, devedor 300,00, AJ 330,00, sem QGC.
      await pedidoPendente({ credorId: 'crd-0003' })
      const resultado = await decidirPedido(armazenamento, contexto())('ped-100', 'acolhido')

      expect(resultado.credorCriado).toBe(false)
      expect(await credor('crd-0003')).toMatchObject({
        classe: 'garantia-real',
        valorDevedor: 300_00,
        valorAj: 4_321_00,
        valorQgc: null,
      })
      expect(await pedido('ped-100')).toMatchObject({ status: 'acolhido', credorId: 'crd-0003' })

      const logs = await logsNovos()
      const doCredor = logs.find((log) => log.colecao === 'credores')
      expect(doCredor).toMatchObject({
        acao: 'editou',
        registroId: 'crd-0003',
        processoId: 'prc-001',
        usuarioId: 'usr-aj',
      })
      expect(doCredor?.mudancas).toEqual(
        expect.arrayContaining([
          { campo: 'valorAj', de: 330_00, para: 4_321_00 },
          { campo: 'classe', de: 'quirografario', para: 'garantia-real' },
        ]),
      )
      const doPedido = logs.find((log) => log.colecao === 'pedidosDeCredito')
      expect(doPedido?.mudancas).toEqual([{ campo: 'status', de: 'pendente', para: 'acolhido' }])
      expect(logs).toHaveLength(2)
    })

    it('T-39 · divergência pendente depois da relação do AJ publicada: acolher é recusado, rejeitar vale', async () => {
      // prc-001 já tem a relação do AJ publicada no seed-mini.
      await pedidoPendente({ credorId: 'crd-0003' })
      const decidir = decidirPedido(armazenamento, contexto())
      const erro = await erroDe(decidir('ped-100', 'acolhido'))
      expect(erro.message).toBe(ERRO_SO_REJEITAR_DEPOIS_DA_RELACAO)
      expect((await pedido('ped-100'))?.status).toBe('pendente')
      expect(await logsNovos()).toHaveLength(0)
      await decidir('ped-100', 'rejeitado')
      expect((await pedido('ped-100'))?.status).toBe('rejeitado')
    })

    it('CRD-04 · acolher impugnação atualiza valor e classe no QGC, com a relação do AJ intacta', async () => {
      // ped-001: impugnação de crd-0002 (garantia-real pedida, 300,00).
      const antes = await credor('crd-0002')
      await decidirPedido(armazenamento, contexto())('ped-001', 'acolhido')
      expect(await credor('crd-0002')).toMatchObject({
        classe: 'garantia-real',
        valorDevedor: antes?.valorDevedor,
        valorAj: antes?.valorAj,
        valorQgc: 300_00,
      })
      expect((await pedido('ped-001'))?.status).toBe('acolhido')
    })

    it('CRD-05 · habilitação de requerente fora da lista cria o credor com devedor 0 e AJ = pedido', async () => {
      await antesDaRelacao()
      const requerente = { nome: 'Rita Moraes', documento: cpfDoCredor(800) }
      await pedidoPendente({ tipo: 'habilitacao', requerente, classePedida: 'trabalhista' })
      const total = (await credoresDoRj()).length

      const resultado = await decidirPedido(armazenamento, contexto())('ped-100', 'acolhido')

      expect(resultado.credorCriado).toBe(true)
      expect(await credoresDoRj()).toHaveLength(total + 1)
      expect(resultado.credor).toMatchObject({
        processoId: 'prc-001',
        nome: 'Rita Moraes',
        documento: cpfDoCredor(800),
        classe: 'trabalhista',
        valorDevedor: 0,
        valorAj: 4_321_00,
        valorQgc: null,
      })
      expect(await pedido('ped-100')).toMatchObject({
        status: 'acolhido',
        credorId: resultado.credor?.id,
      })
      const logs = await logsNovos()
      expect(logs.map((log) => `${log.acao}:${log.colecao}`).sort()).toEqual([
        'criou:credores',
        'editou:pedidosDeCredito',
      ])
    })

    it('CRD-06 · impugnação de requerente fora da lista cria o credor com devedor 0, AJ 0 e QGC = pedido', async () => {
      // ped-002: impugnação de Gustavo Ferraz, 1.500,00, quirografário.
      const resultado = await decidirPedido(armazenamento, contexto())('ped-002', 'acolhido')
      expect(resultado.credor).toMatchObject({
        nome: 'Gustavo Ferraz',
        documento: cpfDoCredor(900),
        classe: 'quirografario',
        valorDevedor: 0,
        valorAj: 0,
        valorQgc: 1_500_00,
      })
      expect((await pedido('ped-002'))?.credorId).toBe(resultado.credor?.id)
    })

    it('CRD-07 · rejeitar pedido de requerente fora da lista só muda o status, sem credor', async () => {
      const total = (await armazenamento.todos('credores')).length
      const resultado = await decidirPedido(armazenamento, contexto())('ped-002', 'rejeitado')
      expect(resultado.credorCriado).toBe(false)
      expect(resultado.credor).toBeUndefined()
      expect(await armazenamento.todos('credores')).toHaveLength(total)
      const decidido = await pedido('ped-002')
      expect(decidido?.status).toBe('rejeitado')
      expect(decidido?.credorId).toBeUndefined()
      const logs = await logsNovos()
      expect(logs).toHaveLength(1)
      expect(logs[0]?.mudancas).toEqual([{ campo: 'status', de: 'pendente', para: 'rejeitado' }])
    })

    it('rejeitar pedido de credor da lista não mexe no credor', async () => {
      const antes = await credor('crd-0002')
      await decidirPedido(armazenamento, contexto())('ped-001', 'rejeitado')
      expect(await credor('crd-0002')).toEqual(antes)
    })

    it('CRD-09 · pedido já decidido é recusado, sem gravar nada', async () => {
      const decidir = decidirPedido(armazenamento, contexto())
      await decidir('ped-001', 'rejeitado')
      const logs = (await logsNovos()).length
      for (const decisao of ['acolhido', 'rejeitado'] as const) {
        const erro = await erroDe(decidir('ped-001', decisao))
        expect(erro.message).toBe(ERRO_PEDIDO_JA_DECIDIDO)
      }
      expect((await pedido('ped-001'))?.status).toBe('rejeitado')
      expect(await logsNovos()).toHaveLength(logs)
    })

    it('requerente cujo CPF/CNPJ virou credor do processo na classe pedida até a decisão: vale para esse credor', async () => {
      // CPF do crd-0004 (ME/EPP, AJ 440,00) no requerente da impugnação, na mesma classe.
      await pedidoPendente({
        tipo: 'impugnacao',
        requerente: { nome: 'Carla Nunes', documento: cpfDoCredor(4) },
        classePedida: 'me-epp',
      })
      const total = (await credoresDoRj()).length
      const resultado = await decidirPedido(armazenamento, contexto())('ped-100', 'acolhido')
      expect(resultado.credorCriado).toBe(false)
      expect(await credoresDoRj()).toHaveLength(total)
      expect(await credor('crd-0004')).toMatchObject({ valorAj: 440_00, valorQgc: 4_321_00 })
      expect((await pedido('ped-100'))?.credorId).toBe('crd-0004')
    })

    it('AJ-04 · acolher pega o credor do documento na classe pedida, não o de outra classe', async () => {
      // O CPF do crd-0004 (ME/EPP) passa a ter também um credor quirografário no processo.
      const quirografario: Tipos['credores'] = {
        ...((await credor('crd-0004')) as Tipos['credores']),
        id: 'crd-0900',
        classe: 'quirografario',
        valorAj: 10_00,
      }
      await armazenamento.put('credores', quirografario)
      await pedidoPendente({
        tipo: 'impugnacao',
        requerente: { nome: 'Carla Nunes', documento: cpfDoCredor(4) },
        classePedida: 'quirografario',
      })
      const antes = await credor('crd-0004')
      const resultado = await decidirPedido(armazenamento, contexto())('ped-100', 'acolhido')
      expect(resultado.credorCriado).toBe(false)
      expect(resultado.credor?.id).toBe('crd-0900')
      expect(await credor('crd-0900')).toMatchObject({
        classe: 'quirografario',
        valorQgc: 4_321_00,
      })
      expect(await credor('crd-0004')).toEqual(antes)
    })

    it('AJ-04 · documento só em outra classe: acolher cria o credor da classe pedida', async () => {
      // CPF do crd-0004 (ME/EPP) pedindo crédito quirografário: é outro crédito, outra linha.
      await pedidoPendente({
        tipo: 'impugnacao',
        requerente: { nome: 'Carla Nunes', documento: cpfDoCredor(4) },
        classePedida: 'quirografario',
      })
      const antes = await credor('crd-0004')
      const total = (await credoresDoRj()).length
      const resultado = await decidirPedido(armazenamento, contexto())('ped-100', 'acolhido')
      expect(resultado.credorCriado).toBe(true)
      expect(await credoresDoRj()).toHaveLength(total + 1)
      expect(resultado.credor).toMatchObject({
        documento: cpfDoCredor(4),
        classe: 'quirografario',
        valorDevedor: 0,
        valorAj: 0,
        valorQgc: 4_321_00,
      })
      expect(await credor('crd-0004')).toEqual(antes)
    })

    it('analista decide (credores: editar, RF-39); sem permissão de credores, nada é gravado', async () => {
      await decidirPedido(armazenamento, contexto('analista', 'usr-ana'))('ped-001', 'acolhido')
      expect((await pedido('ped-001'))?.status).toBe('acolhido')

      const semPermissao: ContextoGravacao = { ...contexto(), papel: 'visitante' as Papel }
      const antes = (await logsNovos()).length
      await expect(
        decidirPedido(armazenamento, semPermissao)('ped-002', 'acolhido'),
      ).rejects.toBeInstanceOf(ErroPermissao)
      expect((await pedido('ped-002'))?.status).toBe('pendente')
      expect(await logsNovos()).toHaveLength(antes)
    })

    it('INV-01 · falha ao gravar o pedido desfaz o credor criado e os logs', async () => {
      const falhando = comFalhaEm(armazenamento, 'put', 'pedidosDeCredito')
      const total = (await armazenamento.todos('credores')).length
      await expect(decidirPedido(falhando, contexto())('ped-002', 'acolhido')).rejects.toThrow(
        'falha simulada',
      )
      expect(await armazenamento.todos('credores')).toHaveLength(total)
      expect((await pedido('ped-002'))?.status).toBe('pendente')
      expect(await logsNovos()).toHaveLength(0)
    })
  })

  describe('registrarPedido', () => {
    const base = {
      processoId: 'prc-001',
      valorPedido: 2_000_00,
      classePedida: 'quirografario',
      data: '2026-11-07',
    } satisfies Partial<NovoPedido>

    it('registra impugnação pendente de credor da lista, com log', async () => {
      const criado = await registrarPedido(
        armazenamento,
        contexto(),
      )({ ...base, credorId: 'crd-0010', tipo: 'impugnacao' })
      expect(criado).toMatchObject({ status: 'pendente', credorId: 'crd-0010' })
      const logs = await logsNovos()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({ acao: 'criou', colecao: 'pedidosDeCredito' })
    })

    it('CRD-10 · depois da relação do AJ, divergência e habilitação são recusadas', async () => {
      const registrar = registrarPedido(armazenamento, contexto())
      for (const dados of [
        { ...base, credorId: 'crd-0010', tipo: 'divergencia' as const },
        {
          ...base,
          requerente: { nome: 'Nova Pessoa', documento: cpfDoCredor(700) },
          tipo: 'habilitacao' as const,
        },
      ]) {
        const erro = await erroDe(registrar(dados))
        expect(erro.message).toBe(ERRO_SO_IMPUGNACAO)
      }
      expect(await logsNovos()).toHaveLength(0)
    })

    it('antes da relação do AJ: impugnação recusada; divergência só para credor, habilitação só para requerente', async () => {
      await antesDaRelacao()
      const registrar = registrarPedido(armazenamento, contexto())
      expect(
        (await erroDe(registrar({ ...base, credorId: 'crd-0010', tipo: 'impugnacao' }))).message,
      ).toBe(ERRO_SO_ANTES_DA_RELACAO)
      expect(
        (await erroDe(registrar({ ...base, credorId: 'crd-0010', tipo: 'habilitacao' }))).message,
      ).toBe(ERRO_TIPO_PARA_CREDOR)
      const requerente = { nome: 'Nova Pessoa', documento: cpfDoCredor(700) }
      expect((await erroDe(registrar({ ...base, requerente, tipo: 'divergencia' }))).message).toBe(
        ERRO_TIPO_PARA_REQUERENTE,
      )
      await registrar({ ...base, credorId: 'crd-0010', tipo: 'divergencia' })
      await registrar({ ...base, requerente, tipo: 'habilitacao' })
      expect(await logsNovos()).toHaveLength(2)
    })

    it('CRD-08 · requerente com CPF de credor do processo na mesma classe: recusado com o credor para vincular', async () => {
      // crd-0005 (Débora Lima) é da classe "não sujeito".
      const documento = cpfDoCredor(5)
      const porDocumento = credorComDocumento(armazenamento)
      expect((await porDocumento('prc-001', documento, 'nao-sujeito'))?.id).toBe('crd-0005')
      // Com pontuação, compara só os dígitos.
      const formatado = `${documento.slice(0, 3)}.${documento.slice(3, 6)}.${documento.slice(6, 9)}-${documento.slice(9)}`
      expect((await porDocumento('prc-001', formatado, 'nao-sujeito'))?.id).toBe('crd-0005')
      // Em outro processo ou em outra classe, o mesmo CPF não conta.
      expect(await porDocumento('prc-002', documento, 'nao-sujeito')).toBeUndefined()
      expect(await porDocumento('prc-001', documento, 'quirografario')).toBeUndefined()

      const erro = await erroDe(
        registrarPedido(
          armazenamento,
          contexto(),
        )({
          ...base,
          classePedida: 'nao-sujeito',
          requerente: { nome: 'Débora', documento },
          tipo: 'impugnacao',
        }),
      )
      expect(erro.message).toBe(AVISO_DOCUMENTO_EXISTENTE)
      expect(erro.vinculos).toEqual([
        { colecao: 'credores', id: 'crd-0005', rotulo: 'Débora Lima' },
      ])
      expect(await logsNovos()).toHaveLength(0)
    })

    it('AJ-04 · requerente com CPF de credor do processo só em outra classe: o pedido é registrado', async () => {
      // crd-0005 é "não sujeito"; o pedido é quirografário (art. 41: um crédito por classe).
      const criado = await registrarPedido(
        armazenamento,
        contexto(),
      )({
        ...base,
        requerente: { nome: 'Débora Lima', documento: cpfDoCredor(5) },
        tipo: 'impugnacao',
      })
      expect(criado).toMatchObject({ status: 'pendente', classePedida: 'quirografario' })
      expect(criado.credorId).toBeUndefined()
      expect(await logsNovos()).toHaveLength(1)
    })

    it('classe que o tipo do processo não tem é recusada (C-01)', async () => {
      const erro = await erroDe(
        registrarPedido(
          armazenamento,
          contexto(),
        )({ ...base, classePedida: 'tributario', credorId: 'crd-0010', tipo: 'impugnacao' }),
      )
      expect(erro.message).toBe(ERRO_CLASSE_DO_TIPO)
      expect(await logsNovos()).toHaveLength(0)
    })

    it('credor de outro processo é recusado', async () => {
      const erro = await erroDe(
        registrarPedido(
          armazenamento,
          contexto(),
        )({ ...base, credorId: 'crd-1001', tipo: 'impugnacao' }),
      )
      expect(erro.message).toMatch(/não pertence/)
    })

    it('CRD-16 · CPF com dígito inválido no requerente: erro no campo, nada gravado', async () => {
      const invalido = `${cpfDoCredor(5).slice(0, 10)}${(Number(cpfDoCredor(5).at(-1)) + 1) % 10}`
      const erro = await registrarPedido(
        armazenamento,
        contexto(),
      )({ ...base, requerente: { nome: 'Fulano', documento: invalido }, tipo: 'impugnacao' }).catch(
        (e: unknown) => e,
      )
      expect(erro).toMatchObject({
        name: 'ErroValidacao',
        problemas: [{ campo: 'requerente.documento', mensagem: 'CPF ou CNPJ inválido' }],
      })
      expect(await logsNovos()).toHaveLength(0)
    })
  })
})
