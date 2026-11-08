// Rótulos da tabela papel × permissões (RF-39). Os níveis vêm de `PERMISSOES` (regras/permissoes):
// aqui só o texto de cada módulo e de cada nível, para a tela de usuários e o filtro de logs.
import type { Modulo, Nivel } from '../../regras/permissoes'
import type { TomSelo } from '../../ui/Selo'

export const ROTULOS_MODULO: Readonly<Record<Modulo, string>> = {
  dashboard: 'Início, busca e consultas',
  processos: 'Processos',
  empresas: 'Empresas',
  informes: 'Informes',
  prazos: 'Prazos',
  credores: 'Credores e pedidos de crédito',
  agc: 'AGC',
  usuarios: 'Usuários',
  logs: 'Logs (tela de logs, aba Histórico e atividade recente)',
}

export const ROTULOS_NIVEL: Readonly<Record<Nivel, string>> = {
  editar: 'Editar',
  ler: 'Ler',
  nenhum: 'Sem acesso',
}

export const TONS_NIVEL: Readonly<Record<Nivel, TomSelo>> = {
  editar: 'sucesso',
  ler: 'azul',
  nenhum: 'neutro',
}
