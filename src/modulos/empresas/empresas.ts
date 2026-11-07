// Peças puras das telas de empresas (RF-16, RF-17): rótulos, UFs, colunas do CSV (RF-44) e a
// conversão entre o registro e os valores do formulário.
import type { z } from 'zod'
import type { camposEmpresa, Tipos } from '../../dados/schemas'
import type { ColunaCsv } from '../../regras/csv'
import { formatarCnpj } from '../../regras/documentos'
import { ROTULOS_PORTE } from '../../regras/empresas'

export type Empresa = Tipos['empresas']

/** Colunas do CSV de empresas (RF-44): CNPJ com pontuação, para o Excel não perder zeros. */
export const COLUNAS_CSV_EMPRESAS: ColunaCsv<Empresa>[] = [
  { titulo: 'Razão social', valor: (e) => e.razaoSocial },
  { titulo: 'Nome fantasia', valor: (e) => e.nomeFantasia },
  { titulo: 'CNPJ', valor: (e) => e.cnpj, formato: 'documento' },
  { titulo: 'Porte', valor: (e) => ROTULOS_PORTE[e.porte] },
  { titulo: 'Cidade', valor: (e) => e.cidade },
  { titulo: 'UF', valor: (e) => e.uf },
  { titulo: 'CNAE', valor: (e) => e.cnae },
]

/** Valores do formulário (entrada do schema): CNPJ com ou sem pontuação. */
export type ValoresEmpresa = z.input<typeof camposEmpresa>

/** O que o formulário entrega ao repositório (CNPJ só com dígitos). */
export type DadosEmpresa = z.output<typeof camposEmpresa>

export const EMPRESA_EM_BRANCO: ValoresEmpresa = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  porte: 'demais',
  cidade: '',
  uf: '',
  cnae: '',
}

export function valoresDaEmpresa(empresa: Empresa): ValoresEmpresa {
  return {
    razaoSocial: empresa.razaoSocial,
    nomeFantasia: empresa.nomeFantasia,
    cnpj: formatarCnpj(empresa.cnpj),
    porte: empresa.porte,
    cidade: empresa.cidade,
    uf: empresa.uf,
    cnae: empresa.cnae,
  }
}
