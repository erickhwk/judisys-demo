// Boot da demo (SDD §5.5, T-18, T-24, T-25, T-34): lê a versão gravada, baixa o seed só quando
// precisa, converte as datas relativas, valida com zod e grava tudo numa transação. Sem IndexedDB,
// cai para a memória (PRD §13). O reset manual (RF-02) refaz a gravação sobre o mesmo armazenamento.
import type { DexieOptions } from 'dexie'
import { z } from 'zod'
import { type DataIso, somarDias } from '../regras/datas'
import { proximoRma } from '../regras/prazos'
import { hoje as hojeDoRelogio } from '../regras/relogio'
import { type Armazenamento, type Id, TABELAS, type Tabela } from './armazenamento'
import { ArmazenamentoDexie, NOME_BANCO, VERSAO_SCHEMA } from './dexie'
import { ArmazenamentoMemoria } from './memoria'
import { SCHEMAS, type Tipos } from './schemas'
import { ehRma } from './servicos/comum'

// ---------------------------------------------------------------------------------------------
// Textos (SDD §7.1, PRD §13)

/** Aviso do reset automático por versão (RF-03, CAR-03). */
export const MENSAGEM_VERSAO = 'A demo foi atualizada e os dados foram restaurados.'
/** Aviso da faixa quando o IndexedDB não abre (CAR-10). */
export const MENSAGEM_MEMORIA = 'suas alterações não serão salvas nesta aba'
/** Erro de cota ao gravar um anexo (CAR-11). */
export const MENSAGEM_COTA =
  'Não há espaço no navegador para este anexo. Resetar a demo libera o espaço.'
/** Título da tela de erro da carga (CAR-08, CAR-09). */
export const TITULO_ERRO_CARGA = 'Não foi possível carregar a demo'

/** Chave do marcador de versão no `localStorage` (T-25). */
export const CHAVE_VERSAO = 'judisys:versao'

// ---------------------------------------------------------------------------------------------
// Datas relativas (T-24)

/** Formato que o carregador converte: `@-12` (data) e `@-3T14:22` (carimbo, horário local). */
export const FORMATO_DATA_RELATIVA = /^@([+-]\d+)(T\d{2}:\d{2})?$/

/** Aplica `trocar` a toda string de `valor`, em qualquer profundidade; o resto passa igual. */
export function mapearStrings<T>(valor: T, trocar: (texto: string) => string): T {
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
 * Troca toda string no formato relativo pela data (ou carimbo) somada a `hoje` (CAR-06). O que só
 * parece data (`@abc`, `email@x`) passa igual (CAR-07).
 */
export function resolverDatas<T>(valor: T, hoje: DataIso): T {
  return mapearStrings(valor, (texto) => {
    const partes = FORMATO_DATA_RELATIVA.exec(texto)
    if (partes === null) return texto
    const [, dias = '0', hora = ''] = partes
    return `${somarDias(hoje, Number(dias))}${hora}`
  })
}

// ---------------------------------------------------------------------------------------------
// RMA no dia 15 (T-34)

type Prazo = Tipos['prazos']

function guardarMaior(mapa: Map<Id, DataIso>, chave: Id, data: DataIso): void {
  const atual = mapa.get(chave)
  if (atual === undefined || data > atual) mapa.set(chave, data)
}

/**
 * Recalcula o vencimento de cada RMA aberto com `proximoRma`, a partir do vencimento do último RMA
 * cumprido do processo ou, sem nenhum, do marco "Processamento deferido" (T-34). O deslocamento
 * fixo do T-24 só acerta o dia 15 quando a demo abre na data-base do seed; nela, isto não muda nada.
 */
export function recalcularRmas(
  prazos: readonly Prazo[],
  marcos: readonly Tipos['marcosDeFase'][],
): Prazo[] {
  const ultimoCumprido = new Map<Id, DataIso>()
  const deferimento = new Map<Id, DataIso>()
  for (const prazo of prazos) {
    if (ehRma(prazo) && prazo.status === 'cumprido') {
      guardarMaior(ultimoCumprido, prazo.processoId, prazo.vencimento)
    }
  }
  for (const marco of marcos) {
    if (marco.fase === 'processamento-deferido') {
      guardarMaior(deferimento, marco.processoId, marco.data)
    }
  }
  return prazos.map((prazo) => {
    if (!ehRma(prazo) || prazo.status !== 'aberto') return prazo
    const referencia = ultimoCumprido.get(prazo.processoId) ?? deferimento.get(prazo.processoId)
    return referencia === undefined ? prazo : { ...prazo, vencimento: proximoRma(referencia) }
  })
}

// ---------------------------------------------------------------------------------------------
// Seed

export type TabelasSeed = { [K in Tabela]: Tipos[K][] }

export interface SeedCarregado {
  versao: string
  tabelas: TabelasSeed
}

/** A carga não terminou: rede, arquivo inválido ou gravação. A tela mostra `TITULO_ERRO_CARGA`. */
export class ErroCarga extends Error {
  constructor(mensagem: string, opcoes?: { cause?: unknown }) {
    super(mensagem, opcoes)
    this.name = 'ErroCarga'
  }
}

const schemaArquivoVersao = z.object({ versao: z.string().min(1) })

const schemaArquivoSeed = z.object({
  versao: z.string().min(1),
  tabelas: z.object(
    Object.fromEntries(TABELAS.map((tabela) => [tabela, z.array(z.unknown())])) as Record<
      Tabela,
      z.ZodArray<z.ZodUnknown>
    >,
  ),
})

/**
 * Converte as datas para `hoje`, valida cada registro com o schema da coleção e recalcula os RMAs
 * (T-24, T-04, T-34). Qualquer registro inválido recusa o seed inteiro (CAR-08).
 */
export function prepararSeed(json: unknown, hoje: DataIso): SeedCarregado {
  const arquivo = schemaArquivoSeed.safeParse(json)
  if (!arquivo.success) throw new ErroCarga(`seed.json fora do formato: ${arquivo.error.message}`)
  const convertidas = resolverDatas(arquivo.data.tabelas, hoje)
  const tabelas = {} as Record<Tabela, unknown[]>
  for (const tabela of TABELAS) {
    tabelas[tabela] = convertidas[tabela].map((registro, i) => {
      const resultado = SCHEMAS[tabela].safeParse(registro)
      if (!resultado.success) {
        throw new ErroCarga(`seed.json: ${tabela}[${i}] inválido: ${resultado.error.message}`)
      }
      return resultado.data
    })
  }
  const validas = tabelas as TabelasSeed
  validas.prazos = recalcularRmas(validas.prazos, validas.marcosDeFase)
  return { versao: arquivo.data.versao, tabelas: validas }
}

/**
 * Apaga o que houver e grava todas as tabelas numa transação só: se algo falha, nada fica (CAR-08).
 * Some também o que a tabela `arquivos` tinha (uploads, RF-02).
 */
export async function gravarTabelas(
  armazenamento: Armazenamento,
  tabelas: TabelasSeed,
): Promise<void> {
  await armazenamento.transacao(TABELAS, async () => {
    await armazenamento.limpar()
    await Promise.all(
      TABELAS.flatMap((tabela) =>
        (tabelas[tabela] as unknown[]).map((registro) => armazenamento.put(tabela, registro)),
      ),
    )
  })
}

// ---------------------------------------------------------------------------------------------
// Cota (PRD §13, CAR-11)

/**
 * O navegador recusou a gravação por falta de espaço. Só a operação que falhou é recusada (a
 * transação dela é desfeita); o armazenamento segue o mesmo, sem trocar para memória no meio da
 * sessão. O Dexie repassa o erro com o mesmo nome ou o guarda em `inner`.
 */
export function ehErroDeCota(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false
  const { name, inner } = erro as { name?: unknown; inner?: unknown }
  return name === 'QuotaExceededError' || (inner !== undefined && ehErroDeCota(inner))
}

// ---------------------------------------------------------------------------------------------
// Dependências do navegador (injetáveis nos testes)

/** Como abrir e apagar o banco persistente. */
export interface Banco {
  /** Abre o banco ou rejeita se o IndexedDB não estiver disponível (CAR-10). */
  abrir(): Promise<Armazenamento>
  apagar(): Promise<void>
}

/** Banco no IndexedDB com Dexie; `opcoes` recebe o `fake-indexeddb` nos testes. */
export function bancoDexie(opcoes?: DexieOptions): Banco {
  return {
    async abrir() {
      const armazenamento = new ArmazenamentoDexie(NOME_BANCO, opcoes)
      await armazenamento.db.open()
      return armazenamento
    },
    async apagar() {
      await new ArmazenamentoDexie(NOME_BANCO, opcoes).db.delete()
    },
  }
}

export interface DependenciasCarga {
  /** "Hoje" para converter as datas do seed. */
  hoje: () => DataIso
  /** JSON de um arquivo do próprio site (`seed.json`, `seed-versao.json`), ou rejeita. */
  baixar: (arquivo: string) => Promise<unknown>
  /** `localStorage`, ou `null` se o navegador não deixa usá-lo (CAR-12). */
  localStorage: () => Storage | null
  banco: Banco
}

/** Baixa relativo à base do Vite, sem aceitar cópia velha do cache (a versão tem de ser a atual). */
async function baixarDoSite(arquivo: string): Promise<unknown> {
  const resposta = await fetch(`${import.meta.env.BASE_URL}${arquivo}`, { cache: 'no-cache' })
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${arquivo}`)
  return resposta.json()
}

function localStorageDoNavegador(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function dependencias(parciais: Partial<DependenciasCarga>): DependenciasCarga {
  return {
    hoje: hojeDoRelogio,
    baixar: baixarDoSite,
    localStorage: localStorageDoNavegador,
    banco: parciais.banco ?? bancoDexie(),
    ...parciais,
  }
}

// ---------------------------------------------------------------------------------------------
// Versão (T-18, T-25)

/** Marcador gravado no navegador: schema do IndexedDB + hash do seed (T-18). */
export function marcadorDeVersao(versaoSeed: string): string {
  return `${VERSAO_SCHEMA}:${versaoSeed}`
}

function lerVersao(armazenamentoLocal: Storage | null): string | null {
  try {
    return armazenamentoLocal?.getItem(CHAVE_VERSAO) ?? null
  } catch {
    return null
  }
}

function gravarVersao(armazenamentoLocal: Storage | null, marcador: string): void {
  try {
    armazenamentoLocal?.setItem(CHAVE_VERSAO, marcador)
  } catch {
    // Sem localStorage, a próxima abertura recarrega o seed (T-25, CAR-12).
  }
}

async function baixarSeed(d: DependenciasCarga): Promise<SeedCarregado> {
  const json = await baixarOuFalhar(d, 'seed.json')
  return prepararSeed(json, d.hoje())
}

async function baixarOuFalhar(d: DependenciasCarga, arquivo: string): Promise<unknown> {
  try {
    return await d.baixar(arquivo)
  } catch (erro) {
    throw new ErroCarga(`Falha ao baixar ${arquivo}`, { cause: erro })
  }
}

async function abrirOuNulo(banco: Banco): Promise<Armazenamento | null> {
  try {
    return await banco.abrir()
  } catch {
    return null
  }
}

/** O banco tem o seed gravado (o marcador pode ter sobrevivido a uma limpeza do IndexedDB). */
async function temDados(armazenamento: Armazenamento): Promise<boolean> {
  return (await armazenamento.todos('escritorios')).length > 0
}

// ---------------------------------------------------------------------------------------------
// Carga e reset

export interface ResultadoCarga {
  armazenamento: Armazenamento
  /** Reset automático por versão, sem ser a primeira visita: mostrar `MENSAGEM_VERSAO` (RF-03). */
  avisoVersao: boolean
  /** IndexedDB indisponível; dados só nesta aba: mostrar `MENSAGEM_MEMORIA` (CAR-10). */
  modoMemoria: boolean
}

/**
 * Boot da demo (SDD §5.5). Rejeita com `ErroCarga` se a rede falha ou o seed é inválido
 * (CAR-08, CAR-09); quem chama mostra a tela de erro com "Tentar de novo" e chama de novo.
 */
export async function carregar(parciais: Partial<DependenciasCarga> = {}): Promise<ResultadoCarga> {
  const d = dependencias(parciais)
  const armazenamentoLocal = d.localStorage()
  const gravada = lerVersao(armazenamentoLocal)
  const publicada = schemaArquivoVersao.safeParse(await baixarOuFalhar(d, 'seed-versao.json'))
  if (!publicada.success) throw new ErroCarga('seed-versao.json fora do formato')
  const alvo = marcadorDeVersao(publicada.data.versao)

  // Versão igual: não baixa o seed (CAR-02).
  let armazenamento: Armazenamento | null = null
  if (gravada === alvo) {
    armazenamento = await abrirOuNulo(d.banco)
    if (armazenamento !== null && (await temDados(armazenamento))) {
      return { armazenamento, avisoVersao: false, modoMemoria: false }
    }
  }

  // Baixa e valida antes de apagar: seed inválido ou rede fora não destroem o banco (CAR-08/09).
  const seed = await baixarSeed(d)
  if (armazenamento === null) {
    armazenamento = await recriarBanco(d.banco)
  }
  if (armazenamento !== null) {
    try {
      await gravarTabelas(armazenamento, seed.tabelas)
      gravarVersao(armazenamentoLocal, marcadorDeVersao(seed.versao))
      return {
        armazenamento,
        avisoVersao: gravada !== null && gravada !== alvo,
        modoMemoria: false,
      }
    } catch {
      // Banco abriu mas não grava: segue em memória, como se não abrisse.
    }
  }

  // Plano B (PRD §13, CAR-10): o mesmo seed na memória desta aba.
  const memoria = new ArmazenamentoMemoria()
  await gravarTabelas(memoria, seed.tabelas)
  return { armazenamento: memoria, avisoVersao: false, modoMemoria: true }
}

/** Versão diferente ou ausente: apaga o banco e abre de novo (T-18: sem migrações). */
async function recriarBanco(banco: Banco): Promise<Armazenamento | null> {
  try {
    await banco.apagar()
  } catch {
    return null
  }
  return abrirOuNulo(banco)
}

/**
 * Reset manual (RF-02, CAR-04): baixa o seed, converte as datas para hoje e troca tudo o que o
 * armazenamento tem, numa transação; os uploads somem. Sem aviso de versão. Se falha, os dados
 * continuam como estavam e a promessa rejeita com `ErroCarga`.
 */
export async function resetar(
  carga: Pick<ResultadoCarga, 'armazenamento' | 'modoMemoria'>,
  parciais: Partial<DependenciasCarga> = {},
): Promise<void> {
  const d = dependencias(parciais)
  const seed = await baixarSeed(d)
  try {
    await gravarTabelas(carga.armazenamento, seed.tabelas)
  } catch (erro) {
    throw new ErroCarga('Falha ao gravar o seed', { cause: erro })
  }
  if (!carga.modoMemoria) gravarVersao(d.localStorage(), marcadorDeVersao(seed.versao))
}
