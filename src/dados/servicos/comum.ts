// Peças dos serviços (T-12): erro de regra, permissão antecipada, log direto, ordem dos marcos e
// o RMA único da RJ ativa (INV-05). Os serviços gravam pelos repositórios sempre que o log por
// registro serve; o log direto fica para a exclusão em cascata (um log só, T-23).
import type { z } from 'zod'
import type { Carimbo, DataIso } from '../../regras/datas'
import type { Mudanca } from '../../regras/diff'
import { ehFaseFinal, type Fase, fasesDoTipo, type TipoProcesso } from '../../regras/fases'
import type { Modulo } from '../../regras/permissoes'
import { pode } from '../../regras/permissoes'
import { novoRma, TITULO_RMA } from '../../regras/prazos'
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import {
  type ContextoGravacao,
  criarRepositorio,
  ErroNaoEncontrado,
  ErroPermissao,
  ErroValidacao,
} from '../repositorio'
import { type Log, SCHEMAS, type Tipos } from '../schemas'

/** Registro que impede a operação, para a mensagem da tela (ex.: processos da empresa). */
export interface Vinculo {
  colecao: Tabela
  id: Id
  rotulo: string
}

/** Operação recusada por regra de negócio (T-23, T-27, RF-15); nada foi gravado. */
export class ErroRegra extends Error {
  constructor(
    mensagem: string,
    readonly vinculos: Vinculo[] = [],
  ) {
    super(mensagem)
    this.name = 'ErroRegra'
  }
}

/** Falha antes de abrir a transação: mesma regra do repositório (INV-02), sem gravar nada. */
export function exigirPermissao(contexto: ContextoGravacao, modulo: Modulo): void {
  if (!pode(contexto.papel, 'editar', modulo)) throw new ErroPermissao(contexto.papel, modulo)
}

/** Erro de validação num campo do formulário (ex.: PRC-08), no formato do repositório. */
export function erroDeCampo(campo: string, mensagem: string, valor: unknown): ErroValidacao {
  const issue = { code: 'custom', message: mensagem, path: [campo], input: valor }
  return new ErroValidacao([issue as z.core.$ZodIssue])
}

/** Lê o registro ou lança `ErroNaoEncontrado`, como o repositório. */
export async function buscarOuFalhar<K extends Tabela>(
  armazenamento: Armazenamento,
  tabela: K,
  id: Id,
): Promise<Tipos[K]> {
  const registro = await armazenamento.get<Tipos[K]>(tabela, id)
  if (!registro) throw new ErroNaoEncontrado(tabela, id)
  return registro
}

/** Grava um log montado pelo serviço (validado pelo schema, como no repositório). */
export async function gravarLogDireto(
  armazenamento: Armazenamento,
  contexto: ContextoGravacao,
  dados: {
    acao: Log['acao']
    colecao: Tabela
    registroId: Id
    processoId?: Id
    mudancas: Mudanca[]
  },
  carimbo: Carimbo,
): Promise<void> {
  const log = {
    id: crypto.randomUUID(),
    escritorioId: contexto.usuario.escritorioId,
    criadoEm: carimbo,
    atualizadoEm: carimbo,
    usuarioId: contexto.usuario.id,
    ...dados,
    data: carimbo,
  }
  const resultado = SCHEMAS.logs.safeParse(log)
  if (!resultado.success) throw new ErroValidacao(resultado.error.issues)
  await armazenamento.put('logs', resultado.data)
}

/**
 * Marcos em ordem de pilha (RF-15, INV-04): por data e, na mesma data, pela ordem das fases do
 * tipo (as finais alternativas da RJ por último), já que as fases só avançam (T-27).
 */
export function ordenarMarcos(
  tipo: TipoProcesso,
  marcos: readonly Tipos['marcosDeFase'][],
): Tipos['marcosDeFase'][] {
  const ordem = fasesDoTipo(tipo)
  return [...marcos].sort(
    (a, b) =>
      a.data.localeCompare(b.data) ||
      ordem.indexOf(a.fase as Fase) - ordem.indexOf(b.fase as Fase) ||
      a.criadoEm.localeCompare(b.criadoEm),
  )
}

/** Prazo de RMA (gerado pelo marco "Processamento deferido" ou pelo cumprimento do anterior). */
export function ehRma(prazo: Pick<Tipos['prazos'], 'origem' | 'titulo'>): boolean {
  return prazo.origem === 'automatico' && prazo.titulo === TITULO_RMA
}

/** A RJ já tem um RMA aberto (INV-05: no máximo um). */
export function temRmaAberto(prazos: readonly Tipos['prazos'][]): boolean {
  return prazos.some((prazo) => ehRma(prazo) && prazo.status === 'aberto')
}

/** RJ fora das fases finais: a que mantém um RMA aberto (INV-05). */
export function ehRjAtiva(processo: Tipos['processos']): boolean {
  return processo.tipo === 'rj' && !ehFaseFinal(processo.faseAtual as Fase)
}

/**
 * Cria o RMA seguinte se a RJ não tem nenhum aberto (INV-05: exatamente um). Vence no próximo
 * dia 15 depois de `dataReferencia`; `marcoId` liga o RMA ao marco "Processamento deferido",
 * para que desfazer esse marco o remova. Quem chama decide se o processo deve ter RMA.
 */
export async function garantirRmaAberto(
  armazenamento: Armazenamento,
  contexto: ContextoGravacao,
  processoId: Id,
  dataReferencia: DataIso,
  marcoId: Id | undefined,
): Promise<Tipos['prazos'] | undefined> {
  const prazos = await armazenamento.porIndice<Tipos['prazos']>('prazos', 'processoId', processoId)
  if (temRmaAberto(prazos)) return undefined
  return criarRepositorio(armazenamento, 'prazos', contexto).criar(
    novoRma(processoId, dataReferencia, marcoId),
  )
}
