// Nomes dos papéis na tela (RF-39) e a linha de cada cartão do login (RF-05).
import type { Papel } from '../../regras/permissoes'

export const NOMES_PAPEIS: Readonly<Record<Papel, string>> = {
  aj: 'Administrador(a) judicial',
  advogado: 'Advogado(a)',
  analista: 'Analista',
}

/** O que cada papel faz, numa linha (cartões "Entrar como…"). */
export const RESUMOS_PAPEIS: Readonly<Record<Papel, string>> = {
  aj: 'Edita tudo, inclusive os usuários do escritório.',
  advogado: 'Edita processos, credores, AGC e informes; consulta os usuários.',
  analista: 'Consulta processos e AGC; edita credores e pedidos de crédito.',
}
