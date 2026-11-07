// Armazenamento sobre o IndexedDB com Dexie (T-01, T-20). Dexie só é usado dentro de src/dados/.
import Dexie, { type DexieOptions, type IndexableType } from 'dexie'
import { type Armazenamento, type Id, INDICES, TABELAS, type Tabela } from './armazenamento'

/** Versão do schema do IndexedDB; entra no marcador de versão gravado no navegador (T-18). */
export const VERSAO_SCHEMA = 1

export const NOME_BANCO = 'judisys'

export class ArmazenamentoDexie implements Armazenamento {
  readonly db: Dexie

  /** `opcoes` aceita `indexedDB` e `IDBKeyRange` próprios (testes com `fake-indexeddb`). */
  constructor(nome = NOME_BANCO, opcoes?: DexieOptions) {
    this.db = new Dexie(nome, opcoes)
    this.db.version(VERSAO_SCHEMA).stores(INDICES)
  }

  get<T>(tabela: Tabela, id: Id): Promise<T | undefined> {
    return this.db.table<T, Id>(tabela).get(id)
  }

  async put<T>(tabela: Tabela, registro: T): Promise<void> {
    await this.db.table<T, Id>(tabela).put(registro)
  }

  delete(tabela: Tabela, id: Id): Promise<void> {
    return this.db.table(tabela).delete(id)
  }

  porIndice<T>(tabela: Tabela, indice: string, valor: unknown): Promise<T[]> {
    // `equals` ordena pelo índice e depois pela chave; como o índice é igual, fica pela chave.
    return this.db
      .table<T, Id>(tabela)
      .where(indice)
      .equals(valor as IndexableType)
      .toArray()
  }

  todos<T>(tabela: Tabela): Promise<T[]> {
    return this.db.table<T, Id>(tabela).toArray()
  }

  transacao<R>(tabelas: Tabela[], fn: () => Promise<R>): Promise<R> {
    return this.db.transaction('rw', tabelas, fn)
  }

  async limpar(): Promise<void> {
    await this.db.transaction('rw', TABELAS, () =>
      Promise.all(TABELAS.map((tabela) => this.db.table(tabela).clear())),
    )
  }

  fechar(): void {
    this.db.close()
  }
}
