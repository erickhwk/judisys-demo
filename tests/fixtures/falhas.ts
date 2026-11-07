// Armazenamento que falha de propósito, para ver uma transação desfazer o que já gravou (INV-01).
import type { Armazenamento, Tabela } from '../../src/dados/armazenamento'

/** Delega tudo a `armazenamento`, mas `put` ou `delete` em `tabela` rejeitam. */
export function comFalhaEm(
  armazenamento: Armazenamento,
  operacao: 'put' | 'delete',
  tabela: Tabela,
): Armazenamento {
  const falha = () => Promise.reject(new Error('falha simulada'))
  return {
    get: (t, id) => armazenamento.get(t, id),
    put: (t, registro) =>
      operacao === 'put' && t === tabela ? falha() : armazenamento.put(t, registro),
    delete: (t, id) =>
      operacao === 'delete' && t === tabela ? falha() : armazenamento.delete(t, id),
    porIndice: (t, indice, valor) => armazenamento.porIndice(t, indice, valor),
    todos: (t) => armazenamento.todos(t),
    transacao: (tabelas, fn) => armazenamento.transacao(tabelas, fn),
    limpar: () => armazenamento.limpar(),
  }
}
