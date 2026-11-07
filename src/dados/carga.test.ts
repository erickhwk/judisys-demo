// Carga, versão e reset (SDD §7.1, CAR-01 a CAR-12; T-18, T-24, T-25, T-34). O navegador é
// simulado: IndexedDB com fake-indexeddb (um IDBFactory por "navegador"), localStorage em mapa e o
// download do seed contado arquivo a arquivo.
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { relativizar } from '../../scripts/seed/datas'
import { type ArquivoSeed, gerarSeed } from '../../scripts/seed/gerar'
import { comFalhaEm } from '../../tests/fixtures/falhas'
import { seedMini } from '../../tests/fixtures/seed-mini'
import type { Armazenamento } from './armazenamento'
import {
  type Banco,
  bancoDexie,
  CHAVE_VERSAO,
  carregar,
  type DependenciasCarga,
  ErroCarga,
  ehErroDeCota,
  marcadorDeVersao,
  prepararSeed,
  type ResultadoCarga,
  recalcularRmas,
  resetar,
  resolverDatas,
} from './carga'
import { ArmazenamentoDexie, VERSAO_SCHEMA } from './dexie'
import { ArmazenamentoMemoria } from './memoria'
import type { Tipos } from './schemas'
import { ehRma } from './servicos/comum'

const HOJE = '2026-11-07'

/** `localStorage` em memória. */
class StorageFalso implements Storage {
  private itens = new Map<string, string>()
  get length() {
    return this.itens.size
  }
  clear() {
    this.itens.clear()
  }
  getItem(chave: string) {
    return this.itens.get(chave) ?? null
  }
  key(i: number) {
    return [...this.itens.keys()][i] ?? null
  }
  removeItem(chave: string) {
    this.itens.delete(chave)
  }
  setItem(chave: string, valor: string) {
    this.itens.set(chave, valor)
  }
}

/** Seed pequeno no formato de public/seed.json (datas relativas a 2026-11-07). */
function arquivoMini(versao = 'aaaaaaaaaaaa'): ArquivoSeed {
  return { versao, tabelas: relativizar(seedMini()) }
}

const abertos: Armazenamento[] = []

/** Um navegador: IndexedDB e localStorage persistem entre as cargas; `servidor` é o site. */
function navegador(servidor: { seed: unknown; versao?: string }) {
  const idb = new IDBFactory()
  const localStorage = new StorageFalso()
  const baixados: string[] = []
  const deps: DependenciasCarga = {
    hoje: () => HOJE,
    baixar: async (arquivo) => {
      baixados.push(arquivo)
      if (arquivo === 'seed-versao.json') {
        return { versao: servidor.versao ?? (servidor.seed as ArquivoSeed).versao }
      }
      return structuredClone(servidor.seed)
    },
    localStorage: () => localStorage,
    banco: bancoDexie({ indexedDB: idb, IDBKeyRange }),
  }
  const abrir = async (extra: Partial<DependenciasCarga> = {}) => {
    baixados.length = 0
    const carga = await carregar({ ...deps, ...extra })
    abertos.push(carga.armazenamento)
    return carga
  }
  return { deps, localStorage, baixados, abrir }
}

afterEach(() => {
  for (const armazenamento of abertos.splice(0)) {
    if (armazenamento instanceof ArmazenamentoDexie) armazenamento.fechar()
  }
})

async function nomeDoProcesso(carga: ResultadoCarga): Promise<string | undefined> {
  return (await carga.armazenamento.get<{ apelido: string }>('processos', 'prc-001'))?.apelido
}

async function renomearProcesso(carga: ResultadoCarga, apelido: string): Promise<void> {
  const processo = await carga.armazenamento.get<Record<string, unknown>>('processos', 'prc-001')
  await carga.armazenamento.put('processos', { ...processo, apelido })
}

describe('CAR-01 · primeira visita', () => {
  it('baixa o seed, converte as datas, grava e marca a versão, sem aviso', async () => {
    const seed = arquivoMini()
    const b = navegador({ seed })
    const carga = await b.abrir()

    expect(b.baixados).toEqual(['seed-versao.json', 'seed.json'])
    expect(carga).toMatchObject({ avisoVersao: false, modoMemoria: false })
    expect(carga.armazenamento).toBeInstanceOf(ArmazenamentoDexie)
    expect(await carga.armazenamento.todos('credores')).toHaveLength(seed.tabelas.credores.length)
    expect(b.localStorage.getItem(CHAVE_VERSAO)).toBe(`${VERSAO_SCHEMA}:${seed.versao}`)
    // Datas de volta ao absoluto: o mini foi relativizado a partir de 2026-11-07.
    expect(await carga.armazenamento.todos('prazos')).toEqual(seedMini().prazos)
  })
})

describe('CAR-02 · versão igual não baixa o seed', () => {
  it('só lê seed-versao.json e mantém o que foi alterado', async () => {
    const b = navegador({ seed: arquivoMini() })
    await renomearProcesso(await b.abrir(), 'Alterado na demo')

    const segunda = await b.abrir()
    expect(b.baixados).toEqual(['seed-versao.json'])
    expect(segunda).toMatchObject({ avisoVersao: false, modoMemoria: false })
    expect(await nomeDoProcesso(segunda)).toBe('Alterado na demo')
  })

  it('marcador igual mas banco vazio (IndexedDB limpo à parte): recarrega sem aviso', async () => {
    const b = navegador({ seed: arquivoMini() })
    const primeira = await b.abrir()
    await primeira.armazenamento.limpar()

    const segunda = await b.abrir()
    expect(b.baixados).toEqual(['seed-versao.json', 'seed.json'])
    expect(segunda.avisoVersao).toBe(false)
    expect(await segunda.armazenamento.todos('escritorios')).toHaveLength(1)
  })
})

describe('CAR-03 · versão diferente reseta com aviso', () => {
  it.each([
    ['o seed mudou', `${VERSAO_SCHEMA}:outra-versao`],
    ['o VERSAO_SCHEMA mudou', `${VERSAO_SCHEMA - 1}:aaaaaaaaaaaa`],
  ])('%s: apaga o banco, recarrega e avisa (RF-03)', async (_caso, marcadorAntigo) => {
    const b = navegador({ seed: arquivoMini() })
    await renomearProcesso(await b.abrir(), 'Alterado na demo')
    b.localStorage.setItem(CHAVE_VERSAO, marcadorAntigo)

    const carga = await b.abrir()
    expect(b.baixados).toEqual(['seed-versao.json', 'seed.json'])
    expect(carga.avisoVersao).toBe(true)
    expect(await nomeDoProcesso(carga)).toBe(seedMini().processos[0]?.apelido)
    expect(b.localStorage.getItem(CHAVE_VERSAO)).toBe(marcadorDeVersao('aaaaaaaaaaaa'))
  })

  it('a abertura seguinte já não avisa', async () => {
    const b = navegador({ seed: arquivoMini() })
    await b.abrir()
    b.localStorage.setItem(CHAVE_VERSAO, 'velho')
    expect((await b.abrir()).avisoVersao).toBe(true)
    expect((await b.abrir()).avisoVersao).toBe(false)
  })
})

describe('CAR-04 · reset manual', () => {
  it('volta ao seed com as datas de hoje, apaga uploads e marca a versão', async () => {
    const b = navegador({ seed: arquivoMini() })
    const carga = await b.abrir()
    await renomearProcesso(carga, 'Alterado na demo')
    await carga.armazenamento.put('arquivos', { id: 'upl-1', conteudo: new Blob(['x']) })
    b.localStorage.removeItem(CHAVE_VERSAO)

    await resetar(carga, { ...b.deps, hoje: () => '2026-12-07' })

    expect(await nomeDoProcesso(carga)).toBe(seedMini().processos[0]?.apelido)
    expect(await carga.armazenamento.todos('arquivos')).toEqual([])
    // Datas recalculadas para o novo "hoje" (+30 dias): 2026-11-19 → 2026-12-19.
    const prazo = (await carga.armazenamento.todos<{ vencimento: string }>('prazos'))[0]
    expect(prazo?.vencimento).toBe(
      resolverDatas(arquivoMini().tabelas.prazos, '2026-12-07')[0]?.vencimento,
    )
    expect(prazo?.vencimento).toBe('2026-12-19')
    expect(b.localStorage.getItem(CHAVE_VERSAO)).toBe(marcadorDeVersao('aaaaaaaaaaaa'))
    // O reset manual não é aviso de versão: a abertura seguinte segue normal.
    expect((await b.abrir()).avisoVersao).toBe(false)
  })

  it('em memória, reseta sem gravar o marcador', async () => {
    const b = navegador({ seed: arquivoMini() })
    const carga = { armazenamento: new ArmazenamentoMemoria(), modoMemoria: true }
    await resetar(carga, b.deps)
    expect(await carga.armazenamento.todos('escritorios')).toHaveLength(1)
    expect(b.localStorage.getItem(CHAVE_VERSAO)).toBeNull()
  })

  it('se a rede falha, os dados ficam como estavam', async () => {
    const b = navegador({ seed: arquivoMini() })
    const carga = await b.abrir()
    await renomearProcesso(carga, 'Alterado na demo')
    const semRede = () => Promise.reject(new TypeError('Failed to fetch'))
    await expect(resetar(carga, { ...b.deps, baixar: semRede })).rejects.toBeInstanceOf(ErroCarga)
    expect(await nomeDoProcesso(carga)).toBe('Alterado na demo')
  })
})

describe('CAR-06 · conversão de datas relativas', () => {
  it('"@-12" e "@-3T14:22" com hoje = 2026-11-07, em qualquer profundidade', () => {
    const seed = { a: '@-12', b: [{ c: '@-3T14:22' }], d: '@+0', e: 3, f: null, g: true }
    expect(resolverDatas(seed, HOJE)).toEqual({
      a: '2026-10-26',
      b: [{ c: '2026-11-04T14:22' }],
      d: '2026-11-07',
      e: 3,
      f: null,
      g: true,
    })
  })
})

describe('CAR-07 · strings parecidas não convertidas', () => {
  it.each(['@abc', 'email@x', '@12', 'x@-12', '@-12 ', '@-3T1:22', '@-3T14:22:00', '@+1d'])(
    '%s fica igual',
    (texto) => {
      expect(resolverDatas({ texto }, HOJE)).toEqual({ texto })
    },
  )
})

describe('CAR-08 · seed inválido', () => {
  const invalido = () => {
    const seed = arquivoMini()
    const credor = seed.tabelas.credores[3]
    if (credor) credor.documento = '12345678900'
    return seed
  }

  it('primeira visita: rejeita com ErroCarga, sem nada gravado nem marcador', async () => {
    const b = navegador({ seed: invalido() })
    await expect(b.abrir()).rejects.toThrow(ErroCarga)
    expect(b.localStorage.getItem(CHAVE_VERSAO)).toBeNull()
    const banco = await b.deps.banco.abrir()
    abertos.push(banco)
    expect(await banco.todos('credores')).toEqual([])
  })

  it('versão nova inválida: o banco anterior fica inteiro e a próxima abertura tenta de novo', async () => {
    const servidor: { seed: unknown; versao?: string } = { seed: arquivoMini() }
    const b = navegador(servidor)
    await renomearProcesso(await b.abrir(), 'Alterado na demo')
    servidor.seed = invalido()
    servidor.versao = 'versao-nova'

    await expect(b.abrir()).rejects.toThrow(ErroCarga)
    const banco = await b.deps.banco.abrir()
    abertos.push(banco)
    expect(await banco.todos('credores')).toHaveLength(seedMini().credores.length)
    expect(b.localStorage.getItem(CHAVE_VERSAO)).toBe(marcadorDeVersao('aaaaaaaaaaaa'))
  })

  it.each([
    ['sem tabelas', { versao: 'x' }],
    ['tabela faltando', { versao: 'x', tabelas: { escritorios: [] } }],
    ['não é JSON de seed', 'texto'],
  ])('%s', async (_caso, seed) => {
    const b = navegador({ seed, versao: 'x' })
    await expect(b.abrir()).rejects.toThrow(ErroCarga)
  })

  it('a gravação falha no meio: a transação desfaz tudo (sem banco pela metade)', async () => {
    const b = navegador({ seed: arquivoMini() })
    const carga = await b.abrir()
    await renomearProcesso(carga, 'Alterado na demo')
    const quebrado = comFalhaEm(carga.armazenamento, 'put', 'logs')
    await expect(resetar({ armazenamento: quebrado, modoMemoria: false }, b.deps)).rejects.toThrow(
      ErroCarga,
    )
    expect(await nomeDoProcesso(carga)).toBe('Alterado na demo')
    expect(await carga.armazenamento.todos('credores')).toHaveLength(seedMini().credores.length)
  })
})

describe('CAR-09 · falha de rede', () => {
  it.each(['seed-versao.json', 'seed.json'])(
    'sem %s: ErroCarga; "Tentar de novo" carrega',
    async (arquivo) => {
      const b = navegador({ seed: arquivoMini() })
      const baixar: DependenciasCarga['baixar'] = (nome) =>
        nome === arquivo ? Promise.reject(new TypeError('Failed to fetch')) : b.deps.baixar(nome)
      await expect(b.abrir({ baixar })).rejects.toThrow(ErroCarga)
      expect(b.localStorage.getItem(CHAVE_VERSAO)).toBeNull()

      const carga = await b.abrir()
      expect(carga).toMatchObject({ avisoVersao: false, modoMemoria: false })
    },
  )
})

describe('CAR-10 · sem IndexedDB usa memória', () => {
  it('Node não tem indexedDB: o Dexie não abre e a carga vai para a memória', async () => {
    const b = navegador({ seed: arquivoMini() })
    const carga = await b.abrir({ banco: bancoDexie() })
    expect(carga).toMatchObject({ avisoVersao: false, modoMemoria: true })
    expect(carga.armazenamento).toBeInstanceOf(ArmazenamentoMemoria)
    expect(await carga.armazenamento.todos('credores')).toHaveLength(seedMini().credores.length)
    // Nada persistiu: o marcador não pode dizer que o banco está carregado.
    expect(b.localStorage.getItem(CHAVE_VERSAO)).toBeNull()
  })

  it('banco abre mas não grava: também memória', async () => {
    const b = navegador({ seed: arquivoMini() })
    const armazenamento = new ArmazenamentoMemoria()
    const banco: Banco = {
      apagar: async () => {},
      abrir: async () => comFalhaEm(armazenamento, 'put', 'escritorios'),
    }
    expect((await b.abrir({ banco })).modoMemoria).toBe(true)
  })

  it('versão igual mas o banco não lê mais: recria o banco em vez de travar na tela de erro', async () => {
    const b = navegador({ seed: arquivoMini() })
    await b.abrir()
    const real = b.deps.banco
    let aberturas = 0
    const banco: Banco = {
      apagar: () => real.apagar(),
      abrir: async () => {
        const armazenamento = await real.abrir()
        abertos.push(armazenamento)
        aberturas++
        if (aberturas > 1) return armazenamento
        return {
          ...comFalhaEm(armazenamento, 'put', 'escritorios'),
          todos: () => Promise.reject(new Error('UnknownError')),
        }
      },
    }
    const carga = await b.abrir({ banco })
    expect(carga).toMatchObject({ avisoVersao: false, modoMemoria: false })
    expect(aberturas).toBe(2)
    expect(b.baixados).toEqual(['seed-versao.json', 'seed.json'])
    expect(await carga.armazenamento.todos('escritorios')).toHaveLength(1)
  })

  it('versão igual mas o banco não abre mais: memória com o seed', async () => {
    const b = navegador({ seed: arquivoMini() })
    await b.abrir()
    const banco: Banco = {
      abrir: () => Promise.reject(new Error('MissingAPIError')),
      apagar: () => Promise.reject(new Error('MissingAPIError')),
    }
    const carga = await b.abrir({ banco })
    expect(carga.modoMemoria).toBe(true)
    expect(await carga.armazenamento.todos('escritorios')).toHaveLength(1)
  })
})

describe('CAR-11 · cota cheia (no armazenamento; a tela do anexo é da DMO-20)', () => {
  const cota = () => new DOMException('cheio', 'QuotaExceededError')

  it('reconhece o erro de cota, direto ou embrulhado pelo Dexie', () => {
    expect(ehErroDeCota(cota())).toBe(true)
    expect(ehErroDeCota({ name: 'AbortError', inner: cota() })).toBe(true)
    expect(ehErroDeCota({ name: 'QuotaExceededError', message: 'Dexie' })).toBe(true)
    expect(ehErroDeCota(new Error('outra'))).toBe(false)
    expect(ehErroDeCota(new DOMException('x', 'AbortError'))).toBe(false)
    expect(ehErroDeCota(undefined)).toBe(false)
  })

  it('só a operação que estourou falha; o resto continua no IndexedDB', async () => {
    const b = navegador({ seed: arquivoMini() })
    const carga = await b.abrir()
    const { armazenamento } = carga
    const logsAntes = (await armazenamento.todos('logs')).length

    const erro = await armazenamento
      .transacao(['arquivos', 'logs'], async () => {
        await armazenamento.put('logs', { id: 'log-novo' })
        throw cota()
      })
      .catch((e: unknown) => e)

    expect(ehErroDeCota(erro)).toBe(true)
    expect(await armazenamento.todos('logs')).toHaveLength(logsAntes)
    expect(await armazenamento.todos('arquivos')).toEqual([])
    expect(await armazenamento.todos('credores')).toHaveLength(seedMini().credores.length)
    // Segue no mesmo banco, sem trocar para a memória.
    await renomearProcesso(carga, 'Gravou depois')
    expect(await nomeDoProcesso(await b.abrir())).toBe('Gravou depois')
  })
})

describe('CAR-12 · sem localStorage', () => {
  it.each([
    ['indisponível', () => null],
    [
      'que lança ao ler',
      () =>
        ({
          getItem: () => {
            throw new DOMException('bloqueado', 'SecurityError')
          },
          setItem: () => {
            throw new DOMException('bloqueado', 'SecurityError')
          },
        }) as unknown as Storage,
    ],
  ])('%s: recarrega o seed a cada abertura, sem aviso de versão', async (_caso, localStorage) => {
    const b = navegador({ seed: arquivoMini() })
    const primeira = await b.abrir({ localStorage })
    expect(b.baixados).toEqual(['seed-versao.json', 'seed.json'])
    await renomearProcesso(primeira, 'Alterado na demo')

    const segunda = await b.abrir({ localStorage })
    expect(b.baixados).toEqual(['seed-versao.json', 'seed.json'])
    expect(segunda).toMatchObject({ avisoVersao: false, modoMemoria: false })
    expect(await nomeDoProcesso(segunda)).toBe(seedMini().processos[0]?.apelido)
  })
})

describe('T-34 · RMA aberto vence no dia 15 em qualquer "hoje", sem mudar de situação', () => {
  let seed: ArquivoSeed
  beforeAll(() => {
    seed = gerarSeed()
  })

  const situacoes = (prazos: Tipos['prazos'][], hoje: string) =>
    prazos
      .filter((p) => ehRma(p) && p.status === 'aberto')
      .map((p) => [p.processoId, p.vencimento < hoje ? 'vencido' : 'em dia'])
      .sort()

  it('na data-base do seed, o recálculo não muda nada', () => {
    const tabelas = resolverDatas(seed.tabelas, HOJE)
    expect(recalcularRmas(tabelas.prazos, HOJE)).toEqual(tabelas.prazos)
  })

  it.each(['2026-11-06', '2026-11-15', '2026-11-20', '2026-12-01', '2027-02-28', '2028-02-29'])(
    'com hoje = %s, todo RMA aberto vence num dia 15 e cada um mantém a situação da data-base',
    (hoje) => {
      const { tabelas } = prepararSeed(structuredClone(seed), hoje)
      const rmas = tabelas.prazos.filter(ehRma)
      const abertos = rmas.filter((p) => p.status === 'aberto')
      expect(abertos.length).toBeGreaterThan(0)
      for (const rma of abertos) {
        expect(rma.vencimento.slice(8), rma.id).toBe('15')
        // O aberto continua depois de todo cumprido do processo.
        for (const cumprido of rmas.filter(
          (p) => p.processoId === rma.processoId && p.status === 'cumprido',
        )) {
          expect(cumprido.vencimento < rma.vencimento, rma.id).toBe(true)
        }
      }
      // Mesma situação (em dia ou vencido) de cada RJ que na data-base: a vitrine continua
      // com exatamente as RJs de RMA vencido que o gerador projetou (SED-05).
      const naBase = resolverDatas(seed.tabelas, HOJE).prazos
      expect(situacoes(tabelas.prazos, hoje)).toEqual(situacoes(naBase, HOJE))
      // Só os RMAs abertos mudam: o resto acompanha o deslocamento do T-24.
      const semRecalculo = resolverDatas(seed.tabelas, hoje).prazos
      const outros = (lista: typeof semRecalculo) =>
        lista.filter((p) => !(ehRma(p) && p.status === 'aberto'))
      expect(outros(tabelas.prazos)).toEqual(outros(semRecalculo))
    },
  )

  it('em dia vai para o primeiro dia 15 a partir de hoje; vencido, para o último antes de hoje', () => {
    const registro = (id: string, vencimento: string, origem: 'automatico' | 'manual') => ({
      id,
      escritorioId: 'esc-1',
      criadoEm: '2026-11-20T10:00',
      atualizadoEm: '2026-11-20T10:00',
      processoId: 'prc-1',
      titulo: 'Relatório mensal de atividades (RMA)',
      origem,
      status: 'aberto' as const,
      vencimento,
    })
    const prazos: Tipos['prazos'][] = [
      registro('prz-1', '2026-11-28', 'automatico'),
      registro('prz-2', '2026-11-03', 'automatico'),
      registro('prz-3', '2026-12-28', 'manual'),
    ]
    expect(recalcularRmas(prazos, '2026-11-20').map((p) => p.vencimento)).toEqual([
      '2026-12-15',
      '2026-11-15',
      '2026-12-28',
    ])
    // Hoje no dia 15: em dia vence hoje; vencido vai para o dia 15 do mês anterior.
    expect(recalcularRmas(prazos, '2026-11-15').map((p) => p.vencimento)).toEqual([
      '2026-11-15',
      '2026-10-15',
      '2026-12-28',
    ])
  })

  it('o seed completo carrega no armazenamento numa outra data', async () => {
    const b = navegador({ seed })
    const carga = await b.abrir({ hoje: () => '2027-01-22' })
    const prazos = await carga.armazenamento.todos<Tipos['prazos']>('prazos')
    const abertos = prazos.filter((p) => ehRma(p) && p.status === 'aberto')
    expect(abertos.length).toBeGreaterThan(0)
    for (const rma of abertos) expect(rma.vencimento.endsWith('-15')).toBe(true)
  })
})
