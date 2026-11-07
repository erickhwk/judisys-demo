// Votação na AGC: votantes (RF-32, INV-06), instalação (art. 37, §2º, RF-33, C-09), resultado por
// classe e geral (art. 45, RF-35, D-16), cram down (art. 58, §1º, RF-36, C-08) e cenários da mesa
// (RF-34, T-29). Valores em centavos inteiros (INV-03); toda comparação de fronteira ("mais da
// metade", "mais de 1/3") é feita com produtos inteiros, sem divisão.
import { formatarMoeda } from './datas'
import {
  CLASSES_VOTANTES,
  type Classe,
  type ClasseVotante,
  rotuloClasse,
  valorVigente,
} from './qgc'

export type OpcaoVoto = 'sim' | 'nao' | 'abstencao'
/** Convocação em que a AGC se instala (art. 37, §2º). */
export type Convocacao = 1 | 2

/** Campos do credor usados na votação (nomes do PRD §6). */
export interface CredorVotacao {
  id: string
  classe: Classe
  valorAj?: number | null
  valorQgc?: number | null
}

/** Credor com direito a voto: classe I a IV e valor vigente maior que zero. */
export interface Votante {
  credorId: string
  classe: ClasseVotante
  /** Valor vigente, em centavos (T-26). */
  valor: number
}

/** Voto lançado na mesa (mesmos campos da coleção `votos`). */
export interface VotoLancado {
  credorId: string
  voto: OpcaoVoto
}

function ehClasseVotante(classe: Classe): classe is ClasseVotante {
  return (CLASSES_VOTANTES as readonly Classe[]).includes(classe)
}

/**
 * Credores com direito a voto (RF-32, INV-06): fora "Não sujeito", extraconcursais e classes da
 * falência, e fora quem tem valor vigente zero. O valor da relação do devedor nunca vota (T-26).
 */
export function credoresVotantes(credores: readonly CredorVotacao[]): Votante[] {
  const votantes: Votante[] = []
  for (const credor of credores) {
    const valor = valorVigente(credor)
    if (!ehClasseVotante(credor.classe) || valor <= 0) continue
    votantes.push({ credorId: credor.id, classe: credor.classe, valor })
  }
  return votantes
}

/** Motivo pelo qual o credor não vota, para a lista de presença (AGC-24); `null` se vota. */
export function motivoSemVoto(credor: CredorVotacao): string | null {
  if (credor.classe === 'nao-sujeito') return 'Credor não sujeito à recuperação judicial'
  if (!ehClasseVotante(credor.classe)) return 'Classe sem direito a voto na AGC'
  if (valorVigente(credor) <= 0) return 'Crédito com valor zero'
  return null
}

// ---------------------------------------------------------------------------------------------
// Instalação (art. 37, §2º; C-09)

export type SituacaoInstalacaoClasse = 'sem-credores' | 'atinge' | 'nao-atinge'

export interface InstalacaoClasse {
  classe: ClasseVotante
  quantidadeTotal: number
  quantidadePresente: number
  /** Soma do valor de todos os votantes da classe (base, C-09). */
  valorTotal: number
  /** Soma do valor dos votantes presentes (numerador). */
  valorPresente: number
  situacao: SituacaoInstalacaoClasse
}

export interface Instalacao {
  convocacao: Convocacao
  classes: InstalacaoClasse[]
  instalada: boolean
}

/**
 * Quórum de instalação. Em 1ª convocação, cada classe com votantes precisa de presentes com
 * **mais da metade** do valor votante da classe (C-09); classe sem votantes não bloqueia (AGC-06).
 * Em 2ª convocação, instala com qualquer número de presentes (ao menos um).
 */
export function instalacao(
  votantes: readonly Votante[],
  presentes: Iterable<string>,
  convocacao: Convocacao,
): Instalacao {
  const idsPresentes = new Set(presentes)
  const classes = CLASSES_VOTANTES.map((classe): InstalacaoClasse => {
    const daClasse = votantes.filter((v) => v.classe === classe)
    const presentesDaClasse = daClasse.filter((v) => idsPresentes.has(v.credorId))
    const valorTotal = somarValores(daClasse)
    const valorPresente = somarValores(presentesDaClasse)
    let situacao: SituacaoInstalacaoClasse = 'sem-credores'
    if (daClasse.length > 0) situacao = valorPresente * 2 > valorTotal ? 'atinge' : 'nao-atinge'
    return {
      classe,
      quantidadeTotal: daClasse.length,
      quantidadePresente: presentesDaClasse.length,
      valorTotal,
      valorPresente,
      situacao,
    }
  })

  const algumPresente = classes.some((c) => c.quantidadePresente > 0)
  const instalada =
    convocacao === 2
      ? algumPresente
      : algumPresente && classes.every((c) => c.situacao !== 'nao-atinge')
  return { convocacao, classes, instalada }
}

function somarValores(itens: readonly { valor: number }[]): number {
  let soma = 0
  for (const item of itens) soma += item.valor
  return soma
}

// ---------------------------------------------------------------------------------------------
// Resultado por classe (art. 45; RF-35; D-16)

/** Classes I e IV votam só por cabeça; II e III, por cabeça e por valor (art. 45, §§1º e 2º). */
export function criterioDaClasse(classe: ClasseVotante): 'cabeca' | 'cabeca-e-valor' {
  return classe === 'garantia-real' || classe === 'quirografario' ? 'cabeca-e-valor' : 'cabeca'
}

export type SituacaoClasse = 'aprovada' | 'rejeitada' | 'nao-votou'

export interface Contagem {
  sim: number
  nao: number
  abstencao: number
}

export interface ResultadoClasse {
  classe: ClasseVotante
  criterio: 'cabeca' | 'cabeca-e-valor'
  /** Presentes da classe (com e sem voto lançado). */
  presentes: number
  /** Presentes ainda sem voto lançado (ficam fora da base, como abstenções). */
  semVoto: number
  cabeca: Contagem
  /** Centavos. */
  valor: Contagem
  /** Mais da metade por cabeça (base: sim + não). */
  maioriaCabeca: boolean
  /** Mais da metade do valor (base: sim + não); só decide nas classes II e III. */
  maioriaValor: boolean
  situacao: SituacaoClasse
}

/** Voto de um presente da classe; `voto: null` quando ainda não foi lançado. */
export interface VotoDaClasse {
  valor: number
  voto: OpcaoVoto | null
}

/**
 * Resultado da classe pelo art. 45. Abstenções (e presentes sem voto) ficam fora da base (D-16);
 * "mais da metade" é estrito, então empate rejeita (AGC-09). Sem nenhum "sim" ou "não" — classe sem
 * presentes ou só com abstenções — a classe "não votou" (AGC-11).
 */
export function resultadoClasse(
  classe: ClasseVotante,
  votos: readonly VotoDaClasse[],
): ResultadoClasse {
  const cabeca: Contagem = { sim: 0, nao: 0, abstencao: 0 }
  const valor: Contagem = { sim: 0, nao: 0, abstencao: 0 }
  let semVoto = 0
  for (const { valor: valorVoto, voto } of votos) {
    if (voto === null) {
      semVoto += 1
      continue
    }
    cabeca[voto] += 1
    valor[voto] += valorVoto
  }

  const criterio = criterioDaClasse(classe)
  const maioriaCabeca = maisDaMetade(cabeca.sim, cabeca.sim + cabeca.nao)
  const maioriaValor = maisDaMetade(valor.sim, valor.sim + valor.nao)
  let situacao: SituacaoClasse = 'nao-votou'
  if (cabeca.sim + cabeca.nao > 0) {
    const aprovada = criterio === 'cabeca' ? maioriaCabeca : maioriaCabeca && maioriaValor
    situacao = aprovada ? 'aprovada' : 'rejeitada'
  }
  return {
    classe,
    criterio,
    presentes: votos.length,
    semVoto,
    cabeca,
    valor,
    maioriaCabeca,
    maioriaValor,
    situacao,
  }
}

function maisDaMetade(parte: number, base: number): boolean {
  return base > 0 && parte * 2 > base
}

function maisDeUmTerco(parte: number, base: number): boolean {
  return base > 0 && parte * 3 > base
}

// ---------------------------------------------------------------------------------------------
// Cram down (art. 58, §1º; RF-36; C-08)

export interface RequisitoCramDown {
  numero: 1 | 2 | 3
  descricao: string
  cumprido: boolean
  /** Explicação curta do porquê, para o painel. */
  detalhe: string
}

export interface CramDown {
  requisitos: [RequisitoCramDown, RequisitoCramDown, RequisitoCramDown]
  cumprido: boolean
}

/**
 * Os três requisitos do art. 58, §1º, cada um marcado como cumprido ou não (C-08):
 * 1. "sim" com mais da metade do valor dos presentes, de todas as classes (abstenções fora, D-16);
 * 2. aprovação de 3 classes; se só 3 classes votaram, de 2; se só 2, de 1 (classe que não votou
 *    não conta, RF-35);
 * 3. em cada classe que rejeitou, "sim" de mais de 1/3 por cabeça (I e IV) ou de mais de 1/3 do
 *    valor **e** mais de 1/3 por cabeça (II e III).
 */
export function cramDown(resultados: readonly ResultadoClasse[]): CramDown {
  const valorSim = resultados.reduce((soma, r) => soma + r.valor.sim, 0)
  const valorBase = resultados.reduce((soma, r) => soma + r.valor.sim + r.valor.nao, 0)
  const requisito1: RequisitoCramDown = {
    numero: 1,
    descricao: 'Voto favorável de mais da metade do valor de todos os créditos presentes',
    cumprido: maisDaMetade(valorSim, valorBase),
    detalhe: `${formatarMoeda(valorSim)} de ${formatarMoeda(valorBase)} votaram sim`,
  }

  const votaram = resultados.filter((r) => r.situacao !== 'nao-votou')
  const aprovaram = votaram.filter((r) => r.situacao === 'aprovada').length
  const exigidas = aprovacoesExigidas(votaram.length)
  const requisito2: RequisitoCramDown = {
    numero: 2,
    descricao: 'Aprovação de 3 classes ou, se só 3 votaram, de 2 ou, se só 2 votaram, de 1 classe',
    cumprido: exigidas !== null && aprovaram >= exigidas,
    detalhe:
      exigidas === null
        ? `Só ${votaram.length} classe votou`
        : `${aprovaram} de ${votaram.length} classes aprovaram; exigidas ${exigidas}`,
  }

  const rejeitaram = votaram.filter((r) => r.situacao === 'rejeitada')
  const falharam = rejeitaram.filter((r) => !umTercoNaClasse(r))
  const requisito3: RequisitoCramDown = {
    numero: 3,
    descricao:
      'Em cada classe que rejeitou, voto favorável de mais de 1/3 dos credores, computados como no art. 45',
    cumprido: rejeitaram.length > 0 && falharam.length === 0,
    detalhe:
      rejeitaram.length === 0
        ? 'Nenhuma classe rejeitou'
        : falharam.length === 0
          ? 'Todas as classes que rejeitaram passam de 1/3'
          : `Não passa de 1/3: ${falharam.map((r) => rotuloClasse(r.classe, 'rj')).join(', ')}`,
  }

  return {
    requisitos: [requisito1, requisito2, requisito3],
    cumprido: requisito1.cumprido && requisito2.cumprido && requisito3.cumprido,
  }
}

/** Aprovações exigidas pelo inciso II conforme o número de classes que votaram; `null` se < 2. */
function aprovacoesExigidas(classesQueVotaram: number): number | null {
  if (classesQueVotaram >= 4) return 3
  if (classesQueVotaram === 3) return 2
  if (classesQueVotaram === 2) return 1
  return null
}

function umTercoNaClasse(resultado: ResultadoClasse): boolean {
  const { cabeca, valor } = resultado
  const porCabeca = maisDeUmTerco(cabeca.sim, cabeca.sim + cabeca.nao)
  if (resultado.criterio === 'cabeca') return porCabeca
  return porCabeca && maisDeUmTerco(valor.sim, valor.sim + valor.nao)
}

// ---------------------------------------------------------------------------------------------
// Resultado geral

export type SituacaoAgc = 'aprovado' | 'rejeitado' | 'cram-down' | 'sem-votos'

export interface ResultadoAgc {
  classes: ResultadoClasse[]
  situacao: SituacaoAgc
  /** Só quando alguma classe rejeitou (RF-36; AGC-18: com todas aprovando não aparece). */
  cramDown: CramDown | null
}

/**
 * Resultado da votação: por classe (I a IV) e geral. "aprovado" quando todas as classes que
 * votaram aprovam; com alguma rejeição, "cram-down" se os três requisitos se cumprem, senão
 * "rejeitado"; "sem-votos" se nenhuma classe votou.
 */
export function resultadoAgc(
  votantes: readonly Votante[],
  presentes: Iterable<string>,
  votos: readonly VotoLancado[],
): ResultadoAgc {
  const idsPresentes = new Set(presentes)
  const votoPorCredor = new Map(votos.map((v) => [v.credorId, v.voto]))
  const classes = CLASSES_VOTANTES.map((classe) =>
    resultadoClasse(
      classe,
      votantes
        .filter((v) => v.classe === classe && idsPresentes.has(v.credorId))
        .map((v) => ({ valor: v.valor, voto: votoPorCredor.get(v.credorId) ?? null })),
    ),
  )

  const votaram = classes.filter((c) => c.situacao !== 'nao-votou')
  if (votaram.length === 0) return { classes, situacao: 'sem-votos', cramDown: null }
  if (votaram.every((c) => c.situacao === 'aprovada')) {
    return { classes, situacao: 'aprovado', cramDown: null }
  }
  const verificacao = cramDown(classes)
  return {
    classes,
    situacao: verificacao.cumprido ? 'cram-down' : 'rejeitado',
    cramDown: verificacao,
  }
}

// ---------------------------------------------------------------------------------------------
// Cenários da mesa de votação (RF-34, T-29)

export const CENARIOS = [
  { id: 'aprovacao-folgada', rotulo: 'Aprovação folgada' },
  { id: 'classe-iii-rejeita', rotulo: 'Classe III rejeita' },
  { id: 'cram-down', rotulo: 'Aprovação por cram down' },
  { id: 'aleatorio', rotulo: 'Aleatório' },
  { id: 'limpar', rotulo: 'Limpar' },
] as const
export type NomeCenario = (typeof CENARIOS)[number]['id']

/** Gerador de números em [0, 1), injetável para os testes (ex.: `criarRng(42)`). */
export type Rng = () => number

export const MENSAGEM_CENARIO_IMPOSSIVEL = 'Este cenário não é possível com as presenças atuais'

export type ResultadoCenario =
  | { possivel: true; votos: VotoLancado[] }
  | { possivel: false; mensagem: string }

/** Tentativas aleatórias antes de desistir (as determinísticas vêm antes). */
const TENTATIVAS = 200

/**
 * Votos de um cenário para os votantes presentes. Os votos devolvidos substituem todos os da
 * mesa ("Limpar" devolve lista vazia). Quando as presenças não permitem o cenário, nada muda e
 * volta a mensagem de T-29.
 */
export function cenario(
  nome: NomeCenario,
  presentes: readonly Votante[],
  rng: Rng,
): ResultadoCenario {
  if (nome === 'limpar') return { possivel: true, votos: [] }
  if (presentes.length === 0) return impossivel()

  switch (nome) {
    case 'aleatorio':
      return { possivel: true, votos: presentes.map((p) => votoDe(p, sorteioAleatorio(rng))) }
    case 'aprovacao-folgada':
      return primeiroQueSatisfaz(
        presentes,
        candidatosFolgados(presentes, rng, null),
        (r) => r.situacao === 'aprovado',
      )
    case 'classe-iii-rejeita':
      if (!presentes.some((p) => p.classe === 'quirografario')) return impossivel()
      return primeiroQueSatisfaz(
        presentes,
        candidatosFolgados(presentes, rng, 'quirografario'),
        (r) => r.situacao === 'rejeitado' && soQuirografarioRejeita(r),
      )
    case 'cram-down':
      return primeiroQueSatisfaz(
        presentes,
        candidatosCramDown(presentes, rng),
        (r) => r.situacao === 'cram-down',
      )
  }
}

function impossivel(): ResultadoCenario {
  return { possivel: false, mensagem: MENSAGEM_CENARIO_IMPOSSIVEL }
}

function votoDe(votante: Votante, voto: OpcaoVoto): VotoLancado {
  return { credorId: votante.credorId, voto }
}

/** A classe III rejeita e nenhuma outra (as demais aprovam ou não votaram). */
function soQuirografarioRejeita(resultado: ResultadoAgc): boolean {
  return resultado.classes.every(
    (c) => (c.situacao === 'rejeitada') === (c.classe === 'quirografario'),
  )
}

function sorteioAleatorio(rng: Rng): OpcaoVoto {
  const sorteio = rng()
  if (sorteio < 0.6) return 'sim'
  if (sorteio < 0.9) return 'nao'
  return 'abstencao'
}

/** Confere cada candidato com as próprias regras e devolve o primeiro que dá o resultado pedido. */
function primeiroQueSatisfaz(
  presentes: readonly Votante[],
  candidatos: Iterable<VotoLancado[]>,
  satisfaz: (resultado: ResultadoAgc) => boolean,
): ResultadoCenario {
  const ids = presentes.map((p) => p.credorId)
  for (const votos of candidatos) {
    if (satisfaz(resultadoAgc(presentes, ids, votos))) return { possivel: true, votos }
  }
  return impossivel()
}

/**
 * Aprovação com folga: cerca de 15% de "não" sorteados; a classe `rejeita` vota toda "não".
 * Por último, todos "sim" (fora a que rejeita), que sempre aprova.
 */
function* candidatosFolgados(
  presentes: readonly Votante[],
  rng: Rng,
  rejeita: ClasseVotante | null,
): Generator<VotoLancado[]> {
  for (let i = 0; i < 20; i++) {
    yield presentes.map((p) =>
      votoDe(p, p.classe === rejeita ? 'nao' : rng() < 0.15 ? 'nao' : 'sim'),
    )
  }
  yield presentes.map((p) => votoDe(p, p.classe === rejeita ? 'nao' : 'sim'))
}

/** Preferência da classe que rejeita no cenário de cram down: a III primeiro, como no roteiro. */
const PREFERENCIA_REJEICAO: readonly ClasseVotante[] = [
  'quirografario',
  'garantia-real',
  'me-epp',
  'trabalhista',
]

/**
 * Candidatos a cram down: as demais classes votam todas "sim" e, na classe escolhida para
 * rejeitar, um subconjunto vota "sim" e o resto "não". Primeiro subconjuntos determinísticos
 * (os k maiores e os k menores credores), depois sorteados.
 */
function* candidatosCramDown(presentes: readonly Votante[], rng: Rng): Generator<VotoLancado[]> {
  for (const classe of PREFERENCIA_REJEICAO) {
    const daClasse = presentes
      .filter((p) => p.classe === classe)
      .sort((a, b) => b.valor - a.valor || a.credorId.localeCompare(b.credorId))
    if (daClasse.length === 0) continue
    const montar = (sim: ReadonlySet<string>) =>
      presentes.map((p) => votoDe(p, p.classe !== classe || sim.has(p.credorId) ? 'sim' : 'nao'))
    for (let k = 1; k < daClasse.length; k++) {
      yield montar(new Set(daClasse.slice(0, k).map((p) => p.credorId)))
      yield montar(new Set(daClasse.slice(-k).map((p) => p.credorId)))
    }
    for (let i = 0; i < TENTATIVAS; i++) {
      yield montar(new Set(daClasse.filter(() => rng() < 0.5).map((p) => p.credorId)))
    }
  }
}

/** RNG determinístico (mulberry32) para testes e para sortear com semente conhecida. */
export function criarRng(semente: number): Rng {
  let estado = semente >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
