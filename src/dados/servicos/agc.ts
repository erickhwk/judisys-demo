// AGC: cadastro, lista de presença e instalação (RF-31 a RF-33, SDD §7.6, DMO-16). As regras de
// quem vota e do quórum são as puras de `regras/votacao.ts` (DMO-05); aqui ficam as gravações, com
// permissão (INV-02) e log por registro na mesma transação (INV-01).
//
// A lista de presença só muda enquanto a AGC está agendada: instalar fecha a lista (a votação da
// DMO-17 parte dos presentes da instalação) e a AGC encerrada é só leitura (AGC-22).
//
// O registro do resultado (RF-37, DMO-17) grava os votos, encerra a AGC e cria o informe "Atas de
// AGC" com o resumo (T-30) numa transação só.
import { type DataIso, formatarData } from '../../regras/datas'
import { formatarMoeda } from '../../regras/moeda'
import { type ClasseVotante, rotuloClasse } from '../../regras/qgc'
import type {
  Convocacao,
  Instalacao,
  ResultadoAgc,
  ResultadoClasse,
  VotoLancado,
} from '../../regras/votacao'
import { credoresVotantes, instalacao, motivoSemVoto, resultadoAgc } from '../../regras/votacao'
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import { type ContextoGravacao, criarRepositorio, ErroNaoEncontrado } from '../repositorio'
import type { Tipos } from '../schemas'
import { buscarOuFalhar, ErroRegra, exigirPermissao } from './comum'

type Agc = Tipos['agcs']

export const ERRO_AGC_SO_RJ = 'AGC só existe em recuperação judicial.'
export const ERRO_AGC_NAO_AGENDADA =
  'A AGC já foi instalada ou encerrada: a lista de presença e os dados não mudam mais.'
export const ERRO_CREDOR_DE_OUTRO_PROCESSO = 'O credor não é deste processo.'
export const ERRO_SEM_PRESENTES = 'Nenhum credor presente.'

const TABELAS_AGC: Tabela[] = ['agcs', 'presencas', 'votos', 'credores', 'processos', 'logs']

export interface DadosAgc {
  processoId: Id
  dataPrimeira: DataIso
  dataSegunda: DataIso
  pauta: string
}

export interface PedidoSalvarAgc {
  /** Sem `id`, cria (agendada); com `id`, edita datas e pauta enquanto agendada. */
  id?: Id
  dados: DadosAgc
}

/** Cria ou edita a AGC (RF-31): várias por processo, só na RJ. */
export function salvarAgc(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repo = criarRepositorio(armazenamento, 'agcs', contexto)
  return async ({ id, dados }: PedidoSalvarAgc): Promise<Agc> => {
    exigirPermissao(contexto, 'agc')
    return armazenamento.transacao(TABELAS_AGC, async () => {
      const { processoId, ...campos } = dados
      const processo = await buscarOuFalhar(armazenamento, 'processos', processoId)
      if (processo.tipo !== 'rj') throw new ErroRegra(ERRO_AGC_SO_RJ)
      if (id === undefined) {
        return repo.criar({ processoId: processo.id, ...campos, status: 'agendada' })
      }
      const agc = await agcAgendada(armazenamento, id)
      if (agc.processoId !== processo.id) throw new ErroNaoEncontrado('agcs', agc.id)
      return repo.atualizar(agc.id, campos)
    })
  }
}

async function agcAgendada(armazenamento: Armazenamento, agcId: Id): Promise<Agc> {
  const agc = await buscarOuFalhar(armazenamento, 'agcs', agcId)
  if (agc.status !== 'agendada') throw new ErroRegra(ERRO_AGC_NAO_AGENDADA)
  return agc
}

/** Credores do processo da AGC, como estão gravados. */
async function credoresDoProcesso(
  armazenamento: Armazenamento,
  processoId: Id,
): Promise<Tipos['credores'][]> {
  return armazenamento.porIndice<Tipos['credores']>('credores', 'processoId', processoId)
}

export interface PedidoPresenca {
  agcId: Id
  credorIds: readonly Id[]
  presente: boolean
}

/**
 * Marca ou desmarca a presença de credores (RF-32), credor a credor ou vários de uma vez.
 * Só credores do processo com direito a voto (INV-06, AGC-24); quem já está como pedido fica como
 * está (sem log). Desmarcar tira também o voto do credor, se houver.
 */
export function marcarPresenca(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoPresencas = criarRepositorio(armazenamento, 'presencas', contexto)
  const repoVotos = criarRepositorio(armazenamento, 'votos', contexto)
  return async ({ agcId, credorIds, presente }: PedidoPresenca): Promise<void> => {
    exigirPermissao(contexto, 'agc')
    await armazenamento.transacao(TABELAS_AGC, async () => {
      const agc = await agcAgendada(armazenamento, agcId)
      const credores = new Map(
        (await credoresDoProcesso(armazenamento, agc.processoId)).map((c) => [c.id, c]),
      )
      const presencas = await armazenamento.porIndice<Tipos['presencas']>(
        'presencas',
        'agcId',
        agcId,
      )
      const presencaPorCredor = new Map(presencas.map((p) => [p.credorId, p]))
      const votos = presente
        ? []
        : await armazenamento.porIndice<Tipos['votos']>('votos', 'agcId', agcId)

      for (const credorId of new Set(credorIds)) {
        const credor = credores.get(credorId)
        if (!credor) throw new ErroRegra(ERRO_CREDOR_DE_OUTRO_PROCESSO)
        // Desmarcar vale também para quem perdeu o direito a voto depois de marcado (ex.: crédito
        // zerado por um pedido acolhido); marcar, só para quem vota (INV-06).
        const motivo = presente ? motivoSemVoto(credor) : null
        if (motivo) throw new ErroRegra(`${credor.nome}: ${motivo.toLowerCase()}.`)

        const atual = presencaPorCredor.get(credorId)
        if (presente && !atual) await repoPresencas.criar({ agcId, credorId })
        if (!presente && atual) {
          await repoPresencas.excluir(atual.id)
          for (const voto of votos.filter((v) => v.credorId === credorId)) {
            await repoVotos.excluir(voto.id)
          }
        }
      }
    })
  }
}

/**
 * "Todos da classe" (RF-32, AGC-02): marca (ou desmarca) todos os votantes da classe no processo.
 * Quem não vota fica de fora sem erro.
 */
export function marcarClasse(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const marcar = marcarPresenca(armazenamento, contexto)
  return async ({
    agcId,
    classe,
    presente,
  }: {
    agcId: Id
    classe: ClasseVotante
    presente: boolean
  }): Promise<void> => {
    exigirPermissao(contexto, 'agc')
    const agc = await buscarOuFalhar(armazenamento, 'agcs', agcId)
    const credores = await credoresDoProcesso(armazenamento, agc.processoId)
    const credorIds = presente
      ? credoresVotantes(credores)
          .filter((v) => v.classe === classe)
          .map((v) => v.credorId)
      : credores.filter((c) => c.classe === classe).map((c) => c.id)
    await marcar({ agcId, credorIds, presente })
  }
}

/** Por que a AGC não instala nesta convocação (art. 37, §2º, T-32); `null` se instala. */
export function motivoSemInstalacao(situacao: Instalacao): string | null {
  if (situacao.instalada) return null
  if (situacao.classes.every((c) => c.quantidadePresente === 0)) return ERRO_SEM_PRESENTES
  const abaixo = situacao.classes.filter((c) => c.situacao === 'nao-atinge').map((c) => c.classe)
  return `Em 1ª convocação, cada classe precisa de presentes com mais de 50% do valor votante. Não atinge: ${abaixo.map((c) => rotuloClasse(c, 'rj')).join(', ')}.`
}

/**
 * Instala a AGC na convocação escolhida (RF-33): em 1ª, só se todas as classes com votantes
 * passam de 50% do valor (C-09); em 2ª, com qualquer número de presentes, mas não zero (T-32).
 */
export function instalarAgc(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repo = criarRepositorio(armazenamento, 'agcs', contexto)
  return async ({ agcId, convocacao }: { agcId: Id; convocacao: Convocacao }): Promise<Agc> => {
    exigirPermissao(contexto, 'agc')
    return armazenamento.transacao(TABELAS_AGC, async () => {
      const agc = await agcAgendada(armazenamento, agcId)
      const votantes = credoresVotantes(await credoresDoProcesso(armazenamento, agc.processoId))
      const presencas = await armazenamento.porIndice<Tipos['presencas']>(
        'presencas',
        'agcId',
        agcId,
      )
      const situacao = instalacao(
        votantes,
        presencas.map((p) => p.credorId),
        convocacao,
      )
      const motivo = motivoSemInstalacao(situacao)
      if (motivo) throw new ErroRegra(motivo)
      return repo.atualizar(agc.id, { status: 'instalada', convocacaoInstalada: convocacao })
    })
  }
}

// ---------------------------------------------------------------------------------------------
// Registro do resultado (RF-37, T-30, T-33; DMO-17)

export const ERRO_AGC_NAO_INSTALADA =
  'A AGC ainda não foi instalada: instale-a para abrir a votação e registrar o resultado.'
export const ERRO_AGC_ENCERRADA = 'A AGC já foi encerrada: o resultado registrado não muda.'
export const ERRO_VOTO_DE_NAO_PRESENTE = 'Só votam os credores presentes com direito a voto.'
export const ERRO_PRESENTE_SEM_VOTO =
  'Há presentes sem voto: lance o voto de todos antes de registrar.'
export const ERRO_SEM_PRESENTES_VOTANTES =
  'Nenhum presente tem direito a voto: não há votação a registrar.'

/** Título e PDF genérico da ata criada pelo registro (o mesmo do seed, `public/anexos/`). */
export const TITULO_ATA = 'Ata da assembleia geral de credores'
const PDF_ATA = {
  origem: 'publico',
  caminho: 'anexos/ata-agc.pdf',
  nome: 'Ata da AGC.pdf',
} as const

const TABELAS_REGISTRO: Tabela[] = [...TABELAS_AGC, 'informes']

export interface PedidoRegistrarResultado {
  agcId: Id
  /** Um voto por presente com direito a voto (T-33); substitui os votos já gravados da AGC. */
  votos: readonly VotoLancado[]
}

export interface ResultadoRegistrado {
  agc: Agc
  informe: Tipos['informes']
  resultado: ResultadoAgc
}

/**
 * Registra o resultado da AGC instalada (RF-37): grava os votos (um por presente votante), muda a
 * AGC para encerrada e cria o informe "Atas de AGC" com o resumo e o PDF genérico (T-30). Tudo numa
 * transação: se algo falha no meio, nada fica gravado (INV-01). Recusa presente sem voto (T-33) e
 * voto de quem não está presente ou não vota.
 */
export function registrarResultadoAgc(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoAgcs = criarRepositorio(armazenamento, 'agcs', contexto)
  const repoVotos = criarRepositorio(armazenamento, 'votos', contexto)
  const repoInformes = criarRepositorio(armazenamento, 'informes', contexto)
  return async ({ agcId, votos }: PedidoRegistrarResultado): Promise<ResultadoRegistrado> => {
    exigirPermissao(contexto, 'agc')
    exigirPermissao(contexto, 'informes')
    return armazenamento.transacao(TABELAS_REGISTRO, async () => {
      const agc = await buscarOuFalhar(armazenamento, 'agcs', agcId)
      if (agc.status === 'agendada') throw new ErroRegra(ERRO_AGC_NAO_INSTALADA)
      if (agc.status === 'encerrada') throw new ErroRegra(ERRO_AGC_ENCERRADA)
      const convocacao = agc.convocacaoInstalada
      if (convocacao === undefined) throw new ErroRegra(ERRO_AGC_NAO_INSTALADA)

      const processo = await buscarOuFalhar(armazenamento, 'processos', agc.processoId)
      const votantes = credoresVotantes(await credoresDoProcesso(armazenamento, agc.processoId))
      const presencas = await armazenamento.porIndice<Tipos['presencas']>(
        'presencas',
        'agcId',
        agcId,
      )
      const presentes = new Set(presencas.map((p) => p.credorId))
      const votamAqui = new Set(
        votantes.filter((v) => presentes.has(v.credorId)).map((v) => v.credorId),
      )

      // T-32: sem presentes votantes não há votação (ex.: o crédito do único presente zerou depois
      // da instalação); encerrar a AGC aqui seria irreversível.
      if (votamAqui.size === 0) throw new ErroRegra(ERRO_SEM_PRESENTES_VOTANTES)

      const votoPorCredor = new Map<Id, VotoLancado['voto']>()
      for (const { credorId, voto } of votos) {
        if (!votamAqui.has(credorId)) throw new ErroRegra(ERRO_VOTO_DE_NAO_PRESENTE)
        votoPorCredor.set(credorId, voto)
      }
      if (votoPorCredor.size < votamAqui.size) throw new ErroRegra(ERRO_PRESENTE_SEM_VOTO)

      // Votos já gravados: o do mesmo credor é atualizado (log só se mudou); o de quem não vota
      // nesta votação sai.
      const gravados = await armazenamento.porIndice<Tipos['votos']>('votos', 'agcId', agcId)
      const gravadoPorCredor = new Map(gravados.map((v) => [v.credorId, v]))
      for (const gravado of gravados) {
        if (!votoPorCredor.has(gravado.credorId)) await repoVotos.excluir(gravado.id)
      }
      for (const [credorId, voto] of votoPorCredor) {
        const gravado = gravadoPorCredor.get(credorId)
        if (gravado) await repoVotos.atualizar(gravado.id, { voto })
        else await repoVotos.criar({ agcId, credorId, voto })
      }

      const resultado = resultadoAgc(
        votantes,
        presentes,
        [...votoPorCredor].map(([credorId, voto]) => ({ credorId, voto })),
      )
      const encerrada = await repoAgcs.atualizar(agc.id, { status: 'encerrada' })
      const dataAgc = convocacao === 1 ? agc.dataPrimeira : agc.dataSegunda
      const informe = await repoInformes.criar({
        processoId: processo.id,
        titulo: TITULO_ATA,
        categoria: 'atas-agc',
        fase: processo.faseAtual,
        dataAgc,
        publicadoNoSite: false,
        data: contexto.agora().slice(0, 10),
        anexos: [{ ...PDF_ATA }],
        resumo: resumoDaAta(dataAgc, convocacao, resultado),
      })
      return { agc: encerrada, informe, resultado }
    })
  }
}

const SITUACOES_ATA = { aprovada: 'aprovada', rejeitada: 'rejeitada', 'nao-votou': 'não votou' }
const FINAIS_ATA = {
  aprovado: 'Resultado: plano aprovado em todas as classes que votaram.',
  rejeitado: 'Resultado: plano rejeitado.',
  'cram-down': 'Resultado: plano rejeitado em classe, passível de cram down (art. 58, §1º).',
  'sem-votos': 'Resultado: nenhuma classe votou.',
}

/**
 * Resumo da ata (RF-37, T-30): data, convocação, resultado por classe com a contagem e, quando
 * alguma classe rejeitou, os três requisitos do cram down. Texto em linhas (a tela do informe
 * mostra as quebras).
 */
export function resumoDaAta(
  dataAgc: DataIso,
  convocacao: Convocacao,
  resultado: ResultadoAgc,
): string {
  const linhas = [`AGC de ${formatarData(dataAgc)}, instalada em ${convocacao}ª convocação.`, '']
  linhas.push('Resultado por classe (art. 45):')
  for (const classe of resultado.classes) linhas.push(linhaDaClasse(classe))
  linhas.push('', FINAIS_ATA[resultado.situacao])
  if (resultado.cramDown) {
    linhas.push('', 'Cram down (art. 58, §1º):')
    for (const requisito of resultado.cramDown.requisitos) {
      const situacao = requisito.cumprido ? 'cumprido' : 'não cumprido'
      linhas.push(
        `${requisito.numero}. ${requisito.descricao}: ${situacao} (${requisito.detalhe}).`,
      )
    }
  }
  return linhas.join('\n')
}

function linhaDaClasse(classe: ResultadoClasse): string {
  const rotulo = rotuloClasse(classe.classe, 'rj')
  if (classe.presentes === 0) return `${rotulo}: não votou (sem presentes).`
  const { cabeca, valor } = classe
  let contagem = `${cabeca.sim} sim, ${cabeca.nao} não, ${cabeca.abstencao} ${cabeca.abstencao === 1 ? 'abstenção' : 'abstenções'}`
  if (classe.criterio === 'cabeca-e-valor') {
    contagem += `; valor: ${formatarMoeda(valor.sim)} sim, ${formatarMoeda(valor.nao)} não`
  }
  return `${rotulo}: ${SITUACOES_ATA[classe.situacao]} (${contagem}).`
}
