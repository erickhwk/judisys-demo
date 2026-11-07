// DadosProvider e hooks (T-22): gravação invalida as consultas; sem sessão, só leitura.
import { QueryClient } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { cpfDoCredor, ESCRITORIO_ID, seedMini } from '../../tests/fixtures/seed-mini'
import { comInvalidacao, DadosProvider, useRepo } from './contexto'
import { ArmazenamentoMemoria } from './memoria'
import { type ContextoGravacao, ErroPermissao, type Repositorio } from './repositorio'
import type { Tipos } from './schemas'

const CONTEXTO: ContextoGravacao = {
  usuario: { id: 'usr-aj', escritorioId: ESCRITORIO_ID },
  papel: 'aj',
  agora: () => '2026-11-07T10:00:00',
}

const NOVO = {
  processoId: 'prc-001',
  nome: 'Ítalo Barros',
  documento: cpfDoCredor(500),
  classe: 'quirografario' as const,
  natureza: '',
  valorDevedor: 0,
}

type RepoCredores = Repositorio<Tipos['credores']>

function Tela({ receber }: { receber: (repo: RepoCredores) => void }) {
  receber(useRepo('credores'))
  return null
}

/** Renderiza o provider e devolve o repositório que a tela receberia. */
function repoDaTela(contexto: ContextoGravacao | null, queryClient: QueryClient) {
  const armazenamento = new ArmazenamentoMemoria()
  let repo: RepoCredores | undefined
  renderToString(
    <DadosProvider armazenamento={armazenamento} contexto={contexto} queryClient={queryClient}>
      <Tela
        receber={(r) => {
          repo = r
        }}
      />
    </DadosProvider>,
  )
  if (!repo) throw new Error('repositório não criado')
  return { repo, armazenamento }
}

describe('contexto de dados', () => {
  it('T-22 · toda gravação pelo hook chama invalidateQueries() sem filtro', async () => {
    const queryClient = new QueryClient()
    const invalidar = vi.spyOn(queryClient, 'invalidateQueries')
    const { repo } = repoDaTela(CONTEXTO, queryClient)
    const criado = await repo.criar(NOVO)
    await repo.atualizar(criado.id, { valorDevedor: 10 })
    await repo.excluir(criado.id)
    expect(invalidar).toHaveBeenCalledTimes(3)
    expect(invalidar).toHaveBeenCalledWith()
  })

  it('sem sessão, lê mas não grava', async () => {
    const { repo, armazenamento } = repoDaTela(null, new QueryClient())
    const credor = seedMini().credores[0]
    await armazenamento.put('credores', credor)
    expect(await repo.buscar(credor?.id ?? '')).toEqual(credor)
    await expect(repo.criar(NOVO)).rejects.toBeInstanceOf(ErroPermissao)
    expect(await armazenamento.todos('logs')).toEqual([])
  })

  it('comInvalidacao invalida também quando a gravação falha', async () => {
    const invalidar = vi.fn(async () => {})
    const falha = () => Promise.reject(new Error('falhou'))
    const repo = comInvalidacao(
      { criar: falha, atualizar: falha, excluir: falha } as unknown as Repositorio<
        Tipos['credores']
      >,
      invalidar,
    )
    await expect(repo.excluir('x')).rejects.toThrow('falhou')
    expect(invalidar).toHaveBeenCalledOnce()
  })
})
