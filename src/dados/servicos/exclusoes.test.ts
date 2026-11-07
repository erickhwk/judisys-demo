// Exclusões com cascata e bloqueio (T-23) nas duas implementações de Armazenamento (SDD §10).
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { comFalhaEm } from '../../../tests/fixtures/falhas'
import { carregarSeedMini, ESCRITORIO_ID, seedMini } from '../../../tests/fixtures/seed-mini'
import type { Papel } from '../../regras/permissoes'
import { type Armazenamento, TABELAS, type Tabela } from '../armazenamento'
import { type ContextoGravacao, ErroPermissao } from '../repositorio'
import type { Log, Tipos } from '../schemas'
import { ErroRegra } from './comum'
import {
  contarExclusaoProcesso,
  ERRO_CREDOR_EM_AGC_ENCERRADA,
  ERRO_EMPRESA_VINCULADA,
  ERRO_EXCLUIR_A_SI_MESMO,
  ERRO_USUARIO_RESPONSAVEL,
  excluirCredor,
  excluirEmpresa,
  excluirProcesso,
  excluirUsuario,
} from './exclusoes'

const AGORA = '2026-11-07T10:00:00'

function contexto(papel: Papel = 'aj', usuarioId = 'usr-aj'): ContextoGravacao {
  return { usuario: { id: usuarioId, escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

describe.each(IMPLEMENTACOES)('exclusões sobre %s', (_nome, criar) => {
  let armazenamento: Armazenamento
  const logsNovos = async () =>
    (await armazenamento.todos<Log>('logs')).filter((log) => log.id !== 'log-001')
  const ids = async (tabela: Tabela) =>
    (await armazenamento.todos<{ id: string }>(tabela)).map((linha) => linha.id)

  async function erroDe(promessa: Promise<unknown>): Promise<ErroRegra> {
    const erro = await promessa.catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroRegra)
    return erro as ErroRegra
  }

  async function encerrarAgc() {
    const [agc] = seedMini().agcs
    if (!agc) throw new Error('seed sem AGC')
    await armazenamento.put('agcs', { ...agc, status: 'encerrada', convocacaoInstalada: 1 })
  }

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  describe('excluirProcesso', () => {
    beforeEach(async () => {
      // Um informe com upload, para ver o conteúdo sair junto.
      await armazenamento.put('arquivos', {
        ...seedMini().escritorios[0],
        id: 'arq-001',
        nome: 'parecer.pdf',
        tipo: 'application/pdf',
        tamanho: 3,
        conteudo: new Blob(['pdf']),
      })
      await armazenamento.put('informes', {
        ...seedMini().informes[0],
        id: 'inf-002',
        anexos: [
          {
            origem: 'local',
            arquivoId: 'arq-001',
            nome: 'parecer.pdf',
            tipo: 'application/pdf',
            tamanho: 3,
          },
        ],
      })
    })

    it('PRC-13 · tudo em cascata numa transação, com um log da contagem', async () => {
      const esperado = {
        processoEmpresas: 1,
        marcosDeFase: 2,
        prazos: 1,
        credores: 55,
        pedidosDeCredito: 2,
        agcs: 1,
        presencas: 2,
        votos: 1,
        informes: 2,
        arquivos: 1,
      }
      expect(await contarExclusaoProcesso(armazenamento)('prc-001')).toEqual(esperado)

      const contagem = await excluirProcesso(armazenamento, contexto())('prc-001')

      expect(contagem).toEqual(esperado)
      expect(await armazenamento.get('processos', 'prc-001')).toBeUndefined()
      for (const tabela of TABELAS.filter((t) => t !== 'logs')) {
        const linhas = await armazenamento.todos<Record<string, unknown>>(tabela)
        expect(linhas.filter((l) => l.processoId === 'prc-001')).toEqual([])
      }
      expect(await ids('presencas')).toEqual([])
      expect(await ids('votos')).toEqual([])
      expect(await ids('arquivos')).toEqual([])
      // O outro processo e as empresas ficam.
      expect(await ids('processos')).toEqual(['prc-002'])
      expect(await ids('empresas')).toEqual(['emp-01', 'emp-02'])
      expect(await ids('credores')).toEqual(['crd-1001'])

      const logs = await logsNovos()
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        acao: 'excluiu',
        colecao: 'processos',
        registroId: 'prc-001',
        processoId: 'prc-001',
        usuarioId: 'usr-aj',
        data: AGORA,
      })
      expect(logs[0]?.mudancas).toContainEqual({ campo: 'apelido', de: 'Grupo Aurora' })
      expect(logs[0]?.mudancas).toContainEqual({ campo: 'cascata.credores', de: 55, para: 0 })
      // Logs antigos do processo ficam (LOG-03).
      expect(await armazenamento.get('logs', 'log-001')).toBeDefined()
    })

    it('upload citado em dois anexos conta e sai uma vez', async () => {
      const informe = await armazenamento.get<Tipos['informes']>('informes', 'inf-002')
      if (!informe) throw new Error('sem informe')
      await armazenamento.put('informes', {
        ...informe,
        anexos: [...informe.anexos, ...informe.anexos],
      })
      expect(await contarExclusaoProcesso(armazenamento)('prc-001')).toMatchObject({ arquivos: 1 })
      expect(await excluirProcesso(armazenamento, contexto())('prc-001')).toMatchObject({
        arquivos: 1,
      })
      expect(await ids('arquivos')).toEqual([])
    })

    it('INV-01 · falha no meio da cascata não remove nada', async () => {
      const falha = comFalhaEm(armazenamento, 'delete', 'informes')
      await expect(excluirProcesso(falha, contexto())('prc-001')).rejects.toThrow('falha simulada')
      expect(await armazenamento.get('processos', 'prc-001')).toBeDefined()
      expect(await ids('credores')).toHaveLength(56)
      expect(await ids('votos')).toEqual(['vot-001'])
      expect(await logsNovos()).toEqual([])
    })

    it('INV-02 · analista não exclui processo', async () => {
      await expect(
        excluirProcesso(armazenamento, contexto('analista', 'usr-ana'))('prc-001'),
      ).rejects.toBeInstanceOf(ErroPermissao)
      expect(await armazenamento.get('processos', 'prc-001')).toBeDefined()
    })
  })

  describe('excluirEmpresa', () => {
    it('T-23 · empresa vinculada não é excluída; a mensagem traz os processos', async () => {
      const erro = await erroDe(excluirEmpresa(armazenamento, contexto())('emp-01'))
      expect(erro.message).toBe(ERRO_EMPRESA_VINCULADA)
      expect(erro.vinculos).toEqual([
        { colecao: 'processos', id: 'prc-001', rotulo: 'Grupo Aurora' },
      ])
      expect(await ids('empresas')).toContain('emp-01')
      expect(await logsNovos()).toEqual([])
    })

    it('empresa sem processo é excluída com log', async () => {
      await armazenamento.delete('processoEmpresas', 'pe-002')
      await excluirEmpresa(armazenamento, contexto())('emp-02')
      expect(await ids('empresas')).toEqual(['emp-01'])
      expect(await logsNovos()).toEqual([
        expect.objectContaining({ acao: 'excluiu', colecao: 'empresas', registroId: 'emp-02' }),
      ])
    })

    it('vínculo com processo que já não existe sai junto com a empresa', async () => {
      await armazenamento.delete('processos', 'prc-002')
      await excluirEmpresa(armazenamento, contexto())('emp-02')
      expect(await ids('empresas')).toEqual(['emp-01'])
      expect(await ids('processoEmpresas')).toEqual(['pe-001'])
    })
  })

  describe('excluirCredor', () => {
    it('CRD-14 · credor que votou em AGC encerrada: recusado com mensagem', async () => {
      await encerrarAgc()
      const erro = await erroDe(excluirCredor(armazenamento, contexto())('crd-0001'))
      expect(erro.message).toBe(ERRO_CREDOR_EM_AGC_ENCERRADA)
      expect(erro.vinculos.map((v) => v.id)).toEqual(['agc-001'])
      expect(await ids('votos')).toEqual(['vot-001'])
      expect(await armazenamento.get('credores', 'crd-0001')).toBeDefined()
      expect(await logsNovos()).toEqual([])
    })

    it('presente sem voto em AGC encerrada também é recusado (T-33: conta como abstenção)', async () => {
      await encerrarAgc()
      await erroDe(excluirCredor(armazenamento, contexto())('crd-0003'))
      expect(await armazenamento.get('credores', 'crd-0003')).toBeDefined()
    })

    it('em AGC aberta, presença e voto saem junto, cada um com log', async () => {
      await excluirCredor(armazenamento, contexto())('crd-0001')
      expect(await armazenamento.get('credores', 'crd-0001')).toBeUndefined()
      expect(await ids('presencas')).toEqual(['pre-002'])
      expect(await ids('votos')).toEqual([])
      const logs = await logsNovos()
      expect(logs.map((l) => [l.colecao, l.registroId]).sort()).toEqual([
        ['credores', 'crd-0001'],
        ['presencas', 'pre-001'],
        ['votos', 'vot-001'],
      ])
      expect(logs.every((l) => l.acao === 'excluiu' && l.processoId === 'prc-001')).toBe(true)
    })

    it('INV-02 · analista edita credores mas não AGC: credor com presença não sai', async () => {
      await expect(
        excluirCredor(armazenamento, contexto('analista', 'usr-ana'))('crd-0001'),
      ).rejects.toBeInstanceOf(ErroPermissao)
      expect(await armazenamento.get('credores', 'crd-0001')).toBeDefined()
      expect(await ids('votos')).toEqual(['vot-001'])
      expect(await logsNovos()).toEqual([])
    })

    it('analista exclui credor sem presença nem voto', async () => {
      await excluirCredor(armazenamento, contexto('analista', 'usr-ana'))('crd-0010')
      expect(await armazenamento.get('credores', 'crd-0010')).toBeUndefined()
    })

    it('pedidos de crédito ligados ao credor saem junto', async () => {
      await excluirCredor(armazenamento, contexto())('crd-0002')
      expect(await ids('pedidosDeCredito')).toEqual(['ped-002'])
    })
  })

  describe('excluirUsuario', () => {
    it('T-23 · usuário responsável por processo não é excluído', async () => {
      const erro = await erroDe(excluirUsuario(armazenamento, contexto())('usr-adv'))
      expect(erro.message).toBe(ERRO_USUARIO_RESPONSAVEL)
      expect(erro.vinculos).toEqual([{ colecao: 'processos', id: 'prc-002', rotulo: 'Boreal' }])
      expect(await ids('usuarios')).toContain('usr-adv')
    })

    it('T-23 · ninguém exclui a si mesmo', async () => {
      const erro = await erroDe(excluirUsuario(armazenamento, contexto())('usr-aj'))
      expect(erro.message).toBe(ERRO_EXCLUIR_A_SI_MESMO)
      expect(await ids('usuarios')).toContain('usr-aj')
    })

    it('usuário sem processo é excluído pelo AJ, com log', async () => {
      await excluirUsuario(armazenamento, contexto())('usr-ana')
      expect(await ids('usuarios')).toEqual(['usr-adv', 'usr-aj'])
      expect(await logsNovos()).toEqual([
        expect.objectContaining({ acao: 'excluiu', colecao: 'usuarios', registroId: 'usr-ana' }),
      ])
    })

    it('INV-02 · advogado não exclui usuário', async () => {
      await expect(
        excluirUsuario(armazenamento, contexto('advogado', 'usr-adv'))('usr-ana'),
      ).rejects.toBeInstanceOf(ErroPermissao)
    })
  })
})
