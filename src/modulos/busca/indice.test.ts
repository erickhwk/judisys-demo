// Índice da busca global (SDD §7.8, RF-38, T-14) com o seed mini. A interação (atalho, setas,
// Enter, credor recém-criado na tela) fica no e2e (e2e/busca.spec.ts).
import { describe, expect, it } from 'vitest'
import { CNJ_RJ, cpfDoCredor, seedMini } from '../../../tests/fixtures/seed-mini'
import { formatarCnpj } from '../../regras/documentos'
import { ehAtalhoBusca } from './BuscaGlobal'
import { buscarNoIndice, LIMITE_POR_GRUPO, montarIndice } from './indice'

const seed = seedMini()
const indice = montarIndice(seed)

describe('buscarNoIndice', () => {
  it('BUS-02 · "jose conceicao" acha o credor "José Conceição" (sem acento, minúsculas)', () => {
    const grupos = buscarNoIndice(indice, 'jose conceicao')
    expect(grupos.map((grupo) => grupo.tipo)).toEqual(['credores'])
    expect(grupos[0]?.itens.map((item) => item.titulo)).toEqual(['José Conceição'])
    expect(buscarNoIndice(indice, 'JOSÉ CONCEIÇÃO')[0]?.itens[0]?.id).toBe('crd-0001')
  })

  it('BUS-03 · CNPJ só com dígitos ou com pontuação acha a empresa', () => {
    const aurora = seed.empresas.find((empresa) => empresa.id === 'emp-01')
    if (!aurora) throw new Error('seed sem emp-01')
    for (const consulta of [aurora.cnpj, formatarCnpj(aurora.cnpj)]) {
      const empresas = buscarNoIndice(indice, consulta).find((grupo) => grupo.tipo === 'empresas')
      expect(empresas?.itens.map((item) => item.id)).toEqual(['emp-01'])
    }
    // CPF do credor com pontuação e número CNJ sem pontuação também.
    const cpf = cpfDoCredor(2).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    expect(buscarNoIndice(indice, cpf)[0]?.itens.map((item) => item.id)).toEqual(['crd-0002'])
    expect(buscarNoIndice(indice, CNJ_RJ)[0]).toMatchObject({ tipo: 'processos', total: 1 })
  })

  it('empresa também é achada pelo nome fantasia, como na lista de empresas', () => {
    const empresas = seed.empresas.map((empresa) =>
      empresa.id === 'emp-01' ? { ...empresa, nomeFantasia: 'Malharia Sol' } : empresa,
    )
    const grupos = buscarNoIndice(montarIndice({ ...seed, empresas }), 'malharia sol')
    expect(grupos.find((grupo) => grupo.tipo === 'empresas')?.itens.map((item) => item.id)).toEqual(
      ['emp-01'],
    )
  })

  it('BUS-04 · 50 credores casam: no máximo 5 no grupo, com o total', () => {
    const grupos = buscarNoIndice(indice, 'credor')
    const credores = grupos.find((grupo) => grupo.tipo === 'credores')
    expect(credores?.total).toBe(50)
    expect(credores?.itens).toHaveLength(LIMITE_POR_GRUPO)
    for (const grupo of grupos) expect(grupo.itens.length).toBeLessThanOrEqual(LIMITE_POR_GRUPO)
  })

  it('agrupa por tipo na ordem processos, empresas, credores, com o destino de cada um', () => {
    const grupos = buscarNoIndice(indice, 'aurora')
    expect(grupos.map((grupo) => grupo.tipo)).toEqual(['processos', 'empresas'])
    expect(grupos[0]?.itens[0]?.destino).toBe('/processos/prc-001/visao-geral')
    expect(grupos[1]?.itens[0]?.destino).toBe('/empresas/emp-01')
    const credor = buscarNoIndice(indice, 'fazenda nacional')[0]?.itens[0]
    expect(credor?.destino).toBe('/processos/prc-002/credores/crd-1001')
    expect(credor?.detalhe).toContain('Boreal')
  })

  it('cada palavra precisa casar; consulta vazia não devolve nada', () => {
    expect(buscarNoIndice(indice, 'ana avila')[0]?.itens.map((item) => item.id)).toEqual([
      'crd-0002',
    ])
    expect(buscarNoIndice(indice, 'ana bruno')).toEqual([])
    expect(buscarNoIndice(indice, '   ')).toEqual([])
  })

  it('grupo sem leitura para o papel fica fora do índice (PER-03)', () => {
    const semCredores = montarIndice({ processos: seed.processos, empresas: seed.empresas })
    expect(semCredores.credores).toEqual([])
    expect(buscarNoIndice(semCredores, 'jose')).toEqual([])
  })
})

describe('ehAtalhoBusca', () => {
  it('BUS-01 · Ctrl+K e ⌘K abrem; K sozinho, com Shift ou com Alt não', () => {
    const tecla = { key: 'k', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false }
    expect(ehAtalhoBusca({ ...tecla, ctrlKey: true })).toBe(true)
    expect(ehAtalhoBusca({ ...tecla, key: 'K', metaKey: true })).toBe(true)
    expect(ehAtalhoBusca(tecla)).toBe(false)
    expect(ehAtalhoBusca({ ...tecla, key: 'j', ctrlKey: true })).toBe(false)
    // Ctrl+Shift+K (console do Firefox) e Ctrl+Alt+K ficam com o navegador.
    expect(ehAtalhoBusca({ ...tecla, ctrlKey: true, shiftKey: true })).toBe(false)
    expect(ehAtalhoBusca({ ...tecla, ctrlKey: true, altKey: true })).toBe(false)
  })
})
