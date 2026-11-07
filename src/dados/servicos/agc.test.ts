// AGC: cadastro, presença e instalação (RF-31 a RF-33, SDD §7.6, DMO-16) nas duas implementações
// de Armazenamento (SDD §10). As regras puras do quórum têm os seus testes em regras/votacao.test.ts.
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { comFalhaEm } from '../../../tests/fixtures/falhas'
import { carregarSeedMini, ESCRITORIO_ID } from '../../../tests/fixtures/seed-mini'
import type { Papel } from '../../regras/permissoes'
import { credoresVotantes, resultadoAgc } from '../../regras/votacao'
import type { Armazenamento } from '../armazenamento'
import { type ContextoGravacao, ErroPermissao, ErroValidacao } from '../repositorio'
import type { Log, Tipos } from '../schemas'
import {
  ERRO_AGC_ENCERRADA,
  ERRO_AGC_NAO_AGENDADA,
  ERRO_AGC_NAO_INSTALADA,
  ERRO_AGC_SO_RJ,
  ERRO_CREDOR_DE_OUTRO_PROCESSO,
  ERRO_PRESENTE_SEM_VOTO,
  ERRO_SEM_PRESENTES,
  ERRO_SEM_PRESENTES_VOTANTES,
  ERRO_VOTO_DE_NAO_PRESENTE,
  instalarAgc,
  marcarClasse,
  marcarPresenca,
  registrarResultadoAgc,
  resumoDaAta,
  salvarAgc,
  TITULO_ATA,
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

// Registro do resultado (RF-37, T-30, T-33; DMO-17). No seed mini, a agc-001 tem presentes
// crd-0001 (I · Trabalhista, R$ 110) e crd-0003 (III · Quirografário, R$ 330), e um voto "sim" de
// crd-0001 já gravado (vot-001).
describe.each(IMPLEMENTACOES)('registrarResultadoAgc (%s)', (_nome, criar) => {
  let armazenamento: Armazenamento

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  const instalarEm2a = () =>
    instalarAgc(armazenamento, contexto())({ agcId: 'agc-001', convocacao: 2 })
  const registrar = (votos: { credorId: string; voto: 'sim' | 'nao' | 'abstencao' }[]) =>
    registrarResultadoAgc(armazenamento, contexto())({ agcId: 'agc-001', votos })
  const votosGravados = async () =>
    (await armazenamento.porIndice<Tipos['votos']>('votos', 'agcId', 'agc-001'))
      .map((v) => `${v.credorId}:${v.voto}`)
      .sort()
  const atas = async () =>
    (await armazenamento.porIndice<Tipos['informes']>('informes', 'processoId', 'prc-001')).filter(
      (i) => i.categoria === 'atas-agc',
    )
  const statusDaAgc = async () =>
    (await armazenamento.get<Tipos['agcs']>('agcs', 'agc-001'))?.status
  const logs = () => armazenamento.todos<Log>('logs')

  it('AGC-21 · grava os votos, encerra a AGC e cria a ata com o resumo e o PDF genérico', async () => {
    await instalarEm2a()
    const { agc, informe, resultado } = await registrar([
      { credorId: 'crd-0001', voto: 'nao' },
      { credorId: 'crd-0003', voto: 'sim' },
    ])

    expect(agc.status).toBe('encerrada')
    expect(await statusDaAgc()).toBe('encerrada')
    // O voto já gravado de crd-0001 é atualizado, não duplicado.
    expect(await votosGravados()).toEqual(['crd-0001:nao', 'crd-0003:sim'])
    expect(resultado.situacao).toBe('rejeitado')

    expect(informe).toMatchObject({
      processoId: 'prc-001',
      titulo: TITULO_ATA,
      categoria: 'atas-agc',
      fase: 'plano-apresentado',
      dataAgc: '2026-11-20',
      data: '2026-11-07',
      publicadoNoSite: false,
      anexos: [{ origem: 'publico', caminho: 'anexos/ata-agc.pdf', nome: 'Ata da AGC.pdf' }],
    })
    expect(informe.resumo).toContain('AGC de 20/11/2026, instalada em 2ª convocação.')
    expect(informe.resumo).toContain('I · Trabalhista: rejeitada (0 sim, 1 não, 0 abstenções).')
    expect(informe.resumo).toContain('III · Quirografário: aprovada (1 sim, 0 não, 0 abstenções;')
    expect(informe.resumo).toContain('Resultado: plano rejeitado.')
    expect(informe.resumo).toContain('Cram down (art. 58, §1º):')
    expect(informe.resumo).toMatch(/3\. Em cada classe que rejeitou.*: não cumprido/)
    expect(await atas()).toEqual([informe])

    expect(await logs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ acao: 'editou', colecao: 'votos', registroId: 'vot-001' }),
        expect.objectContaining({ acao: 'criou', colecao: 'votos' }),
        expect.objectContaining({ acao: 'editou', colecao: 'agcs', registroId: 'agc-001' }),
        expect.objectContaining({ acao: 'criou', colecao: 'informes', registroId: informe.id }),
      ]),
    )
  })

  it('INV-01 · falha ao criar a ata não deixa nada gravado (votos, AGC, logs)', async () => {
    await instalarEm2a()
    const logsAntes = (await logs()).length
    const falha = comFalhaEm(armazenamento, 'put', 'informes')
    await expect(
      registrarResultadoAgc(
        falha,
        contexto(),
      )({
        agcId: 'agc-001',
        votos: [
          { credorId: 'crd-0001', voto: 'nao' },
          { credorId: 'crd-0003', voto: 'sim' },
        ],
      }),
    ).rejects.toThrow('falha simulada')
    expect(await statusDaAgc()).toBe('instalada')
    expect(await votosGravados()).toEqual(['crd-0001:sim'])
    expect(await atas()).toEqual([])
    expect(await logs()).toHaveLength(logsAntes)
  })

  it('T-33 · presente sem voto impede o registro', async () => {
    await instalarEm2a()
    await expect(registrar([{ credorId: 'crd-0001', voto: 'sim' }])).rejects.toThrow(
      ERRO_PRESENTE_SEM_VOTO,
    )
    expect(await statusDaAgc()).toBe('instalada')
    expect(await atas()).toEqual([])
  })

  it('T-32 · sem presente com direito a voto não registra (crédito zerado depois da instalação)', async () => {
    await instalarEm2a()
    for (const id of ['crd-0001', 'crd-0003']) {
      const credor = await armazenamento.get<Tipos['credores']>('credores', id)
      await armazenamento.put('credores', { ...credor, valorAj: 0, valorQgc: 0 })
    }
    await expect(registrar([])).rejects.toThrow(ERRO_SEM_PRESENTES_VOTANTES)
    expect(await statusDaAgc()).toBe('instalada')
    expect(await atas()).toEqual([])
  })

  it('recusa voto de quem não está presente', async () => {
    await instalarEm2a()
    await expect(
      registrar([
        { credorId: 'crd-0001', voto: 'sim' },
        { credorId: 'crd-0003', voto: 'sim' },
        { credorId: 'crd-0002', voto: 'sim' },
      ]),
    ).rejects.toThrow(ERRO_VOTO_DE_NAO_PRESENTE)
    expect(await statusDaAgc()).toBe('instalada')
  })

  it('AGC-23 · AGC não instalada não registra', async () => {
    const falha = registrar([
      { credorId: 'crd-0001', voto: 'sim' },
      { credorId: 'crd-0003', voto: 'sim' },
    ])
    await expect(falha).rejects.toBeInstanceOf(ErroRegra)
    await expect(falha).rejects.toThrow(ERRO_AGC_NAO_INSTALADA)
    expect(await statusDaAgc()).toBe('agendada')
  })

  it('AGC-22 · AGC encerrada não registra de novo', async () => {
    await instalarEm2a()
    const votos = [
      { credorId: 'crd-0001', voto: 'sim' as const },
      { credorId: 'crd-0003', voto: 'sim' as const },
    ]
    await registrar(votos)
    await expect(registrar(votos)).rejects.toThrow(ERRO_AGC_ENCERRADA)
    expect(await atas()).toHaveLength(1)
  })

  it('INV-02 · analista não registra', async () => {
    await instalarEm2a()
    await expect(
      registrarResultadoAgc(armazenamento, contexto('analista'))({ agcId: 'agc-001', votos: [] }),
    ).rejects.toBeInstanceOf(ErroPermissao)
    expect(await statusDaAgc()).toBe('instalada')
  })
})

describe('resumoDaAta (T-30)', () => {
  it('com todas as classes que votaram aprovando, sem cram down', () => {
    const votantes = [
      { credorId: 'a', classe: 'trabalhista' as const, valor: 100 },
      { credorId: 'b', classe: 'garantia-real' as const, valor: 500 },
    ]
    const resultado = resultadoAgc(
      votantes,
      ['a', 'b'],
      [
        { credorId: 'a', voto: 'sim' },
        { credorId: 'b', voto: 'sim' },
      ],
    )
    expect(resumoDaAta('2026-11-13', 1, resultado)).toBe(
      [
        'AGC de 13/11/2026, instalada em 1ª convocação.',
        '',
        'Resultado por classe (art. 45):',
        'I · Trabalhista: aprovada (1 sim, 0 não, 0 abstenções).',
        'II · Garantia real: aprovada (1 sim, 0 não, 0 abstenções; valor: R$ 5,00 sim, R$ 0,00 não).',
        'III · Quirografário: não votou (sem presentes).',
        'IV · ME/EPP: não votou (sem presentes).',
        '',
        'Resultado: plano aprovado em todas as classes que votaram.',
      ].join('\n'),
    )
  })
})
