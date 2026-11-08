// Contas dos gráficos em SVG (S-06), separadas do desenho para ter teste unitário.

/**
 * Item de qualquer gráfico: o rótulo e o valor entram no texto alternativo (INV-05). O rótulo
 * identifica o item (é a chave do React), então não se repete num mesmo gráfico.
 */
export interface ItemGrafico {
  rotulo: string
  valor: number
}

export type Formatar = (valor: number) => string

export const formatarNumero: Formatar = (valor) => valor.toLocaleString('pt-BR')

function total(valores: readonly number[]): number {
  return valores.reduce((soma, valor) => soma + Math.max(0, valor), 0)
}

export interface FatiaDoTotal {
  /** Posição do item na lista recebida. */
  indice: number
  /** Início e comprimento em % do total (0 a 100). */
  inicio: number
  comprimento: number
}

/** Fatias do total em % (volta da rosca, largura da barra 100%). Valor zero não vira fatia. */
export function fatiasDoTotal(valores: readonly number[]): FatiaDoTotal[] {
  const soma = total(valores)
  if (soma === 0) return []
  let inicio = 0
  return valores.flatMap((valor, indice) => {
    if (valor <= 0) return []
    const comprimento = (valor / soma) * 100
    const segmento = { indice, inicio, comprimento }
    inicio += comprimento
    return [segmento]
  })
}

/**
 * Percentuais inteiros que somam 100 (maiores restos): arredonda tudo para baixo e dá o ponto que
 * falta a quem tem a maior parte decimal. Lista toda zero devolve zeros.
 */
export function percentuaisArredondados(valores: readonly number[]): number[] {
  const soma = total(valores)
  if (soma === 0) return valores.map(() => 0)
  const exatos = valores.map((valor) => (Math.max(0, valor) / soma) * 100)
  const inteiros = exatos.map(Math.floor)
  let falta = 100 - inteiros.reduce((a, b) => a + b, 0)
  const porResto = exatos
    .map((exato, indice) => ({ indice, resto: exato - Math.floor(exato) }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice)
  for (const { indice } of porResto) {
    if (falta <= 0) break
    inteiros[indice] = (inteiros[indice] ?? 0) + 1
    falta -= 1
  }
  return inteiros
}

/** Cada valor como fração (0 a 1) do maior, ou do `maximo` dado. Série toda zero dá zeros. */
export function proporcoesPeloMaximo(valores: readonly number[], maximo?: number): number[] {
  const teto = maximo ?? Math.max(0, ...valores)
  if (teto <= 0) return valores.map(() => 0)
  return valores.map((valor) => Math.min(1, Math.max(0, valor) / teto))
}

export interface PontoLinha {
  /** Coordenadas em % da área do desenho: x da esquerda, y do topo. */
  x: number
  y: number
}

/** Pontos da linha em % da área: o maior valor no topo, zero na base. Um ponto só fica no meio. */
export function pontosDaLinha(valores: readonly number[]): PontoLinha[] {
  const ultimo = valores.length - 1
  return proporcoesPeloMaximo(valores).map((proporcao, i) => ({
    x: ultimo === 0 ? 50 : (i / ultimo) * 100,
    y: 100 - proporcao * 100,
  }))
}

/**
 * Rótulos do eixo da linha quando o quadro não escolhe: a primeira ponta, a última e a marca.
 * Uma ponta vizinha da marca sai, para os dois textos não se sobreporem em largura estreita.
 */
export function rotulosPadraoDoEixo(quantidade: number, marca?: number): number[] {
  if (quantidade === 0) return []
  const ultimo = quantidade - 1
  const indices = new Set([0, ultimo])
  if (marca !== undefined && marca >= 0 && marca <= ultimo) {
    for (const ponta of [0, ultimo]) if (Math.abs(ponta - marca) === 1) indices.delete(ponta)
    indices.add(marca)
  }
  return [...indices].sort((a, b) => a - b)
}

/** Texto alternativo com os valores (INV-05, QDR-17): "Descrição: rótulo valor, rótulo valor". */
export function textoAlternativo(
  descricao: string,
  itens: readonly ItemGrafico[],
  formatar: Formatar = formatarNumero,
  complemento?: (indice: number) => string,
): string {
  if (itens.length === 0) return `${descricao}: sem dados`
  const partes = itens.map(
    (item, i) => `${item.rotulo} ${formatar(item.valor)}${complemento ? complemento(i) : ''}`,
  )
  return `${descricao}: ${partes.join(', ')}`
}
