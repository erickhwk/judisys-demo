// Schemas zod das coleções (T-04, PRD §6, SDD §5.4, T-30).
import { describe, expect, it } from 'vitest'
import { cpfDoCredor, seedMini } from '../../tests/fixtures/seed-mini'
import { formatarCnj, formatarCpf } from '../regras/documentos'
import type { Tabela } from './armazenamento'
import { SCHEMAS, TAMANHO_MAXIMO_ANEXO } from './schemas'

const seed = seedMini()
const credor = seed.credores[0]
const processo = seed.processos[0]
const informe = seed.informes[0]
const pedido = seed.pedidosDeCredito[1]
const agc = seed.agcs[0]

function erros(tabela: Tabela, registro: unknown): string[] {
  const resultado = SCHEMAS[tabela].safeParse(registro)
  return resultado.success ? [] : resultado.error.issues.map((i) => i.path.join('.'))
}

describe('schemas', () => {
  it('o seed mini passa em todos os schemas', () => {
    for (const tabela of Object.keys(seed) as Tabela[]) {
      for (const registro of seed[tabela]) expect(erros(tabela, registro), registro.id).toEqual([])
    }
  })

  it('cobre todas as coleções do §5.4', () => {
    expect(Object.keys(SCHEMAS).sort()).toEqual(Object.keys(seed).sort())
  })

  it('CRD-16 · CPF com dígito inválido é recusado', () => {
    expect(erros('credores', { ...credor, documento: '123.456.789-00' })).toEqual(['documento'])
  })

  it('CPF/CNPJ formatado é aceito e gravado só com dígitos', () => {
    const resultado = SCHEMAS.credores.parse({ ...credor, documento: formatarCpf(cpfDoCredor(1)) })
    expect(resultado.documento).toBe(cpfDoCredor(1))
  })

  it('PRC-14 · número CNJ com dígito verificador errado é recusado', () => {
    const errado = `${processo?.numeroCnj.slice(0, 7)}00${processo?.numeroCnj.slice(9)}`
    expect(erros('processos', { ...processo, numeroCnj: errado })).toEqual(['numeroCnj'])
    const formatado = SCHEMAS.processos.parse({
      ...processo,
      numeroCnj: formatarCnj(processo?.numeroCnj ?? ''),
    })
    expect(formatado.numeroCnj).toBe(processo?.numeroCnj)
  })

  it('CNPJ inválido de empresa é recusado', () => {
    expect(erros('empresas', { ...seed.empresas[0], cnpj: '11.111.111/1111-11' })).toEqual(['cnpj'])
  })

  it('valores em centavos precisam ser inteiros (INV-03)', () => {
    expect(erros('credores', { ...credor, valorDevedor: 10.5 })).toEqual(['valorDevedor'])
    expect(erros('credores', { ...credor, valorAj: null, valorQgc: undefined })).toEqual([])
  })

  it('fase precisa ser do tipo do processo', () => {
    expect(erros('processos', { ...processo, faseAtual: 'arrecadacao' })).toEqual(['faseAtual'])
    expect(erros('processos', { ...processo, faseAtual: 'convolada-falencia' })).toEqual([])
    expect(erros('processos', { ...processo, faseAtual: 'qualquer' })).toEqual(['faseAtual'])
  })

  it('classes de falência (C-01) e RJ são aceitas; outra não', () => {
    expect(erros('credores', { ...credor, classe: 'juros' })).toEqual([])
    expect(erros('credores', { ...credor, classe: 'extraconcursal' })).toEqual([])
    expect(erros('credores', { ...credor, classe: 'privilegio-especial' })).toEqual(['classe'])
  })

  it('pedido de crédito exige credor ou requerente com CPF/CNPJ válido', () => {
    const { requerente: _r, ...semRequerente } = pedido ?? {}
    expect(erros('pedidosDeCredito', semRequerente)).toEqual(['requerente'])
    expect(
      erros('pedidosDeCredito', { ...pedido, requerente: { nome: 'X', documento: '1' } }),
    ).toEqual(['requerente.documento'])
  })

  it('data da AGC só em Atas de AGC (RF-18); resumo da ata aceito (T-30)', () => {
    expect(erros('informes', { ...informe, dataAgc: '2026-11-13' })).toEqual(['dataAgc'])
    expect(
      erros('informes', {
        ...informe,
        categoria: 'atas-agc',
        dataAgc: '2026-11-13',
        resumo: 'Classe I: aprovada',
      }),
    ).toEqual([])
  })

  it('INF-04 · anexo local acima de 10 MB é recusado', () => {
    const anexo = { origem: 'local', arquivoId: 'arq-1', nome: 'a.pdf', tipo: 'application/pdf' }
    expect(
      erros('informes', { ...informe, anexos: [{ ...anexo, tamanho: TAMANHO_MAXIMO_ANEXO }] }),
    ).toEqual([])
    const grande = { ...anexo, tamanho: TAMANHO_MAXIMO_ANEXO + 1 }
    expect(erros('informes', { ...informe, anexos: [grande] })).toEqual(['anexos.0.tamanho'])
  })

  it('datas inexistentes e carimbos malformados são recusados', () => {
    expect(erros('prazos', { ...seed.prazos[0], vencimento: '2026-02-30' })).toEqual(['vencimento'])
    expect(erros('escritorios', { ...seed.escritorios[0], criadoEm: '2026-11-01' })).toEqual([
      'criadoEm',
    ])
  })

  it('2ª convocação não pode ser antes da 1ª', () => {
    expect(erros('agcs', { ...agc, dataSegunda: '2026-11-01' })).toEqual(['dataSegunda'])
  })

  it('mensagens em português', () => {
    const resultado = SCHEMAS.credores.safeParse({ ...credor, nome: 42 })
    expect(resultado.error?.issues[0]?.message).toMatch(/esperava um texto/)
  })
})
