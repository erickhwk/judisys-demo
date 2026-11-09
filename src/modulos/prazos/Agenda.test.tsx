// Agenda geral (RF-25): as linhas e as ações só aparecem com prazos, processos e usuários carregados.
// Os prazos costumam chegar antes, do cache do início; sem esperar, "Marcar como cumprido" abria a
// confirmação sem o aviso do próximo RMA (AJ-24).
import { QueryClient } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { carregarSeedMini, ESCRITORIO_ID, seedMini } from '../../../tests/fixtures/seed-mini'
import { DadosProvider } from '../../dados/contexto'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { renderizarComDados } from '../../ui/renderizarParaTeste'
import { type Guarda, SessaoProvider } from '../entrada/sessao'
import { Agenda } from './Agenda'

const CAMINHO = '/agenda?processo=prc-001'
const CUMPRIR = 'Marcar &quot;Objeções ao plano&quot; como cumprido'

const guarda: Guarda = {
  getItem: () =>
    JSON.stringify({ usuarioId: 'usr-aj', escritorioId: ESCRITORIO_ID, nome: 'X', papel: 'aj' }),
  setItem: () => {},
  removeItem: () => {},
}

describe('Agenda', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 7, 10, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('AJ-24 · só com os prazos no cache, sem linhas nem ações até o resto carregar', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['prazos', 'todos', {}], seedMini().prazos)
    const contexto = {
      usuario: { id: 'usr-aj', escritorioId: ESCRITORIO_ID },
      papel: 'aj' as const,
      agora: () => '2026-11-07T10:00:00',
    }
    const html = renderToString(
      <MemoryRouter initialEntries={[CAMINHO]}>
        <SessaoProvider guarda={guarda}>
          <DadosProvider
            armazenamento={new ArmazenamentoMemoria()}
            contexto={contexto}
            queryClient={queryClient}
          >
            <Agenda />
          </DadosProvider>
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(html).toContain('Carregando prazos…')
    expect(html).not.toContain('Objeções ao plano')
    expect(html).not.toContain('como cumprido')
  })

  it('com tudo carregado, a linha aparece com a ação de cumprir', async () => {
    const armazenamento = new ArmazenamentoMemoria()
    await carregarSeedMini(armazenamento)
    const html = await renderizarComDados(<Agenda />, { armazenamento, caminho: CAMINHO })
    expect(html).toContain(CUMPRIR)
  })
})
