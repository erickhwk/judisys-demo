// Casca nova (INI-01, SDD §7.1): menu lateral renderizado em HTML com o seed da demo. O seed é
// relativo a hoje (T-24), então a carga usa o mesmo relógio que o menu.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { type ArquivoSeed, gerarSeed } from '../../scripts/seed/gerar'
import { gravarTabelas, prepararSeed, type TabelasSeed } from '../dados/carga'
import { ArmazenamentoMemoria } from '../dados/memoria'
import { numerosDoTopo } from '../modulos/inicio/indicadores'
import type { Papel } from '../regras/permissoes'
import { hoje as hojeDoRelogio } from '../regras/relogio'
import { iniciais } from './MenuConta'
import { MenuLateral, type PropsMenuLateral } from './MenuLateral'
import { renderizarComDados } from './renderizarParaTeste'

let seed: ArquivoSeed
let tabelas: TabelasSeed

beforeAll(() => {
  seed = gerarSeed()
})

beforeEach(() => {
  tabelas = prepararSeed(structuredClone(seed), hojeDoRelogio()).tabelas
})

const nada = () => {}

async function menu(
  opcoes: { papel?: Papel; caminho?: string } & Partial<PropsMenuLateral> = {},
  dados: TabelasSeed = tabelas,
): Promise<string> {
  const { papel = 'advogado', caminho = '/processos', ...props } = opcoes
  const armazenamento = new ArmazenamentoMemoria()
  await gravarTabelas(armazenamento, dados)
  return renderizarComDados(
    <MenuLateral
      id="menu"
      papel={papel}
      nome="Otávio Reis"
      nomePapel="Advogado(a)"
      aoTrocarDePapel={nada}
      aoResetar={nada}
      recolhido={false}
      aoAlternarRecolhido={nada}
      gavetaAberta={false}
      aoFecharGaveta={nada}
      {...props}
    />,
    { armazenamento, papel, caminho },
  )
}

/** Rótulos dos links do menu, na ordem. */
function rotulos(html: string): string[] {
  return [...html.matchAll(/<a [^>]*>.*?<span[^>]*>([^<]+)<\/span>/g)].map((m) => m[1] ?? '')
}

function contador(html: string, nome: string): string | undefined {
  return new RegExp(`data-contador="${nome}"[^>]*>([^<]*)<`).exec(html)?.[1]
}

/** Abertura da tag do elemento com o atributo dado (ex.: `role="switch"`). */
function tag(html: string, atributo: string): string {
  const inicio = html.lastIndexOf('<', html.indexOf(atributo))
  return html.slice(inicio, html.indexOf('>', inicio) + 1)
}

describe('menu lateral (INI-01)', () => {
  it('CAS-01 · "Início" no lugar de "Dashboard"; pé com o tema e a conta', async () => {
    const html = await menu()
    expect(rotulos(html)).toEqual([
      'Início',
      'Processos',
      'Empresas',
      'Informes',
      'Agenda',
      'Usuários',
      'Logs',
    ])
    expect(html).not.toContain('Dashboard')
    const interruptor = tag(html, 'role="switch"')
    expect(interruptor).toContain('aria-checked="false"')
    expect(html).toContain('Tema escuro')
    expect(tag(html, 'aria-label="Menu da conta"')).toContain('aria-expanded="false"')
    expect(html).toContain('Otávio Reis')
    expect(html).toContain('Advogado(a)')
  })

  it('CAS-01 · o item da tela atual fica marcado', async () => {
    const html = await menu({ caminho: '/processos' })
    expect(tag(html, 'aria-current="page"')).toContain('href="/processos"')
  })

  it('CAS-02 · Processos mostra 12 e Agenda mostra 3 vencidos, descritos para o leitor', async () => {
    const hoje = hojeDoRelogio()
    const numeros = numerosDoTopo(tabelas, hoje)
    // Os números saem do seed real (as mesmas funções do início).
    expect(tabelas.processos).toHaveLength(12)
    expect(numeros.prazosVencidos).toBe(3)

    const html = await menu()
    expect(contador(html, 'processos')).toBe('12')
    expect(contador(html, 'vencidos')).toBe('3')
    expect(html).toContain('12 processos')
    expect(html).toContain('3 prazos vencidos')
    // O contador descreve o link sem mudar o nome dele ("Agenda").
    expect(tag(html, 'href="/agenda"')).toMatch(/aria-describedby="[^"]+"/)
  })

  it('CAS-03 · sem prazo vencido, a Agenda fica sem contador', async () => {
    const semVencidos: TabelasSeed = {
      ...tabelas,
      prazos: tabelas.prazos.map((prazo) => ({ ...prazo, status: 'cumprido' as const })),
    }
    const html = await menu({}, semVencidos)
    expect(contador(html, 'vencidos')).toBeUndefined()
    expect(html).toContain('nenhum prazo vencido')
    expect(contador(html, 'processos')).toBe('12')
  })

  it('CAS-07 · recolhido, o pé mostra só os ícones do tema e da conta, com aria-label', async () => {
    const html = await menu({ recolhido: true })
    const interruptor = tag(html, 'role="switch"')
    expect(interruptor).toContain('aria-label="Tema escuro"')
    expect(html).not.toMatch(/>Tema escuro</)
    expect(html).toContain('aria-label="Menu da conta"')
    // Nome e papel só no painel da conta (fechado), não no botão.
    expect(html.match(/Advogado\(a\)/g)).toHaveLength(1)
    expect(html).toContain('>OR<')
  })

  it('CAS-07 · na gaveta (abaixo de 901px), o pé volta inteiro mesmo recolhido', async () => {
    const html = await menu({ recolhido: true, gavetaAberta: true })
    expect(html).toMatch(/>Tema escuro</)
    expect(html.match(/Advogado\(a\)/g)).toHaveLength(2)
  })

  it('CAS-08 · analista não vê "Usuários" (RF-40 da demo)', async () => {
    const html = await menu({ papel: 'analista' })
    expect(rotulos(html)).not.toContain('Usuários')
    expect(rotulos(html)).toContain('Logs')
    expect(rotulos(html)).toContain('Início')
  })
})

describe('iniciais do avatar', () => {
  it.each([
    ['Otávio Reis', 'OR'],
    ['Helena Prado Moura', 'HM'],
    ['  marina  ', 'M'],
    ['', ''],
  ])('%s → %s', (nome, esperado) => {
    expect(iniciais(nome)).toBe(esperado)
  })
})
