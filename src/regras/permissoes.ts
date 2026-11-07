// Permissões por papel (RF-39, T-13, INV-02). Aplicadas na tela, na rota e no repositório.

export const PAPEIS = ['aj', 'advogado', 'analista'] as const
export type Papel = (typeof PAPEIS)[number]

export const ACOES = ['ler', 'editar'] as const
export type Acao = (typeof ACOES)[number]

/**
 * Módulos da tabela do RF-39. `dashboard` cobre dashboard, busca e consultas; `credores` cobre
 * também os pedidos de crédito; `logs` cobre a tela de logs, a aba Histórico e a atividade
 * recente (o log é gravado pelo repositório junto com a gravação, não por "editar logs").
 */
export const MODULOS = [
  'dashboard',
  'processos',
  'empresas',
  'informes',
  'prazos',
  'credores',
  'agc',
  'usuarios',
  'logs',
] as const
export type Modulo = (typeof MODULOS)[number]

/** Nível de acesso: `nenhum` (—), `ler` ou `editar` (que inclui ler). */
export type Nivel = 'nenhum' | 'ler' | 'editar'

/** Tabela do RF-39, módulo × papel. */
export const PERMISSOES: Readonly<Record<Modulo, Readonly<Record<Papel, Nivel>>>> = {
  dashboard: { aj: 'ler', advogado: 'ler', analista: 'ler' },
  processos: { aj: 'editar', advogado: 'editar', analista: 'ler' },
  empresas: { aj: 'editar', advogado: 'editar', analista: 'ler' },
  informes: { aj: 'editar', advogado: 'editar', analista: 'ler' },
  prazos: { aj: 'editar', advogado: 'editar', analista: 'ler' },
  credores: { aj: 'editar', advogado: 'editar', analista: 'editar' },
  agc: { aj: 'editar', advogado: 'editar', analista: 'ler' },
  usuarios: { aj: 'editar', advogado: 'ler', analista: 'nenhum' },
  logs: { aj: 'ler', advogado: 'ler', analista: 'ler' },
}

export function pode(papel: Papel, acao: Acao, modulo: Modulo): boolean {
  // Papel ou módulo fora da tabela (ex.: sessão adulterada) nega tudo.
  const nivel = PERMISSOES[modulo]?.[papel]
  if (acao === 'editar') return nivel === 'editar'
  return nivel === 'ler' || nivel === 'editar'
}
