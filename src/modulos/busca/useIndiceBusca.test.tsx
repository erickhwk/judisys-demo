// Índice da busca no cache do React Query (T-14, T-22): a gravação invalida o índice e a próxima
// leitura já traz o registro novo. Sem DOM: as consultas rodam à mão, como em renderizarParaTeste.
import { QueryClient } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { carregarSeedMini, cpfDoCredor, ESCRITORIO_ID } from '../../../tests/fixtures/seed-mini'
import { DadosProvider, useRepo } from '../../dados/contexto'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import type { ContextoGravacao, Repositorio } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import type { Papel } from '../../regras/permissoes'
import { buscarNoIndice, type Indice } from './indice'
import { CHAVE_INDICE, useIndiceBusca } from './useIndiceBusca'

type RepoCredores = Repositorio<Tipos['credores']>

function Sonda({ papel, receber }: { papel: Papel; receber: (repo: RepoCredores) => void }) {
  useIndiceBusca(papel, true)
  receber(useRepo('credores'))
  return null
}

async function montar(papel: Papel = 'aj') {
  const armazenamento = new ArmazenamentoMemoria()
  await carregarSeedMini(armazenamento)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const contexto: ContextoGravacao = {
    usuario: { id: 'usr-aj', escritorioId: ESCRITORIO_ID },
    papel,
    agora: () => '2026-11-07T10:00:00',
  }
  let repo: RepoCredores | undefined
  renderToString(
    <DadosProvider armazenamento={armazenamento} contexto={contexto} queryClient={queryClient}>
      <Sonda
        papel={papel}
        receber={(r) => {
          repo = r
        }}
      />
    </DadosProvider>,
  )
  if (!repo) throw new Error('repositório não criado')
  const consulta = () => {
    const achada = queryClient.getQueryCache().find({ queryKey: [...CHAVE_INDICE, papel] })
    if (!achada) throw new Error('índice não registrado')
    return achada
  }
  const ler = async () => (await consulta().fetch()) as Indice
  return { repo, queryClient, consulta, ler }
}

describe('useIndiceBusca', () => {
  it('BUS-06 · credor criado agora entra no índice (índice invalidado pela gravação)', async () => {
    const { repo, consulta, ler } = await montar()
    expect(buscarNoIndice(await ler(), 'italo barros')).toEqual([])

    await repo.criar({
      processoId: 'prc-001',
      nome: 'Ítalo Barros',
      documento: cpfDoCredor(500),
      classe: 'quirografario',
      natureza: '',
      valorDevedor: 0,
    })
    expect(consulta().state.isInvalidated).toBe(true)

    const grupos = buscarNoIndice(await ler(), 'italo barros')
    expect(grupos).toHaveLength(1)
    expect(grupos[0]?.itens[0]).toMatchObject({ tipo: 'credores', titulo: 'Ítalo Barros' })
  })

  it('monta os três grupos para quem lê os três módulos', async () => {
    const { ler } = await montar('analista')
    const indice = await ler()
    expect(indice.processos.length).toBeGreaterThan(0)
    expect(indice.empresas.length).toBeGreaterThan(0)
    expect(indice.credores.length).toBeGreaterThan(0)
  })
})
