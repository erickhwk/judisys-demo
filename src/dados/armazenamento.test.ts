// Contrato de Armazenamento (T-20), igual nas duas implementações (SDD §10).
import { describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../tests/fixtures/armazenamentos'
import { carregarSeedMini } from '../../tests/fixtures/seed-mini'
import { INDICES, indicesDe } from './armazenamento'
import { NOME_BANCO, VERSAO_SCHEMA } from './dexie'

interface Linha {
  id: string
  agcId?: string
  credorId?: string
  nome?: string
}

describe('schema do IndexedDB (SDD §5.4)', () => {
  it('VERSAO_SCHEMA = 1 e banco "judisys"', () => {
    expect(VERSAO_SCHEMA).toBe(1)
    expect(NOME_BANCO).toBe('judisys')
  })

  it('tem as 15 tabelas com os índices do §5.4', () => {
    expect(Object.keys(INDICES)).toHaveLength(15)
    expect(indicesDe('credores')).toEqual(['processoId', 'classe', 'documento'])
    expect(indicesDe('votos')).toEqual(['agcId', 'credorId', '[agcId+credorId]'])
    expect(indicesDe('arquivos')).toEqual([])
  })
})

describe.each(IMPLEMENTACOES)('%s', (_nome, criar) => {
  it('put e get devolvem cópias: alterar o objeto não altera o gravado', async () => {
    const armazenamento = criar()
    const linha = { id: 'a', nome: 'Ana' }
    await armazenamento.put('escritorios', linha)
    linha.nome = 'mudou'
    const lida = await armazenamento.get<Linha>('escritorios', 'a')
    expect(lida).toEqual({ id: 'a', nome: 'Ana' })
    if (lida) lida.nome = 'mudou de novo'
    expect(await armazenamento.get('escritorios', 'a')).toEqual({ id: 'a', nome: 'Ana' })
  })

  it('get de id inexistente devolve undefined; delete remove', async () => {
    const armazenamento = criar()
    await armazenamento.put('escritorios', { id: 'a' })
    await armazenamento.delete('escritorios', 'a')
    expect(await armazenamento.get('escritorios', 'a')).toBeUndefined()
    await expect(armazenamento.delete('escritorios', 'nao-existe')).resolves.toBeUndefined()
  })

  it('todos ordena pela chave', async () => {
    const armazenamento = criar()
    for (const id of ['c', 'a', 'b']) await armazenamento.put('usuarios', { id })
    const ids = (await armazenamento.todos<Linha>('usuarios')).map((l) => l.id)
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('porIndice filtra por índice simples e composto, ordenado pela chave', async () => {
    const armazenamento = criar()
    await carregarSeedMini(armazenamento)
    const presencas = await armazenamento.porIndice<Linha>('presencas', 'agcId', 'agc-001')
    expect(presencas.map((p) => p.id)).toEqual(['pre-001', 'pre-002'])
    const voto = await armazenamento.porIndice<Linha>('votos', '[agcId+credorId]', [
      'agc-001',
      'crd-0001',
    ])
    expect(voto.map((v) => v.id)).toEqual(['vot-001'])
    expect(await armazenamento.porIndice('votos', '[agcId+credorId]', ['agc-001', 'x'])).toEqual([])
  })

  it('porIndice em campo sem índice rejeita', async () => {
    const armazenamento = criar()
    await expect(armazenamento.porIndice('credores', 'nome', 'Ana')).rejects.toThrow()
  })

  it('transação que rejeita desfaz tudo o que gravou (INV-01)', async () => {
    const armazenamento = criar()
    await armazenamento.put('credores', { id: 'c1', nome: 'antes' })
    await expect(
      armazenamento.transacao(['credores', 'logs'], async () => {
        await armazenamento.put('credores', { id: 'c1', nome: 'depois' })
        await armazenamento.put('credores', { id: 'c2' })
        await armazenamento.put('logs', { id: 'l1' })
        throw new Error('falhou')
      }),
    ).rejects.toThrow('falhou')
    expect(await armazenamento.get('credores', 'c1')).toEqual({ id: 'c1', nome: 'antes' })
    expect(await armazenamento.get('credores', 'c2')).toBeUndefined()
    expect(await armazenamento.todos('logs')).toEqual([])
  })

  it('transação aninhada roda dentro da de fora e devolve o valor', async () => {
    const armazenamento = criar()
    const resultado = await armazenamento.transacao(['credores', 'logs'], async () => {
      await armazenamento.put('credores', { id: 'c1' })
      return armazenamento.transacao(['logs'], async () => {
        await armazenamento.put('logs', { id: 'l1' })
        return 42
      })
    })
    expect(resultado).toBe(42)
    expect(await armazenamento.todos('logs')).toEqual([{ id: 'l1' }])
  })

  it('limpar apaga todas as tabelas', async () => {
    const armazenamento = criar()
    await carregarSeedMini(armazenamento)
    await armazenamento.limpar()
    for (const tabela of Object.keys(INDICES) as (keyof typeof INDICES)[]) {
      expect(await armazenamento.todos(tabela)).toEqual([])
    }
  })
})
