// Quadros 1×1 do início (INI-06): Q-01 prazos em aberto, Q-02 próxima AGC e Q-03 pedidos de
// crédito, renderizados em HTML com o seed no relógio fixo dos e2e (7/11/2026). Os números vêm do
// `pnpm indicadores` (SDD-INI §10). O que só o navegador mede (estouro nas larguras, QDR-16) está
// em e2e/quadros-1x1.spec.ts.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ArquivoSeed, gerarSeed } from '../../../../scripts/seed/gerar'
import { gravarTabelas, prepararSeed, type TabelasSeed } from '../../../dados/carga'
import { ArmazenamentoMemoria } from '../../../dados/memoria'
import type { Papel } from '../../../regras/permissoes'
import { renderizarComDados } from '../../../ui/renderizarParaTeste'
import type { Variante } from './Quadro'
import { QuadroAgc, quandoEhAgc } from './QuadroAgc'
import { QuadroPedidos } from './QuadroPedidos'
import { QuadroPrazos } from './QuadroPrazos'

const HOJE = '2026-11-07'

let seed: ArquivoSeed
let tabelas: TabelasSeed

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${HOJE}T10:00:00`))
  seed = gerarSeed()
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  tabelas = prepararSeed(structuredClone(seed), HOJE).tabelas
})

async function renderizar(
  elemento: React.ReactNode,
  { papel = 'advogado', dados = tabelas }: { papel?: Papel; dados?: Partial<TabelasSeed> } = {},
) {
  const armazenamento = new ArmazenamentoMemoria()
  await gravarTabelas(armazenamento, { ...tabelas, ...dados })
  return renderizarComDados(elemento, { armazenamento, papel })
}

/** Texto visível do HTML, sem as tags e com os espaços juntos. */
const texto = (html: string) =>
  html
    .replace(/<title[^>]*>[^<]*<\/title>/g, '')
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const titulo = (html: string) => /<title[^>]*>([^<]*)<\/title>/.exec(html)?.[1]

const VARIANTES: Variante[] = ['desktop', 'tablet', 'celular']

describe('Q-01 · prazos em aberto', () => {
  it('QDR-01 · 19 em aberto, 3 vencidos, 1 hoje; barra com 3, 1, 1, 6 e 8 (pnpm indicadores)', async () => {
    const html = await renderizar(<QuadroPrazos variante="desktop" />)
    expect(texto(html)).toContain('19 em aberto 3 vencidos · 1 hoje')
    expect(titulo(html)).toBe(
      'Prazos em aberto por urgência: Vencidos 3 (16%), Hoje 1 (5%), Até 7 dias 1 (5%), ' +
        'De 8 a 30 dias 6 (32%), Depois de 30 dias 8 (42%)',
    )
    expect(texto(html)).toContain('7 dias 1 30 dias 6 depois 8')
  })

  it('o número de vencidos leva à agenda filtrada, o de hoje também (F-08)', async () => {
    const html = await renderizar(<QuadroPrazos variante="desktop" />)
    expect(html).toMatch(/href="\/agenda\?periodo=vencidos"[^>]*>3 vencidos</)
    expect(html).toMatch(/href="\/agenda\?periodo=hoje"[^>]*>1 hoje</)
    expect(html).toMatch(/href="\/agenda"[^>]*>Agenda</)
  })

  it('QDR-15 · sem prazo em aberto, o estado vazio', async () => {
    const cumpridos = tabelas.prazos.map((p) => ({ ...p, status: 'cumprido' as const }))
    const html = await renderizar(<QuadroPrazos variante="desktop" />, {
      dados: { prazos: cumpridos },
    })
    expect(texto(html)).toContain('Nenhum prazo em aberto.')
    expect(html).not.toContain('data-grafico')
  })
})

describe('Q-02 · próxima AGC', () => {
  it('QDR-02 · Grupo Lontra Azul, 13/11, "em 6 dias", 2ª convocação 20/11', async () => {
    const html = await renderizar(<QuadroAgc variante="desktop" />)
    expect(texto(html)).toContain(
      'nov 13 Grupo Lontra Azul sexta · em 6 dias 1ª convocação 13/11 2ª convocação 20/11',
    )
    expect(html).toMatch(/href="\/processos\/prc-001\/agc\/[\w-]+"[^>]*>Abrir</)
  })

  it('QDR-03 · sem AGC agendada: o estado vazio e o link para a agenda (RF-15)', async () => {
    const agcs = tabelas.agcs.map((a) => ({ ...a, status: 'encerrada' as const }))
    const html = await renderizar(<QuadroAgc variante="desktop" />, { dados: { agcs } })
    expect(texto(html)).toContain('Nenhuma AGC agendada')
    expect(html).toMatch(/href="\/agenda"[^>]*>Agenda</)
  })

  it('a distância de hoje: hoje, amanhã e o dia da semana sem o "-feira"', () => {
    expect(quandoEhAgc(HOJE, HOJE)).toBe('hoje')
    expect(quandoEhAgc('2026-11-08', HOJE)).toBe('amanhã')
    expect(quandoEhAgc('2026-11-10', HOJE)).toBe('terça · em 3 dias')
    expect(quandoEhAgc('2026-11-14', HOJE)).toBe('sábado · em 7 dias')
  })
})

describe('Q-03 · pedidos de crédito', () => {
  it('QDR-04 · rosca 8, 25 e 17, "8 pendentes" no centro e a nota do processo', async () => {
    const html = await renderizar(<QuadroPedidos variante="desktop" />, { papel: 'analista' })
    expect(titulo(html)).toBe(
      'Pedidos de crédito por status: Pendentes 8, Acolhidos 25, Rejeitados 17',
    )
    expect(html).toMatch(/>8<\/text><text[^>]*>pendentes<\/text>/)
    expect(texto(html)).toContain('Pendentes 8 Acolhidos 25 Rejeitados 17')
    expect(texto(html)).toContain('Mais pendentes: Transportes Jabuticaba (5)')
  })

  it('o link leva aos credores do processo com mais pendentes, onde se decidem', async () => {
    const html = await renderizar(<QuadroPedidos variante="desktop" />, { papel: 'analista' })
    const jabuticaba = tabelas.processos.find((p) => p.apelido === 'Transportes Jabuticaba')
    expect(html).toContain(`href="/processos/${jabuticaba?.id}/credores"`)
  })

  it('sem pendentes: sem nota, e o link vai para os processos', async () => {
    const decididos = tabelas.pedidosDeCredito.map((p) =>
      p.status === 'pendente' ? { ...p, status: 'acolhido' as const } : p,
    )
    const html = await renderizar(<QuadroPedidos variante="desktop" />, {
      dados: { pedidosDeCredito: decididos },
    })
    expect(html).not.toContain('data-nota')
    expect(html).toMatch(/href="\/processos"[^>]*>Processos</)
    expect(html).toMatch(/>0<\/text><text[^>]*>pendentes<\/text>/)
  })

  it('QDR-15 · sem pedidos, o estado vazio', async () => {
    const html = await renderizar(<QuadroPedidos variante="desktop" />, {
      dados: { pedidosDeCredito: [] },
    })
    expect(texto(html)).toContain('Nenhum pedido de crédito.')
    expect(html).not.toContain('data-grafico')
  })
})

describe('as três variantes (RF-14)', () => {
  it.each(VARIANTES)('%s: os três quadros com o mesmo conteúdo', async (variante) => {
    const prazos = await renderizar(<QuadroPrazos variante={variante} />)
    const agc = await renderizar(<QuadroAgc variante={variante} />)
    const pedidos = await renderizar(<QuadroPedidos variante={variante} />)
    for (const html of [prazos, agc, pedidos]) {
      expect(html).toContain(`data-variante="${variante}"`)
    }
    expect(texto(prazos)).toContain('19 em aberto')
    expect(texto(agc)).toContain('Grupo Lontra Azul')
    expect(texto(pedidos)).toContain('Mais pendentes')
    // No celular a rosca cresce (a altura acompanha o conteúdo).
    expect(pedidos).toContain(variante === 'celular' ? 'width="100"' : 'width="84"')
  })
})
