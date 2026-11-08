// Montagem guardada por usuário (SDD-INI §5.5, MNT-02 a MNT-07). O localStorage é simulado por um
// mapa; o "navegador" do MNT-07 usa fake-indexeddb, como os testes da carga.
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { relativizar } from '../../../scripts/seed/datas'
import { seedMini } from '../../../tests/fixtures/seed-mini'
import { resetarDadosDaDemo } from '../../dados/boot'
import {
  bancoDexie,
  carregar,
  type DependenciasCarga,
  type ResultadoCarga,
} from '../../dados/carga'
import { ArmazenamentoDexie } from '../../dados/dexie'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { type Montagem, PADROES, padraoDoPapel } from './montagem'
import {
  apagarMontagens,
  chaveDaMontagem,
  gravarMontagem,
  lerMontagem,
  PREFIXO_MONTAGEM,
} from './persistencia'

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

const MINHA: Montagem = [
  { quadro: 'carteira', x: 0, y: 0 },
  { quadro: 'prazos', x: 3, y: 1 },
]

let storage: StorageFalso
const fonte = () => storage

beforeEach(() => {
  storage = new StorageFalso()
  // Zera a cópia da aba entre os testes.
  apagarMontagens(() => null)
})

describe('lerMontagem e gravarMontagem', () => {
  it('sem montagem salva, o padrão do papel (RF-26)', () => {
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual(PADROES.aj)
  })

  it('grava na chave do usuário, versionada, e lê de volta; outro usuário não vê (RF-24)', () => {
    gravarMontagem('usr-1', MINHA, fonte)
    expect(JSON.parse(storage.getItem('judisys:inicio:usr-1') ?? '')).toEqual({
      versao: 1,
      itens: MINHA,
    })
    apagarMontagens(() => null) // simula recarregar a aba: só o localStorage fica
    expect(lerMontagem('usr-1', 'advogado', fonte)).toEqual(MINHA)
    expect(lerMontagem('usr-2', 'aj', fonte)).toEqual(PADROES.aj)
  })

  it.each([
    ['JSON quebrado', '{"versao":1,"itens":['],
    ['outro formato', '[{"quadro":"prazos","x":0,"y":0}]'],
    ['versão desconhecida', '{"versao":2,"itens":[{"quadro":"prazos","x":0,"y":0}]}'],
    ['coordenada inválida', '{"versao":1,"itens":[{"quadro":"prazos","x":-1,"y":0.5}]}'],
    ['linha absurda', '{"versao":1,"itens":[{"quadro":"agc","x":0,"y":1000000000}]}'],
  ])('MNT-03 · %s vira o padrão do papel, sem lançar', (_caso, valor) => {
    storage.setItem(chaveDaMontagem('usr-1'), valor)
    expect(lerMontagem('usr-1', 'analista', fonte)).toEqual(padraoDoPapel('analista'))
  })

  it('MNT-04 · quadro inexistente na montagem salva é ignorado', () => {
    storage.setItem(
      chaveDaMontagem('usr-1'),
      JSON.stringify({ versao: 1, itens: [{ quadro: 'velho', x: 0, y: 0 }, ...MINHA] }),
    )
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual(MINHA)
  })

  it('MNT-08 · montagem salva com todos os quadros descartados vira o padrão do papel', () => {
    storage.setItem(
      chaveDaMontagem('usr-1'),
      JSON.stringify({ versao: 1, itens: [{ quadro: 'velho', x: 0, y: 0 }] }),
    )
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual(padraoDoPapel('aj'))
  })

  it('MNT-08 · montagem salva vazia de propósito (PRS-11) continua vazia', () => {
    gravarMontagem('usr-1', [], fonte)
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual([])
  })

  it('MNT-05 · a montagem lida passa pelo normalizar', () => {
    storage.setItem(
      chaveDaMontagem('usr-1'),
      JSON.stringify({
        versao: 1,
        itens: [
          { quadro: 'prazos', x: 0, y: 0 },
          { quadro: 'agc', x: 0, y: 0 },
        ],
      }),
    )
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual([
      { quadro: 'prazos', x: 0, y: 0 },
      { quadro: 'agc', x: 1, y: 0 },
    ])
  })

  it('gravação que deu certo não fica na cópia da aba: o reset feito noutra aba vale aqui', () => {
    gravarMontagem('usr-1', MINHA, fonte)
    storage.removeItem(chaveDaMontagem('usr-1')) // outra aba resetou a demo
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual(PADROES.aj)
  })

  it.each([
    ['indisponível', () => null],
    [
      'que lança',
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
  ])('MNT-06 · sem localStorage (%s), grava e lê em memória, sem erro', (_caso, semStorage) => {
    expect(() => gravarMontagem('usr-1', MINHA, semStorage)).not.toThrow()
    expect(lerMontagem('usr-1', 'aj', semStorage)).toEqual(MINHA)
    expect(lerMontagem('usr-2', 'aj', semStorage)).toEqual(PADROES.aj)
    // Recarregar a aba perde a cópia: volta o padrão.
    apagarMontagens(semStorage)
    expect(lerMontagem('usr-1', 'aj', semStorage)).toEqual(PADROES.aj)
  })
})

describe('apagarMontagens', () => {
  it('MNT-02 · apaga toda chave judisys:inicio:, e só elas', () => {
    gravarMontagem('usr-1', MINHA, fonte)
    gravarMontagem('usr-2', MINHA, fonte)
    storage.setItem('judisys:versao', '1:abc')
    storage.setItem('tema', 'dark')

    apagarMontagens(fonte)

    const chaves = Array.from({ length: storage.length }, (_, i) => storage.key(i))
    expect(chaves.filter((c) => c?.startsWith(PREFIXO_MONTAGEM))).toEqual([])
    expect(chaves.sort()).toEqual(['judisys:versao', 'tema'])
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual(PADROES.aj)
  })
})

describe('resetarDadosDaDemo (resetarDemo do boot)', () => {
  const carga: ResultadoCarga = {
    armazenamento: new ArmazenamentoMemoria(),
    avisoVersao: false,
    modoMemoria: false,
  }

  it('MNT-02 · depois de o reset dar certo, apaga as montagens', async () => {
    gravarMontagem('usr-1', MINHA, fonte)
    const ordem: string[] = []
    await resetarDadosDaDemo(carga, {
      resetar: async () => {
        ordem.push('resetar')
      },
      apagarMontagens: () => {
        ordem.push('apagar')
        apagarMontagens(fonte)
      },
    })
    expect(ordem).toEqual(['resetar', 'apagar'])
    expect(storage.getItem(chaveDaMontagem('usr-1'))).toBeNull()
  })

  it('se o reset falha, as montagens ficam', async () => {
    gravarMontagem('usr-1', MINHA, fonte)
    const apagar = vi.fn()
    await expect(
      resetarDadosDaDemo(carga, {
        resetar: async () => {
          throw new Error('rede')
        },
        apagarMontagens: apagar,
      }),
    ).rejects.toThrow('rede')
    expect(apagar).not.toHaveBeenCalled()
    expect(storage.getItem(chaveDaMontagem('usr-1'))).not.toBeNull()
  })
})

describe('MNT-07 · mudança de versão do seed', () => {
  it('a carga com versão nova não apaga a montagem', async () => {
    const idb = new IDBFactory()
    let versao = 'aaaaaaaaaaaa'
    const deps: DependenciasCarga = {
      hoje: () => '2026-11-07',
      baixar: async (arquivo) =>
        arquivo === 'seed-versao.json' ? { versao } : { versao, tabelas: relativizar(seedMini()) },
      localStorage: fonte,
      banco: bancoDexie({ indexedDB: idb, IDBKeyRange }),
    }
    const primeira = await carregar(deps)
    gravarMontagem('usr-1', MINHA, fonte)

    versao = 'bbbbbbbbbbbb'
    const segunda = await carregar(deps)
    expect(segunda.avisoVersao).toBe(true)

    apagarMontagens(() => null) // a aba recarregou: só o localStorage conta
    expect(lerMontagem('usr-1', 'aj', fonte)).toEqual(MINHA)
    for (const carga of [primeira, segunda]) {
      if (carga.armazenamento instanceof ArmazenamentoDexie) carga.armazenamento.fechar()
    }
  })
})
