// Início renderizado em HTML com o seed completo da demo (DSH-01 a DSH-05, PER-07, CAB-03). O seed é
// relativo a hoje (T-24), então a carga usa o mesmo relógio que a tela.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { type ArquivoSeed, gerarSeed } from '../../../scripts/seed/gerar'
import { gravarTabelas, prepararSeed, type TabelasSeed } from '../../dados/carga'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { type ContextoGravacao, criarRepositorio } from '../../dados/repositorio'
import { type DataIso, formatarData, somarDias } from '../../regras/datas'
import { type Papel, pode } from '../../regras/permissoes'
import { hoje as hojeDoRelogio } from '../../regras/relogio'
import { renderizarComDados } from '../../ui/renderizarParaTeste'
import { Inicio } from './Inicio'
import { ehAtivo, resumoDoDia } from './indicadores'
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

const tela = (papel: Papel = 'advogado') => renderizarComDados(<Inicio />, { armazenamento, papel })

function stat(html: string, nome: string): string {
  const achado = new RegExp(`data-stat="${nome}"[^>]*>([^<]*)<`).exec(html)
  if (!achado) throw new Error(`data-stat="${nome}" não encontrado`)
  return achado[1] ?? ''
}

function passivo(html: string): number {
  const achado = /data-stat="passivo" data-valor="(\d+)"/.exec(html)
  if (!achado) throw new Error('passivo não encontrado')
  return Number(achado[1])
}

/** Itens (`<li>`) da seção com o rótulo dado, como HTML. */
function itens(html: string, secao: string): string[] {
  const inicio = html.indexOf(`aria-label="${secao}"`)
  if (inicio === -1) throw new Error(`seção ${secao} não encontrada`)
  const corpo = html.slice(inicio, html.indexOf('</section>', inicio))
  return corpo.split('<li>').slice(1)
}

const numero = (texto: string) => Number(texto.replace(/\D/g, ''))

describe('Início com o seed (conteúdo do antigo dashboard)', () => {
  it('DSH-01 · números do topo, todos > 0', async () => {
    const html = await tela()
    for (const nome of [
      'processos-ativos',
      'ativos-rj',
      'ativos-falencia',
      'credores',
      'prazos-vencidos',
      'prazos-7-dias',
    ]) {
      expect(numero(stat(html, nome)), nome).toBeGreaterThan(0)
    }
    expect(passivo(html)).toBeGreaterThan(0)

    const ativos = tabelas.processos.filter(ehAtivo)
    expect(numero(stat(html, 'ativos-rj'))).toBe(ativos.filter((p) => p.tipo === 'rj').length)
    expect(numero(stat(html, 'credores'))).toBe(tabelas.credores.length)
    const idsAtivos = new Set(ativos.map((p) => p.id))
    expect(passivo(html)).toBe(
      tabelas.credores
        .filter((c) => idsAtivos.has(c.processoId))
        .reduce((soma, c) => soma + (c.valorAj ?? 0), 0),
    )
  })

  it('DSH-02 · AGC do vitrine em "próximas AGCs", em D+6, com link para a AGC', async () => {
    const html = await tela()
    const [primeira] = itens(html, 'Próximas AGCs')
    expect(primeira).toContain('Grupo Lontra Azul')
    expect(primeira).toContain(formatarData(somarDias(hoje, 6)))
    expect(primeira).toContain('1ª convocação')
    const agc = tabelas.agcs.find((a) => a.processoId === 'prc-001' && a.status === 'agendada')
    expect(primeira).toContain(`href="/processos/prc-001/agc/${agc?.id}"`)
  })

  it('DSH-03 · 8 próximos prazos, vencidos primeiro, depois por data, cada um com link', async () => {
    const html = await tela()
    const prazos = itens(html, 'Próximos prazos')
    expect(prazos).toHaveLength(8)
    const vencidos = prazos.map((item) => item.includes('>Vencido<'))
    const ultimoVencido = vencidos.lastIndexOf(true)
    expect(ultimoVencido).toBeGreaterThanOrEqual(0)
    expect(vencidos.slice(0, ultimoVencido + 1).every(Boolean)).toBe(true)
    const datas = prazos.map((item) => {
      const [dia, mes, ano] = (/<b>(\d{2}\/\d{2}\/\d{4})<\/b>/.exec(item)?.[1] ?? '').split('/')
      return `${ano}-${mes}-${dia}`
    })
    expect(datas).toEqual([...datas].sort())
    for (const item of prazos) expect(item).toMatch(/href="\/processos\/prc-\d+\/prazos"/)
  })

  it('DSH-04 · editar um credor muda o passivo e aparece na atividade recente', async () => {
    const antes = passivo(await tela())
    const credor = tabelas.credores.find(
      (c) => c.processoId === 'prc-001' && c.valorAj !== null && c.valorAj !== undefined,
    )
    if (!credor) throw new Error('seed sem credor com valor do AJ no vitrine')
    const advogado = tabelas.usuarios.find((u) => u.papel === 'advogado')
    if (!advogado) throw new Error('seed sem advogado')
    const contexto: ContextoGravacao = {
      usuario: { id: advogado.id, escritorioId: credor.escritorioId },
      papel: 'advogado',
      agora: () => `${hoje}T23:59:59`,
    }
    await criarRepositorio(armazenamento, 'credores', contexto).atualizar(credor.id, {
      valorAj: (credor.valorAj ?? 0) + 1_000_00,
    })

    const html = await tela()
    expect(passivo(html)).toBe(antes + 1_000_00)
    const [maisNova] = itens(html, 'Atividade recente')
    expect(maisNova).toContain('Editou credor')
    expect(maisNova).toContain(`${advogado.nome} · Grupo Lontra Azul`)
    expect(maisNova).toContain(`href="/processos/prc-001/credores/${credor.id}"`)
  })

  it('DSH-05 · processo que vai para fase final sai dos ativos e do passivo', async () => {
    const antes = await tela()
    const vitrine = tabelas.processos.find((p) => p.id === 'prc-001')
    if (!vitrine) throw new Error('seed sem o vitrine')
    await armazenamento.put('processos', { ...vitrine, faseAtual: 'desistencia' })
    const doVitrine = tabelas.credores
      .filter((c) => c.processoId === 'prc-001')
      .reduce((soma, c) => soma + (c.valorAj ?? 0), 0)

    const depois = await tela()
    expect(numero(stat(depois, 'ativos-rj'))).toBe(numero(stat(antes, 'ativos-rj')) - 1)
    expect(passivo(depois)).toBe(passivo(antes) - doVitrine)
  })

  it('RF-08/RF-09 · funil com todas as fases de cada tipo e passivo por classe da RJ', async () => {
    const html = await tela()
    expect(html.match(/data-fase="/g)).toHaveLength(12 + 7)
    expect(html).toContain('data-tipo="rj"')
    expect(html).toContain('data-tipo="falencia"')
    expect(html.match(/data-classe="/g)).toHaveLength(5)
  })

  it('PER-07 · analista lê o dashboard: números e listas, sem link para usuários', async () => {
    expect(pode('analista', registro.rotas?.[0]?.acao ?? 'editar', 'dashboard')).toBe(true)
    const html = await tela('analista')
    expect(numero(stat(html, 'credores'))).toBe(tabelas.credores.length)
    expect(itens(html, 'Atividade recente').length).toBeGreaterThan(0)
    expect(html).not.toContain('href="/usuarios"')
  })
})

describe('cabeçalho do início com o seed', () => {
  it('CAB-03 · resumo do seed no relógio fixo (sábado, 7/11/2026)', () => {
    const fixo = '2026-11-07'
    const doDia = prepararSeed(structuredClone(seed), fixo).tabelas
    const resumo = resumoDoDia(doDia.prazos, doDia.agcs, doDia.processos, fixo)
    const { destaque, resto } = fraseDoResumo(resumo, fixo)
    expect(destaque + resto).toBe(
      '3 prazos vencidos, 1 vence hoje e a AGC do Grupo Lontra Azul é na sexta.',
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
