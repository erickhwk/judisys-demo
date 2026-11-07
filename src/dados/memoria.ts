// Armazenamento em memória com o mesmo contrato do Dexie (T-20): usado nos testes e quando o
// IndexedDB não abre (PRD §13, CAR-10). Os registros são copiados na entrada e na saída, como
// no IndexedDB, para que quem chama não altere o que está gravado sem passar por `put`.
import { type Armazenamento, type Id, indicesDe, TABELAS, type Tabela } from './armazenamento'

type Linha = Record<string, unknown>

function chaveDe(registro: Linha): Id {
  const id = registro.id
  if (typeof id !== 'string' || id === '') throw new Error('Registro sem id')
  return id
}

/** Ordem das chaves do IndexedDB para ids (strings): por unidade de código, não por locale. */
function porChave(a: Linha, b: Linha): number {
  const ia = chaveDe(a)
  const ib = chaveDe(b)
  return ia < ib ? -1 : ia > ib ? 1 : 0
}

function camposDoIndice(indice: string): string[] {
  return indice.startsWith('[') ? indice.slice(1, -1).split('+') : [indice]
}

export class ArmazenamentoMemoria implements Armazenamento {
  private tabelas = new Map<Tabela, Map<Id, Linha>>(TABELAS.map((t) => [t, new Map()]))
  private profundidade = 0

  private tabela(nome: Tabela): Map<Id, Linha> {
    const tabela = this.tabelas.get(nome)
    if (!tabela) throw new Error(`Tabela desconhecida: ${nome}`)
    return tabela
  }

  async get<T>(tabela: Tabela, id: Id): Promise<T | undefined> {
    const linha = this.tabela(tabela).get(id)
    return linha === undefined ? undefined : (structuredClone(linha) as T)
  }

  async put<T>(tabela: Tabela, registro: T): Promise<void> {
    const linha = structuredClone(registro) as Linha
    this.tabela(tabela).set(chaveDe(linha), linha)
  }

  async delete(tabela: Tabela, id: Id): Promise<void> {
    this.tabela(tabela).delete(id)
  }

  async porIndice<T>(tabela: Tabela, indice: string, valor: unknown): Promise<T[]> {
    // Mesmo erro de contrato do Dexie: só se consulta por índice declarado (SDD §5.4).
    if (!indicesDe(tabela).includes(indice)) {
      throw new Error(`Índice ${indice} não existe na tabela ${tabela}`)
    }
    const campos = camposDoIndice(indice)
    const valores = campos.length > 1 ? (valor as unknown[]) : [valor]
    return [...this.tabela(tabela).values()]
      .filter((linha) => campos.every((campo, i) => Object.is(linha[campo], valores[i])))
      .sort(porChave)
      .map((linha) => structuredClone(linha) as T)
  }

  async todos<T>(tabela: Tabela): Promise<T[]> {
    return [...this.tabela(tabela).values()]
      .sort(porChave)
      .map((linha) => structuredClone(linha) as T)
  }

  /**
   * Guarda uma cópia rasa de todas as tabelas (as linhas não mudam no lugar: `put` troca a
   * linha) e a devolve se `fn` rejeitar. Transação aninhada roda dentro da de fora, que cuida
   * do desfazer. Limitação: sem fila, duas transações concorrentes se misturam; na demo as
   * gravações vêm uma a uma da tela.
   */
  async transacao<R>(_tabelas: Tabela[], fn: () => Promise<R>): Promise<R> {
    if (this.profundidade > 0) return this.aninhada(fn)
    const copia = new Map([...this.tabelas].map(([nome, linhas]) => [nome, new Map(linhas)]))
    try {
      return await this.aninhada(fn)
    } catch (erro) {
      for (const [nome, linhas] of copia) this.tabelas.set(nome, linhas)
      throw erro
    }
  }

  private async aninhada<R>(fn: () => Promise<R>): Promise<R> {
    this.profundidade++
    try {
      return await fn()
    } finally {
      this.profundidade--
    }
  }

  async limpar(): Promise<void> {
    for (const tabela of this.tabelas.values()) tabela.clear()
  }
}
