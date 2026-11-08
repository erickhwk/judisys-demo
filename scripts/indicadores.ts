// Números do seed para fichas, casos e testes (SDD-INI §10). Roda com `pnpm indicadores`: carrega o
// seed com as datas do relógio fixo dos e2e (2026-11-07 10:00) e imprime, por bloco e com rótulo, o
// que as funções reais de `indicadores.ts` devolvem. É a fonte única desses números: nada de cálculo
// avulso fora do código do app. Cálculo novo em `indicadores.ts` entra também aqui.
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { prepararSeed, type TabelasSeed } from '../src/dados/carga'
import {
  cumpridosPorMes,
  funilPorFase,
  informesPorMes,
  numerosDoTopo,
  passivoPorClasse,
  passivoPorProcesso,
  proximasAgcs,
  proximosPrazos,
  resumoDoDia,
  ultimosInformes,
} from '../src/modulos/inicio/indicadores'
import type { DataIso } from '../src/regras/datas'
import { formatarMoedaCurta } from '../src/regras/moeda'
import { gerarSeed } from './seed/gerar'

/** O "hoje" do relógio fixo dos e2e (`--relogio 2026-11-07T10:00:00`). */
export const HOJE_FIXO: DataIso = '2026-11-07'

export interface Linha {
  rotulo: string
  valor: number | string
}

export interface Bloco {
  titulo: string
  linhas: Linha[]
}

/** As tabelas do seed com as datas convertidas para `hoje`, como a carga da demo grava. */
export function tabelasDoSeed(hoje: DataIso = HOJE_FIXO): TabelasSeed {
  return prepararSeed(gerarSeed(), hoje).tabelas
}

/** Dinheiro em centavos, com a forma curta da tela ao lado. */
function dinheiro(centavos: number): string {
  return `${centavos} centavos (${formatarMoedaCurta(centavos)})`
}

export function blocosDeIndicadores(tabelas: TabelasSeed, hoje: DataIso): Bloco[] {
  const topo = numerosDoTopo(tabelas, hoje)
  const classes = passivoPorClasse(tabelas.processos, tabelas.credores)
  const porProcesso = passivoPorProcesso(tabelas.processos, tabelas.credores)
  const resumo = resumoDoDia(tabelas.prazos, tabelas.agcs, tabelas.processos, hoje)
  const processo = (id: string) => tabelas.processos.find((p) => p.id === id)?.apelido ?? id
  return [
    {
      titulo: 'Números do topo (numerosDoTopo)',
      linhas: [
        { rotulo: 'Processos ativos', valor: topo.ativosRj + topo.ativosFalencia },
        { rotulo: 'RJ ativas', valor: topo.ativosRj },
        { rotulo: 'Falências ativas', valor: topo.ativosFalencia },
        { rotulo: 'Passivo (relação do AJ, ativos)', valor: dinheiro(topo.passivo) },
        { rotulo: 'Credores', valor: topo.credores },
        { rotulo: 'Prazos vencidos', valor: topo.prazosVencidos },
        { rotulo: 'Prazos nos próximos 7 dias', valor: topo.prazosProximos },
      ],
    },
    {
      titulo: 'Frase-resumo do início (resumoDoDia)',
      linhas: [
        { rotulo: 'Prazos vencidos', valor: resumo.vencidos },
        { rotulo: 'Prazos de hoje', valor: resumo.hoje },
        {
          rotulo: 'AGC nos próximos 7 dias',
          valor: resumo.agc ? `${resumo.agc.data} · ${resumo.agc.apelido}` : '(nenhuma)',
        },
      ],
    },
    {
      titulo: 'Passivo por classe das RJ ativas (passivoPorClasse)',
      linhas: [
        ...classes.map((c) => ({ rotulo: c.rotulo, valor: dinheiro(c.valor) })),
        { rotulo: 'Total', valor: dinheiro(classes.reduce((soma, c) => soma + c.valor, 0)) },
      ],
    },
    // INI-08 · quadros 2×1 (Q-08 a Q-10)
    {
      titulo: 'Passivo por processo ativo (passivoPorProcesso)',
      linhas: [
        ...porProcesso.maiores.map((p) => ({ rotulo: p.apelido, valor: dinheiro(p.valor) })),
        { rotulo: 'Ativos sem relação do AJ', valor: porProcesso.semRelacao },
        { rotulo: 'Total', valor: dinheiro(porProcesso.total) },
      ],
    },
    {
      titulo: 'Informes por mês, 12 meses até o de hoje (informesPorMes)',
      linhas: informesPorMes(tabelas.informes, hoje).map((m) => ({
        rotulo: m.mes,
        valor: m.quantidade,
      })),
    },
    {
      titulo: 'Prazos cumpridos por mês de vencimento, 12 meses fechados (cumpridosPorMes)',
      linhas: cumpridosPorMes(tabelas.prazos, hoje).map((m) => ({
        rotulo: m.mes,
        valor: m.quantidade,
      })),
    },
    ...(['rj', 'falencia'] as const).map((tipo) => ({
      titulo: `Funil por fase, ${tipo === 'rj' ? 'RJ' : 'falência'} (funilPorFase)`,
      linhas: funilPorFase(tabelas.processos, tipo).map((e) => ({
        rotulo: e.rotulo,
        valor: e.quantidade,
      })),
    })),
    {
      titulo: 'Próximos prazos em aberto (proximosPrazos)',
      linhas: proximosPrazos(tabelas.prazos, hoje).map((p) => ({
        rotulo: `${p.vencimento} · ${processo(p.processoId)}`,
        valor: p.titulo,
      })),
    },
    {
      titulo: 'Próximas AGCs (proximasAgcs)',
      linhas: proximasAgcs(tabelas.agcs, hoje).map((a) => ({
        rotulo: `${a.data} · ${processo(a.agc.processoId)}`,
        valor: `${a.convocacao}ª convocação`,
      })),
    },
    {
      titulo: 'Últimos informes (ultimosInformes)',
      linhas: ultimosInformes(tabelas.informes).map((i) => ({
        rotulo: `${i.data} · ${processo(i.processoId)}`,
        valor: i.titulo,
      })),
    },
  ]
}

export function formatarBlocos(blocos: readonly Bloco[], hoje: DataIso): string {
  const partes = [`Indicadores do seed com hoje = ${hoje}`]
  for (const bloco of blocos) {
    partes.push('', `## ${bloco.titulo}`)
    for (const linha of bloco.linhas) partes.push(`${linha.rotulo}: ${linha.valor}`)
    if (bloco.linhas.length === 0) partes.push('(nenhum)')
  }
  return partes.join('\n')
}

// Só imprime quando roda como script; o teste importa as funções. O `import.meta.url` vem com os
// links simbólicos resolvidos, o `argv[1]` não: compara pelo caminho real.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  console.log(formatarBlocos(blocosDeIndicadores(tabelasDoSeed(HOJE_FIXO), HOJE_FIXO), HOJE_FIXO))
}
