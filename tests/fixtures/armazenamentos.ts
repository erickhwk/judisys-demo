// As duas implementações de Armazenamento, para as suítes com `describe.each` (SDD §10).
// Cada chamada devolve um armazenamento vazio e isolado: o Dexie ganha um IDBFactory novo.
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import type { Armazenamento } from '../../src/dados/armazenamento'
import { ArmazenamentoDexie } from '../../src/dados/dexie'
import { ArmazenamentoMemoria } from '../../src/dados/memoria'

export const IMPLEMENTACOES: [string, () => Armazenamento][] = [
  ['ArmazenamentoMemoria', () => new ArmazenamentoMemoria()],
  [
    'ArmazenamentoDexie',
    () => new ArmazenamentoDexie('judisys-teste', { indexedDB: new IDBFactory(), IDBKeyRange }),
  ],
]
