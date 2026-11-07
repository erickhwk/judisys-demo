// Peças das telas de empresas (DMO-13): CSV (RF-44) e valores do formulário (RF-16).
import { describe, expect, it } from 'vitest'
import { camposEmpresa } from '../../dados/schemas'
import { gerarCsv, nomeArquivoCsv } from '../../regras/csv'
import { COLUNAS_CSV_EMPRESAS, EMPRESA_EM_BRANCO, type Empresa, valoresDaEmpresa } from './empresas'

const EMPRESA: Empresa = {
  id: 'emp-001',
  escritorioId: 'esc-001',
  criadoEm: '2026-11-01T10:00:00',
  atualizadoEm: '2026-11-01T10:00:00',
  razaoSocial: 'Lontra Azul; "Alimentos" Ltda.',
  nomeFantasia: 'Lontra Azul',
  cnpj: '06682973000134',
  porte: 'epp',
  cidade: 'Campinas',
  uf: 'SP',
  cnae: '1091-1/01',
}

describe('empresas', () => {
  it('CSV-01 · CSV de empresas com BOM, `;`, CNPJ com pontuação e porte por extenso', () => {
    const csv = gerarCsv(COLUNAS_CSV_EMPRESAS, [EMPRESA])
    expect(csv.startsWith('﻿')).toBe(true)
    const [cabecalho, linha] = csv.slice(1).split('\r\n')
    expect(cabecalho).toBe('Razão social;Nome fantasia;CNPJ;Porte;Cidade;UF;CNAE')
    // CSV-03 e CSV-04: escape e zero à esquerda preservado.
    expect(linha).toBe(
      '"Lontra Azul; ""Alimentos"" Ltda.";Lontra Azul;06.682.973/0001-34;EPP;Campinas;SP;1091-1/01',
    )
    expect(nomeArquivoCsv('empresas', '2026-11-07')).toBe('judisys-empresas-2026-11-07.csv')
  })

  it('na edição, o CNPJ aparece com pontuação e volta só com dígitos ao gravar', () => {
    const valores = valoresDaEmpresa(EMPRESA)
    expect(valores.cnpj).toBe('06.682.973/0001-34')
    expect(camposEmpresa.parse(valores).cnpj).toBe('06682973000134')
  })

  it('CNPJ inválido recusado pelo schema do formulário', () => {
    const resultado = camposEmpresa.safeParse({
      ...EMPRESA_EM_BRANCO,
      razaoSocial: 'Empresa Teste Ltda.',
      cidade: 'Campinas',
      uf: 'SP',
      cnpj: '12.345.678/0001-00',
    })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['cnpj', 'CNPJ inválido'],
    ])
  })
})
