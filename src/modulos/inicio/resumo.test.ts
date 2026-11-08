// Textos do cabeçalho do início (SDD do início §7.2, CAB-01 a CAB-07) com dados pequenos e "hoje"
// por parâmetro. O CAB-03 com o seed completo fica em inicio.test.tsx.
import { describe, expect, it } from 'vitest'
import type { Tipos } from '../../dados/schemas'
import { type ResumoDoDia, resumoDoDia } from './indicadores'
import { dataPorExtenso, fraseDoResumo, horaDoCarimbo, primeiroNome, saudacao } from './resumo'

/** Sábado, como no relógio fixo da demo. */
const HOJE = '2026-11-07'

const frase = (resumo: ResumoDoDia, hoje = HOJE) => {
  const { destaque, resto } = fraseDoResumo(resumo, hoje)
  return destaque + resto
}

const base = {
  escritorioId: 'esc-1',
  criadoEm: '2026-11-01T10:00',
  atualizadoEm: '2026-11-01T10:00',
}

function prazo(
  id: string,
  vencimento: string,
  status: 'aberto' | 'cumprido' = 'aberto',
): Tipos['prazos'] {
  return { ...base, id, processoId: 'prc-1', titulo: id, vencimento, origem: 'manual', status }
}

function agc(
  id: string,
  dataPrimeira: string,
  status: Tipos['agcs']['status'] = 'agendada',
  processoId = 'prc-1',
): Tipos['agcs'] {
  return {
    ...base,
    id,
    processoId,
    dataPrimeira,
    dataSegunda: '2026-12-31',
    pauta: 'Plano',
    status,
  }
}

const PROCESSOS = [{ id: 'prc-1', apelido: 'Grupo Lontra Azul' }]

describe('saudação e data (RF-05, RF-06)', () => {
  it('CAB-01 · "Bom dia, Otávio" e "Sábado, 7 de novembro"', () => {
    expect(
      `${saudacao(horaDoCarimbo('2026-11-07T10:00:00'))}, ${primeiroNome('Otávio Reis')}`,
    ).toBe('Bom dia, Otávio')
    expect(dataPorExtenso(HOJE)).toBe('Sábado, 7 de novembro')
    expect(dataPorExtenso('2026-11-09')).toBe('Segunda-feira, 9 de novembro')
  })

  it('CAB-02 · "Boa tarde" a partir de 12h; "Boa noite" a partir de 18h', () => {
    expect(saudacao(0)).toBe('Bom dia')
    expect(saudacao(11)).toBe('Bom dia')
    expect(saudacao(horaDoCarimbo('2026-11-07T12:00:00'))).toBe('Boa tarde')
    expect(saudacao(17)).toBe('Boa tarde')
    expect(saudacao(horaDoCarimbo('2026-11-07T18:00:00'))).toBe('Boa noite')
    expect(saudacao(23)).toBe('Boa noite')
  })
})

describe('resumoDoDia e a frase (RF-07)', () => {
  it('CAB-03 · vencidos, de hoje e a AGC da semana, na ordem', () => {
    const prazos = [
      prazo('v1', '2026-11-01'),
      prazo('v2', '2026-11-05'),
      prazo('v3', '2026-11-06'),
      prazo('h1', HOJE),
      prazo('cumprido', '2026-11-02', 'cumprido'),
      prazo('futuro', '2026-11-10'),
    ]
    const resumo = resumoDoDia(prazos, [agc('agc-1', '2026-11-13')], PROCESSOS, HOJE)
    expect(resumo).toEqual({
      vencidos: 3,
      hoje: 1,
      agc: { apelido: 'Grupo Lontra Azul', data: '2026-11-13' },
    })
    expect(fraseDoResumo(resumo, HOJE)).toEqual({
      destaque: '3 prazos vencidos',
      resto: ', 1 vence hoje e a AGC do Grupo Lontra Azul é na sexta.',
    })
  })

  it('CAB-04 · só um vencido: singular, sem as outras partes', () => {
    const resumo = resumoDoDia([prazo('v1', '2026-11-06')], [], PROCESSOS, HOJE)
    expect(fraseDoResumo(resumo, HOJE)).toEqual({ destaque: '1 prazo vencido', resto: '.' })
  })

  it('CAB-05 · AGC daqui a 8 dias fica de fora; em D+7 ainda entra', () => {
    expect(resumoDoDia([], [agc('agc-8', '2026-11-15')], PROCESSOS, HOJE).agc).toBeNull()
    expect(frase(resumoDoDia([], [agc('agc-8', '2026-11-15')], PROCESSOS, HOJE))).toBe(
      'Nenhuma pendência para hoje.',
    )
    expect(frase(resumoDoDia([], [agc('agc-7', '2026-11-14')], PROCESSOS, HOJE))).toBe(
      'A AGC do Grupo Lontra Azul é no próximo sábado.',
    )
  })

  it('CAB-06 · nada vencido, nada hoje, sem AGC', () => {
    const resumo = resumoDoDia([prazo('futuro', '2026-11-10')], [], PROCESSOS, HOJE)
    expect(resumo).toEqual({ vencidos: 0, hoje: 0, agc: null })
    expect(fraseDoResumo(resumo, HOJE)).toEqual({
      destaque: '',
      resto: 'Nenhuma pendência para hoje.',
    })
  })

  it('CAB-07 · AGC amanhã ou hoje', () => {
    expect(frase({ vencidos: 2, hoje: 0, agc: { apelido: 'X', data: '2026-11-08' } })).toBe(
      '2 prazos vencidos e a AGC do X é amanhã.',
    )
    expect(frase({ vencidos: 0, hoje: 0, agc: { apelido: 'X', data: HOJE } })).toBe(
      'A AGC do X é hoje.',
    )
    expect(resumoDoDia([], [agc('agc-hoje', HOJE)], PROCESSOS, HOJE).agc?.data).toBe(HOJE)
  })

  it('sem vencidos, "prazo" vai na parte de hoje; plural concorda', () => {
    expect(frase({ vencidos: 0, hoje: 1, agc: null })).toBe('1 prazo vence hoje.')
    expect(frase({ vencidos: 0, hoje: 2, agc: null })).toBe('2 prazos vencem hoje.')
    expect(frase({ vencidos: 1, hoje: 2, agc: null })).toBe('1 prazo vencido e 2 vencem hoje.')
  })

  it('AGC: só agendada, a mais próxima, e de processo que existe', () => {
    const agcs = [
      agc('instalada', '2026-11-08', 'instalada'),
      agc('encerrada', '2026-11-08', 'encerrada'),
      agc('sem-processo', '2026-11-08', 'agendada', 'prc-x'),
      agc('passada', '2026-11-06'),
      agc('depois', '2026-11-12'),
      agc('antes', '2026-11-10'),
    ]
    expect(resumoDoDia([], agcs, PROCESSOS, HOJE).agc).toEqual({
      apelido: 'Grupo Lontra Azul',
      data: '2026-11-10',
    })
    expect(frase({ vencidos: 0, hoje: 0, agc: { apelido: 'X', data: '2026-11-10' } })).toBe(
      'A AGC do X é na terça.',
    )
  })
})
