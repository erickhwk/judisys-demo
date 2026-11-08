// Q-09 · Informes publicados (SDD-INI §5.7, QDR-10): colunas dos 12 meses até o mês de hoje, com os
// meses de pico em dourado e o mês em curso (ainda incompleto) num tom mais claro. No celular, só os
// 6 últimos, com colunas mais altas. O destaque soma os meses que o gráfico mostra.
import { useTodos } from '../../../dados/contexto'
import { formatarMesAno } from '../../../regras/datas'
import { hoje } from '../../../regras/relogio'
import { Colunas } from '../../../ui/graficos/Colunas'
import { informesPorMes, rotuloDoMes } from '../indicadores'
import { CATALOGO } from '../montagem'
import { type LinkDoQuadro, Quadro } from './Quadro'
import estilos from './QuadroPublicados.module.css'
import { ResumoNoCorpo } from './ResumoNoCorpo'
import type { PropsDoQuadro } from './registro'

const LINK: LinkDoQuadro = { para: '/informes', rotulo: 'Informes', modulo: 'informes' }

/** Meses no celular (ficha do Q-09). */
export const MESES_NO_CELULAR = 6

export function QuadroPublicados({ variante }: PropsDoQuadro) {
  const informes = useTodos('informes')
  const moldura = {
    id: 'publicados',
    titulo: CATALOGO.publicados.titulo,
    variante,
    link: LINK,
  } as const

  if (informes.isError) {
    return <Quadro {...moldura} vazio="Não foi possível carregar os informes." />
  }
  if (!informes.data) return <Quadro {...moldura} />

  const todos = informesPorMes(informes.data, hoje())
  const celular = variante === 'celular'
  const meses = celular ? todos.slice(-MESES_NO_CELULAR) : todos
  const total = meses.reduce((soma, m) => soma + m.quantidade, 0)
  if (total === 0) {
    return <Quadro {...moldura} vazio={`Nenhum informe nos últimos ${meses.length} meses.`} />
  }
  const pico = Math.max(...meses.map((m) => m.quantidade))
  const primeiro = meses[0]?.mes ?? ''
  const ultimo = meses.at(-1)?.mes ?? ''
  return (
    <Quadro {...moldura} destaque={celular ? undefined : `${total} em ${meses.length} meses`}>
      <div className={estilos.corpo}>
        {celular && (
          <ResumoNoCorpo
            numero={String(total)}
            texto={`${total === 1 ? 'informe' : 'informes'} em ${meses.length} meses`}
          />
        )}
        <Colunas
          descricao={`Informes publicados por mês, de ${formatarMesAno(`${primeiro}-01`)} a ${formatarMesAno(`${ultimo}-01`)} (mês em curso)`}
          colunas={meses.map((m) => ({
            rotulo: rotuloDoMes(m.mes),
            valor: m.quantidade,
            destaque: m.quantidade === pico,
            // O mês de hoje ainda está correndo: tom mais claro, salvo se já for o pico.
            tom: m.mes === ultimo && m.quantidade !== pico ? 'serie-4' : undefined,
          }))}
          altura={celular ? 100 : 68}
        />
      </div>
    </Quadro>
  )
}
