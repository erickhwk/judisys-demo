// Montagem do início (SDD-INI §5.2 e §5.4): o catálogo dos 12 quadros, os padrões por papel
// (RF-17) e as regras de encaixe. Funções puras, sem tela: a grade (INI-03) e a persistência usam
// daqui. A montagem guarda só quadro, x e y; largura e altura vêm sempre do catálogo (S-02, INV-02).
import { type Modulo, type Papel, pode } from '../../regras/permissoes'

export const ID_QUADROS = [
  'prazos',
  'agc',
  'pedidos',
  'proximos',
  'calendario',
  'atividade',
  'informes',
  'passivo',
  'publicados',
  'cumpridos',
  'classes',
  'carteira',
] as const
export type IdQuadro = (typeof ID_QUADROS)[number]

export interface DefinicaoQuadro {
  id: IdQuadro
  titulo: string
  /** Largura no desktop, em unidades de 4 colunas. */
  w: 1 | 2 | 3 | 4
  /** Altura no desktop e no tablet. */
  h: 1 | 2
  /** Largura no tablet (2 colunas): `min(w, 2)`, salvo exceção. */
  wTablet: 1 | 2
  /** Altura no tablet: a carteira vira 2×2. */
  hTablet: 1 | 2
  /** O papel precisa ler todos para ter o quadro no catálogo (S-05). */
  modulos: readonly Modulo[]
}

export interface ItemMontagem {
  quadro: IdQuadro
  x: number
  y: number
}
export type Montagem = ItemMontagem[]

/** Colunas da faixa do desktop (5.3); a montagem salva é sempre nessa grade. */
export const COLUNAS_DESKTOP = 4
export const COLUNAS_TABLET = 2

function quadro(
  id: IdQuadro,
  titulo: string,
  w: DefinicaoQuadro['w'],
  h: DefinicaoQuadro['h'],
  modulos: readonly Modulo[],
  tablet: Partial<Pick<DefinicaoQuadro, 'wTablet' | 'hTablet'>> = {},
): DefinicaoQuadro {
  return {
    id,
    titulo,
    w,
    h,
    wTablet: tablet.wTablet ?? (Math.min(w, 2) as 1 | 2),
    hTablet: tablet.hTablet ?? h,
    modulos,
  }
}

/** Os 12 quadros, com os tamanhos do PRD §6.4, na ordem Q-01 a Q-12. */
export const CATALOGO: Readonly<Record<IdQuadro, DefinicaoQuadro>> = {
  prazos: quadro('prazos', 'Prazos em aberto', 1, 1, ['prazos']),
  agc: quadro('agc', 'Próxima AGC', 1, 1, ['agc']),
  pedidos: quadro('pedidos', 'Pedidos de crédito', 1, 1, ['credores']),
  proximos: quadro('proximos', 'Próximos prazos', 1, 2, ['prazos']),
  calendario: quadro('calendario', 'Calendário do mês', 1, 2, ['prazos', 'agc']),
  atividade: quadro('atividade', 'Atividade recente', 1, 2, ['logs']),
  informes: quadro('informes', 'Últimos informes', 1, 2, ['informes']),
  passivo: quadro('passivo', 'Passivo sob administração', 2, 1, ['processos', 'credores']),
  publicados: quadro('publicados', 'Informes publicados', 2, 1, ['informes']),
  cumpridos: quadro('cumpridos', 'Prazos cumpridos', 2, 1, ['prazos']),
  classes: quadro('classes', 'Passivo por classe (RJ)', 2, 1, ['processos', 'credores']),
  carteira: quadro('carteira', 'Carteira por fase', 4, 1, ['processos'], { hTablet: 2 }),
}

/** Largura e altura de um quadro numa faixa de largura. */
export type Medida = (quadro: IdQuadro) => { w: number; h: number }

export const MEDIDA_DESKTOP: Medida = (id) => ({ w: CATALOGO[id].w, h: CATALOGO[id].h })
export const MEDIDA_TABLET: Medida = (id) => ({ w: CATALOGO[id].wTablet, h: CATALOGO[id].hTablet })

/** Montagens padrão do RF-17 (colunas 0 a 3, de cima para baixo). */
export const PADROES: Readonly<Record<Papel, readonly ItemMontagem[]>> = {
  aj: [
    { quadro: 'carteira', x: 0, y: 0 },
    { quadro: 'passivo', x: 0, y: 1 },
    { quadro: 'prazos', x: 2, y: 1 },
    { quadro: 'agc', x: 3, y: 1 },
    { quadro: 'cumpridos', x: 0, y: 2 },
    { quadro: 'proximos', x: 2, y: 2 },
    { quadro: 'atividade', x: 3, y: 2 },
    { quadro: 'classes', x: 0, y: 3 },
  ],
  advogado: [
    { quadro: 'prazos', x: 0, y: 0 },
    { quadro: 'agc', x: 1, y: 0 },
    { quadro: 'proximos', x: 2, y: 0 },
    { quadro: 'calendario', x: 3, y: 0 },
    { quadro: 'publicados', x: 0, y: 1 },
    { quadro: 'passivo', x: 0, y: 2 },
    { quadro: 'classes', x: 2, y: 2 },
    { quadro: 'carteira', x: 0, y: 3 },
  ],
  analista: [
    { quadro: 'pedidos', x: 0, y: 0 },
    { quadro: 'prazos', x: 1, y: 0 },
    { quadro: 'informes', x: 2, y: 0 },
    { quadro: 'atividade', x: 3, y: 0 },
    { quadro: 'classes', x: 0, y: 1 },
    { quadro: 'passivo', x: 0, y: 2 },
    { quadro: 'proximos', x: 2, y: 2 },
    { quadro: 'calendario', x: 3, y: 2 },
    { quadro: 'publicados', x: 0, y: 3 },
  ],
}

/** Cópia do padrão do papel, para quem vai alterar a montagem. */
export function padraoDoPapel(papel: Papel): Montagem {
  return PADROES[papel].map((item) => ({ ...item }))
}

export function ehIdQuadro(valor: string): valor is IdQuadro {
  return (ID_QUADROS as readonly string[]).includes(valor)
}

/** O papel lê todos os módulos de que o quadro precisa (S-05). */
export function papelLeQuadro(papel: Papel, id: IdQuadro): boolean {
  return CATALOGO[id].modulos.every((modulo) => pode(papel, 'ler', modulo))
}

/** Quadros que o papel pode pôr na montagem, na ordem do catálogo. */
export function catalogoDoPapel(papel: Papel): DefinicaoQuadro[] {
  return ID_QUADROS.filter((id) => papelLeQuadro(papel, id)).map((id) => CATALOGO[id])
}

/** Primeira linha livre abaixo de todos os quadros (0 na montagem vazia). */
export function base(montagem: readonly ItemMontagem[], medida: Medida = MEDIDA_DESKTOP): number {
  return montagem.reduce((maior, item) => Math.max(maior, item.y + medida(item.quadro).h), 0)
}

/**
 * O quadro cabe em (x, y): dentro das colunas e sem se sobrepor a outro item da montagem. O próprio
 * quadro, se já estiver na montagem, é ignorado (é ele que está mudando de lugar).
 */
export function cabe(
  item: Pick<ItemMontagem, 'quadro'>,
  x: number,
  y: number,
  montagem: readonly ItemMontagem[],
  cols: number,
  medida: Medida = MEDIDA_DESKTOP,
): boolean {
  const { w, h } = medida(item.quadro)
  if (x < 0 || y < 0 || x + w > cols) return false
  return montagem.every((outro) => {
    if (outro.quadro === item.quadro) return true
    const o = medida(outro.quadro)
    return x + w <= outro.x || outro.x + o.w <= x || y + h <= outro.y || outro.y + o.h <= y
  })
}

/**
 * Primeira posição livre em ordem de leitura (linha a linha, da esquerda para a direita), das
 * linhas 0 até a base da montagem. Sem lugar, vai para a base, na coluna 0.
 */
export function primeiroLugarLivre(
  id: IdQuadro,
  montagem: readonly ItemMontagem[],
  cols: number,
  medida: Medida = MEDIDA_DESKTOP,
): { x: number; y: number } {
  const fim = base(montagem, medida)
  const { w } = medida(id)
  for (let y = 0; y < fim; y++) {
    for (let x = 0; x <= cols - w; x++) {
      if (cabe({ quadro: id }, x, y, montagem, cols, medida)) return { x, y }
    }
  }
  return { x: 0, y: fim }
}

/** Itens por linha e, na mesma linha, por coluna. Não altera a montagem recebida. */
export function ordemDeLeitura<T extends Pick<ItemMontagem, 'x' | 'y'>>(
  montagem: readonly T[],
): T[] {
  return [...montagem].sort((a, b) => a.y - b.y || a.x - b.x)
}

/**
 * Remonta noutra largura (tablet, S-03): em ordem de leitura, cada quadro, com o tamanho da faixa
 * de destino, vai para o primeiro lugar livre da montagem que vai se formando.
 */
export function empacotar(
  montagem: readonly ItemMontagem[],
  cols: number,
  medida: Medida,
): Montagem {
  const resultado: Montagem = []
  for (const item of ordemDeLeitura(montagem)) {
    resultado.push({
      quadro: item.quadro,
      ...primeiroLugarLivre(item.quadro, resultado, cols, medida),
    })
  }
  return resultado
}

/** Item como veio do armazenamento: o quadro ainda não foi conferido contra o catálogo. */
export interface ItemSalvo {
  quadro: string
  x: number
  y: number
}

/**
 * Deixa a montagem salva válida para o papel (RF-26, INV-01): descarta quadro inexistente, repetido
 * ou que o papel não lê. Em ordem de leitura, fica no lugar quem cabe nele; depois, também em ordem
 * de leitura, quem não cabia (sobreposto ou fora das 4 colunas) vai para o primeiro lugar livre.
 * Assim um item deslocado não desaloja outro que estava certo. Montagem inválida no formato é da
 * persistência: aqui ela já chega como lista de itens.
 */
export function normalizar(montagemSalva: readonly ItemSalvo[], papel: Papel): Montagem {
  const resultado: Montagem = []
  const deslocados: IdQuadro[] = []
  const vistos = new Set<IdQuadro>()
  for (const item of ordemDeLeitura(montagemSalva)) {
    const id = item.quadro
    if (!ehIdQuadro(id) || vistos.has(id) || !papelLeQuadro(papel, id)) continue
    vistos.add(id)
    if (cabe({ quadro: id }, item.x, item.y, resultado, COLUNAS_DESKTOP)) {
      resultado.push({ quadro: id, x: item.x, y: item.y })
    } else {
      deslocados.push(id)
    }
  }
  for (const id of deslocados) {
    resultado.push({ quadro: id, ...primeiroLugarLivre(id, resultado, COLUNAS_DESKTOP) })
  }
  return resultado
}
