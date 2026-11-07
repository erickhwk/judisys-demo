// Interface mínima de armazenamento (T-20, SDD §5.3). Repositórios e serviços são escritos uma
// vez sobre ela; as implementações são `ArmazenamentoDexie` (IndexedDB) e `ArmazenamentoMemoria`
// (testes e navegador sem IndexedDB, PRD §13).

export type Id = string

/** Ordem das chaves do IndexedDB para ids (strings): por unidade de código, não por locale. */
export function compararIds(a: Id, b: Id): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Índices de cada tabela, na sintaxe do Dexie; o primeiro é a chave (SDD §5.4). */
export const INDICES = {
  escritorios: 'id',
  usuarios: 'id, papel',
  empresas: 'id, cnpj',
  processos: 'id, tipo, faseAtual, responsavelId',
  processoEmpresas: 'id, processoId, empresaId',
  marcosDeFase: 'id, processoId',
  prazos: 'id, processoId, vencimento, status',
  credores: 'id, processoId, classe, documento',
  pedidosDeCredito: 'id, processoId, credorId, status',
  agcs: 'id, processoId, status',
  presencas: 'id, agcId, credorId, [agcId+credorId]',
  votos: 'id, agcId, credorId, [agcId+credorId]',
  informes: 'id, processoId, categoria, data',
  arquivos: 'id',
  logs: 'id, data, usuarioId, colecao, processoId',
} as const

export type Tabela = keyof typeof INDICES

export const TABELAS = Object.keys(INDICES) as Tabela[]

/**
 * Índices secundários da tabela, sem a chave. Composto vem como `[a+b]`; em `porIndice` o
 * valor dele é a lista dos valores na mesma ordem (`[agcId, credorId]`).
 */
export function indicesDe(tabela: Tabela): string[] {
  return INDICES[tabela]
    .split(',')
    .map((indice) => indice.trim())
    .slice(1)
}

export interface Armazenamento {
  get<T>(tabela: Tabela, id: Id): Promise<T | undefined>
  put<T>(tabela: Tabela, registro: T): Promise<void>
  delete(tabela: Tabela, id: Id): Promise<void>
  /** Registros cujo índice é igual a `valor`, ordenados pela chave. */
  porIndice<T>(tabela: Tabela, indice: string, valor: unknown): Promise<T[]>
  /** Todos os registros da tabela, ordenados pela chave. */
  todos<T>(tabela: Tabela): Promise<T[]>
  /**
   * Roda `fn` numa transação de leitura e escrita sobre `tabelas`: se `fn` rejeita, nada do que
   * ela gravou fica (INV-01). Dentro de `fn`, só operações deste armazenamento podem ser
   * aguardadas (regra do IndexedDB: esperar outra coisa encerra a transação).
   */
  transacao<R>(tabelas: Tabela[], fn: () => Promise<R>): Promise<R>
  /** Apaga os registros de todas as tabelas. */
  limpar(): Promise<void>
}
