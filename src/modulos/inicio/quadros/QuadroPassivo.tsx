// Q-08 · Passivo sob administração (SDD-INI §5.7, QDR-09): o total da relação do AJ dos processos
// ativos no cabeçalho (o mesmo dos números do topo) e as barras dos quatro maiores. No celular, nome
// e valor em cima e a barra embaixo. Os ativos ainda sem relação ficam numa nota, fora da soma.
import { useTodos } from '../../../dados/contexto'
import { formatarMoedaCurta } from '../../../regras/moeda'
import { BarrasHorizontais } from '../../../ui/graficos/BarrasHorizontais'
import { passivoPorProcesso } from '../indicadores'
import { CATALOGO } from '../montagem'
import { type LinkDoQuadro, Quadro } from './Quadro'
import estilos from './QuadroPassivo.module.css'
import { ResumoNoCorpo } from './ResumoNoCorpo'
import type { PropsDoQuadro } from './registro'

const LINK: LinkDoQuadro = { para: '/processos', rotulo: 'Processos', modulo: 'processos' }

export function QuadroPassivo({ variante }: PropsDoQuadro) {
  const processos = useTodos('processos')
  const credores = useTodos('credores')
  const moldura = { id: 'passivo', titulo: CATALOGO.passivo.titulo, variante, link: LINK } as const

  if (processos.isError || credores.isError) {
    return <Quadro {...moldura} vazio="Não foi possível carregar o passivo." />
  }
  if (!processos.data || !credores.data) return <Quadro {...moldura} />

  const passivo = passivoPorProcesso(processos.data, credores.data)
  if (passivo.maiores.length === 0) {
    return <Quadro {...moldura} vazio="Nenhum processo ativo com relação do AJ." />
  }
  const { semRelacao } = passivo
  const total = formatarMoedaCurta(passivo.total)
  const celular = variante === 'celular'
  return (
    <Quadro {...moldura} destaque={celular ? undefined : total}>
      <div className={estilos.corpo} data-desenho={variante}>
        {celular && <ResumoNoCorpo numero={total} texto="na relação do AJ dos processos ativos" />}
        <BarrasHorizontais
          descricao="Relação do AJ dos maiores processos ativos"
          // O maior em destaque, os outros num tom só (canvas).
          barras={passivo.maiores.map((p, i) => ({
            rotulo: p.apelido,
            valor: p.valor,
            tom: i === 0 ? 'serie-1' : 'serie-3',
          }))}
          empilhado={celular}
          formatar={formatarMoedaCurta}
        />
        {semRelacao > 0 && (
          <p className={estilos.nota}>
            {`Fora da soma: ${semRelacao} ${semRelacao === 1 ? 'processo' : 'processos'} ainda sem relação do AJ.`}
          </p>
        )}
      </div>
    </Quadro>
  )
}
