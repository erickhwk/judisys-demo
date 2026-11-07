// CSV da lista de credores do processo (RF-44, CRD-11): todos os que passam na busca e na classe,
// não só a página. Arquivo com o apelido do processo; CPF/CNPJ com pontuação e valores em
// `1234,56`, sem separador de milhar.
import type { Filtro, Repositorio } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { type ColunaCsv, gerarCsv, nomeArquivoCsv } from '../../regras/csv'
import type { DataIso } from '../../regras/datas'
import type { TipoProcesso } from '../../regras/fases'
import { type Classe, rotuloClasse } from '../../regras/qgc'
import type { ArquivoCsv } from '../../ui/useExportarCsv'

type Credor = Tipos['credores']

export function colunasCsvCredores(tipo: TipoProcesso): ColunaCsv<Credor>[] {
  return [
    { titulo: 'Credor', valor: (c) => c.nome },
    { titulo: 'CPF/CNPJ', valor: (c) => c.documento, formato: 'documento' },
    { titulo: 'Classe', valor: (c) => rotuloClasse(c.classe, tipo) },
    { titulo: 'Natureza', valor: (c) => c.natureza },
    { titulo: 'Relação do devedor', valor: (c) => c.valorDevedor, formato: 'centavos' },
    { titulo: 'Relação do AJ', valor: (c) => c.valorAj, formato: 'centavos' },
    { titulo: 'QGC', valor: (c) => c.valorQgc, formato: 'centavos' },
  ]
}

export interface FiltroCredores {
  busca: string
  /** Vazio: todas as classes. */
  classe: Classe | ''
}

/** O mesmo filtro da lista da aba, sem a página. */
export function filtroDaLista(
  processoId: string,
  { busca, classe }: FiltroCredores,
): Omit<Filtro<Credor>, 'pagina' | 'porPagina'> {
  return {
    onde: { processoId, classe: classe || undefined },
    busca,
    ordem: { campo: 'nome', direcao: 'asc' },
  }
}

/** Arquivo `judisys-credores-<apelido>-aaaa-mm-dd.csv` com tudo que passa no filtro da aba. */
export async function exportarCredores(
  repo: Repositorio<Credor>,
  processo: Pick<Tipos['processos'], 'id' | 'apelido' | 'tipo'>,
  filtro: FiltroCredores,
  hoje: DataIso,
): Promise<ArquivoCsv> {
  const credores = await repo.todos(filtroDaLista(processo.id, filtro))
  return {
    nome: nomeArquivoCsv('credores', hoje, processo.apelido),
    conteudo: gerarCsv(colunasCsvCredores(processo.tipo), credores),
  }
}
