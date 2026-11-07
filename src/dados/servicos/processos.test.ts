// Criar e editar processo com as empresas nas duas implementações de Armazenamento (SDD §7.3, §10).
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { comFalhaEm } from '../../../tests/fixtures/falhas'
import { CNJ_RJ, carregarSeedMini, ESCRITORIO_ID } from '../../../tests/fixtures/seed-mini'
import { completarCnj } from '../../regras/documentos'
import type { Papel } from '../../regras/permissoes'
import type { Armazenamento } from '../armazenamento'
import {
  type ContextoGravacao,
  ErroNaoEncontrado,
  ErroPermissao,
  ErroValidacao,
} from '../repositorio'
import type { Log, Tipos } from '../schemas'
import { ErroRegra } from './comum'
import {
  CAMPO_EMPRESAS,
  criarProcesso,
  type DadosProcesso,
  ERRO_TIPO_FIXO,
  editarProcesso,
} from './processos'

const AGORA = '2026-11-07T10:00:00'

function contexto(papel: Papel = 'aj', usuarioId = 'usr-aj'): ContextoGravacao {
  return { usuario: { id: usuarioId, escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

function dados(mudancas: Partial<DadosProcesso> = {}): DadosProcesso {
  return {
    apelido: 'Grupo Novo',
    numeroCnj: completarCnj('000999920268260100'),
    tipo: 'rj',
    comarca: 'Campinas',
    uf: 'SP',
    vara: '1ª Vara Empresarial',
    email: '',
    consolidacao: 'nenhuma',
    passivoDeclarado: 1_000_000_00,
    responsavelId: 'usr-aj',
    honorariosPercentual: null,
    honorariosValor: null,
    ...mudancas,
  }
}

describe.each(IMPLEMENTACOES)('serviços de processo sobre %s', (_nome, criar) => {
  let armazenamento: Armazenamento
  const logsNovos = async () =>
    (await armazenamento.todos<Log>('logs')).filter((log) => log.id !== 'log-001')
  const doProcesso = <K extends 'marcosDeFase' | 'prazos' | 'processoEmpresas'>(
    tabela: K,
    processoId: string,
  ) => armazenamento.porIndice<Tipos[K]>(tabela, 'processoId', processoId)

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  describe('criarProcesso', () => {
    it('PRC-15 · RJ nova começa em "pedido", com marco na data informada e sem prazos', async () => {
      const processo = await criarProcesso(
        armazenamento,
        contexto(),
      )({
        processo: dados(),
        empresaIds: ['emp-01', 'emp-02'],
        dataInicio: '2026-11-02',
      })
      expect(processo.faseAtual).toBe('pedido')
      const marcos = await doProcesso('marcosDeFase', processo.id)
      expect(marcos.map((m) => [m.fase, m.data])).toEqual([['pedido', '2026-11-02']])
      expect(await doProcesso('prazos', processo.id)).toEqual([])
      const vinculos = await doProcesso('processoEmpresas', processo.id)
      expect(vinculos.map((v) => v.empresaId).sort()).toEqual(['emp-01', 'emp-02'])
    })

    it('PRC-05 · falência nasce "decretada" e cria habilitações, relatório e plano de realização', async () => {
      const processo = await criarProcesso(
        armazenamento,
        contexto(),
      )({
        processo: dados({ tipo: 'falencia' }),
        empresaIds: ['emp-02'],
        dataInicio: '2026-10-01',
      })
      expect(processo.faseAtual).toBe('decretada')
      const [marco] = await doProcesso('marcosDeFase', processo.id)
      const prazos = await doProcesso('prazos', processo.id)
      expect(prazos.map((p) => p.vencimento).sort()).toEqual([
        '2026-10-16',
        '2026-11-10',
        '2026-11-30',
      ])
      expect(prazos.every((p) => p.marcoId === marco?.id && p.origem === 'automatico')).toBe(true)
    })

    it('log do processo, do marco e das empresas, todos com o processoId', async () => {
      const processo = await criarProcesso(
        armazenamento,
        contexto(),
      )({
        processo: dados(),
        empresaIds: ['emp-01'],
        dataInicio: '2026-11-02',
      })
      const logs = await logsNovos()
      expect(logs.map((l) => [l.acao, l.colecao])).toEqual(
        expect.arrayContaining([
          ['criou', 'processos'],
          ['criou', 'marcosDeFase'],
        ]),
      )
      // As empresas da criação vão num log 'criou', não numa edição que o usuário não fez.
      expect(logs.some((l) => l.acao === 'editou')).toBe(false)
      // processoEmpresas não tem log próprio: a mudança vai para o log do processo (SDD §5.4).
      expect(logs.some((l) => l.colecao === 'processoEmpresas')).toBe(false)
      const empresas = logs.find((l) => l.mudancas.some((m) => m.campo === CAMPO_EMPRESAS))
      expect(empresas?.acao).toBe('criou')
      expect(empresas?.mudancas).toEqual([{ campo: CAMPO_EMPRESAS, de: [], para: ['emp-01'] }])
      expect(logs.every((l) => l.processoId === processo.id)).toBe(true)
    })

    it('PRC-14 · CNJ com dígito verificador errado: erro no campo e nada gravado', async () => {
      const errado = `${CNJ_RJ.slice(0, 7)}${(Number(CNJ_RJ[7]) + 1) % 10}${CNJ_RJ.slice(8)}`
      const erro = await criarProcesso(
        armazenamento,
        contexto(),
      )({
        processo: dados({ numeroCnj: errado }),
        empresaIds: [],
        dataInicio: '2026-11-02',
      }).catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas.map((p) => p.campo)).toContain('numeroCnj')
      expect(await armazenamento.todos('processos')).toHaveLength(2)
      expect(await logsNovos()).toEqual([])
    })

    it('INV-02 · analista não cria processo e nada é gravado', async () => {
      await expect(
        criarProcesso(
          armazenamento,
          contexto('analista', 'usr-ana'),
        )({
          processo: dados(),
          empresaIds: [],
          dataInicio: '2026-11-02',
        }),
      ).rejects.toBeInstanceOf(ErroPermissao)
      expect(await armazenamento.todos('processos')).toHaveLength(2)
    })

    it('empresa inexistente desfaz tudo (INV-01)', async () => {
      await expect(
        criarProcesso(
          armazenamento,
          contexto(),
        )({
          processo: dados(),
          empresaIds: ['emp-99'],
          dataInicio: '2026-11-02',
        }),
      ).rejects.toBeInstanceOf(ErroNaoEncontrado)
      expect(await armazenamento.todos('processos')).toHaveLength(2)
      expect(await logsNovos()).toEqual([])
    })

    it('INV-01 · falha ao gravar o marco desfaz o processo, os vínculos e os logs', async () => {
      const falho = comFalhaEm(armazenamento, 'put', 'marcosDeFase')
      await expect(
        criarProcesso(
          falho,
          contexto(),
        )({
          processo: dados(),
          empresaIds: ['emp-01'],
          dataInicio: '2026-11-02',
        }),
      ).rejects.toThrow('falha simulada')
      expect(await armazenamento.todos('processos')).toHaveLength(2)
      expect(await armazenamento.todos('processoEmpresas')).toHaveLength(2)
      expect(await logsNovos()).toEqual([])
    })
  })

  describe('editarProcesso', () => {
    it('troca as empresas e grava a mudança no log do processo', async () => {
      const atual = await armazenamento.get<Tipos['processos']>('processos', 'prc-001')
      if (!atual) throw new Error('seed sem processo')
      const {
        id: _id,
        escritorioId: _e,
        criadoEm: _c,
        atualizadoEm: _a,
        faseAtual: _f,
        ...resto
      } = atual
      await editarProcesso(armazenamento, contexto())(
        'prc-001',
        { ...resto, apelido: 'Grupo Aurora Renomeado' },
        ['emp-02'],
      )
      const processo = await armazenamento.get<Tipos['processos']>('processos', 'prc-001')
      expect(processo?.apelido).toBe('Grupo Aurora Renomeado')
      expect(processo?.faseAtual).toBe('plano-apresentado')
      const vinculos = await doProcesso('processoEmpresas', 'prc-001')
      expect(vinculos.map((v) => v.empresaId)).toEqual(['emp-02'])
      const logs = await logsNovos()
      expect(logs).toHaveLength(2)
      expect(logs.flatMap((l) => l.mudancas)).toEqual(
        expect.arrayContaining([
          { campo: 'apelido', de: 'Grupo Aurora', para: 'Grupo Aurora Renomeado' },
          { campo: CAMPO_EMPRESAS, de: ['emp-01'], para: ['emp-02'] },
        ]),
      )
    })

    it('LOG-02 · salvar sem mudar nada não grava log', async () => {
      const atual = await armazenamento.get<Tipos['processos']>('processos', 'prc-001')
      if (!atual) throw new Error('seed sem processo')
      const {
        id: _id,
        escritorioId: _e,
        criadoEm: _c,
        atualizadoEm: _a,
        faseAtual: _f,
        ...resto
      } = atual
      await editarProcesso(armazenamento, contexto())('prc-001', resto, ['emp-01'])
      expect(await logsNovos()).toEqual([])
    })

    it('o tipo não muda', async () => {
      await expect(
        editarProcesso(armazenamento, contexto())('prc-001', dados({ tipo: 'falencia' }), []),
      ).rejects.toThrow(new ErroRegra(ERRO_TIPO_FIXO))
      expect(await doProcesso('processoEmpresas', 'prc-001')).toHaveLength(1)
    })
  })
})
