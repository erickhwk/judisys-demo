// Q-11 · Passivo por classe da RJ (RF-09, SDD-INI §5.7, QDR-12): barra 100% e legenda das cinco
// classes, da maior para a menor, somando a relação do AJ das RJ ativas. A legenda fica em duas
// colunas no desktop e no tablet e vira uma coluna no celular.
import { useTodos } from '../../../dados/contexto'
import { formatarMoedaCurta } from '../../../regras/moeda'
import { ROTULOS_CLASSE } from '../../../regras/qgc'
import { Barra100 } from '../../../ui/graficos/Barra100'
import { percentuaisArredondados } from '../../../ui/graficos/calculos'
import { Legenda } from '../../../ui/graficos/Legenda'
import { passivoPorClasse } from '../indicadores'
import { CATALOGO } from '../montagem'
import { type LinkDoQuadro, Quadro } from './Quadro'
import estilos from './QuadroClasses.module.css'
import { ResumoNoCorpo } from './ResumoNoCorpo'
import type { PropsDoQuadro } from './registro'

const LINK: LinkDoQuadro = { para: '/processos', rotulo: 'Processos', modulo: 'processos' }

export function QuadroClasses({ variante }: PropsDoQuadro) {
  const processos = useTodos('processos')
  const credores = useTodos('credores')
  const moldura = { id: 'classes', titulo: CATALOGO.classes.titulo, variante, link: LINK } as const

  if (processos.isError || credores.isError) {
    return <Quadro {...moldura} vazio="Não foi possível carregar o passivo." />
  }
  if (!processos.data || !credores.data) return <Quadro {...moldura} />

  // Da maior para a menor; o sort é estável, então no empate fica a ordem do RF-26.
  const classes = passivoPorClasse(processos.data, credores.data)
    .map((c) => ({ rotulo: ROTULOS_CLASSE[c.classe], valor: c.valor }))
    .sort((a, b) => b.valor - a.valor)
  const total = classes.reduce((soma, c) => soma + c.valor, 0)
  if (total === 0) return <Quadro {...moldura} vazio="Nenhuma RJ ativa com relação do AJ." />

  const percentuais = percentuaisArredondados(classes.map((c) => c.valor))
  const celular = variante === 'celular'
  return (
    <Quadro {...moldura} destaque={celular ? undefined : formatarMoedaCurta(total)}>
      <div className={estilos.corpo}>
        <div className={estilos.conteudo} data-desenho={variante}>
          {celular && <ResumoNoCorpo numero={formatarMoedaCurta(total)} texto="nas RJ ativas" />}
          {/* Sem tom próprio: a barra e a legenda pegam as cinco séries pela posição. */}
          <Barra100
            descricao="Relação do AJ das RJ ativas por classe"
            segmentos={classes}
            formatar={formatarMoedaCurta}
          />
          <Legenda
            emColuna={celular}
            duasColunas={!celular}
            itens={classes.map((c, i) => ({
              rotulo: c.rotulo,
              detalhe: formatarMoedaCurta(c.valor),
              valor: `${percentuais[i]}%`,
            }))}
          />
        </div>
      </div>
    </Quadro>
  )
}
