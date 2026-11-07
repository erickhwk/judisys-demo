// Exportação CSV (RF-44, CSV-01 a CSV-04): UTF-8 com BOM e separador `;`, para abrir direto
// no Excel em pt-BR.
import { type DataIso, formatarCentavos, formatarData } from './datas'
import { formatarCnj, formatarDocumento } from './documentos'
import { normalizar } from './normalizar'

const BOM = '﻿'
const SEPARADOR = ';'
const QUEBRA = '\r\n'

/**
 * Como a célula é escrita:
 * - `texto` (padrão): como veio;
 * - `centavos`: inteiro em centavos → `1234,56`, sem separador de milhar;
 * - `data`: `aaaa-mm-dd` ou carimbo → `dd/mm/aaaa`;
 * - `documento`: CPF ou CNPJ com pontuação (preserva zeros à esquerda);
 * - `cnj`: número CNJ com pontuação.
 */
export type FormatoCelula = 'texto' | 'centavos' | 'data' | 'documento' | 'cnj'

export type Valor = string | number | boolean | null | undefined

export interface ColunaCsv<T> {
  titulo: string
  valor: (linha: T) => Valor
  formato?: FormatoCelula
}

/** Célula de valor monetário: 123456 → `1234,56` (CSV-02). */
export function celulaCentavos(centavos: number): string {
  return formatarCentavos(centavos, '')
}

function formatarCelula(valor: Valor, formato: FormatoCelula): string {
  if (valor === null || valor === undefined || valor === '') return ''
  if (formato === 'centavos' && typeof valor === 'number') return celulaCentavos(valor)
  const texto = String(valor)
  if (formato === 'data') return formatarData(texto)
  if (formato === 'documento') return formatarDocumento(texto)
  if (formato === 'cnj') return formatarCnj(texto)
  return texto
}

/** Campo com `;`, aspas ou quebra de linha vai entre aspas, com aspas internas duplicadas (CSV-03). */
export function escaparCelula(texto: string): string {
  return /[;"\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

/** Conteúdo do arquivo: BOM, cabeçalho e uma linha por item, com `\r\n` entre linhas. */
export function gerarCsv<T>(colunas: ColunaCsv<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((coluna) => escaparCelula(coluna.titulo)).join(SEPARADOR)
  const corpo = linhas.map((linha) =>
    colunas
      .map((coluna) =>
        escaparCelula(formatarCelula(coluna.valor(linha), coluna.formato ?? 'texto')),
      )
      .join(SEPARADOR),
  )
  return `${BOM}${[cabecalho, ...corpo].join(QUEBRA)}${QUEBRA}`
}

/**
 * `judisys-<módulo>-aaaa-mm-dd.csv`; com apelido (credores),
 * `judisys-credores-<apelido>-aaaa-mm-dd.csv`. O apelido sai normalizado, com hífens.
 */
export function nomeArquivoCsv(modulo: string, hoje: DataIso, apelido?: string): string {
  const partes = ['judisys', modulo]
  if (apelido)
    partes.push(
      normalizar(apelido.replace(/[.\-/]/g, ' '))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    )
  partes.push(hoje)
  return `${partes.filter(Boolean).join('-')}.csv`
}
