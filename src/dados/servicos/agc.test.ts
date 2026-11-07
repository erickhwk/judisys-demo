// AGC: cadastro, presença e instalação (RF-31 a RF-33, SDD §7.6, DMO-16) nas duas implementações
// de Armazenamento (SDD §10). As regras puras do quórum têm os seus testes em regras/votacao.test.ts.
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { carregarSeedMini, ESCRITORIO_ID } from '../../../tests/fixtures/seed-mini'
import type { Papel } from '../../regras/permissoes'
import { credoresVotantes } from '../../regras/votacao'
import type { Armazenamento } from '../armazenamento'
import { type ContextoGravacao, ErroPermissao, ErroValidacao } from '../repositorio'
import type { Log, Tipos } from '../schemas'
import {
  ERRO_AGC_NAO_AGENDADA,
  ERRO_AGC_SO_RJ,
  ERRO_CREDOR_DE_OUTRO_PROCESSO,
  ERRO_SEM_PRESENTES,
  instalarAgc,
  marcarClasse,
  marcarPresenca,
  salvarAgc,
} from './agc'
import { ErroRegra } from './comum'

const AGORA = '2026-11-07T10:00:00'

function contexto(papel: Papel = 'aj'): ContextoGravacao {
  return { usuario: { id: `usr-${papel}`, escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

const DADOS = {
  processoId: 'prc-001',
  dataPrimeira: '2026-12-01',
  dataSegunda: '2026-12-08',
  pauta: 'Deliberação sobre o plano',
}

describe.each(IMPLEMENTACOES)('serviços da AGC (%s)', (_nome, criar) => {
  let armazenamento: Armazenamento

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  const presentesDe = async (agcId: string) =>
    (await armazenamento.porIndice<Tipos['presencas']>('presencas', 'agcId', agcId))
      .map((p) => p.credorId)
      .sort()
  const credoresRj = () =>
    armazenamento.porIndice<Tipos['credores']>('credores', 'processoId', 'prc-001')
  const logs = () => armazenamento.todos<Log>('logs')

  describe('salvarAgc (RF-31)', () => {
    it('cria agendada, com log; o processo pode ter várias', async () => {
      const salvar = salvarAgc(armazenamento, contexto())
      const nova = await salvar({ dados: DADOS })
      expect(nova).toMatchObject({ ...DADOS, status: 'agendada' })
      await salvar({ dados: { ...DADOS, pauta: 'Outra pauta' } })
      const agcs = await armazenamento.porIndice<Tipos['agcs']>('agcs', 'processoId', 'prc-001')
      expect(agcs).toHaveLength(3)
      expect(await logs()).toContainEqual(
        expect.objectContaining({ acao: 'criou', colecao: 'agcs', registroId: nova.id }),
      )
    })

    it('edita datas e pauta enquanto agendada', async () => {
      const editada = await salvarAgc(
        armazenamento,
        contexto(),
      )({ id: 'agc-001', dados: { ...DADOS, pauta: 'Nova pauta' } })
      expect(editada).toMatchObject({ id: 'agc-001', pauta: 'Nova pauta', status: 'agendada' })
    })

    it('recusa AGC na falência', async () => {
      await expect(
        salvarAgc(armazenamento, contexto())({ dados: { ...DADOS, processoId: 'prc-002' } }),
      ).rejects.toThrow(ERRO_AGC_SO_RJ)
    })

    it('recusa 2ª convocação antes da 1ª (erro no campo)', async () => {
      const falha = salvarAgc(
        armazenamento,
        contexto(),
      )({ dados: { ...DADOS, dataSegunda: '2026-11-30' } })
      await expect(falha).rejects.toBeInstanceOf(ErroValidacao)
    })

    it('recusa editar AGC instalada', async () => {
      await armazenamento.put('agcs', {
        ...(await armazenamento.get<Tipos['agcs']>('agcs', 'agc-001')),
        status: 'instalada',
        convocacaoInstalada: 2,
      })
      await expect(
        salvarAgc(armazenamento, contexto())({ id: 'agc-001', dados: DADOS }),
      ).rejects.toThrow(ERRO_AGC_NAO_AGENDADA)
    })

    it('analista não grava (INV-02)', async () => {
      await expect(
        salvarAgc(armazenamento, contexto('analista'))({ dados: DADOS }),
      ).rejects.toThrow(ErroPermissao)
    })
  })

  describe('presença (RF-32)', () => {
    it('AGC-02 · "todos da classe II" marca todos os votantes da classe II, um log por presença', async () => {
      const antes = (await logs()).length
      await marcarClasse(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', classe: 'garantia-real', presente: true })

      const votantesII = credoresVotantes(await credoresRj())
        .filter((v) => v.classe === 'garantia-real')
        .map((v) => v.credorId)
      expect(votantesII.length).toBeGreaterThan(5)
      const presentes = await presentesDe('agc-001')
      expect(presentes).toEqual([...votantesII, 'crd-0001', 'crd-0003'].sort())
      // crd-0007 é da classe II com valor zero: não vota e fica de fora (INV-06).
      expect(presentes).not.toContain('crd-0007')
      expect((await logs()).length - antes).toBe(votantesII.length)
    })

    it('marcar de novo quem já está presente não grava nada', async () => {
      const antes = (await logs()).length
      await marcarPresenca(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', credorIds: ['crd-0001'], presente: true })
      expect((await logs()).length).toBe(antes)
    })

    it('"todos da classe" desmarcado tira a classe toda', async () => {
      const marcar = marcarClasse(armazenamento, contexto())
      await marcar({ agcId: 'agc-001', classe: 'quirografario', presente: true })
      await marcar({ agcId: 'agc-001', classe: 'quirografario', presente: false })
      expect(await presentesDe('agc-001')).toEqual(['crd-0001'])
    })

    it('desmarcar o credor tira a presença e o voto dele', async () => {
      await marcarPresenca(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', credorIds: ['crd-0001'], presente: false })
      expect(await presentesDe('agc-001')).toEqual(['crd-0003'])
      expect(await armazenamento.porIndice('votos', 'agcId', 'agc-001')).toEqual([])
    })

    it.each([
      ['não sujeito', 'crd-0005', /não sujeito/],
      ['valor zero', 'crd-0007', /valor zero/],
    ])('AGC-24 · credor %s não pode ser marcado presente', async (_caso, credorId, mensagem) => {
      const falha = marcarPresenca(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', credorIds: [credorId], presente: true })
      await expect(falha).rejects.toBeInstanceOf(ErroRegra)
      await expect(falha).rejects.toThrow(mensagem)
      expect(await presentesDe('agc-001')).toEqual(['crd-0001', 'crd-0003'])
    })

    it('credor que deixou de votar depois de marcado pode ser desmarcado, também pela classe', async () => {
      // crd-0005 (não sujeito) e crd-0007 (classe II, valor zero) marcados antes de perder o voto.
      const presenca = (id: string, credorId: string) => ({
        id,
        agcId: 'agc-001',
        credorId,
        escritorioId: ESCRITORIO_ID,
        criadoEm: AGORA,
        atualizadoEm: AGORA,
      })
      await armazenamento.put('presencas', presenca('pre-x1', 'crd-0005'))
      await armazenamento.put('presencas', presenca('pre-x2', 'crd-0007'))

      await marcarPresenca(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', credorIds: ['crd-0005'], presente: false })
      await marcarClasse(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', classe: 'garantia-real', presente: false })
      const presentes = await presentesDe('agc-001')
      expect(presentes).not.toContain('crd-0005')
      expect(presentes).not.toContain('crd-0007')
    })

    it('recusa credor de outro processo, sem gravar nada', async () => {
      const falha = marcarPresenca(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', credorIds: ['crd-0002', 'crd-9001'], presente: true })
      await expect(falha).rejects.toThrow(ERRO_CREDOR_DE_OUTRO_PROCESSO)
      expect(await presentesDe('agc-001')).toEqual(['crd-0001', 'crd-0003'])
    })

    it('analista não marca presença (INV-02)', async () => {
      await expect(
        marcarPresenca(
          armazenamento,
          contexto('analista'),
        )({ agcId: 'agc-001', credorIds: ['crd-0002'], presente: true }),
      ).rejects.toThrow(ErroPermissao)
    })
  })

  describe('instalação (RF-33)', () => {
    it('em 1ª convocação, sem quórum em todas as classes, recusa com as classes abaixo', async () => {
      const falha = instalarAgc(armazenamento, contexto())({ agcId: 'agc-001', convocacao: 1 })
      await expect(falha).rejects.toThrow(/Não atinge: .*II · Garantia real/)
      const agc = await armazenamento.get<Tipos['agcs']>('agcs', 'agc-001')
      expect(agc?.status).toBe('agendada')
    })

    it('em 1ª convocação, com todas as classes presentes, instala e fecha a lista', async () => {
      const marcar = marcarClasse(armazenamento, contexto())
      for (const classe of ['trabalhista', 'garantia-real', 'quirografario', 'me-epp'] as const) {
        await marcar({ agcId: 'agc-001', classe, presente: true })
      }
      const instalada = await instalarAgc(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', convocacao: 1 })
      expect(instalada).toMatchObject({ status: 'instalada', convocacaoInstalada: 1 })

      await expect(
        marcarPresenca(
          armazenamento,
          contexto(),
        )({ agcId: 'agc-001', credorIds: ['crd-0001'], presente: false }),
      ).rejects.toThrow(ERRO_AGC_NAO_AGENDADA)
    })

    it('AGC-05 · em 2ª convocação, um único presente basta', async () => {
      await marcarPresenca(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', credorIds: ['crd-0003'], presente: false })
      const instalada = await instalarAgc(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', convocacao: 2 })
      expect(instalada).toMatchObject({ status: 'instalada', convocacaoInstalada: 2 })
    })

    it('em 2ª convocação, sem presentes, não instala (T-32)', async () => {
      await marcarPresenca(
        armazenamento,
        contexto(),
      )({ agcId: 'agc-001', credorIds: ['crd-0001', 'crd-0003'], presente: false })
      await expect(
        instalarAgc(armazenamento, contexto())({ agcId: 'agc-001', convocacao: 2 }),
      ).rejects.toThrow(ERRO_SEM_PRESENTES)
    })
  })
})
