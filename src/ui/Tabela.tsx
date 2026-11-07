import type { ReactNode } from 'react'
import { juntarClasses } from './classes'
import estilos from './Tabela.module.css'

export type ColunaTabela<T> = {
  chave: string
  titulo: ReactNode
  /** Conteúdo da célula, já formatado (datas e moeda vêm prontas de `regras/`). */
  celula: (linha: T) => ReactNode
  /** Largura da coluna (ex.: '33%' ou '160px'); a tabela usa `table-layout: fixed`. */
  largura?: string
  alinhar?: 'esquerda' | 'direita' | 'centro'
  /** Números tabulares e sem quebra (valores, datas, CNJ). */
  numerica?: boolean
  /** Primeira coluna em destaque (nome principal). */
  destaque?: boolean
}

export type PropsTabela<T> = {
  /** Nome acessível da tabela e da área de rolagem. */
  rotulo: string
  colunas: ColunaTabela<T>[]
  linhas: T[]
  chaveLinha: (linha: T) => string
  /** Mostrado no lugar do corpo quando não há linhas (use `<Vazio>`). */
  vazio?: ReactNode
  /** Largura mínima antes de rolar na horizontal (D-13). Padrão: 900px. */
  larguraMinima?: number
  /** Conteúdo acima da tabela, dentro do card (abas, contagem). */
  topo?: ReactNode
  /** Conteúdo abaixo da tabela, dentro do card (paginação). */
  rodape?: ReactNode
}

/**
 * Tabela em card, com rolagem horizontal em telas estreitas (D-13).
 * A área de rolagem recebe foco pelo teclado para dar para rolar sem mouse.
 */
export function Tabela<T>({
  rotulo,
  colunas,
  linhas,
  chaveLinha,
  vazio,
  larguraMinima = 900,
  topo,
  rodape,
}: PropsTabela<T>) {
  return (
    <div className={estilos.card}>
      {topo && <div className={estilos.topo}>{topo}</div>}
      {linhas.length === 0 && vazio ? (
        <div className={estilos.vazio}>{vazio}</div>
      ) : (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: área rolável precisa de foco para rolar pelo teclado
        <section className={estilos.rolagem} aria-label={rotulo} tabIndex={0}>
          <table
            className={estilos.tabela}
            style={{ minWidth: larguraMinimaEfetiva(colunas, larguraMinima) }}
          >
            <thead>
              <tr>
                {colunas.map((coluna) => (
                  <th
                    key={coluna.chave}
                    scope="col"
                    className={classeAlinhamento(coluna.alinhar)}
                    style={coluna.largura ? { width: coluna.largura } : undefined}
                  >
                    {coluna.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={chaveLinha(linha)}>
                  {colunas.map((coluna) => (
                    <td
                      key={coluna.chave}
                      className={juntarClasses(
                        classeAlinhamento(coluna.alinhar),
                        coluna.numerica && estilos.numerica,
                        coluna.destaque && estilos.destaque,
                      )}
                    >
                      {coluna.celula(linha)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {rodape && <div className={estilos.rodape}>{rodape}</div>}
    </div>
  )
}

/** Espaço mínimo de cada coluna sem `largura` (o nome, em geral) quando a tabela encolhe. */
const MINIMO_COLUNA_LIVRE = 200

/**
 * Com `table-layout: fixed`, as colunas sem `largura` ficam com o que sobra das fixas em px. Na
 * largura mínima, a sobra podia cair para poucos px e o nome quebrar letra a letra no celular
 * (DMO-23). A mínima cresce até as colunas livres terem `MINIMO_COLUNA_LIVRE` cada. Colunas em %
 * crescem com a tabela e ficam fora da conta.
 */
function larguraMinimaEfetiva<T>(colunas: ColunaTabela<T>[], larguraMinima: number): number {
  if (colunas.some((coluna) => coluna.largura?.endsWith('%'))) return larguraMinima
  let fixas = 0
  let livres = 0
  for (const coluna of colunas) {
    if (coluna.largura?.endsWith('px')) fixas += Number.parseFloat(coluna.largura)
    else if (!coluna.largura) livres++
  }
  return Math.max(larguraMinima, fixas + livres * MINIMO_COLUNA_LIVRE)
}

function classeAlinhamento(alinhar: ColunaTabela<unknown>['alinhar']) {
  if (alinhar === 'direita') return estilos.direita
  if (alinhar === 'centro') return estilos.centro
  return undefined
}

/** Grupo de botões de ação de uma linha (editar, excluir), alinhado à direita. */
export function AcoesLinha({ children }: { children: ReactNode }) {
  return <span className={estilos.acoes}>{children}</span>
}
