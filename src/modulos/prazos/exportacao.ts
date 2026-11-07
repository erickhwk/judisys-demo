// CSV da agenda (RF-25, RF-44): todos os prazos que passam nos filtros de período, processo e
// responsável, não só a página. Vencimento em `dd/mm/aaaa`; situação calculada em `hoje`.
import type { Tipos } from '../../dados/schemas'
import { type ColunaCsv, gerarCsv, nomeArquivoCsv } from '../../regras/csv'
import type { DataIso } from '../../regras/datas'
import type { ArquivoCsv } from '../../ui/useExportarCsv'
import { rotuloSituacao } from './regras'

type Prazo = Tipos['prazos']
type Processo = Tipos['processos']

const ROTULOS_ORIGEM: Readonly<Record<Prazo['origem'], string>> = {
  automatico: 'Automático',
  manual: 'Manual',
}

export function colunasCsvPrazos(
  processos: ReadonlyMap<string, Pick<Processo, 'apelido' | 'responsavelId'>>,
  responsaveis: ReadonlyMap<string, string>,
  hoje: DataIso,
): ColunaCsv<Prazo>[] {
  const processoDe = (prazo: Prazo) => processos.get(prazo.processoId)
  return [
    { titulo: 'Vencimento', valor: (p) => p.vencimento, formato: 'data' },
    { titulo: 'Prazo', valor: (p) => p.titulo },
    { titulo: 'Base legal', valor: (p) => p.baseLegal },
    { titulo: 'Processo', valor: (p) => processoDe(p)?.apelido },
    {
      titulo: 'Responsável',
      valor: (p) => {
        const id = processoDe(p)?.responsavelId
        return id === undefined ? '' : responsaveis.get(id)
      },
    },
    { titulo: 'Origem', valor: (p) => ROTULOS_ORIGEM[p.origem] },
    { titulo: 'Situação', valor: (p) => rotuloSituacao(p, hoje) },
  ]
}

/**
 * Arquivo `judisys-prazos-aaaa-mm-dd.csv`. `prazos` já vem filtrado e ordenado pela agenda
 * (`filtrarAgenda`), com todas as páginas.
 */
export function exportarPrazos(
  prazos: readonly Prazo[],
  processos: ReadonlyMap<string, Pick<Processo, 'apelido' | 'responsavelId'>>,
  responsaveis: ReadonlyMap<string, string>,
  hoje: DataIso,
): ArquivoCsv {
  return {
    nome: nomeArquivoCsv('prazos', hoje),
    conteudo: gerarCsv(colunasCsvPrazos(processos, responsaveis, hoje), [...prazos]),
  }
}
