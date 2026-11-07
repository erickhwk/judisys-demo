// CSV da lista de processos (RF-44): todos os que passam na busca, no tipo e na fase, não só a
// página. CNJ com pontuação e passivo em `1234,56`, para o Excel em pt-BR.
import type { Repositorio } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { type ColunaCsv, gerarCsv, nomeArquivoCsv } from '../../regras/csv'
import type { DataIso } from '../../regras/datas'
import { ROTULOS_FASE } from '../../regras/fases'
import type { ArquivoCsv } from '../../ui/useExportarCsv'
import { type FiltroProcessos, filtrarProcessos, type ReposListagem } from './listagem'
import { ROTULOS_CONSOLIDACAO, ROTULOS_TIPO } from './rotulos'

type Processo = Tipos['processos']

/** Colunas do CSV; `nomeDe` traduz o id do responsável no nome do usuário. */
export function colunasCsvProcessos(nomeDe: (id: string) => string): ColunaCsv<Processo>[] {
  return [
    { titulo: 'Apelido', valor: (p) => p.apelido },
    { titulo: 'Número CNJ', valor: (p) => p.numeroCnj, formato: 'cnj' },
    { titulo: 'Tipo', valor: (p) => ROTULOS_TIPO[p.tipo] },
    { titulo: 'Fase', valor: (p) => ROTULOS_FASE[p.faseAtual] },
    { titulo: 'Comarca', valor: (p) => p.comarca },
    { titulo: 'UF', valor: (p) => p.uf },
    { titulo: 'Vara', valor: (p) => p.vara },
    { titulo: 'Consolidação', valor: (p) => ROTULOS_CONSOLIDACAO[p.consolidacao] },
    { titulo: 'Passivo declarado', valor: (p) => p.passivoDeclarado, formato: 'centavos' },
    { titulo: 'Responsável', valor: (p) => nomeDe(p.responsavelId) },
  ]
}

export interface ReposExportacao extends ReposListagem {
  usuarios: Repositorio<Tipos['usuarios']>
}

/** Arquivo `judisys-processos-aaaa-mm-dd.csv` com tudo que passa no filtro da lista. */
export async function exportarProcessos(
  repos: ReposExportacao,
  filtro: Omit<FiltroProcessos, 'pagina'>,
  hoje: DataIso,
): Promise<ArquivoCsv> {
  const [{ processos }, usuarios] = await Promise.all([
    filtrarProcessos(repos, filtro),
    repos.usuarios.todos(),
  ])
  const nomes = new Map(usuarios.map((u) => [u.id, u.nome]))
  return {
    nome: nomeArquivoCsv('processos', hoje),
    conteudo: gerarCsv(
      colunasCsvProcessos((id) => nomes.get(id) ?? ''),
      processos,
    ),
  }
}
