// Conteúdo da aba Prazos do processo (DMO-14), renderizado com os dados já no cache, até a aba
// ganhar rota na TelaDoProcesso (DMO-12): cores de situação (PRZ-06/07) e botões por papel (T-13).
import { QueryClient } from '@tanstack/react-query'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ESCRITORIO_ID, seedMini } from '../../../tests/fixtures/seed-mini'
import { DadosProvider } from '../../dados/contexto'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import type { Tipos } from '../../dados/schemas'
import type { Papel } from '../../regras/permissoes'
import { type Guarda, SessaoProvider } from '../entrada/sessao'
import { AbaPrazos } from './AbaPrazos'

type Prazo = Tipos['prazos']

const BASE = seedMini().prazos[0] as Prazo
const PROCESSO = seedMini().processos[0] as Tipos['processos']

const PRAZOS: Prazo[] = [
  { ...BASE, id: 'prz-vencido', titulo: 'Prazo vencido', vencimento: '2026-11-06' },
  { ...BASE, id: 'prz-urgente', titulo: 'Prazo urgente', vencimento: '2026-11-10' },
  { ...BASE, id: 'prz-normal', titulo: 'Prazo normal', vencimento: '2026-11-11' },
  {
    ...BASE,
    id: 'prz-cumprido',
    titulo: 'Prazo cumprido',
    vencimento: '2026-11-01',
    status: 'cumprido',
  },
]

function guardaCom(papel: Papel): Guarda {
  const sessao = JSON.stringify({
    usuarioId: 'usr-x',
    escritorioId: ESCRITORIO_ID,
    nome: 'X',
    papel,
  })
  return { getItem: () => sessao, setItem: () => {}, removeItem: () => {} }
}

function renderizar(
  papel: Papel,
  url = '/processos/prc-001/prazos',
  { comProcesso = true } = {},
): string {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['prazos', 'todos', { onde: { processoId: 'prc-001' } }], PRAZOS)
  if (comProcesso) queryClient.setQueryData(['processos', 'buscar', 'prc-001'], PROCESSO)
  const contexto = {
    usuario: { id: 'usr-x', escritorioId: ESCRITORIO_ID },
    papel,
    agora: () => '2026-11-07T10:00:00',
  }
  return renderToString(
    <MemoryRouter initialEntries={[url]}>
      <SessaoProvider guarda={guardaCom(papel)}>
        <DadosProvider
          armazenamento={new ArmazenamentoMemoria()}
          contexto={contexto}
          queryClient={queryClient}
        >
          <AbaPrazos processoId="prc-001" />
        </DadosProvider>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

/** Trecho do HTML da linha do prazo (do título até o fim da linha). */
function linha(html: string, titulo: string): string {
  const inicio = html.lastIndexOf('<tr', html.indexOf(titulo))
  return html.slice(inicio, html.indexOf('</tr>', inicio))
}

describe('AbaPrazos', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 7, 10, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('PRZ-06 · vencido em vermelho, urgente (D+3) em dourado, D+4 normal, em ordem de vencimento', () => {
    const html = renderizar('aj')
    expect(linha(html, 'Prazo vencido')).toMatch(/data_vencido/)
    expect(linha(html, 'Prazo vencido')).toContain('Vencido')
    expect(linha(html, 'Prazo urgente')).toMatch(/data_urgente/)
    expect(linha(html, 'Prazo urgente')).toContain('Vence em 3 dias')
    expect(linha(html, 'Prazo normal')).not.toMatch(/data_(vencido|urgente)/)
    expect(linha(html, 'Prazo normal')).toContain('Em aberto')
    const ordem = ['Prazo cumprido', 'Prazo vencido', 'Prazo urgente', 'Prazo normal'].map((t) =>
      html.indexOf(t),
    )
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b))
    expect(html).toContain('4 prazos, 3 em aberto')
  })

  it('PRZ-07 · cumprido sem destaque, com o selo "Cumprido" e sem ações', () => {
    const html = renderizar('aj')
    const cumprido = linha(html, 'Prazo cumprido')
    expect(cumprido).not.toMatch(/data_(vencido|urgente)/)
    expect(cumprido).toContain('Cumprido')
    expect(cumprido).not.toContain('Marcar')
    expect(linha(html, 'Prazo normal')).toContain('Marcar &quot;Prazo normal&quot; como cumprido')
  })

  it('PER-03 · analista só lê prazos: sem "Novo prazo", cumprir ou editar', () => {
    const html = renderizar('analista')
    expect(html).toContain('Prazo normal')
    expect(html).not.toContain('Novo prazo')
    expect(html).not.toContain('como cumprido')
    expect(html).not.toContain('Editar')
    expect(renderizar('advogado')).toContain('Novo prazo')
  })

  it('AJ-24 · sem o processo carregado, nenhuma linha nem ação de cumprir', () => {
    // Cumprir um RMA sem o processo abriria a confirmação sem o aviso do próximo RMA.
    const html = renderizar('aj', undefined, { comProcesso: false })
    expect(html).toContain('Carregando prazos…')
    expect(html).not.toContain('Prazo normal')
    expect(html).not.toContain('como cumprido')
  })

  it('PRZ-09 · o link do calendário destaca o prazo na aba', () => {
    const html = renderizar('aj', '/processos/prc-001/prazos?prazo=prz-urgente')
    expect(html).toMatch(/id="prazo-prz-urgente" class="[^"]*destacado/)
    expect(html).not.toMatch(/id="prazo-prz-normal" class="[^"]*destacado/)
  })
})
