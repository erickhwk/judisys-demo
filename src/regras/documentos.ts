// CPF, CNPJ e número CNJ: validação pelos dígitos verificadores e formatação (T-04, RF-44).
// Aceitam o texto com ou sem pontuação. CNPJ só numérico.

export function somenteDigitos(texto: string): string {
  return texto.replace(/\D/g, '')
}

function digitosRepetidos(digitos: string): boolean {
  return /^(\d)\1*$/.test(digitos)
}

/** Dígito verificador módulo 11 com os pesos dados (CPF e CNPJ). */
function dvModulo11(digitos: string, pesos: number[]): number {
  const soma = pesos.reduce((total, peso, i) => total + Number(digitos[i]) * peso, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

function pesosDecrescentes(de: number, quantidade: number): number[] {
  return Array.from({ length: quantidade }, (_, i) => de - i)
}

function exigirDigitos(base: string, quantidade: number): void {
  if (!new RegExp(`^\\d{${quantidade}}$`).test(base)) {
    throw new Error(`Esperados ${quantidade} dígitos: ${base}`)
  }
}

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_CNPJ_2 = [6, ...PESOS_CNPJ_1]

/** Recebe os 9 primeiros dígitos e devolve o CPF com os 2 verificadores (11 dígitos). */
export function completarCpf(base: string): string {
  exigirDigitos(base, 9)
  const d1 = dvModulo11(base, pesosDecrescentes(10, 9))
  const comD1 = `${base}${d1}`
  return `${comD1}${dvModulo11(comD1, pesosDecrescentes(11, 10))}`
}

/** Recebe os 12 primeiros dígitos e devolve o CNPJ com os 2 verificadores (14 dígitos). */
export function completarCnpj(base: string): string {
  exigirDigitos(base, 12)
  const d1 = dvModulo11(base, PESOS_CNPJ_1)
  const comD1 = `${base}${d1}`
  return `${comD1}${dvModulo11(comD1, PESOS_CNPJ_2)}`
}

function resto97(digitos: string): number {
  let resto = 0
  for (const digito of digitos) resto = (resto * 10 + Number(digito)) % 97
  return resto
}

/**
 * Recebe os 18 dígitos do número CNJ sem o verificador (NNNNNNN AAAA J TR OOOO) e devolve os
 * 20 dígitos na ordem oficial (NNNNNNN DD AAAA J TR OOOO). Módulo 97 (Resolução CNJ 65/2008).
 */
export function completarCnj(base: string): string {
  exigirDigitos(base, 18)
  const dv = 98 - resto97(`${base}00`)
  return `${base.slice(0, 7)}${dv.toString().padStart(2, '0')}${base.slice(7)}`
}

export function validarCpf(texto: string): boolean {
  const digitos = somenteDigitos(texto)
  if (digitos.length !== 11 || digitosRepetidos(digitos)) return false
  return completarCpf(digitos.slice(0, 9)) === digitos
}

export function validarCnpj(texto: string): boolean {
  const digitos = somenteDigitos(texto)
  if (digitos.length !== 14 || digitosRepetidos(digitos)) return false
  return completarCnpj(digitos.slice(0, 12)) === digitos
}

export function validarCnj(texto: string): boolean {
  const digitos = somenteDigitos(texto)
  if (digitos.length !== 20) return false
  return completarCnj(`${digitos.slice(0, 7)}${digitos.slice(9)}`) === digitos
}

/** `012.345.678-90`. Texto com quantidade errada de dígitos volta como veio. */
export function formatarCpf(texto: string): string {
  const d = somenteDigitos(texto)
  if (d.length !== 11) return texto
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** `12.345.678/0001-90`. Texto com quantidade errada de dígitos volta como veio. */
export function formatarCnpj(texto: string): string {
  const d = somenteDigitos(texto)
  if (d.length !== 14) return texto
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** `NNNNNNN-DD.AAAA.J.TR.OOOO`. Texto com quantidade errada de dígitos volta como veio. */
export function formatarCnj(texto: string): string {
  const d = somenteDigitos(texto)
  if (d.length !== 20) return texto
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`
}

/** CPF (11 dígitos) ou CNPJ (14 dígitos) pelo tamanho; outro tamanho volta como veio. */
export function formatarDocumento(texto: string): string {
  const tamanho = somenteDigitos(texto).length
  if (tamanho === 11) return formatarCpf(texto)
  if (tamanho === 14) return formatarCnpj(texto)
  return texto
}
