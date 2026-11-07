// Datas relativas do seed (T-24). O gerador calcula tudo em datas absolutas a partir de uma data
// de referência fixa (INV-07; sem relógio, INV-08) e, no fim, troca cada data por um deslocamento
// em dias: "@-12" (data) e "@-3T14:22" (carimbo, horário local). Na carga, o deslocamento é
// somado ao "hoje" de quem abre a demo.
import { type Carimbo, type DataIso, diasEntre, somarDias } from '../../src/regras/datas'

/**
 * "Hoje" do gerador. É a data dos exemplos do SDD (CAR-06) e do relógio fixo do Playwright: nos
 * testes e2e os vencimentos do RMA caem no dia 15, como o gerador os calculou.
 */
export const DATA_BASE: DataIso = '2026-11-07'

/** Formato que o carregador converte (T-24). */
export const FORMATO_DATA_RELATIVA = /^@([+-]\d+)(T\d{2}:\d{2})?$/

const DATA_OU_CARIMBO_ABSOLUTO = /^(\d{4}-\d{2}-\d{2})(T\d{2}:\d{2})?$/

/** Data da referência deslocada em `dias` (`dia(-12)` = D−12). */
export function dia(dias: number): DataIso {
  return somarDias(DATA_BASE, dias)
}

/** Carimbo `aaaa-mm-ddTHH:mm` de uma data e de uma hora. */
export function carimbo(data: DataIso, hora: number, minuto: number): Carimbo {
  return `${data}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
}

function deslocamento(dias: number): string {
  return dias < 0 ? `-${-dias}` : `+${dias}`
}

/** Aplica `trocar` a toda string de `valor`, em qualquer profundidade; o resto passa igual. */
function mapearStrings<T>(valor: T, trocar: (texto: string) => string): T {
  if (typeof valor === 'string') return trocar(valor) as T
  if (Array.isArray(valor)) return valor.map((item) => mapearStrings(item, trocar)) as T
  if (typeof valor === 'object' && valor !== null) {
    return Object.fromEntries(
      Object.entries(valor).map(([chave, item]) => [chave, mapearStrings(item, trocar)]),
    ) as T
  }
  return valor
}

/**
 * Troca toda string que é data (`aaaa-mm-dd`) ou carimbo (`aaaa-mm-ddTHH:mm`) pelo formato
 * relativo a `DATA_BASE`.
 */
export function relativizar<T>(valor: T): T {
  return mapearStrings(valor, (texto) => {
    const partes = DATA_OU_CARIMBO_ABSOLUTO.exec(texto)
    if (partes === null) return texto
    const [, data = '', hora = ''] = partes
    return `@${deslocamento(diasEntre(DATA_BASE, data))}${hora}`
  })
}

/**
 * Inverso de `relativizar` para um "hoje" qualquer, como o carregador da DMO-08 fará (CAR-06,
 * CAR-07). Aqui serve aos testes, para validar o seed com os schemas zod.
 */
export function resolverDatas<T>(valor: T, hoje: DataIso): T {
  return mapearStrings(valor, (texto) => {
    const partes = FORMATO_DATA_RELATIVA.exec(texto)
    if (partes === null) return texto
    const [, dias = '0', hora = ''] = partes
    return `${somarDias(hoje, Number(dias))}${hora}`
  })
}
