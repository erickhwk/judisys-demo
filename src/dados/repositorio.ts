// Repositório genérico (T-12, T-14, SDD §5.3): permissão (INV-02), validação zod (T-04), log na
// mesma transação da gravação (INV-01) e filtro, busca, ordem e paginação em memória.
//
// O `excluir` daqui apaga só o registro. Exclusões com cascata ou bloqueio (processo, empresa,
// credor, usuário; T-23) e operações em várias coleções são dos serviços (DMO-11).
import type { z } from 'zod'
import type { Carimbo } from '../regras/datas'
import { diferencas, type Mudanca } from '../regras/diff'
import { somenteDigitos } from '../regras/documentos'
import { normalizar } from '../regras/normalizar'
import { type Modulo, type Papel, pode } from '../regras/permissoes'
import { type Armazenamento, compararIds, type Id, indicesDe, type Tabela } from './armazenamento'
import { CAMPOS_REGISTRO, type Log, type Novo, type Registro, SCHEMAS, type Tipos } from './schemas'

/** Quem grava, com que papel e em que instante (SDD §5.2). Vem da sessão; nos testes, explícito. */
export interface ContextoGravacao {
  usuario: { id: Id; escritorioId: Id }
  papel: Papel
  agora: () => Carimbo
}

export interface Filtro<T> {
  /** Igualdade campo a campo; usa índice quando houver. `undefined` ignora o campo; `null` casa com ausente. */
  onde?: Partial<Record<keyof T, unknown>>
  /** Normalizada (`normalizar()`); cada palavra precisa aparecer num dos campos de busca da coleção. */
  busca?: string
  ordem?: { campo: keyof T; direcao: 'asc' | 'desc' }
  /** 1-based; fora do intervalo vai para a primeira ou a última página. */
  pagina?: number
  /** Padrão 50 (RF-28). */
  porPagina?: number
}

export interface Pagina<T> {
  itens: T[]
  total: number
  pagina: number
  paginas: number
}

export interface Repositorio<T extends Registro> {
  listar(filtro?: Filtro<T>): Promise<Pagina<T>>
  todos(filtro?: Omit<Filtro<T>, 'pagina' | 'porPagina'>): Promise<T[]>
  buscar(id: Id): Promise<T | undefined>
  criar(dados: Novo<T>): Promise<T>
  atualizar(id: Id, mudancas: Partial<Novo<T>>): Promise<T>
  excluir(id: Id): Promise<void>
}

export const POR_PAGINA = 50

// ---------------------------------------------------------------------------------------------
// Erros

/** Gravação sem `pode(papel, 'editar', modulo)` (INV-02, PER-05) ou sem sessão. */
export class ErroPermissao extends Error {
  constructor(
    readonly papel?: Papel,
    readonly modulo?: Modulo,
  ) {
    super('Seu papel não permite esta ação')
    this.name = 'ErroPermissao'
  }
}

export interface ProblemaDeCampo {
  /** Caminho do campo com pontos (`requerente.documento`); vazio para o registro todo. */
  campo: string
  mensagem: string
}

/** O registro não passou no schema zod; nada foi gravado (LOG-05). */
export class ErroValidacao extends Error {
  readonly problemas: ProblemaDeCampo[]

  constructor(issues: readonly z.core.$ZodIssue[]) {
    const problemas = issues.map((issue) => ({
      campo: issue.path.map(String).join('.'),
      mensagem: issue.message,
    }))
    super(problemas.map((p) => (p.campo ? `${p.campo}: ${p.mensagem}` : p.mensagem)).join('; '))
    this.name = 'ErroValidacao'
    this.problemas = problemas
  }
}

export class ErroNaoEncontrado extends Error {
  constructor(
    readonly tabela: Tabela,
    readonly id: Id,
  ) {
    super('Registro não existe mais')
    this.name = 'ErroNaoEncontrado'
  }
}

// ---------------------------------------------------------------------------------------------
// Configuração por coleção

interface ConfigColecao {
  /** Módulo da tabela de permissões (RF-39) que rege a gravação. */
  modulo: Modulo
  /** Campos (caminho com pontos) onde `busca` procura. Sem campos, busca não casa nada. */
  busca: string[]
  /**
   * `false` só onde o log é de outra coleção: `processoEmpresas` segue o log do processo
   * (SDD §5.4); `arquivos` é o conteúdo do anexo, registrado no log do informe.
   */
  log: boolean
  /** Campos que não se repetem na coleção (AJ-03); gravação que repete vira `ErroValidacao`. */
  unicos?: Unicidade[]
}

/** Um campo único na coleção, ou dentro de um escopo (ex.: por `processoId`). */
interface Unicidade {
  /** Caminho com pontos de um campo escalar; valor vazio não é comparado. */
  campo: string
  /** Campo que delimita a unicidade: só conflitam registros com o mesmo valor nele. */
  escopo?: string
  /**
   * Forma comparada; padrão `String(valor)`. Documentos usam `somenteDigitos`. Com ela, a busca
   * não usa o índice do campo (que casa o valor exato), só o do escopo, se houver.
   */
  chave?: (valor: unknown) => string
  /** Vai para o campo no `ErroValidacao`. */
  mensagem: string
}

/** Credor com CPF/CNPJ repetido no processo (AJ-04, e CRD-08 no registro de pedido). */
export const AVISO_DOCUMENTO_EXISTENTE = 'Já existe credor com este CPF/CNPJ neste processo'

export const COLECOES: Record<Tabela, ConfigColecao> = {
  escritorios: { modulo: 'usuarios', busca: ['nome'], log: true },
  usuarios: { modulo: 'usuarios', busca: ['nome', 'email'], log: true },
  empresas: {
    modulo: 'empresas',
    busca: ['razaoSocial', 'nomeFantasia', 'cnpj'],
    log: true,
    unicos: [
      {
        campo: 'cnpj',
        chave: (valor) => somenteDigitos(String(valor)),
        mensagem: 'Já existe empresa com este CNPJ',
      },
    ],
  },
  processos: { modulo: 'processos', busca: ['apelido', 'numeroCnj'], log: true },
  processoEmpresas: { modulo: 'processos', busca: [], log: false },
  marcosDeFase: { modulo: 'processos', busca: [], log: true },
  prazos: { modulo: 'prazos', busca: ['titulo', 'baseLegal'], log: true },
  credores: {
    modulo: 'credores',
    busca: ['nome', 'documento'],
    log: true,
    // AJ-04: o documento já é gravado só com dígitos (schema), então dispensa `chave` e usa o
    // índice 'documento'. Em processos diferentes, o mesmo CPF/CNPJ continua permitido.
    unicos: [{ campo: 'documento', escopo: 'processoId', mensagem: AVISO_DOCUMENTO_EXISTENTE }],
  },
  pedidosDeCredito: {
    modulo: 'credores',
    busca: ['requerente.nome', 'requerente.documento'],
    log: true,
  },
  agcs: { modulo: 'agc', busca: ['pauta'], log: true },
  presencas: { modulo: 'agc', busca: [], log: true },
  votos: { modulo: 'agc', busca: [], log: true },
  informes: { modulo: 'informes', busca: ['titulo'], log: true },
  arquivos: { modulo: 'informes', busca: ['nome'], log: false },
  // Ninguém edita logs (RF-39): o repositório os grava junto com cada gravação.
  logs: { modulo: 'logs', busca: [], log: false },
}

/** Tabelas cujo processo do log vem da AGC (`agcId`). */
const VIA_AGC: ReadonlySet<Tabela> = new Set<Tabela>(['presencas', 'votos'])

type Linha = Record<string, unknown>

function valorEm(linha: Linha, caminho: string): unknown {
  return caminho
    .split('.')
    .reduce<unknown>(
      (atual, parte) =>
        typeof atual === 'object' && atual !== null ? (atual as Linha)[parte] : undefined,
      linha,
    )
}

/** Forma comparada do campo pela regra de unicidade; '' quando vazio. */
function chaveEm(linha: Linha, campo: string, chave: (valor: unknown) => string = String): string {
  const valor = valorEm(linha, campo)
  return valor === undefined || valor === null ? '' : chave(valor)
}

function semCamposDoRegistro(linha: Linha): Linha {
  const copia = { ...linha }
  for (const campo of CAMPOS_REGISTRO) delete copia[campo]
  return copia
}

const COLADOR = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

/** Ausentes por último nos dois sentidos; números e booleanos por valor; o resto pelo pt-BR. */
function comparar(a: unknown, b: unknown, sentido: 1 | -1): number {
  const aVazio = a === undefined || a === null
  const bVazio = b === undefined || b === null
  if (aVazio || bVazio) return aVazio === bVazio ? 0 : aVazio ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * sentido
  if (typeof a === 'boolean' && typeof b === 'boolean') return (Number(a) - Number(b)) * sentido
  return COLADOR.compare(String(a), String(b)) * sentido
}

function ehChaveSimples(valor: unknown): valor is string | number {
  return typeof valor === 'string' || typeof valor === 'number'
}

// ---------------------------------------------------------------------------------------------
// Repositório

export function criarRepositorio<K extends Tabela>(
  armazenamento: Armazenamento,
  tabela: K,
  contexto: ContextoGravacao,
): Repositorio<Tipos[K]> {
  type T = Tipos[K]
  const config = COLECOES[tabela]
  const schema = SCHEMAS[tabela] as unknown as z.ZodType<T>
  const tabelasDaGravacao: Tabela[] = [
    tabela,
    'logs',
    ...(VIA_AGC.has(tabela) ? ['agcs' as const] : []),
  ]

  async function candidatos(onde: Linha): Promise<Linha[]> {
    const indices = indicesDe(tabela)
    const indexado = Object.entries(onde).find(
      ([campo, valor]) => indices.includes(campo) && ehChaveSimples(valor),
    )
    return indexado
      ? armazenamento.porIndice<Linha>(tabela, indexado[0], indexado[1])
      : armazenamento.todos<Linha>(tabela)
  }

  function casaBusca(linha: Linha, palavras: string[]): boolean {
    const textos = config.busca.map((campo) => {
      const valor = valorEm(linha, campo)
      return valor === undefined || valor === null ? '' : normalizar(String(valor))
    })
    return palavras.every((palavra) => textos.some((texto) => texto.includes(palavra)))
  }

  async function filtrar(filtro: Omit<Filtro<T>, 'pagina' | 'porPagina'> = {}): Promise<T[]> {
    const onde = Object.fromEntries(
      Object.entries(filtro.onde ?? {}).filter(([, valor]) => valor !== undefined),
    )
    const palavras = normalizar(filtro.busca ?? '')
      .split(' ')
      .filter(Boolean)
    const linhas = (await candidatos(onde)).filter(
      (linha) =>
        Object.entries(onde).every(([campo, valor]) =>
          valor === null ? linha[campo] == null : linha[campo] === valor,
        ) &&
        (palavras.length === 0 || casaBusca(linha, palavras)),
    )
    const { ordem } = filtro
    const sentido = ordem?.direcao === 'desc' ? -1 : 1
    linhas.sort((a, b) => {
      const resultado = ordem
        ? comparar(a[ordem.campo as string], b[ordem.campo as string], sentido)
        : 0
      return resultado !== 0 ? resultado : compararIds(String(a.id), String(b.id))
    })
    return linhas as T[]
  }

  function exigirPermissao(): void {
    if (!pode(contexto.papel, 'editar', config.modulo)) {
      throw new ErroPermissao(contexto.papel, config.modulo)
    }
  }

  function validar(registro: Linha): T {
    const resultado = schema.safeParse(registro)
    if (!resultado.success) throw new ErroValidacao(resultado.error.issues)
    return resultado.data
  }

  /**
   * Recusa o registro que repete um campo único de outro da coleção (AJ-03). Na edição, só confere
   * a regra cujo valor (pela chave) ou escopo mudou: registro que já repetia continua editável.
   */
  async function exigirUnicidade(linha: Linha, antigo?: Linha): Promise<void> {
    for (const { campo, escopo, chave, mensagem } of config.unicos ?? []) {
      const procurada = chaveEm(linha, campo, chave)
      if (!procurada) continue
      const valorDoEscopo = escopo === undefined ? undefined : valorEm(linha, escopo)
      if (
        antigo &&
        chaveEm(antigo, campo, chave) === procurada &&
        (escopo === undefined || valorEm(antigo, escopo) === valorDoEscopo)
      ) {
        continue
      }
      // O índice do campo casa o valor como gravado: com `chave`, a busca fica só no escopo.
      const vizinhos = await candidatos({
        ...(chave ? {} : { [campo]: valorEm(linha, campo) }),
        ...(escopo === undefined ? {} : { [escopo]: valorDoEscopo }),
      })
      const repetido = vizinhos.some(
        (outra) =>
          outra.id !== linha.id &&
          (escopo === undefined || valorEm(outra, escopo) === valorDoEscopo) &&
          chaveEm(outra, campo, chave) === procurada,
      )
      if (repetido) {
        throw new ErroValidacao([
          {
            code: 'custom',
            path: campo.split('.'),
            message: mensagem,
            input: valorEm(linha, campo),
          },
        ])
      }
    }
  }

  async function processoDoLog(linha: Linha): Promise<Id | undefined> {
    if (tabela === 'processos') return linha.id as Id
    if (typeof linha.processoId === 'string') return linha.processoId
    if (VIA_AGC.has(tabela) && typeof linha.agcId === 'string') {
      const agc = await armazenamento.get<Tipos['agcs']>('agcs', linha.agcId)
      return agc?.processoId
    }
    return undefined
  }

  async function gravarLog(
    acao: Log['acao'],
    linha: Linha,
    mudancas: Mudanca[],
    carimbo: Carimbo,
  ): Promise<void> {
    if (!config.log) return
    const processoId = await processoDoLog(linha)
    const log: Log = {
      id: crypto.randomUUID(),
      escritorioId: contexto.usuario.escritorioId,
      criadoEm: carimbo,
      atualizadoEm: carimbo,
      usuarioId: contexto.usuario.id,
      acao,
      colecao: tabela,
      registroId: linha.id as Id,
      ...(processoId === undefined ? {} : { processoId }),
      mudancas,
      data: carimbo,
    }
    const resultado = SCHEMAS.logs.safeParse(log)
    if (!resultado.success) throw new ErroValidacao(resultado.error.issues)
    await armazenamento.put('logs', resultado.data)
  }

  return {
    async listar(filtro = {}) {
      const { pagina = 1, porPagina = POR_PAGINA, ...resto } = filtro
      // Número inválido (ex.: `Number('abc')` vindo da URL) vale o padrão.
      const tamanho = Number.isFinite(porPagina) ? Math.max(1, Math.floor(porPagina)) : POR_PAGINA
      const todos = await filtrar(resto)
      const paginas = Math.max(1, Math.ceil(todos.length / tamanho))
      const pedida = Number.isFinite(pagina) ? Math.floor(pagina) : 1
      const atual = Math.min(Math.max(1, pedida), paginas)
      return {
        itens: todos.slice((atual - 1) * tamanho, atual * tamanho),
        total: todos.length,
        pagina: atual,
        paginas,
      }
    },

    todos: filtrar,

    buscar(id) {
      return armazenamento.get<T>(tabela, id)
    },

    async criar(dados) {
      exigirPermissao()
      const carimbo = contexto.agora()
      const registro = validar({
        ...(dados as Linha),
        id: crypto.randomUUID(),
        escritorioId: contexto.usuario.escritorioId,
        criadoEm: carimbo,
        atualizadoEm: carimbo,
      })
      const linha = registro as Linha
      await armazenamento.transacao(tabelasDaGravacao, async () => {
        await exigirUnicidade(linha)
        await armazenamento.put(tabela, registro)
        await gravarLog('criou', linha, diferencas({}, semCamposDoRegistro(linha)), carimbo)
      })
      return registro
    },

    async atualizar(id, mudancas) {
      exigirPermissao()
      const carimbo = contexto.agora()
      return armazenamento.transacao(tabelasDaGravacao, async () => {
        const antigo = await armazenamento.get<Linha>(tabela, id)
        if (!antigo) throw new ErroNaoEncontrado(tabela, id)
        const novo = validar({
          ...antigo,
          ...(mudancas as Linha),
          id: antigo.id,
          escritorioId: antigo.escritorioId,
          criadoEm: antigo.criadoEm,
          atualizadoEm: carimbo,
        })
        const diferencasDoRegistro = diferencas(antigo, novo as Linha)
        // Sem mudança, nada é gravado e não há log (LOG-02).
        if (diferencasDoRegistro.length === 0) return antigo as T
        await exigirUnicidade(novo as Linha, antigo)
        await armazenamento.put(tabela, novo)
        await gravarLog('editou', novo as Linha, diferencasDoRegistro, carimbo)
        return novo
      })
    },

    async excluir(id) {
      exigirPermissao()
      const carimbo = contexto.agora()
      await armazenamento.transacao(tabelasDaGravacao, async () => {
        const antigo = await armazenamento.get<Linha>(tabela, id)
        if (!antigo) throw new ErroNaoEncontrado(tabela, id)
        await armazenamento.delete(tabela, id)
        await gravarLog('excluiu', antigo, diferencas(semCamposDoRegistro(antigo), {}), carimbo)
      })
    },
  }
}
