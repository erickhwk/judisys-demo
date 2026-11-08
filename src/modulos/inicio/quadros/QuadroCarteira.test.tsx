// Q-12 · Carteira por fase em HTML, com o seed da demo e sem dados (QDR-13 a QDR-15). O que só o
// navegador mede (estouro de texto nos extremos de largura, QDR-16) está em
// e2e/quadros-carteira.spec.ts.
import { beforeAll, describe, expect, it } from 'vitest'
import { gerarSeed } from '../../../../scripts/seed/gerar'
import { gravarTabelas, prepararSeed } from '../../../dados/carga'
import { ArmazenamentoMemoria } from '../../../dados/memoria'
import { renderizarComDados } from '../../../ui/renderizarParaTeste'
import type { Variante } from './Quadro'
import {
  ERRO_CARTEIRA,
  paraProcessos,
  QuadroCarteira,
  resumoDoTipo,
  VAZIO_CARTEIRA,
} from './QuadroCarteira'

let comSeed: ArmazenamentoMemoria

beforeAll(async () => {
  comSeed = new ArmazenamentoMemoria()
  await gravarTabelas(comSeed, prepararSeed(gerarSeed(), '2026-11-07').tabelas)
})

const tela = (variante: Variante, armazenamento = comSeed) =>
  renderizarComDados(<QuadroCarteira variante={variante} />, { armazenamento, papel: 'advogado' })

/** `href` dos links de fase, na ordem do HTML. */
const linksDeFase = (html: string) =>
  [...html.matchAll(/<a [^>]*>/g)]
    .filter((m) => m[0].includes('data-fase='))
    .map((m) => (/href="([^"]+)"/.exec(m[0])?.[1] ?? '').replaceAll('&amp;', '&'))

/** `data-fase` das células apagadas (sem link). */
const apagadas = (html: string) =>
  [...html.matchAll(/<span [^>]*data-fase="([^"]+)"/g)].map((m) => m[1])

describe('Quadro Carteira por fase', () => {
  it.each(['desktop', 'tablet', 'celular'] as const)(
    'QDR-13 · %s: as fases do seed com processo viram links e as vazias ficam apagadas',
    async (variante) => {
      const html = await tela(variante)
      expect(html).toContain(`data-variante="${variante}"`)
      expect(linksDeFase(html)).toEqual([
        '/processos?tipo=rj&fase=pedido',
        '/processos?tipo=rj&fase=processamento-deferido',
        '/processos?tipo=rj&fase=edital-publicado',
        '/processos?tipo=rj&fase=plano-apresentado',
        '/processos?tipo=rj&fase=fiscalizacao',
        '/processos?tipo=rj&fase=encerrada',
        '/processos?tipo=falencia&fase=decretada',
        '/processos?tipo=falencia&fase=arrecadacao',
        '/processos?tipo=falencia&fase=realizacao-ativo',
        '/processos?tipo=falencia&fase=encerrada',
      ])
      expect(apagadas(html)).toEqual([
        'relacao-aj-publicada',
        'prazo-objecoes',
        'agc',
        'plano-homologado',
        'quadro-credores',
        'pagamentos',
        'prestacao-contas',
      ])
      // As finais alternativas da RJ não aparecem (SDD-INI §5.7).
      expect(html).not.toContain('convolada-falencia')
      expect(html).not.toContain('Desistência')
      expect(html).toContain('5 ativas · 1 encerrada')
      expect(html).toContain('3 ativas · 1 encerrada')
    },
  )

  it('QDR-13 · nome acessível com o nome inteiro da fase e a contagem', async () => {
    const html = await tela('desktop')
    expect(html).toContain('aria-label="Pedido: 1 processo"')
    expect(html).toContain('title="Relação do AJ publicada: nenhum processo"')
    // No desktop, o nome curto do canvas; no celular, o nome inteiro.
    expect(html).toMatch(/>Deferido<\/span>/)
    expect(await tela('celular')).toMatch(/>Processamento deferido<\/span>/)
  })

  it('QDR-14 · o link da fase leva a Processos filtrada por tipo e fase (F-08)', () => {
    expect(paraProcessos('falencia', 'realizacao-ativo')).toBe(
      '/processos?tipo=falencia&fase=realizacao-ativo',
    )
  })

  it('QDR-15 · sem processos, o estado vazio no lugar das trilhas', async () => {
    const html = await tela('desktop', new ArmazenamentoMemoria())
    expect(html).toContain(VAZIO_CARTEIRA)
    expect(html).not.toContain('data-fase=')
    expect(html).not.toContain(ERRO_CARTEIRA)
  })

  it('resumo do tipo no singular e sem encerradas', () => {
    expect(resumoDoTipo({ ativos: 1, encerrados: 0 })).toBe('1 ativa')
    expect(resumoDoTipo({ ativos: 0, encerrados: 2 })).toBe('0 ativas · 2 encerradas')
  })
})
