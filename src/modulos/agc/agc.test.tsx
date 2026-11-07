// Telas da AGC renderizadas em HTML com o seed mini (SDD §7.6, DMO-16). Sem DOM: o que se confere
// é o que a tela mostra com os dados; os cliques ficam no e2e (e2e/agc.spec.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { carregarSeedMini } from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import type { Tipos } from '../../dados/schemas'
import { pode } from '../../regras/permissoes'
import { credoresVotantes, resultadoAgc } from '../../regras/votacao'
import { renderizarComDados } from '../credores/renderizarParaTeste'
import { AbaAgc } from './AbaAgc'
import {
  convocacaoSugerida,
  emSimulacao,
  filtrarPresenca,
  linhasDePresenca,
  MENSAGEM_SIMULACAO,
} from './agc'
import { filtrarMesa, linhasDaMesa, motivoSemRegistro, percentualDe } from './mesa'
import { registro } from './rotas'
import { TelaAgc } from './TelaAgc'

let armazenamento: ArmazenamentoMemoria

beforeEach(async () => {
  armazenamento = new ArmazenamentoMemoria()
  await carregarSeedMini(armazenamento)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-07T10:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

/** A tag `<input>` da caixa de presença do credor. */
function caixaDe(html: string, nome: string): string {
  const fim = html.indexOf(`aria-label="Presente: ${nome}"`)
  if (fim === -1) return ''
  return html.slice(html.lastIndexOf('<input', fim), html.indexOf('>', fim) + 1)
}

const tela = (agcId = 'agc-001', papel?: 'aj' | 'analista', processoId = 'prc-001') =>
  renderizarComDados(<TelaAgc />, {
    armazenamento,
    papel,
    caminho: `/processos/${processoId}/agc/${agcId}`,
    rota: '/processos/:id/agc/:agcId',
  })

async function credoresRj() {
  return armazenamento.porIndice<Tipos['credores']>('credores', 'processoId', 'prc-001')
}

describe('rota da AGC', () => {
  it('PER-04, PER-07 · a tela da AGC abre para quem lê AGC (os três papéis)', () => {
    const [rotaAgc] = registro.rotas ?? []
    expect(rotaAgc).toMatchObject({ caminho: '/processos/:id/agc/:agcId', acao: 'ler' })
    for (const papel of ['aj', 'advogado', 'analista'] as const) {
      expect(pode(papel, rotaAgc?.acao ?? 'editar', rotaAgc?.modulo ?? 'dashboard')).toBe(true)
    }
    expect(registro.abas?.agc).toBe(AbaAgc)
  })
})

describe('regras da tela', () => {
  it('AGC-01 · simulação enquanto a 1ª convocação não chegou e a AGC não foi encerrada', () => {
    const agc = { dataPrimeira: '2026-11-13', status: 'agendada' as const }
    expect(emSimulacao(agc, '2026-11-07')).toBe(true)
    expect(emSimulacao(agc, '2026-11-13')).toBe(false)
    expect(emSimulacao({ ...agc, status: 'encerrada' }, '2026-11-07')).toBe(false)
  })

  it('convocação sugerida: a 2ª depois que passou a data da 1ª', () => {
    expect(convocacaoSugerida({ dataPrimeira: '2026-11-13' }, '2026-11-13')).toBe(1)
    expect(convocacaoSugerida({ dataPrimeira: '2026-11-13' }, '2026-11-14')).toBe(2)
  })

  it('lista: votantes por classe (I a IV) e quem não vota por último, com o motivo', async () => {
    const linhas = linhasDePresenca(await credoresRj(), new Set(['crd-0001', 'crd-0005']))
    const primeiraSemVoto = linhas.findIndex((linha) => linha.motivo)
    expect(linhas.slice(primeiraSemVoto).every((linha) => linha.motivo)).toBe(true)
    expect(linhas[0]?.credor.classe).toBe('trabalhista')
    // Quem deixou de votar depois de marcado aparece presente, para poder ser desmarcado.
    expect(linhas.find((l) => l.credor.id === 'crd-0005')).toMatchObject({ presente: true })
    expect(linhas.find((l) => l.credor.id === 'crd-0001')).toMatchObject({ presente: true })

    const semVoto = filtrarPresenca(linhas, { busca: '', classe: 'sem-voto' })
    expect(semVoto.map((l) => l.credor.id)).toContain('crd-0007')
    const classeII = filtrarPresenca(linhas, { busca: '', classe: 'garantia-real' })
    expect(classeII.every((l) => l.credor.classe === 'garantia-real' && !l.motivo)).toBe(true)
    expect(filtrarPresenca(linhas, { busca: 'debora', classe: '' })).toHaveLength(1)
  })
})

describe('AbaAgc', () => {
  it('lista as AGCs do processo com a situação e o selo de data futura', async () => {
    const html = await renderizarComDados(<AbaAgc processoId="prc-001" />, { armazenamento })
    expect(html).toContain('href="/processos/prc-001/agc/agc-001"')
    expect(html).toContain('13/11/2026')
    expect(html).toContain('Agendada')
    expect(html).toContain('Data futura')
    expect(html).toContain('Nova AGC')
  })

  it('analista vê a lista sem "Nova AGC" (PER-05)', async () => {
    const html = await renderizarComDados(<AbaAgc processoId="prc-001" />, {
      armazenamento,
      papel: 'analista',
    })
    expect(html).toContain('agc-001')
    expect(html).not.toContain('Nova AGC')
  })
})

describe('TelaAgc', () => {
  it('AGC-01 · AGC futura mostra o aviso e deixa marcar presença', async () => {
    const html = await tela()
    expect(html).toContain(MENSAGEM_SIMULACAO)
    expect(caixaDe(html, 'José Conceição')).toContain('checked=""')
    expect(caixaDe(html, 'José Conceição')).not.toContain('disabled')
    expect(html).toContain('Instalar em 1ª convocação')
  })

  it('AGC-01 · na data da AGC, sem aviso', async () => {
    vi.setSystemTime(new Date('2026-11-13T10:00:00'))
    expect(await tela()).not.toContain(MENSAGEM_SIMULACAO)
  })

  it('AGC-24 · não sujeito e valor zero aparecem desabilitados, com o motivo', async () => {
    const html = await tela()
    // crd-0007: classe II com valor zero; crd-0010: não sujeito.
    const zero = caixaDe(html, 'Credor 0007')
    const naoSujeito = caixaDe(html, 'Credor 0010')
    expect(zero).toContain('disabled=""')
    expect(naoSujeito).toContain('disabled=""')
    expect(zero).toContain('aria-describedby="motivo-crd-0007"')
    expect(html).toMatch(/id="motivo-crd-0007"[^>]*>Não vota: <!-- -->crédito com valor zero/)
    expect(html).toMatch(
      /id="motivo-crd-0010"[^>]*>Não vota: <!-- -->credor não sujeito à recuperação judicial/,
    )
    // Votante ausente: habilitado.
    expect(caixaDe(html, 'Ana Ávila')).not.toContain('disabled')
  })

  it('painel de instalação por classe; em 1ª convocação, sem quórum, instalar fica desabilitado com o motivo', async () => {
    const html = await tela()
    expect(html).toContain('data-classe="trabalhista"')
    expect(html).toContain('Todos da classe')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-describedby="[^"]+"[^>]*>.*Instalar/)
    expect(html).toMatch(
      /Não atinge: I · Trabalhista, II · Garantia real, III · Quirografário, IV · ME\/EPP\./,
    )
  })

  it('analista vê a lista e o painel só para leitura (PER-05)', async () => {
    const html = await tela('agc-001', 'analista')
    expect(caixaDe(html, 'Ana Ávila')).toContain('disabled=""')
    expect(html).not.toContain('Todos da classe')
    expect(html).not.toContain('Instalar em')
    expect(html).not.toContain('>Editar<')
  })

  it('AGC instalada: convocação fixa e lista fechada', async () => {
    const agc = await armazenamento.get<Tipos['agcs']>('agcs', 'agc-001')
    await armazenamento.put('agcs', { ...agc, status: 'instalada', convocacaoInstalada: 2 })
    const html = await tela()
    expect(html).toContain('Instalada em 2ª convocação')
    expect(caixaDe(html, 'Ana Ávila')).toContain('disabled=""')
    expect(html).not.toContain('Todos da classe')
    expect(html).not.toContain('name="convocacao-')
  })

  it('AGC de outro processo ou processo de falência: não encontrada', async () => {
    expect(await tela('agc-001', 'aj', 'prc-002')).toContain('Página não encontrada')
    expect(await tela('agc-999')).toContain('Página não encontrada')
  })
})

// Votação (RF-34 a RF-37, T-33; DMO-17). No seed mini, os presentes da agc-001 são crd-0001
// (I · Trabalhista, José Conceição) e crd-0003 (III · Quirografário, Bruno Souza); crd-0001 já tem
// um voto "sim" gravado.
describe('votação', () => {
  async function mudarAgc(campos: Partial<Tipos['agcs']>) {
    const agc = await armazenamento.get<Tipos['agcs']>('agcs', 'agc-001')
    await armazenamento.put('agcs', { ...agc, ...campos })
  }
  const instalar = () => mudarAgc({ status: 'instalada', convocacaoInstalada: 2 })
  async function votar(credorId: string, voto: 'sim' | 'nao' | 'abstencao') {
    await armazenamento.put('votos', {
      id: `vot-${credorId}`,
      escritorioId: 'esc-1',
      criadoEm: '2026-11-07T09:00:00',
      atualizadoEm: '2026-11-07T09:00:00',
      agcId: 'agc-001',
      credorId,
      voto,
    })
  }
  /** A tag `<button>` de "Registrar resultado". */
  function botaoRegistrar(html: string): string {
    const fim = html.indexOf('Registrar resultado</button>')
    if (fim === -1) return ''
    const inicio = html.lastIndexOf('<button', fim)
    return html.slice(inicio, html.indexOf('>', inicio) + 1)
  }

  it('AGC-23 · AGC não instalada: sem mesa, "Registrar resultado" desabilitado com o motivo', async () => {
    const html = await tela()
    expect(html).toContain('A votação abre depois da instalação')
    expect(html).not.toContain('Mesa de votação')
    const botao = botaoRegistrar(html)
    expect(botao).toContain('disabled=""')
    expect(botao).toMatch(/aria-describedby="[^"]+"/)
    expect(html).toContain('Instale a AGC para abrir a votação')
  })

  it('T-33 · presente sem voto: aviso no painel e registro desabilitado', async () => {
    await instalar()
    const html = await tela()
    expect(html).toContain('Mesa de votação')
    expect(html).toContain('Aprovação por cram down')
    expect(html).toMatch(/1<!-- --> de <!-- -->2<!-- --> presentes com voto lançado/)
    expect(html).toContain('Falta o voto de 1 presente.')
    expect(botaoRegistrar(html)).toContain('disabled=""')
    // O voto gravado entra no painel: o "sim" da classe I aprova; a III ainda não votou.
    expect(html).toContain('data-classe="trabalhista" data-resultado="aprovada"')
    expect(html).toContain('data-classe="quirografario" data-resultado="nao-votou"')
  })

  it('RF-35, RF-36 · com todos os votos, painel por classe, cram down e registro habilitado', async () => {
    await instalar()
    await votar('crd-0003', 'nao')
    const html = await tela()
    expect(html).not.toContain('Falta o voto')
    expect(botaoRegistrar(html)).not.toContain('disabled')
    expect(html).toContain('data-classe="quirografario" data-resultado="rejeitada"')
    expect(html).toContain('data-resultado-geral="rejeitado"')
    expect(html).toContain('Cram down (art. 58, §1º)')
    expect(html).toContain('data-cram-down="nao-cumprido"')
    expect(html).toContain('data-requisito="2" data-cumprido="true"')
    expect(html).toContain('data-requisito="1" data-cumprido="false"')
  })

  it('AGC-18 · todas as classes que votaram aprovam: cram down não aparece', async () => {
    await instalar()
    await votar('crd-0003', 'sim')
    const html = await tela()
    expect(html).toContain('Aprovado em todas as classes')
    expect(html).not.toContain('Cram down (art. 58, §1º)')
  })

  it('AGC-22 · AGC encerrada: votos e presença só leitura, sem cenários nem registro', async () => {
    await mudarAgc({ status: 'encerrada', convocacaoInstalada: 2 })
    await votar('crd-0003', 'sim')
    const html = await tela()
    expect(html).toContain('Resultado registrado: presença e votos ficam só leitura.')
    expect(html).toContain('href="/processos/prc-001/informes"')
    expect(html).toMatch(/<fieldset[^>]*disabled=""[^>]*><legend[^>]*>Voto de José Conceição/)
    expect(html).not.toContain('Registrar resultado')
    expect(html).not.toContain('Aprovação por cram down')
    expect(caixaDe(html, 'José Conceição')).toContain('disabled=""')
    expect(html).toContain('Aprovado em todas as classes')
  })

  it('analista vê a mesa só para leitura, sem cenários nem registro (PER-05)', async () => {
    await instalar()
    const html = await tela('agc-001', 'analista')
    expect(html).toContain('Mesa de votação')
    expect(html).toMatch(/<fieldset[^>]*disabled=""[^>]*><legend[^>]*>Voto de Bruno Souza/)
    expect(html).not.toContain('Aprovação por cram down')
    expect(html).not.toContain('Registrar resultado')
  })

  it('peças da mesa: linhas só de presentes votantes, filtros, motivo e percentual', async () => {
    const credores = await credoresRj()
    const votantes = credoresVotantes(credores)
    // crd-0007 (valor zero) marcado presente não entra na mesa.
    const linhas = linhasDaMesa(credores, votantes, new Set(['crd-0003', 'crd-0001', 'crd-0007']))
    expect(linhas.map((l) => l.credor.id)).toEqual(['crd-0001', 'crd-0003'])

    const votos = new Map([['crd-0001', 'sim' as const]])
    const semVoto = filtrarMesa(linhas, votos, { busca: '', filtro: 'sem-voto' })
    expect(semVoto.map((l) => l.credor.id)).toEqual(['crd-0003'])
    expect(filtrarMesa(linhas, votos, { busca: 'bruno', filtro: '' })).toHaveLength(1)
    expect(filtrarMesa(linhas, votos, { busca: '', filtro: 'trabalhista' })).toHaveLength(1)

    const presentes = ['crd-0001', 'crd-0003']
    const parcial = resultadoAgc(votantes, presentes, [{ credorId: 'crd-0001', voto: 'sim' }])
    expect(motivoSemRegistro({ status: 'agendada' }, parcial)).toMatch(/^Instale a AGC/)
    expect(motivoSemRegistro({ status: 'instalada' }, parcial)).toMatch(
      /^Falta o voto de 1 presente/,
    )
    const completo = resultadoAgc(votantes, presentes, [
      { credorId: 'crd-0001', voto: 'sim' },
      { credorId: 'crd-0003', voto: 'abstencao' },
    ])
    expect(motivoSemRegistro({ status: 'instalada' }, completo)).toBeNull()

    expect(percentualDe(1, 3)).toBe('33,33%')
    expect(percentualDe(50_004, 100_000)).toBe('50,00%')
    expect(percentualDe(1, 0)).toBe('—')
  })
})
