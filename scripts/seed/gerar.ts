// Gerador do seed da demo (RF-45 a RF-47, T-06, T-07, T-21, T-24, INV-05, INV-07). Função pura e
// determinística: faker pt_BR com semente fixa, datas calculadas a partir de DATA_BASE e, no fim,
// trocadas por deslocamentos relativos. Prazos, RMAs, votação e logs saem das regras de src/regras.
import { createHash } from 'node:crypto'
import { base, Faker, pt_BR } from '@faker-js/faker'
import type { Tabela } from '../../src/dados/armazenamento'
import { COLECOES } from '../../src/dados/repositorio'
import { CAMPOS_REGISTRO, type CategoriaInforme, type Tipos } from '../../src/dados/schemas'
import { type Carimbo, type DataIso, somarDias } from '../../src/regras/datas'
import { diferencas, type Mudanca } from '../../src/regras/diff'
import { completarCnj, completarCnpj, completarCpf } from '../../src/regras/documentos'
import { ehFaseFinal, type Fase, fasesSeguintes, validarDataDoMarco } from '../../src/regras/fases'
import { pode } from '../../src/regras/permissoes'
import {
  type NovoPrazoAutomatico,
  novoRma,
  prazosDoMarco,
  TITULO_RMA,
} from '../../src/regras/prazos'
import { type Classe, rotuloClasse } from '../../src/regras/qgc'
import {
  credoresVotantes,
  instalacao,
  type OpcaoVoto,
  type ResultadoAgc,
  resultadoAgc,
  type Votante,
} from '../../src/regras/votacao'
import { type ChavePdf, caminhoDoPdf, PDF_DA_CATEGORIA, PDFS } from './anexos'
import { carimbo, DATA_BASE, dia, relativizar } from './datas'
import {
  BANCOS,
  DOMINIO,
  ESCRITORIO,
  EXTRACONCURSAIS,
  FISCOS,
  NAO_SUJEITOS,
  USUARIOS,
} from './nomes'
import { ID_VITRINE, PROCESSOS, type ProcessoDoSeed } from './processos'

/** Semente do faker (INV-07). Mudar a semente muda o seed inteiro e a versão. */
export const SEMENTE = 20261107

/** Dias de histórico de logs (RF-43). */
export const DIAS_DE_LOG = 60

export type TabelasDoSeed = { [K in Tabela]: Tipos[K][] }

/** Conteúdo de public/seed.json: as tabelas, com as datas no formato relativo (T-24). */
export interface ArquivoSeed {
  versao: string
  tabelas: TabelasDoSeed
}

/** Conteúdo de public/seed-versao.json (SDD §5.5, passo 2). */
export interface ArquivoVersao {
  versao: string
}

const RAMOS = [
  'Comércio',
  'Serviços',
  'Distribuidora',
  'Transportes',
  'Indústria',
  'Engenharia',
  'Representações',
  'Consultoria',
] as const

/** Prazo que se cumpre quando o processo chega a uma fase (os demais vencem pela data). */
const FASE_QUE_CUMPRE: Readonly<Record<string, Fase>> = {
  'Apresentação do plano': 'plano-apresentado',
  'Realização da AGC': 'agc',
  'Relação do AJ': 'relacao-aj-publicada',
  'Realização dos ativos': 'pagamentos',
}

/** Distribuição das classes por tipo de processo (frações do total de credores). */
const CLASSES_POR_TIPO: Readonly<Record<'rj' | 'falencia', readonly [Classe, number][]>> = {
  rj: [
    ['trabalhista', 0.42],
    ['garantia-real', 0.03],
    ['me-epp', 0.17],
    ['nao-sujeito', 0.03],
    ['quirografario', 0.35],
  ],
  falencia: [
    ['trabalhista', 0.36],
    ['garantia-real', 0.03],
    ['tributario', 0.03],
    ['multas', 0.03],
    ['subordinados', 0.03],
    ['juros', 0.03],
    ['extraconcursal', 0.07],
    ['quirografario', 0.42],
  ],
}

// ---------------------------------------------------------------------------------------------
// Entrada

/** Gera as tabelas do seed, já com as datas relativas (T-24). */
export function gerarTabelas(): TabelasDoSeed {
  return relativizar(new Gerador().gerar())
}

/** Seed completo: tabelas e versão (hash curto do conteúdo, T-06). */
export function gerarSeed(): ArquivoSeed {
  const tabelas = gerarTabelas()
  return { versao: versaoDoConteudo(JSON.stringify(tabelas)), tabelas }
}

/** Hash curto (12 hex do SHA-256) do conteúdo das tabelas. */
export function versaoDoConteudo(texto: string): string {
  return createHash('sha256').update(texto).digest('hex').slice(0, 12)
}

/** Texto de public/seed.json e de public/seed-versao.json. */
export function serializarSeed(seed: ArquivoSeed): { seed: string; versao: string } {
  const versao: ArquivoVersao = { versao: seed.versao }
  return { seed: `${JSON.stringify(seed)}\n`, versao: `${JSON.stringify(versao)}\n` }
}

// ---------------------------------------------------------------------------------------------
// Gerador

type Marco = Tipos['marcosDeFase']
type Prazo = Tipos['prazos']
type Credor = Tipos['credores']

interface EdicaoDoLog {
  tabela: Tabela
  registroId: string
  processoId?: string
  mudancas: Mudanca[]
  data: Carimbo
  responsavelId?: string
}

class Gerador {
  private readonly faker = new Faker({ locale: [pt_BR, base], seed: SEMENTE })
  private readonly tabelas = tabelasVazias()
  private readonly contadores = new Map<string, number>()
  private readonly documentosUsados = new Set<string>()
  private readonly documentosInstitucionais = new Map<string, string>()
  private readonly empresasDoProcesso = new Map<string, string[]>()
  private readonly edicoes: EdicaoDoLog[] = []

  gerar(): TabelasDoSeed {
    const criadoEscritorio = carimbo(dia(-900), 9, 0)
    this.tabelas.escritorios.push({
      ...this.registro(ESCRITORIO.id, criadoEscritorio),
      nome: ESCRITORIO.nome,
    })
    for (const usuario of USUARIOS) {
      this.tabelas.usuarios.push({ ...this.registro(usuario.id, criadoEscritorio), ...usuario })
    }
    for (const processo of PROCESSOS) this.gerarProcesso(processo)
    this.gerarEdicoesAvulsas()
    this.gerarLogs()
    return this.tabelas
  }

  // --- utilidades ------------------------------------------------------------------------------

  private novoId(prefixo: string, digitos: number): string {
    const n = (this.contadores.get(prefixo) ?? 0) + 1
    this.contadores.set(prefixo, n)
    return `${prefixo}-${String(n).padStart(digitos, '0')}`
  }

  private registro(id: string, criadoEm: Carimbo, atualizadoEm: Carimbo = criadoEm) {
    return { id, escritorioId: ESCRITORIO.id, criadoEm, atualizadoEm }
  }

  private inteiro(min: number, max: number): number {
    return this.faker.number.int({ min, max })
  }

  private chance(probabilidade: number): boolean {
    return this.faker.number.float({ min: 0, max: 1 }) < probabilidade
  }

  private escolher<T>(itens: readonly T[]): T {
    return this.faker.helpers.arrayElement(itens)
  }

  /** Carimbo em horário de expediente na data dada. */
  private noExpediente(data: DataIso): Carimbo {
    return carimbo(data, this.inteiro(8, 17), this.inteiro(0, 59))
  }

  private digitos(quantidade: number): string {
    return this.faker.string.numeric({ length: quantidade, allowLeadingZeros: true })
  }

  private novoCpf(): string {
    for (;;) {
      const cpf = completarCpf(this.digitos(9))
      if (!this.documentosUsados.has(cpf) && !/^(\d)\1*$/.test(cpf)) {
        this.documentosUsados.add(cpf)
        return cpf
      }
    }
  }

  private novoCnpj(): string {
    for (;;) {
      const cnpj = completarCnpj(`${this.digitos(8)}0001`)
      if (!this.documentosUsados.has(cnpj)) {
        this.documentosUsados.add(cnpj)
        return cnpj
      }
    }
  }

  /** Mesmo CNPJ para a mesma instituição em todos os processos (bancos, fiscos...). */
  private cnpjInstitucional(nome: string): string {
    let cnpj = this.documentosInstitucionais.get(nome)
    if (cnpj === undefined) {
      cnpj = this.novoCnpj()
      this.documentosInstitucionais.set(nome, cnpj)
    }
    return cnpj
  }

  private nomePessoa(): string {
    const nome = this.faker.person.firstName()
    const sobrenomes = this.chance(0.6)
      ? `${this.faker.person.lastName()} ${this.faker.person.lastName()}`
      : this.faker.person.lastName()
    return `${nome} ${sobrenomes}`
  }

  /** Razão social: sobrenomes do faker, um ramo e o tipo societário (ou ME/EPP). */
  private nomeEmpresa(tipo?: 'ME' | 'EPP'): string {
    const nomes = this.faker.company
      .name()
      .replace(/ (LTDA|S\.A\.|EIRELI|Comércio|e Associados)$/, '')
    const ramo = this.escolher(RAMOS)
    return `${nomes} ${ramo} ${tipo ?? this.escolher(['Ltda.', 'Ltda.', 'S.A.'])}`
  }

  /** Centavos entre `min` e `max` reais. */
  private valor(minReais: number, maxReais: number): number {
    return this.inteiro(minReais * 100, maxReais * 100)
  }

  /** Usuário que grava na coleção: o responsável, se o papel permite, ou outro que possa. */
  private autor(tabela: Tabela, responsavelId?: string): string {
    const { modulo } = COLECOES[tabela]
    const podem = USUARIOS.filter((u) => pode(u.papel, 'editar', modulo))
    const responsavel = podem.find((u) => u.id === responsavelId)
    if (responsavel && this.chance(0.5)) return responsavel.id
    return this.escolher(podem).id
  }

  // --- processo --------------------------------------------------------------------------------

  private gerarProcesso(especificacao: ProcessoDoSeed): void {
    const marcos = this.gerarMarcos(especificacao)
    const primeiro = marcos[0]
    if (!primeiro) throw new Error(`Processo sem marcos: ${especificacao.id}`)
    const criadoEm = primeiro.criadoEm
    const empresaIds = this.gerarEmpresas(especificacao, criadoEm)
    const credores = this.gerarCredores(especificacao, marcos, criadoEm)
    this.gerarPedidos(especificacao, marcos, credores)

    const passivoDeclarado = credores.reduce((soma, c) => soma + c.valorDevedor, 0)
    const ultimo = marcos[marcos.length - 1] ?? primeiro
    const ano = primeiro.data.slice(0, 4)
    const numeroCnj = completarCnj(
      `${this.digitos(7)}${ano}8${especificacao.tribunal}${this.digitos(4)}`,
    )
    const processo: Tipos['processos'] = {
      ...this.registro(especificacao.id, criadoEm, ultimo.criadoEm),
      apelido: especificacao.apelido,
      numeroCnj,
      tipo: especificacao.tipo,
      comarca: especificacao.comarca,
      uf: especificacao.uf,
      vara: especificacao.vara,
      email: `${especificacao.id}@${DOMINIO}`,
      consolidacao: especificacao.consolidacao,
      passivoDeclarado,
      responsavelId: especificacao.responsavelId,
      honorariosPercentual: especificacao.honorariosPercentual,
      honorariosValor: Math.round((passivoDeclarado * especificacao.honorariosPercentual) / 100),
      faseAtual: ultimo.fase,
    }
    this.tabelas.processos.push(processo)
    for (const empresaId of empresaIds) {
      this.tabelas.processoEmpresas.push({
        ...this.registro(this.novoId('pem', 3), criadoEm),
        processoId: especificacao.id,
        empresaId,
      })
    }
    this.tabelas.marcosDeFase.push(...marcos)
    this.tabelas.credores.push(...credores)

    // Cada avanço de fase depois do primeiro marco edita a fase atual do processo.
    for (let i = 1; i < marcos.length; i++) {
      const marco = marcos[i]
      const anterior = marcos[i - 1]
      if (!marco || !anterior) continue
      this.edicoes.push({
        tabela: 'processos',
        registroId: especificacao.id,
        processoId: especificacao.id,
        mudancas: [{ campo: 'faseAtual', de: anterior.fase, para: marco.fase }],
        data: marco.criadoEm,
        responsavelId: especificacao.responsavelId,
      })
    }

    const rmasCumpridos = this.gerarPrazos(especificacao, marcos)
    const ata = this.gerarAgc(especificacao, marcos, credores)
    this.gerarInformes(especificacao, marcos, rmasCumpridos, ata)
  }

  /** Marcos em datas absolutas, conferidos pelas regras de fase (T-27, INV-04). */
  private gerarMarcos(especificacao: ProcessoDoSeed): Marco[] {
    const marcos: Marco[] = []
    for (const [fase, deslocamento] of especificacao.marcos) {
      const data = dia(deslocamento)
      const anterior = marcos[marcos.length - 1]
      const permitida =
        anterior === undefined
          ? fase === (especificacao.tipo === 'rj' ? 'pedido' : 'decretada')
          : fasesSeguintes(especificacao.tipo, anterior.fase).includes(fase)
      const erroData = validarDataDoMarco(data, marcos)
      if (!permitida || erroData !== null || data > DATA_BASE) {
        throw new Error(`Marco inválido em ${especificacao.id}: ${fase} em ${data}`)
      }
      marcos.push({
        ...this.registro(this.novoId('mrc', 3), this.noExpediente(data)),
        processoId: especificacao.id,
        fase,
        data,
      })
    }
    return marcos
  }

  private gerarEmpresas(especificacao: ProcessoDoSeed, criadoEm: Carimbo): string[] {
    const ids = especificacao.empresasDe
      ? [...(this.empresasDoProcesso.get(especificacao.empresasDe) ?? [])]
      : []
    for (const empresa of especificacao.empresas) {
      const id = this.novoId('emp', 3)
      this.tabelas.empresas.push({
        ...this.registro(id, criadoEm),
        ...empresa,
        cnpj: this.novoCnpj(),
        cidade: especificacao.comarca,
        uf: especificacao.uf,
      })
      ids.push(id)
    }
    this.empresasDoProcesso.set(especificacao.id, ids)
    return ids
  }

  // --- credores --------------------------------------------------------------------------------

  private gerarCredores(
    especificacao: ProcessoDoSeed,
    marcos: readonly Marco[],
    criadoEm: Carimbo,
  ): Credor[] {
    const distribuicao = CLASSES_POR_TIPO[especificacao.tipo]
    const quantidades = distribuicao.map(([classe, fracao]) => [
      classe,
      Math.max(1, Math.floor(especificacao.credores * fracao)),
    ]) as [Classe, number][]
    // A última classe (quirografários) fecha a conta.
    const semUltima = quantidades.slice(0, -1).reduce((soma, [, n]) => soma + n, 0)
    const ultima = quantidades[quantidades.length - 1]
    if (ultima) ultima[1] = especificacao.credores - semUltima

    // Credores entram com a relação do devedor, na data do pedido ou da decretação.
    const dataRelacaoAj = marcos.find(
      (m) => m.fase === 'relacao-aj-publicada' || m.fase === 'quadro-credores',
    )?.criadoEm
    const credores: Credor[] = []
    for (const [classe, quantidade] of quantidades) {
      for (let i = 0; i < quantidade; i++) {
        const { nome, documento, natureza, valorDevedor } = this.credorDaClasse(classe, i)
        const credor: Credor = {
          ...this.registro(this.novoId('crd', 4), criadoEm, dataRelacaoAj ?? criadoEm),
          processoId: especificacao.id,
          nome,
          documento,
          classe,
          natureza,
          valorDevedor,
          valorAj: null,
          valorQgc: null,
        }
        if (especificacao.relacoes !== 'devedor') credor.valorAj = this.ajustar(valorDevedor, 0.3)
        if (especificacao.relacoes === 'qgc')
          credor.valorQgc = this.ajustar(credor.valorAj ?? 0, 0.1)
        credores.push(credor)
      }
    }
    return credores
  }

  /** Valor revisto: igual na maioria dos casos, às vezes maior ou menor, raramente zerado. */
  private ajustar(valor: number, chanceDeMudar: number): number {
    if (!this.chance(chanceDeMudar)) return valor
    if (this.chance(0.1)) return 0
    const fator = this.inteiro(75, 130) / 100
    return Math.round(valor * fator)
  }

  private credorDaClasse(
    classe: Classe,
    indice: number,
  ): { nome: string; documento: string; natureza: string; valorDevedor: number } {
    const pessoa = () => ({ nome: this.nomePessoa(), documento: this.novoCpf() })
    const empresa = () => ({ nome: this.nomeEmpresa(), documento: this.novoCnpj() })
    const instituicao = (nome: string) => ({ nome, documento: this.cnpjInstitucional(nome) })
    switch (classe) {
      case 'trabalhista':
        return {
          ...pessoa(),
          natureza: this.escolher([
            'Verbas rescisórias',
            'Salários e férias',
            'Horas extras',
            'Indenização por acidente de trabalho',
          ]),
          valorDevedor: this.valor(3_000, 180_000),
        }
      case 'garantia-real': {
        const banco = BANCOS[indice]
        return banco
          ? {
              ...instituicao(banco),
              natureza: 'Cédula de crédito bancário com hipoteca',
              valorDevedor: this.valor(800_000, 18_000_000),
            }
          : {
              ...empresa(),
              natureza: 'Penhor de máquinas e equipamentos',
              valorDevedor: this.valor(150_000, 2_500_000),
            }
      }
      case 'quirografario':
        return {
          ...(this.chance(0.65) ? empresa() : pessoa()),
          natureza: this.escolher([
            'Fornecimento de mercadorias',
            'Prestação de serviços',
            'Duplicatas',
            'Contrato de mútuo',
          ]),
          valorDevedor: this.valor(1_500, 1_800_000),
        }
      case 'me-epp':
        return {
          nome: this.nomeEmpresa(this.escolher(['ME', 'EPP'] as const)),
          documento: this.novoCnpj(),
          natureza: this.escolher(['Fornecimento de mercadorias', 'Prestação de serviços']),
          valorDevedor: this.valor(1_000, 280_000),
        }
      case 'nao-sujeito': {
        const credor = NAO_SUJEITOS[indice % NAO_SUJEITOS.length] ?? NAO_SUJEITOS[0]
        return {
          ...(indice < NAO_SUJEITOS.length ? instituicao(credor.nome) : empresa()),
          natureza: credor.natureza,
          valorDevedor: this.valor(120_000, 4_500_000),
        }
      }
      case 'tributario':
        return {
          ...instituicao(FISCOS[indice % FISCOS.length] ?? FISCOS[0]),
          natureza: 'Créditos tributários',
          valorDevedor: this.valor(50_000, 3_000_000),
        }
      case 'multas':
        return {
          ...instituicao(FISCOS[indice % FISCOS.length] ?? FISCOS[0]),
          natureza: 'Multas tributárias e administrativas',
          valorDevedor: this.valor(5_000, 400_000),
        }
      case 'subordinados':
        return {
          ...pessoa(),
          natureza: 'Crédito de sócio',
          valorDevedor: this.valor(20_000, 900_000),
        }
      case 'juros':
        return {
          ...instituicao(BANCOS[indice % BANCOS.length] ?? BANCOS[0]),
          natureza: 'Juros vencidos após a decretação',
          valorDevedor: this.valor(10_000, 600_000),
        }
      case 'extraconcursal': {
        const credor = EXTRACONCURSAIS[indice]
        return credor
          ? {
              ...instituicao(credor.nome),
              natureza: credor.natureza,
              valorDevedor: this.valor(8_000, 250_000),
            }
          : {
              ...pessoa(),
              natureza: 'Serviços prestados após a decretação',
              valorDevedor: this.valor(2_000, 40_000),
            }
      }
    }
  }

  // --- prazos ----------------------------------------------------------------------------------

  /** Prazos de cada marco pelas regras (RF-22) e a cadeia de RMAs (INV-05). Devolve os RMAs cumpridos. */
  private gerarPrazos(especificacao: ProcessoDoSeed, marcos: readonly Marco[]): Prazo[] {
    const processo = { id: especificacao.id, tipo: especificacao.tipo }
    const fasesAlcancadas = new Set(marcos.map((m) => m.fase))
    const ultimo = marcos[marcos.length - 1]
    const finalizado = ultimo !== undefined && ehFaseFinal(ultimo.fase)
    let primeiroRma: { prazo: NovoPrazoAutomatico; marco: Marco } | undefined

    for (let i = 0; i < marcos.length; i++) {
      const marco = marcos[i]
      if (!marco) continue
      for (const novo of prazosDoMarco(processo, marco, marcos.slice(0, i + 1))) {
        if (novo.titulo === TITULO_RMA) {
          primeiroRma = { prazo: novo, marco }
          continue
        }
        const faseQueCumpre = FASE_QUE_CUMPRE[novo.titulo]
        const cumprido =
          finalizado ||
          (faseQueCumpre !== undefined
            ? fasesAlcancadas.has(faseQueCumpre)
            : novo.vencimento < DATA_BASE)
        this.tabelas.prazos.push({
          ...this.registro(this.novoId('prz', 4), marco.criadoEm),
          ...novo,
          status: cumprido ? 'cumprido' : 'aberto',
        })
      }
    }
    return primeiroRma ? this.gerarRmas(especificacao, primeiroRma, ultimo, finalizado) : []
  }

  /**
   * RMAs mensais: cada um cumprido gera o seguinte com `novoRma` (PRZ-01). RJ ativa termina com
   * exatamente um aberto (INV-05): o do próximo dia 15, ou o do mês passado se `rmaVencido`. RJ em
   * fase final para no último vencimento antes da fase final, todos cumpridos.
   */
  private gerarRmas(
    especificacao: ProcessoDoSeed,
    primeiro: { prazo: NovoPrazoAutomatico; marco: Marco },
    ultimo: Marco | undefined,
    finalizado: boolean,
  ): Prazo[] {
    const cumpridos: Prazo[] = []
    let novo = primeiro.prazo
    let criadoEm = primeiro.marco.criadoEm
    for (;;) {
      const id = this.novoId('prz', 4)
      const seguinte = novoRma(especificacao.id, novo.vencimento)
      const aberto = finalizado
        ? false
        : especificacao.rmaVencido
          ? seguinte.vencimento >= DATA_BASE
          : novo.vencimento >= DATA_BASE
      if (aberto) {
        this.tabelas.prazos.push({ ...this.registro(id, criadoEm), ...novo })
        return cumpridos
      }
      // Entregue dois dias antes do vencimento.
      const entregue = this.noExpediente(somarDias(novo.vencimento, -2))
      const prazo: Prazo = { ...this.registro(id, criadoEm, entregue), ...novo, status: 'cumprido' }
      this.tabelas.prazos.push(prazo)
      cumpridos.push(prazo)
      this.edicoes.push({
        tabela: 'prazos',
        registroId: id,
        processoId: especificacao.id,
        mudancas: [{ campo: 'status', de: 'aberto', para: 'cumprido' }],
        data: entregue,
        responsavelId: especificacao.responsavelId,
      })
      if (finalizado && ultimo !== undefined && seguinte.vencimento > ultimo.data) return cumpridos
      novo = seguinte
      criadoEm = entregue
    }
  }

  // --- pedidos de crédito ----------------------------------------------------------------------

  private gerarPedidos(
    especificacao: ProcessoDoSeed,
    marcos: readonly Marco[],
    credores: Credor[],
  ): void {
    const dataDe = (fase: Fase) => marcos.find((m) => m.fase === fase)?.data
    const edital = dataDe('edital-publicado')
    const relacao = dataDe('relacao-aj-publicada') ?? dataDe('quadro-credores')
    const ultimaFase = marcos[marcos.length - 1]?.fase ?? 'pedido'
    // Com o edital como fase atual, o prazo das habilitações corre: os pedidos estão pendentes.
    const pendente = ultimaFase === 'edital-publicado'

    // Divergências e habilitações na fase administrativa (art. 7º, §1º).
    if (edital !== undefined) {
      const quantidade = pendente ? 5 : 6
      for (let i = 0; i < quantidade; i++) {
        const data = somarDias(edital, 1 + ((i * 2) % 14))
        const credor = this.escolher(credores.filter((c) => c.classe !== 'nao-sujeito'))
        const tipo = i % 3 === 2 ? 'habilitacao' : 'divergencia'
        const valorPedido = Math.round(credor.valorDevedor * (this.inteiro(105, 160) / 100))
        const status = pendente ? 'pendente' : i % 3 === 1 ? 'rejeitado' : 'acolhido'
        if (status === 'acolhido') {
          if (tipo === 'habilitacao') credor.valorDevedor = 0 // credor criado pelo pedido (CRD-05)
          credor.valorAj = valorPedido
          if (credor.valorQgc !== null && credor.valorQgc !== undefined)
            credor.valorQgc = valorPedido
        }
        if (pendente && tipo === 'habilitacao') {
          this.novoPedido(especificacao.id, data, {
            requerente: { nome: this.nomePessoa(), documento: this.novoCpf() },
            tipo,
            valorPedido: this.valor(5_000, 90_000),
            classePedida: 'trabalhista',
            status,
          })
        } else {
          this.novoPedido(especificacao.id, data, {
            credorId: credor.id,
            tipo,
            valorPedido,
            classePedida: credor.classe,
            status,
          })
        }
      }
    }

    // Impugnações depois da relação do AJ (art. 8º): pendentes no vitrine (SED-04).
    if (relacao !== undefined) {
      const vitrine = especificacao.id === ID_VITRINE
      const quantidade = vitrine ? 3 : especificacao.relacoes === 'qgc' ? 4 : 2
      for (let i = 0; i < quantidade; i++) {
        const data = somarDias(relacao, 2 + i * 2)
        // Já decididas quando o QGC saiu ou o processo terminou; pendentes nos demais.
        const decididas = especificacao.relacoes === 'qgc' || ehFaseFinal(ultimaFase)
        const status = vitrine || !decididas ? 'pendente' : i % 2 === 0 ? 'acolhido' : 'rejeitado'
        if (vitrine && i === 2) {
          // Pedido de inclusão de quem não está na lista.
          this.novoPedido(especificacao.id, data, {
            requerente: { nome: this.nomeEmpresa(), documento: this.novoCnpj() },
            tipo: 'impugnacao',
            valorPedido: this.valor(40_000, 300_000),
            classePedida: 'quirografario',
            status,
          })
          continue
        }
        const credor = this.escolher(
          credores.filter((c) => c.classe === 'quirografario' || c.classe === 'trabalhista'),
        )
        const valorPedido = Math.round((credor.valorAj ?? credor.valorDevedor) * 1.25)
        if (status === 'acolhido') credor.valorQgc = valorPedido
        this.novoPedido(especificacao.id, data, {
          credorId: credor.id,
          tipo: 'impugnacao',
          valorPedido,
          classePedida: credor.classe,
          status,
        })
      }
    }
  }

  private novoPedido(
    processoId: string,
    data: DataIso,
    campos: Pick<
      Tipos['pedidosDeCredito'],
      'credorId' | 'requerente' | 'tipo' | 'valorPedido' | 'classePedida' | 'status'
    >,
  ): void {
    const criadoEm = this.noExpediente(data)
    this.tabelas.pedidosDeCredito.push({
      ...this.registro(this.novoId('ped', 3), criadoEm),
      processoId,
      ...campos,
      data,
    })
  }

  // --- AGC -------------------------------------------------------------------------------------

  /** AGC do processo; devolve o resumo da ata quando a AGC já foi encerrada (T-30). */
  private gerarAgc(
    especificacao: ProcessoDoSeed,
    marcos: readonly Marco[],
    credores: readonly Credor[],
  ): { data: DataIso; resumo: string } | undefined {
    if (especificacao.agc === undefined) return undefined
    const pauta = 'Deliberação sobre o plano de recuperação judicial'
    const agcId = this.novoId('agc', 3)

    if (especificacao.agc === 'agendada') {
      // AGC do vitrine em 1ª convocação daqui a 6 dias (RF-46, SED-04).
      this.tabelas.agcs.push({
        ...this.registro(agcId, this.noExpediente(dia(-20))),
        processoId: especificacao.id,
        dataPrimeira: dia(6),
        dataSegunda: dia(13),
        pauta,
        status: 'agendada',
      })
      return undefined
    }

    const marcoAgc = marcos.find((m) => m.fase === 'agc')
    if (!marcoAgc) throw new Error(`AGC encerrada sem marco: ${especificacao.id}`)
    const votantes = credoresVotantes(credores)
    const presentes = this.presentes(votantes)
    const convocacao = instalacao(votantes, presentes, 1).instalada ? 1 : 2
    const dataPrimeira = convocacao === 1 ? marcoAgc.data : somarDias(marcoAgc.data, -7)
    const dataSegunda = convocacao === 1 ? somarDias(marcoAgc.data, 7) : marcoAgc.data
    const votos = this.votos(votantes, presentes, especificacao.agc)
    const resultado = resultadoAgc(votantes, presentes, votos)

    const criadoEm = this.noExpediente(somarDias(dataPrimeira, -30))
    const encerradaEm = carimbo(marcoAgc.data, 17, 30)
    this.tabelas.agcs.push({
      ...this.registro(agcId, criadoEm, encerradaEm),
      processoId: especificacao.id,
      dataPrimeira,
      dataSegunda,
      pauta,
      status: 'encerrada',
      convocacaoInstalada: convocacao,
    })
    const aberta = carimbo(marcoAgc.data, 10, 0)
    for (const credorId of presentes) {
      this.tabelas.presencas.push({
        ...this.registro(this.novoId('pre', 5), aberta),
        agcId,
        credorId,
      })
    }
    for (const voto of votos) {
      this.tabelas.votos.push({
        ...this.registro(this.novoId('vot', 5), carimbo(marcoAgc.data, 15, 0)),
        agcId,
        ...voto,
      })
    }
    return { data: marcoAgc.data, resumo: resumoDaAta(convocacao, resultado) }
  }

  /** Presentes: os maiores créditos de cada classe até passar de 60% do valor, mais alguns. */
  private presentes(votantes: readonly Votante[]): string[] {
    const presentes = new Set<string>()
    const classes = new Set(votantes.map((v) => v.classe))
    for (const classe of classes) {
      const daClasse = votantes.filter((v) => v.classe === classe).sort((a, b) => b.valor - a.valor)
      const total = daClasse.reduce((soma, v) => soma + v.valor, 0)
      let acumulado = 0
      for (const votante of daClasse) {
        if (acumulado * 10 <= total * 6 || this.chance(0.35)) {
          presentes.add(votante.credorId)
          acumulado += votante.valor
        }
      }
    }
    return votantes.filter((v) => presentes.has(v.credorId)).map((v) => v.credorId)
  }

  /**
   * Votos com o perfil pedido; depois, se o resultado não for o esperado, vira votos até chegar
   * nele (aprovada: "não" vira "sim"; rejeitada: "sim" dos quirografários vira "não").
   */
  private votos(
    votantes: readonly Votante[],
    presentes: readonly string[],
    perfil: 'aprovada' | 'rejeitada',
  ): { credorId: string; voto: OpcaoVoto }[] {
    const classeDe = new Map(votantes.map((v) => [v.credorId, v.classe]))
    const votos = presentes.map((credorId) => {
      const classe = classeDe.get(credorId)
      const sim =
        perfil === 'aprovada' ? 0.85 : classe === 'trabalhista' || classe === 'me-epp' ? 0.7 : 0.15
      const sorteio = this.faker.number.float({ min: 0, max: 1 })
      const voto: OpcaoVoto = sorteio < sim ? 'sim' : sorteio < sim + 0.05 ? 'abstencao' : 'nao'
      return { credorId, voto }
    })
    const esperado = perfil === 'aprovada' ? 'aprovado' : 'rejeitado'
    const de: OpcaoVoto = perfil === 'aprovada' ? 'nao' : 'sim'
    const para: OpcaoVoto = perfil === 'aprovada' ? 'sim' : 'nao'
    for (const voto of votos) {
      if (resultadoAgc(votantes, presentes, votos).situacao === esperado) break
      const classe = classeDe.get(voto.credorId)
      if (
        voto.voto === de &&
        (perfil === 'aprovada' || classe === 'quirografario' || classe === 'garantia-real')
      ) {
        voto.voto = para
      }
    }
    return votos
  }

  // --- informes --------------------------------------------------------------------------------

  private gerarInformes(
    especificacao: ProcessoDoSeed,
    marcos: readonly Marco[],
    rmasCumpridos: readonly Prazo[],
    ata: { data: DataIso; resumo: string } | undefined,
  ): void {
    const dataDe = (fase: Fase) => marcos.find((m) => m.fase === fase)?.data
    const novo = (
      categoria: CategoriaInforme,
      titulo: string,
      data: DataIso | undefined,
      extras: Partial<Tipos['informes']> = {},
      pdf: ChavePdf = PDF_DA_CATEGORIA[categoria],
    ) => {
      if (data === undefined) return
      const folhaInicial = this.inteiro(80, 4_000)
      const fase = [...marcos].reverse().find((m) => m.data <= data)?.fase
      this.tabelas.informes.push({
        ...this.registro(this.novoId('inf', 3), this.noExpediente(data)),
        processoId: especificacao.id,
        titulo,
        categoria,
        ...(fase === undefined ? {} : { fase }),
        folhaInicial,
        folhaFinal: folhaInicial + this.inteiro(1, 60),
        publicadoNoSite: this.chance(0.8),
        data,
        anexos: [{ origem: 'publico', caminho: caminhoDoPdf(pdf), nome: PDFS[pdf].nome }],
        ...extras,
      })
    }
    const rmas = (quantidade: number) => {
      const ultimos = rmasCumpridos.slice(-quantidade)
      ultimos.forEach((rma, i) => {
        const numero = rmasCumpridos.length - ultimos.length + i + 1
        novo(
          'relatorios',
          `Relatório mensal de atividades nº ${numero}`,
          rma.atualizadoEm.slice(0, 10),
        )
      })
    }

    if (especificacao.tipo === 'rj') {
      if (marcos.length === 1) {
        novo(
          'outros-documentos',
          'Petição inicial: síntese da administração judicial',
          dataDe('pedido'),
        )
      }
      novo(
        'notas-relevantes',
        'Deferido o processamento da recuperação judicial',
        dataDe('processamento-deferido'),
      )
      novo('editais', 'Edital de convocação de credores (art. 52, §1º)', dataDe('edital-publicado'))
      novo(
        'relacao-credores',
        'Relação de credores da administração judicial (art. 7º, §2º)',
        dataDe('relacao-aj-publicada'),
      )
      novo('prj', 'Plano de recuperação judicial', dataDe('plano-apresentado'))
      novo(
        'outros-documentos',
        'Laudo de avaliação de bens e ativos',
        dataDe('plano-apresentado'),
        {},
        'laudo',
      )
      if (ata) {
        novo('atas-agc', 'Ata da assembleia geral de credores', ata.data, {
          dataAgc: ata.data,
          resumo: ata.resumo,
          publicadoNoSite: true,
        })
      }
      novo('relacao-credores', 'Quadro-geral de credores homologado', dataDe('plano-homologado'))
      novo(
        'notas-relevantes',
        'Convolação da recuperação judicial em falência',
        dataDe('convolada-falencia'),
      )
      novo('notas-relevantes', 'Homologada a desistência do pedido', dataDe('desistencia'))
      novo(
        'notas-relevantes',
        'Sentença de encerramento da recuperação judicial',
        dataDe('encerrada'),
      )
      if (especificacao.id === ID_VITRINE) {
        novo('outros-documentos', 'Parecer da administração judicial sobre o plano', dia(-30))
        novo('editais', 'Edital de convocação da assembleia geral de credores', dia(-20))
        novo('notas-relevantes', 'Orientações aos credores para a AGC', dia(-10))
      }
      rmas(5)
    } else {
      const decretada = dataDe('decretada')
      novo('editais', 'Edital da sentença de falência (art. 99, parágrafo único)', decretada)
      const relatorio = decretada === undefined ? undefined : somarDias(decretada, 38)
      if (relatorio !== undefined && relatorio < DATA_BASE) {
        novo(
          'relatorios',
          'Relatório do administrador judicial (art. 22, III, "e")',
          relatorio,
          {},
          'parecer',
        )
      }
      novo(
        'outros-documentos',
        'Auto de arrecadação e laudo de avaliação',
        dataDe('arrecadacao'),
        {},
        'laudo',
      )
      novo('relacao-credores', 'Quadro-geral de credores', dataDe('quadro-credores'))
      novo('editais', 'Edital de leilão de bens da massa falida', dataDe('realizacao-ativo'))
      novo('notas-relevantes', 'Rateio aos credores', dataDe('pagamentos'))
      novo(
        'relatorios',
        'Prestação de contas da administração judicial',
        dataDe('prestacao-contas'),
        {},
        'parecer',
      )
      novo('notas-relevantes', 'Sentença de encerramento da falência', dataDe('encerrada'))
    }
  }

  // --- histórico (logs) ------------------------------------------------------------------------

  /** Correções do dia a dia nos últimos 60 dias: nomes de credores sem acento e publicações. */
  private gerarEdicoesAvulsas(): void {
    const ativos = new Set(
      this.tabelas.processos.filter((p) => !ehFaseFinal(p.faseAtual)).map((p) => p.id),
    )
    const comAcento = this.tabelas.credores.filter(
      (c) => ativos.has(c.processoId) && semAcento(c.nome) !== c.nome,
    )
    for (let i = 0; i < 40; i++) {
      const credor = this.escolher(comAcento)
      const data = this.noExpediente(dia(-this.inteiro(1, DIAS_DE_LOG)))
      if (data <= credor.atualizadoEm) continue
      this.edicoes.push({
        tabela: 'credores',
        registroId: credor.id,
        processoId: credor.processoId,
        mudancas: [{ campo: 'nome', de: semAcento(credor.nome), para: credor.nome }],
        data,
      })
      credor.atualizadoEm = data
    }
    // Cada informe recente publicado no site passou por "publicar" depois de criado.
    for (const informe of this.tabelas.informes) {
      if (!informe.publicadoNoSite || informe.data < dia(-DIAS_DE_LOG) || this.chance(0.5)) continue
      const data = carimbo(informe.data, 18, this.inteiro(0, 59))
      if (data > carimbo(dia(-1), 23, 59)) continue
      this.edicoes.push({
        tabela: 'informes',
        registroId: informe.id,
        processoId: informe.processoId,
        mudancas: [{ campo: 'publicadoNoSite', de: false, para: true }],
        data,
      })
      informe.atualizadoEm = data
    }
  }

  /**
   * ~60 dias de histórico (RF-43, SED-07): um "criou" para cada registro criado na janela e um
   * "editou" para cada edição registrada; autor com permissão de editar o módulo (RF-39).
   */
  private gerarLogs(): void {
    const inicio = carimbo(dia(-DIAS_DE_LOG), 0, 0)
    const fim = carimbo(DATA_BASE, 0, 0)
    const naJanela = (data: Carimbo) => data >= inicio && data < fim
    const responsavelDe = new Map(this.tabelas.processos.map((p) => [p.id, p.responsavelId]))
    const processoDaAgc = new Map(this.tabelas.agcs.map((a) => [a.id, a.processoId]))
    const logs: Omit<Tipos['logs'], 'id' | 'escritorioId' | 'criadoEm' | 'atualizadoEm'>[] = []

    // Tabelas com log próprio, como no repositório (escritório e usuários caem fora da janela).
    const comLog = (Object.keys(COLECOES) as Tabela[]).filter((tabela) => COLECOES[tabela].log)
    for (const tabela of comLog) {
      for (const registro of this.tabelas[tabela] as Record<string, unknown>[]) {
        const criadoEm = registro.criadoEm as Carimbo
        if (!naJanela(criadoEm)) continue
        const processoId =
          tabela === 'processos'
            ? (registro.id as string)
            : typeof registro.processoId === 'string'
              ? registro.processoId
              : processoDaAgc.get(registro.agcId as string)
        const campos = { ...registro }
        for (const campo of CAMPOS_REGISTRO) delete campos[campo]
        logs.push({
          usuarioId: this.autor(tabela, processoId && responsavelDe.get(processoId)),
          acao: 'criou',
          colecao: tabela,
          registroId: registro.id as string,
          ...(processoId === undefined ? {} : { processoId }),
          // No JSON, `de: undefined` some e o schema exige o campo: o "antes" do criou vai como null.
          mudancas: diferencas({}, campos).map((mudanca) => ({ ...mudanca, de: null })),
          data: criadoEm,
        })
      }
    }
    for (const edicao of this.edicoes) {
      if (!naJanela(edicao.data)) continue
      logs.push({
        usuarioId: this.autor(
          edicao.tabela,
          edicao.responsavelId ?? (edicao.processoId && responsavelDe.get(edicao.processoId)),
        ),
        acao: 'editou',
        colecao: edicao.tabela,
        registroId: edicao.registroId,
        ...(edicao.processoId === undefined ? {} : { processoId: edicao.processoId }),
        mudancas: edicao.mudancas,
        data: edicao.data,
      })
    }

    logs.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
    for (const log of logs) {
      this.tabelas.logs.push({ ...this.registro(this.novoId('log', 4), log.data), ...log })
    }
  }
}

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function tabelasVazias(): TabelasDoSeed {
  return {
    escritorios: [],
    usuarios: [],
    empresas: [],
    processos: [],
    processoEmpresas: [],
    marcosDeFase: [],
    prazos: [],
    credores: [],
    pedidosDeCredito: [],
    agcs: [],
    presencas: [],
    votos: [],
    informes: [],
    arquivos: [],
    logs: [],
  }
}

/** Resumo da ata (T-30), sem datas no texto: o seed é relativo e o texto não acompanharia. */
function resumoDaAta(convocacao: 1 | 2, resultado: ResultadoAgc): string {
  const situacoes = { aprovada: 'aprovada', rejeitada: 'rejeitada', 'nao-votou': 'não votou' }
  const linhas = [`Instalada em ${convocacao}ª convocação.`]
  for (const classe of resultado.classes) {
    linhas.push(`${rotuloClasse(classe.classe, 'rj')}: ${situacoes[classe.situacao]}.`)
  }
  const final = {
    aprovado: 'Plano aprovado em todas as classes.',
    rejeitado: 'Plano rejeitado.',
    'cram-down': 'Plano rejeitado em classe, passível de cram down (art. 58, §1º).',
    'sem-votos': 'Sem votos.',
  }
  linhas.push(final[resultado.situacao])
  return linhas.join('\n')
}
