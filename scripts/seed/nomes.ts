// Nomes inventados à mão (T-07, RF-47): escritório, equipe e credores institucionais (devedoras
// em processos.ts). Todos obviamente fictícios; pessoas e empresas comuns vêm do faker (gerar.ts).
import type { Papel } from '../../src/regras/permissoes'

export const ESCRITORIO = { id: 'esc-001', nome: 'Vértice Administração Judicial' } as const

export const DOMINIO = 'vertice-aj.example'

export interface UsuarioDoSeed {
  id: string
  nome: string
  email: string
  papel: Papel
}

/** 2 AJs, 2 advogados, 2 analistas (RF-46). O primeiro de cada papel aparece no login. */
export const USUARIOS: readonly UsuarioDoSeed[] = [
  { id: 'usr-01', nome: 'Helena Prado', email: `helena.prado@${DOMINIO}`, papel: 'aj' },
  { id: 'usr-02', nome: 'Rodrigo Vasconcelos', email: `rodrigo@${DOMINIO}`, papel: 'aj' },
  { id: 'usr-03', nome: 'Otávio Reis', email: `otavio.reis@${DOMINIO}`, papel: 'advogado' },
  { id: 'usr-04', nome: 'Marina Albuquerque', email: `marina@${DOMINIO}`, papel: 'advogado' },
  { id: 'usr-05', nome: 'Lia Campos', email: `lia.campos@${DOMINIO}`, papel: 'analista' },
  { id: 'usr-06', nome: 'Caio Fernandes', email: `caio@${DOMINIO}`, papel: 'analista' },
]

/** Bancos e cooperativas fictícios: credores com garantia real e de juros na falência. */
export const BANCOS = [
  'Banco Ipê Amarelo S.A.',
  'Banco Cajuína S.A.',
  'Banco Araucária Dourada S.A.',
  'Banco Seriema de Investimentos S.A.',
  'Cooperativa de Crédito Vale do Mandacaru',
  'Banco Maré Alta S.A.',
] as const

/** Credores não sujeitos (art. 49, §3º, C-07), com a natureza de cada um. */
export const NAO_SUJEITOS = [
  { nome: 'Financeira Pitanga S.A.', natureza: 'Alienação fiduciária' },
  { nome: 'Arrendadora Guará Leasing S.A.', natureza: 'Arrendamento mercantil' },
  { nome: 'Máquinas Jacarandá Ltda.', natureza: 'Compra e venda com reserva de domínio' },
  { nome: 'Fomento Carcará S.A.', natureza: 'Cessão fiduciária de recebíveis' },
] as const

/** Credores tributários da falência (art. 83, III), genéricos. */
export const FISCOS = ['Fazenda Nacional', 'Fazenda Estadual', 'Fazenda Municipal'] as const

/** Extraconcursais (art. 84), genéricos. */
export const EXTRACONCURSAIS = [
  { nome: 'Leilões Lua Cheia Ltda.', natureza: 'Despesas com a arrecadação e a venda de bens' },
  { nome: 'Vigilância Coruja Ltda.', natureza: 'Serviços prestados à massa falida' },
  { nome: 'Transportes Pé-de-Vento Ltda.', natureza: 'Remoção e guarda de bens' },
] as const
