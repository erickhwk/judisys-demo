// Mudanças campo a campo para o log (RF-41, LOG-01, LOG-02).

export interface Mudanca {
  campo: string
  de: unknown
  para: unknown
}

const CAMPOS_IGNORADOS = new Set(['atualizadoEm'])

function ehObjetoSimples(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

/** Igualdade estrutural de valores serializáveis (primitivos, arrays e objetos simples). */
function iguais(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => iguais(item, b[i]))
  }
  if (ehObjetoSimples(a) && ehObjetoSimples(b)) {
    const chaves = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...chaves].every((chave) => iguais(a[chave], b[chave]))
  }
  return false
}

/**
 * Campos de primeiro nível que mudaram de `antes` para `depois`, na ordem em que aparecem
 * (primeiro os de `antes`, depois os novos). Ignora `atualizadoEm`; campo ausente vale
 * `undefined`. Sem mudanças, devolve lista vazia (LOG-02).
 */
export function diferencas<T extends object>(antes: T, depois: T): Mudanca[] {
  const de = antes as Record<string, unknown>
  const para = depois as Record<string, unknown>
  const campos = new Set([...Object.keys(de), ...Object.keys(para)])
  const mudancas: Mudanca[] = []
  for (const campo of campos) {
    if (CAMPOS_IGNORADOS.has(campo)) continue
    if (!iguais(de[campo], para[campo])) {
      mudancas.push({ campo, de: de[campo], para: para[campo] })
    }
  }
  return mudancas
}
