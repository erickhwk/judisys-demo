// Quadros 1×2 do início (INI-07, Q-04 a Q-07) renderizados em HTML com o seed no relógio fixo dos
// e2e (sábado, 7/11/2026 às 10h): conteúdo das fichas (QDR-05 a QDR-08), estado vazio (QDR-15) e as
// três variantes (QDR-16; o estouro de texto, que pede layout, é medido no e2e quadros-1x2).
import type { ComponentType } from 'react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOJE_FIXO, tabelasDoSeed } from '../../../../scripts/indicadores'
import { gravarTabelas, type TabelasSeed } from '../../../dados/carga'
import { ArmazenamentoMemoria } from '../../../dados/memoria'
import { renderizarComDados } from '../../../ui/renderizarParaTeste'
import type { Variante } from './Quadro'
import { QuadroAtividade } from './QuadroAtividade'
import { QuadroCalendario } from './QuadroCalendario'
import { QuadroInformes } from './QuadroInformes'
import { QuadroProximos } from './QuadroProximos'
import type { PropsDoQuadro } from './registro'

let tabelas: TabelasSeed

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(`${HOJE_FIXO}T10:00:00`))
  tabelas = tabelasDoSeed(HOJE_FIXO)
})

afterAll(() => {
  vi.useRealTimers()
})

let armazenamento: ArmazenamentoMemoria

beforeEach(async () => {
  armazenamento = new ArmazenamentoMemoria()
  await gravarTabelas(armazenamento, tabelas)
})

const renderizar = (
  Componente: ComponentType<PropsDoQuadro>,
  variante: Variante = 'desktop',
  dados = armazenamento,
) =>
  renderizarComDados(<Componente variante={variante} />, {
    armazenamento: dados,
    papel: 'advogado',
  })

/** Texto visível do HTML, sem as tags e com os espaços juntos. */
function texto(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .trim()
}

const itens = (html: string) =>
  [...html.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((m) => texto(m[1] ?? ''))
const links = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])

describe('Q-04 · Próximos prazos', () => {
  it('QDR-05 · seis prazos, vencidos primeiro, com data relativa, e "+ 13 prazos na agenda"', async () => {
    const html = await renderizar(QuadroProximos)
    expect(itens(html)).toEqual([
      '09/08 há 90 dias Realização dos ativos Fundição Sapo-Cururu (falência)',
      '15/10 há 23 dias Relatório mensal de atividades (RMA) Transportes Jabuticaba',
      '05/11 há 2 dias Apresentação do plano Tecelagem Pé-de-Moleque',
      '07/11 hoje Habilitações e divergências Transportes Jabuticaba',
      '12/11 em 5 dias Relatório do AJ Calçados Tico-Tico',
      '15/11 em 8 dias Relatório mensal de atividades (RMA) Grupo Lontra Azul',
    ])
    expect([...html.matchAll(/data-situacao="(\w+)"/g)].map((m) => m[1])).toEqual([
      'vencido',
      'vencido',
      'vencido',
      'hoje',
      'futuro',
      'futuro',
    ])
    expect(texto(html)).toContain('+ 13 prazos na agenda')
  })

  it('cada prazo leva a ele na aba Prazos do processo; o rodapé, à agenda', async () => {
    const html = await renderizar(QuadroProximos)
    const doQuadro = links(html)
    expect(doQuadro.filter((l) => l?.includes('/prazos?prazo='))).toHaveLength(6)
    expect(doQuadro.filter((l) => l === '/agenda')).toHaveLength(2)
  })
})

describe('Q-05 · Calendário do mês', () => {
  it('QDR-06 · novembro de 2026 com 5 vencido, 7 hoje, 12, 15 e 27 prazo, 13 e 20 AGC', async () => {
    const html = await renderizar(QuadroCalendario)
    expect(texto(html)).toContain('Novembro de 2026')
    const marcas = Object.fromEntries(
      [...html.matchAll(/data-marca="(\w+)" data-dia="2026-11-(\d\d)"/g)].map((m) => [
        Number(m[2]),
        m[1],
      ]),
    )
    expect(marcas).toEqual({
      5: 'vencido',
      7: 'hoje',
      12: 'prazo',
      13: 'agc',
      15: 'prazo',
      20: 'agc',
      27: 'prazo',
    })
    expect(html.match(/data-dia="2026-11-\d\d"/g)).toHaveLength(30)
    expect(html).toMatch(/data-dia="2026-11-07" data-hoje="true"/)
  })

  it('o leitor de tela lê o resumo do mês, e o pé traz o prazo de hoje com o link', async () => {
    const html = await renderizar(QuadroCalendario)
    expect(texto(html)).toContain(
      'Em novembro: prazo vencido no dia 5; prazo de hoje no dia 7; prazos nos dias 12, 15 e 27; AGCs nos dias 13 e 20.',
    )
    expect(texto(html)).toContain('Hoje · 7/11 Habilitações e divergências Transportes Jabuticaba')
    expect(links(html).some((l) => l?.includes('/prazos?prazo='))).toBe(true)
  })

  it('celular: a grade usa a variante do celular (células de 38px no CSS)', async () => {
    const html = await renderizar(QuadroCalendario, 'celular')
    expect(html).toContain('data-variante="celular"')
  })
})

describe('Q-06 · Atividade recente', () => {
  it('QDR-07 · seis ações mais recentes, com quem, o quê, onde e quando', async () => {
    const html = await renderizar(QuadroAtividade)
    const recentes = [...tabelas.logs].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6)
    const lista = itens(html)
    expect(lista).toHaveLength(6)
    const nomes = new Map(tabelas.usuarios.map((u) => [u.id, u.nome]))
    lista.forEach((item, i) => {
      const log = recentes[i]
      expect(item).toContain(nomes.get(log?.usuarioId ?? '') ?? '?')
      expect(item).toContain(`${log?.data.slice(8, 10)}/${log?.data.slice(5, 7)}`)
    })
    expect(lista[0]).toBe(
      'MA Marina Albuquerque 05/11 · 11:14 editou um credor em Moinho Quero-Quero',
    )
  })

  it('cada ação leva ao registro como ele está agora', async () => {
    const html = await renderizar(QuadroAtividade)
    expect(links(html)).toEqual([
      '/logs',
      '/processos/prc-005/credores/crd-0862',
      '/processos/prc-001/credores/crd-0084',
      '/processos/prc-005/credores/crd-0942',
      '/processos/prc-001/credores/crd-0481',
      '/informes/inf-013',
      '/empresas/emp-006',
    ])
  })
  it('processo excluído: o log dele fica "excluiu o processo", sem "Processo excluído"', async () => {
    const [maisNovo] = [...tabelas.logs].sort((a, b) => b.data.localeCompare(a.data))
    if (!maisNovo) throw new Error('seed sem logs')
    const dados = new ArmazenamentoMemoria()
    const exclusao = {
      ...maisNovo,
      id: 'log-exclusao',
      data: '2026-11-07T09:00:00',
      acao: 'excluiu',
      colecao: 'processos',
      registroId: 'prc-apagado',
      processoId: 'prc-apagado',
    } as const
    await gravarTabelas(dados, { ...tabelas, logs: [...tabelas.logs, exclusao] })
    const [primeira] = itens(await renderizar(QuadroAtividade, 'desktop', dados))
    expect(primeira).toMatch(/excluiu o processo$/)
  })
})

describe('Q-07 · Últimos informes', () => {
  it('QDR-08 · cinco informes, do mais novo ao mais antigo, com categoria, processo e data', async () => {
    const html = await renderizar(QuadroInformes)
    expect(itens(html)).toEqual([
      'Petição inicial: síntese da administração judicial Outros Documentos Cerâmica Tatu-Bola 02/11',
      'Orientações aos credores para a AGC Notas Relevantes Grupo Lontra Azul 28/10',
      'Edital de convocação de credores (art. 52, §1º) Editais Transportes Jabuticaba 23/10',
      'Edital de convocação da assembleia geral de credores Editais Grupo Lontra Azul 18/10',
      'Relatório mensal de atividades nº 4 Relatórios Grupo Lontra Azul 13/10',
    ])
    expect(links(html).filter((l) => l?.startsWith('/informes/'))).toHaveLength(5)
  })
})

describe('QDR-15 · estado vazio dos quatro quadros', () => {
  it.each([
    ['proximos', QuadroProximos, 'Nenhum prazo em aberto.'],
    ['calendario', QuadroCalendario, 'Nenhum prazo nem AGC em novembro.'],
    ['atividade', QuadroAtividade, 'Nenhuma atividade registrada.'],
    ['informes', QuadroInformes, 'Nenhum informe cadastrado.'],
  ] as const)('%s sem dados mostra "%s"', async (_id, Componente, frase) => {
    const html = await renderizar(Componente, 'desktop', new ArmazenamentoMemoria())
    expect(texto(html)).toContain(frase)
    expect(html).not.toContain('<ol')
    expect(html).not.toMatch(/data-marca="\w+" data-dia/)
    expect(html).not.toContain('Hoje ·')
  })
})

describe('QDR-16 · as três variantes', () => {
  it.each(['desktop', 'tablet', 'celular'] as const)(
    '%s renderiza os quatro quadros',
    async (v) => {
      for (const Componente of [
        QuadroProximos,
        QuadroCalendario,
        QuadroAtividade,
        QuadroInformes,
      ]) {
        const html = await renderizar(Componente, v)
        expect(html).toContain(`data-variante="${v}"`)
        expect(html).not.toContain('Não foi possível')
      }
    },
  )
})
