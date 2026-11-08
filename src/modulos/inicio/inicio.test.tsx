// Início renderizado em HTML com o seed completo da demo (CAB-03, PER-04). O seed é relativo a hoje
// (T-24), então a carga usa o mesmo relógio que a tela. A grade e os quadros estão em grade.test.tsx;
// os números do antigo dashboard (DSH) voltam nos quadros do lote 3 (QDR).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { type ArquivoSeed, gerarSeed } from '../../../scripts/seed/gerar'
import { gravarTabelas, prepararSeed, type TabelasSeed } from '../../dados/carga'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import type { DataIso } from '../../regras/datas'
import { type Papel, pode } from '../../regras/permissoes'
import { hoje as hojeDoRelogio } from '../../regras/relogio'
import { renderizarComDados } from '../../ui/renderizarParaTeste'
import { Inicio } from './Inicio'
import { resumoDoDia } from './indicadores'
import { fraseDoResumo } from './resumo'
import { registro } from './rotas'

let seed: ArquivoSeed
let hoje: DataIso
let tabelas: TabelasSeed
let armazenamento: ArmazenamentoMemoria

beforeAll(() => {
  seed = gerarSeed()
})

beforeEach(async () => {
  hoje = hojeDoRelogio()
  tabelas = prepararSeed(structuredClone(seed), hoje).tabelas
  armazenamento = new ArmazenamentoMemoria()
  await gravarTabelas(armazenamento, tabelas)
})

const tela = (papel: Papel = 'advogado') =>
  renderizarComDados(<Inicio larguraForcada={1240} />, { armazenamento, papel })

describe('cabeçalho do início com o seed', () => {
  it('CAB-03 · resumo do seed no relógio fixo (sábado, 7/11/2026)', () => {
    const fixo = '2026-11-07'
    const doDia = prepararSeed(structuredClone(seed), fixo).tabelas
    const resumo = resumoDoDia(doDia.prazos, doDia.agcs, doDia.processos, fixo)
    const { destaque, resto } = fraseDoResumo(resumo, fixo)
    expect(destaque + resto).toBe(
      '3 prazos vencidos, 1 vence hoje e a AGC de Grupo Lontra Azul é na sexta.',
    )
  })

  it('a tela mostra a saudação no h1 e o resumo de hoje', async () => {
    const html = await tela()
    const { destaque, resto } = fraseDoResumo(
      resumoDoDia(tabelas.prazos, tabelas.agcs, tabelas.processos, hoje),
      hoje,
    )
    expect(html).toMatch(/<h1[^>]*>(Bom dia|Boa tarde|Boa noite), Teste<\/h1>/)
    expect(html).toContain(`>${destaque}</b>${resto}</p>`)
    expect(html).not.toContain('Dashboard')
  })
})

describe('rota do início', () => {
  it.each(['aj', 'advogado', 'analista'] as const)('PER-04 · %s abre "/"', (papel) => {
    const [rota] = registro.rotas ?? []
    expect(rota).toMatchObject({ caminho: '/', acao: 'ler', modulo: 'dashboard' })
    expect(pode(papel, rota?.acao ?? 'editar', rota?.modulo ?? 'usuarios')).toBe(true)
  })
})
