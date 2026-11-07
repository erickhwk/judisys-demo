import { describe, expect, it } from 'vitest'
import { type ColunaCsv, celulaCentavos, escaparCelula, gerarCsv, nomeArquivoCsv } from './csv'

interface Credor {
  nome: string
  documento: string
  valor: number
  data: string
  processo: string
}

const colunas: ColunaCsv<Credor>[] = [
  { titulo: 'Nome', valor: (c) => c.nome },
  { titulo: 'CPF/CNPJ', valor: (c) => c.documento, formato: 'documento' },
  { titulo: 'Valor (R$)', valor: (c) => c.valor, formato: 'centavos' },
  { titulo: 'Data', valor: (c) => c.data, formato: 'data' },
  { titulo: 'Processo', valor: (c) => c.processo, formato: 'cnj' },
]

const credor: Credor = {
  nome: 'Maria Souza',
  documento: '01234567890',
  valor: 123456,
  data: '2026-11-07',
  processo: '10001234520258260100',
}

describe('gerarCsv', () => {
  it('CSV-01 · começa com BOM, usa ; e \\r\\n', () => {
    const csv = gerarCsv(colunas, [credor])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toBe(
      '﻿Nome;CPF/CNPJ;Valor (R$);Data;Processo\r\n' +
        'Maria Souza;012.345.678-90;1234,56;07/11/2026;1000123-45.2025.8.26.0100\r\n',
    )
  })

  it('CSV-02 · centavos 123456 → 1234,56, sem separador de milhar', () => {
    expect(celulaCentavos(123456)).toBe('1234,56')
    expect(celulaCentavos(123456789)).toBe('1234567,89')
    expect(celulaCentavos(5)).toBe('0,05')
    expect(celulaCentavos(0)).toBe('0,00')
    expect(celulaCentavos(-1050)).toBe('-10,50')
  })

  it('CSV-03 · escape de ; e aspas', () => {
    expect(escaparCelula('Silva; "Filho"')).toBe('"Silva; ""Filho"""')
    const csv = gerarCsv(colunas.slice(0, 1), [{ ...credor, nome: 'Silva; "Filho"' }])
    expect(csv.split('\r\n')[1]).toBe('"Silva; ""Filho"""')
  })

  it('CSV-03 · quebra de linha e aspas sozinhas vão entre aspas', () => {
    expect(escaparCelula('linha 1\nlinha 2')).toBe('"linha 1\nlinha 2"')
    expect(escaparCelula('a\r\nb')).toBe('"a\r\nb"')
    expect(escaparCelula('diz "oi"')).toBe('"diz ""oi"""')
    expect(escaparCelula('sem nada')).toBe('sem nada')
  })

  it('CSV-04 · CPF com zero à esquerda sai formatado', () => {
    const csv = gerarCsv(colunas.slice(1, 2), [credor])
    expect(csv.split('\r\n')[1]).toBe('012.345.678-90')
  })

  it('valores vazios viram célula vazia', () => {
    const csv = gerarCsv<{ a?: number | null }>(
      [
        { titulo: 'A', valor: (l) => l.a, formato: 'centavos' },
        { titulo: 'B', valor: () => null, formato: 'data' },
      ],
      [{}],
    )
    expect(csv.split('\r\n')[1]).toBe(';')
  })

  it('sem linhas, só o cabeçalho', () => {
    expect(gerarCsv(colunas.slice(0, 2), [])).toBe('﻿Nome;CPF/CNPJ\r\n')
  })
})

describe('nomeArquivoCsv', () => {
  it('CSV-01 · judisys-<módulo>-aaaa-mm-dd.csv', () => {
    expect(nomeArquivoCsv('processos', '2026-11-07')).toBe('judisys-processos-2026-11-07.csv')
  })

  it('credores incluem o apelido do processo, normalizado', () => {
    expect(nomeArquivoCsv('credores', '2026-11-07', 'Grupo Aurora Têxtil')).toBe(
      'judisys-credores-grupo-aurora-textil-2026-11-07.csv',
    )
  })

  it('pontuação do apelido vira hífen, sem colar palavras', () => {
    expect(nomeArquivoCsv('credores', '2026-11-07', 'Aurora-Têxtil')).toBe(
      'judisys-credores-aurora-textil-2026-11-07.csv',
    )
    expect(nomeArquivoCsv('credores', '2026-11-07', 'Aurora/Têxtil S.A.')).toBe(
      'judisys-credores-aurora-textil-s-a-2026-11-07.csv',
    )
  })
})
