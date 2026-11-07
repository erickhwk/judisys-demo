// Lista de processos sobre o seed mini (RF-11, PRC-12).
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CNJ_RJ,
  carregarSeedMini,
  ESCRITORIO_ID,
  seedMini,
} from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { type ContextoGravacao, criarRepositorio } from '../../dados/repositorio'
import { formatarCnj } from '../../regras/documentos'
import { listarProcessos, type ReposListagem } from './listagem'

const CONTEXTO: ContextoGravacao = {
  usuario: { id: 'usr-ana', escritorioId: ESCRITORIO_ID },
  papel: 'analista',
  agora: () => '2026-11-07T10:00:00',
}

describe('listarProcessos', () => {
  let armazenamento: ArmazenamentoMemoria
  let repos: ReposListagem

  beforeEach(async () => {
    armazenamento = new ArmazenamentoMemoria()
    await carregarSeedMini(armazenamento)
    repos = {
      processos: criarRepositorio(armazenamento, 'processos', CONTEXTO),
      empresas: criarRepositorio(armazenamento, 'empresas', CONTEXTO),
      processoEmpresas: criarRepositorio(armazenamento, 'processoEmpresas', CONTEXTO),
    }
  })

  const apelidos = async (busca: string) =>
    (await listarProcessos(repos, { busca })).itens.map((p) => p.apelido)

  it('sem filtro: todos, por apelido, com a contagem por tipo', async () => {
    const lista = await listarProcessos(repos, {})
    expect(lista.itens.map((p) => p.apelido)).toEqual(['Boreal', 'Grupo Aurora'])
    expect(lista.porTipo).toEqual({ todos: 2, rj: 1, falencia: 1 })
  })

  it('PRC-12 · busca pelo apelido, sem acento e sem caixa', async () => {
    expect(await apelidos('aurora')).toEqual(['Grupo Aurora'])
    expect(await apelidos('GRUPO')).toEqual(['Grupo Aurora'])
  })

  it('PRC-12 · busca pelo número CNJ, com ou sem pontuação', async () => {
    expect(await apelidos(CNJ_RJ)).toEqual(['Grupo Aurora'])
    expect(await apelidos(formatarCnj(CNJ_RJ))).toEqual(['Grupo Aurora'])
  })

  it('PRC-12 · busca pela razão social e pelo nome fantasia da empresa', async () => {
    expect(await apelidos('fiacao')).toEqual(['Boreal'])
    expect(await apelidos('Aurora Têxtil')).toEqual(['Grupo Aurora'])
  })

  it('busca sem resultado', async () => {
    const lista = await listarProcessos(repos, { busca: 'inexistente' })
    expect(lista.itens).toEqual([])
    expect(lista.porTipo.todos).toBe(0)
  })

  it('filtra por tipo e por fase; a contagem das abas ignora o tipo', async () => {
    const rj = await listarProcessos(repos, { tipo: 'rj' })
    expect(rj.itens.map((p) => p.id)).toEqual(['prc-001'])
    expect(rj.porTipo).toEqual({ todos: 2, rj: 1, falencia: 1 })
    const decretada = await listarProcessos(repos, { fase: 'decretada' })
    expect(decretada.itens.map((p) => p.id)).toEqual(['prc-002'])
    expect(decretada.porTipo).toEqual({ todos: 1, rj: 0, falencia: 1 })
  })

  it('pagina de 50 em 50; página fora do intervalo vai para a última', async () => {
    const [base] = seedMini().processos
    if (!base) throw new Error('seed sem processo')
    for (let i = 0; i < 60; i++) {
      await armazenamento.put('processos', {
        ...base,
        id: `prc-${String(100 + i)}`,
        apelido: `Extra ${String(i).padStart(2, '0')}`,
      })
    }
    const primeira = await listarProcessos(repos, {})
    expect(primeira).toMatchObject({ total: 62, pagina: 1, paginas: 2 })
    expect(primeira.itens).toHaveLength(50)
    const ultima = await listarProcessos(repos, { pagina: 9 })
    expect(ultima).toMatchObject({ pagina: 2 })
    expect(ultima.itens).toHaveLength(12)
  })
})
