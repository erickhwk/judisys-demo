// Só para os testes (Vitest, sem DOM): renderiza uma tela de credores em HTML com os dados de um
// armazenamento, a sessão de um papel e a rota pedida. No servidor o React Query não busca nada;
// aqui cada rodada roda as consultas que a tela registrou e renderiza de novo, até não sobrar
// consulta pendente.
import { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { Armazenamento } from '../../dados/armazenamento'
import { DadosProvider } from '../../dados/contexto'
import type { ContextoGravacao } from '../../dados/repositorio'
import type { Papel } from '../../regras/permissoes'
import { type Guarda, SessaoProvider } from '../entrada/sessao'

export interface OpcoesRender {
  armazenamento: Armazenamento
  papel?: Papel
  /** Endereço aberto (ex.: `/processos/prc-001/credores/crd-0001`). */
  caminho?: string
  /** Padrão da rota que recebe o elemento (ex.: `/processos/:id/credores/:credorId`). */
  rota?: string
}

const USUARIOS: Record<Papel, string> = { aj: 'usr-aj', advogado: 'usr-adv', analista: 'usr-ana' }

function guardaCom(papel: Papel): Guarda {
  const sessao = JSON.stringify({
    usuarioId: USUARIOS[papel],
    escritorioId: 'esc-1',
    nome: 'Teste',
    papel,
  })
  return { getItem: () => sessao, setItem: () => {}, removeItem: () => {} }
}

export async function renderizarComDados(
  elemento: ReactNode,
  { armazenamento, papel = 'aj', caminho = '/', rota = '*' }: OpcoesRender,
): Promise<string> {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const contexto: ContextoGravacao = {
    usuario: { id: USUARIOS[papel], escritorioId: 'esc-1' },
    papel,
    agora: () => '2026-11-07T10:00:00',
  }
  const arvore = (
    <SessaoProvider guarda={guardaCom(papel)}>
      <DadosProvider armazenamento={armazenamento} contexto={contexto} queryClient={queryClient}>
        <MemoryRouter initialEntries={[caminho]}>
          <Routes>
            <Route path={rota} element={elemento} />
          </Routes>
        </MemoryRouter>
      </DadosProvider>
    </SessaoProvider>
  )

  let html = renderToString(arvore)
  for (let rodada = 0; rodada < 10; rodada++) {
    const pendentes = queryClient
      .getQueryCache()
      .getAll()
      .filter((consulta) => consulta.state.status === 'pending')
    if (pendentes.length === 0) return html
    await Promise.all(pendentes.map((consulta) => consulta.fetch()))
    html = renderToString(arvore)
  }
  throw new Error('consultas ainda pendentes depois de 10 rodadas')
}
