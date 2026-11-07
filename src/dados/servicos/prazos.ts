// Cumprir prazo (RF-22, PRZ-01 a PRZ-04, INV-05): marca como cumprido e, se for o RMA de uma RJ
// ativa, cria o seguinte, numa transação.
import type { Armazenamento, Id, Tabela } from '../armazenamento'
import { type ContextoGravacao, criarRepositorio } from '../repositorio'
import type { Tipos } from '../schemas'
import {
  buscarOuFalhar,
  ErroRegra,
  ehRjAtiva,
  ehRma,
  exigirPermissao,
  garantirRmaAberto,
} from './comum'

type Prazo = Tipos['prazos']

const TABELAS_PRAZOS: Tabela[] = ['prazos', 'processos', 'logs']

export const ERRO_PRAZO_JA_CUMPRIDO = 'Este prazo já foi cumprido.'

export interface ResultadoCumprimento {
  prazo: Prazo
  /** RMA seguinte, quando criado. */
  proximoRma?: Prazo
}

/**
 * Marca o prazo como cumprido. Se for RMA e o processo for RJ fora das fases finais, cria o RMA
 * que vence no próximo dia 15 depois do vencimento do cumprido, ligado ao mesmo marco (para que
 * desfazer "Processamento deferido" o remova). Convolada, encerrada ou desistência: nenhum RMA
 * novo (PRZ-03, PRZ-04).
 */
export function cumprirPrazo(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoPrazos = criarRepositorio(armazenamento, 'prazos', contexto)

  return async (prazoId: Id): Promise<ResultadoCumprimento> => {
    exigirPermissao(contexto, 'prazos')
    return armazenamento.transacao(TABELAS_PRAZOS, async () => {
      const atual = await buscarOuFalhar(armazenamento, 'prazos', prazoId)
      if (atual.status === 'cumprido') throw new ErroRegra(ERRO_PRAZO_JA_CUMPRIDO)
      const prazo = await repoPrazos.atualizar(prazoId, { status: 'cumprido' })
      if (!ehRma(prazo)) return { prazo }
      const processo = await armazenamento.get<Tipos['processos']>('processos', prazo.processoId)
      if (!processo || !ehRjAtiva(processo)) return { prazo }
      const proximoRma = await garantirRmaAberto(
        armazenamento,
        contexto,
        prazo.processoId,
        prazo.vencimento,
        prazo.marcoId,
      )
      return proximoRma ? { prazo, proximoRma } : { prazo }
    })
  }
}
