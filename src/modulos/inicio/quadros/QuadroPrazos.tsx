// Q-01 · Prazos em aberto (INI-06), conforme a ficha "prazos" do canvas: o total em aberto, os
// vencidos e os de hoje (que levam à agenda filtrada), a barra por urgência e a legenda das faixas
// que vêm depois. O mesmo desenho nas três variantes; no celular a altura acompanha o conteúdo.
import { Link } from 'react-router'
import { useTodos } from '../../../dados/contexto'
import { pode } from '../../../regras/permissoes'
import { hoje } from '../../../regras/relogio'
import { Barra100, type SegmentoDaBarra } from '../../../ui/graficos/Barra100'
import { Legenda } from '../../../ui/graficos/Legenda'
import { useSessao } from '../../entrada/sessao'
import { prazosPorUrgencia } from '../indicadores'
import { Quadro } from './Quadro'
import estilos from './QuadroPrazos.module.css'
import type { PropsDoQuadro } from './registro'

const TITULO = 'Prazos em aberto'
const LINK = { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' } as const

const plural = (n: number, singular: string, varios: string) => (n === 1 ? singular : varios)

export function QuadroPrazos({ variante }: PropsDoQuadro) {
  const prazos = useTodos('prazos')
  const { sessao } = useSessao()
  const comum = { id: 'prazos', titulo: TITULO, variante, link: LINK } as const

  if (prazos.isError) return <Quadro {...comum} vazio="Não foi possível carregar os prazos." />
  if (!prazos.data) return <Quadro {...comum} />

  const u = prazosPorUrgencia(prazos.data, hoje())
  if (u.abertos === 0) return <Quadro {...comum} vazio="Nenhum prazo em aberto." />

  const leAgenda = !!sessao && pode(sessao.papel, 'ler', 'prazos')
  const segmentos: SegmentoDaBarra[] = [
    { rotulo: 'Vencidos', valor: u.vencidos, tom: 'perigo' },
    { rotulo: 'Hoje', valor: u.hoje, tom: 'serie-2' },
    { rotulo: 'Até 7 dias', valor: u.ate7Dias, tom: 'serie-1' },
    { rotulo: 'De 8 a 30 dias', valor: u.ate30Dias, tom: 'serie-3' },
    { rotulo: 'Depois de 30 dias', valor: u.depois, tom: 'serie-4' },
  ]

  return (
    <Quadro {...comum}>
      <div className={estilos.corpo}>
        <div className={estilos.topo}>
          <span className={estilos.total} data-total="">
            {u.abertos}
          </span>
          <span className={estilos.resumo}>
            <span className={estilos.emAberto}>em aberto</span>
            {(u.vencidos > 0 || u.hoje > 0) && (
              <span className={estilos.urgentes}>
                {u.vencidos > 0 && (
                  <Contagem
                    texto={`${u.vencidos} ${plural(u.vencidos, 'vencido', 'vencidos')}`}
                    periodo="vencidos"
                    classe={estilos.vencidos}
                    link={leAgenda}
                  />
                )}
                {u.vencidos > 0 && u.hoje > 0 && ' · '}
                {u.hoje > 0 && (
                  <Contagem
                    texto={`${u.hoje} hoje`}
                    periodo="hoje"
                    classe={estilos.hoje}
                    link={leAgenda}
                  />
                )}
              </span>
            )}
          </span>
        </div>
        <Barra100 descricao="Prazos em aberto por urgência" segmentos={segmentos} altura={8} />
        <Legenda
          itens={[
            { rotulo: '7 dias', valor: String(u.ate7Dias), tom: 'serie-1' },
            { rotulo: '30 dias', valor: String(u.ate30Dias), tom: 'serie-3' },
            { rotulo: 'depois', valor: String(u.depois), tom: 'serie-4' },
          ]}
        />
      </div>
    </Quadro>
  )
}

/** Vencidos e de hoje levam à agenda já filtrada (F-08); sem leitura da agenda, só o texto. */
function Contagem({
  texto,
  periodo,
  classe,
  link,
}: {
  texto: string
  periodo: 'vencidos' | 'hoje'
  classe: string | undefined
  link: boolean
}) {
  if (!link) return <span className={classe}>{texto}</span>
  return (
    <Link to={`/agenda?periodo=${periodo}`} className={classe}>
      {texto}
    </Link>
  )
}
