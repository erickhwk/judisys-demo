// Regras das telas de prazos e agenda (SDD §7.4: PRZ-06 a PRZ-11).
import { describe, expect, it } from 'vitest'
import { carregarSeedMini, ESCRITORIO_ID, seedMini } from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { criarRepositorio } from '../../dados/repositorio'
import type { Log, Tipos } from '../../dados/schemas'
import { somarDias } from '../../regras/datas'
import { situacao } from '../../regras/prazos'
import {
  filtrarAgenda,
  MENSAGEM_OBRIGATORIO,
  mudancasDaEdicao,
  noPeriodo,
  novoPrazoManual,
  prazosPorDia,
  rotuloSituacao,
  semanasDoMes,
  somarMesesAoMes,
  TOM_SITUACAO,
  validarPrazo,
  valoresIniciais,
} from './regras'

type Prazo = Tipos['prazos']

const HOJE = '2026-11-07'

const BASE = seedMini().prazos[0] as Prazo

function prazo(id: string, vencimento: string, mudancas: Partial<Prazo> = {}): Prazo {
  return { ...BASE, id, vencimento, status: 'aberto', ...mudancas }
}

describe('situação na lista', () => {
  it('PRZ-06 · vencido ontem em vermelho, D+3 em dourado, D+4 sem destaque', () => {
    const ontem = prazo('a', somarDias(HOJE, -1))
    const d3 = prazo('b', somarDias(HOJE, 3))
    const d4 = prazo('c', somarDias(HOJE, 4))
    expect(TOM_SITUACAO[situacao(ontem, HOJE)]).toBe('perigo')
    expect(TOM_SITUACAO[situacao(d3, HOJE)]).toBe('dourado')
    expect(TOM_SITUACAO[situacao(d4, HOJE)]).toBe('neutro')
    expect(rotuloSituacao(ontem, HOJE)).toBe('Vencido')
    expect(rotuloSituacao(d3, HOJE)).toBe('Vence em 3 dias')
    expect(rotuloSituacao(prazo('d', HOJE), HOJE)).toBe('Vence hoje')
    expect(rotuloSituacao(prazo('e', somarDias(HOJE, 1)), HOJE)).toBe('Vence amanhã')
    expect(rotuloSituacao(d4, HOJE)).toBe('Em aberto')
  })

  it('PRZ-07 · cumprido vencido fica sem destaque, com o selo "Cumprido"', () => {
    const cumprido = prazo('a', somarDias(HOJE, -10), { status: 'cumprido' })
    expect(TOM_SITUACAO[situacao(cumprido, HOJE)]).toBe('sucesso')
    expect(rotuloSituacao(cumprido, HOJE)).toBe('Cumprido')
  })
})

describe('filtros da agenda', () => {
  const processos = new Map([
    ['prc-001', { responsavelId: 'usr-aj' }],
    ['prc-002', { responsavelId: 'usr-adv' }],
  ])
  const prazos = [
    prazo('vencido', somarDias(HOJE, -1)),
    prazo('hoje', HOJE),
    prazo('d7', somarDias(HOJE, 7)),
    prazo('d8', somarDias(HOJE, 8)),
    prazo('d30', somarDias(HOJE, 30), { processoId: 'prc-002' }),
    prazo('d31', somarDias(HOJE, 31)),
    prazo('cumprido', somarDias(HOJE, 2), { status: 'cumprido' }),
    prazo('cumpridoVencido', somarDias(HOJE, -5), { status: 'cumprido' }),
  ]
  const ids = (filtro: Partial<Parameters<typeof filtrarAgenda>[2]>) =>
    filtrarAgenda(
      prazos,
      processos,
      { periodo: 'abertos', processoId: '', responsavelId: '', ...filtro },
      HOJE,
    ).map((p) => p.id)

  it('PRZ-08 · "7 dias" traz abertos de hoje a D+7, inclusive', () => {
    expect(ids({ periodo: '7-dias' })).toEqual(['hoje', 'd7'])
  })

  it('PRZ-08 · "vencidos" traz só abertos com vencimento antes de hoje', () => {
    expect(ids({ periodo: 'vencidos' })).toEqual(['vencido'])
  })

  it('PRZ-08 · hoje, 30 dias, abertos e todos', () => {
    expect(ids({ periodo: 'hoje' })).toEqual(['hoje'])
    expect(ids({ periodo: '30-dias' })).toEqual(['hoje', 'd7', 'd8', 'd30'])
    expect(ids({ periodo: 'abertos' })).toEqual(['vencido', 'hoje', 'd7', 'd8', 'd30', 'd31'])
    expect(ids({ periodo: 'todos' })).toHaveLength(prazos.length)
    expect(noPeriodo(prazos[6] as Prazo, '7-dias', HOJE)).toBe(false)
  })

  it('RF-25 · por processo e por responsável do processo', () => {
    expect(ids({ processoId: 'prc-002' })).toEqual(['d30'])
    expect(ids({ responsavelId: 'usr-adv' })).toEqual(['d30'])
    expect(ids({ responsavelId: 'usr-aj', periodo: 'vencidos' })).toEqual(['vencido'])
  })
})

describe('calendário mensal', () => {
  it('PRZ-09 · novembro de 2026 em semanas de domingo a sábado, com os vizinhos nas pontas', () => {
    const semanas = semanasDoMes('2026-11')
    // 01/11/2026 é domingo e 30/11 é segunda: 5 semanas, de 01/11 a 05/12.
    expect(semanas).toHaveLength(5)
    expect(semanas.every((semana) => semana.length === 7)).toBe(true)
    expect(semanas[0]?.[0]).toEqual({ data: '2026-11-01', foraDoMes: false })
    expect(semanas[4]?.[1]).toEqual({ data: '2026-11-30', foraDoMes: false })
    expect(semanas[4]?.[6]).toEqual({ data: '2026-12-05', foraDoMes: true })
    // Fevereiro de 2026 começa num domingo e termina num sábado: 4 semanas exatas.
    expect(semanasDoMes('2026-02')).toHaveLength(4)
    // Outubro de 2026 começa numa quinta: a primeira semana traz o fim de setembro.
    expect(semanasDoMes('2026-10')[0]?.[0]).toEqual({ data: '2026-09-27', foraDoMes: true })
  })

  it('PRZ-09 · navegação mês a mês e prazos agrupados por dia', () => {
    expect(somarMesesAoMes('2026-11', 1)).toBe('2026-12')
    expect(somarMesesAoMes('2026-12', 1)).toBe('2027-01')
    expect(somarMesesAoMes('2026-01', -1)).toBe('2025-12')
    const dias = prazosPorDia([
      prazo('b', '2026-11-15', { titulo: 'RMA' }),
      prazo('a', '2026-11-15', { titulo: 'Habilitações' }),
      prazo('c', '2026-11-20'),
    ])
    expect(dias.get('2026-11-15')?.map((p) => p.id)).toEqual(['a', 'b'])
    expect(dias.get('2026-11-20')).toHaveLength(1)
    expect(dias.has('2026-11-16')).toBe(false)
  })
})

describe('formulário de prazo', () => {
  const CONTEXTO = {
    usuario: { id: 'usr-aj', escritorioId: ESCRITORIO_ID },
    papel: 'aj' as const,
    agora: () => '2026-11-07T10:00:00',
  }

  it('PRZ-10 · prazo manual sem base legal é aceito e gravado sem o campo', async () => {
    const valores = {
      processoId: 'prc-001',
      titulo: '  Reunião com o comitê  ',
      vencimento: '2026-11-20',
      baseLegal: '   ',
    }
    expect(validarPrazo(valores)).toEqual({})
    const dados = novoPrazoManual(valores)
    expect(dados).toEqual({
      processoId: 'prc-001',
      titulo: 'Reunião com o comitê',
      vencimento: '2026-11-20',
      origem: 'manual',
      status: 'aberto',
    })

    const armazenamento = new ArmazenamentoMemoria()
    await carregarSeedMini(armazenamento)
    const criado = await criarRepositorio(armazenamento, 'prazos', CONTEXTO).criar(dados)
    expect(criado).toMatchObject({ origem: 'manual', status: 'aberto' })
    expect(criado.baseLegal).toBeUndefined()
  })

  it('RF-23 · processo, título e vencimento são obrigatórios no novo', () => {
    expect(validarPrazo(valoresIniciais())).toEqual({
      processoId: MENSAGEM_OBRIGATORIO,
      titulo: MENSAGEM_OBRIGATORIO,
      vencimento: MENSAGEM_OBRIGATORIO,
    })
    expect(
      validarPrazo({
        ...valoresIniciais(undefined, 'prc-001'),
        titulo: 'X',
        vencimento: '2026-02-30',
      }),
    ).toEqual({ vencimento: 'Data inválida' })
  })

  it('PRZ-11 · editar vencimento de prazo automático: origem continua automático e o log grava de/para', async () => {
    const armazenamento = new ArmazenamentoMemoria()
    await carregarSeedMini(armazenamento)
    const automatico = (await armazenamento.get<Prazo>('prazos', 'prz-001')) as Prazo
    // O formulário trava o título (T-37); mesmo que viesse outro, só o vencimento é gravado.
    const valores = {
      ...valoresIniciais(automatico),
      titulo: 'Outro título',
      vencimento: '2027-05-18',
    }
    expect(validarPrazo(valores, automatico)).toEqual({})
    const mudancas = mudancasDaEdicao(automatico, valores)
    expect(mudancas).toEqual({ vencimento: '2027-05-18' })

    const salvo = await criarRepositorio(armazenamento, 'prazos', CONTEXTO).atualizar(
      automatico.id,
      mudancas,
    )
    expect(salvo).toMatchObject({
      origem: 'automatico',
      titulo: 'Objeções ao plano',
      vencimento: '2027-05-18',
    })
    const logs = (await armazenamento.todos<Log>('logs')).filter(
      (log) => log.registroId === automatico.id,
    )
    expect(logs).toHaveLength(1)
    expect(logs[0]?.mudancas).toEqual([
      { campo: 'vencimento', de: '2026-11-19', para: '2027-05-18' },
    ])
  })

  it('T-37 · prazo automático não exige título no formulário; o manual edita título e base legal', () => {
    const automatico = prazo('a', '2026-12-01')
    expect(validarPrazo({ ...valoresIniciais(automatico), titulo: '' }, automatico)).toEqual({})
    const manual = prazo('m', '2026-12-01', { origem: 'manual', titulo: 'Reunião' })
    delete manual.baseLegal
    expect(
      mudancasDaEdicao(manual, {
        ...valoresIniciais(manual),
        titulo: ' Reunião final ',
        baseLegal: '',
      }),
    ).toEqual({ titulo: 'Reunião final', vencimento: '2026-12-01' })
    expect(
      mudancasDaEdicao(manual, { ...valoresIniciais(manual), baseLegal: ' art. 22 ' }),
    ).toEqual({ titulo: 'Reunião', vencimento: '2026-12-01', baseLegal: 'art. 22' })
    expect(validarPrazo({ ...valoresIniciais(manual), titulo: ' ' }, manual)).toEqual({
      titulo: MENSAGEM_OBRIGATORIO,
    })
  })
})
