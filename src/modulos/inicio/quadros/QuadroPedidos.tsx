// Q-03 · Pedidos de crédito (INI-06), conforme a ficha "pedidos" do canvas: a rosca em SVG com os
// pendentes no centro, a legenda ao lado e a nota do processo com mais pendentes. O link do
// cabeçalho leva aos credores desse processo, onde os pedidos se decidem (RF-29); sem pendentes,
// à lista de processos.
import { useTodos } from '../../../dados/contexto'
import { Legenda } from '../../../ui/graficos/Legenda'
import { Rosca, type SegmentoDaRosca } from '../../../ui/graficos/Rosca'
import { pedidosPorStatus } from '../indicadores'
import { type LinkDoQuadro, Quadro } from './Quadro'
import estilos from './QuadroPedidos.module.css'
import type { PropsDoQuadro } from './registro'

const TITULO = 'Pedidos de crédito'
const LINK_PROCESSOS: LinkDoQuadro = {
  para: '/processos',
  rotulo: 'Processos',
  modulo: 'processos',
}

export function QuadroPedidos({ variante }: PropsDoQuadro) {
  const pedidos = useTodos('pedidosDeCredito')
  const processos = useTodos('processos')
  const comum = { id: 'pedidos', titulo: TITULO, variante } as const

  if (pedidos.isError || processos.isError) {
    return <Quadro {...comum} link={LINK_PROCESSOS} vazio="Não foi possível carregar os pedidos." />
  }
  if (!pedidos.data || !processos.data) return <Quadro {...comum} link={LINK_PROCESSOS} />

  // Pedido de processo que não existe mais fica de fora, como a AGC do resumo do dia.
  const apelidos = new Map(processos.data.map((p) => [p.id, p.apelido]))
  const s = pedidosPorStatus(pedidos.data.filter((p) => apelidos.has(p.processoId)))
  if (s.pendentes + s.acolhidos + s.rejeitados === 0) {
    return <Quadro {...comum} link={LINK_PROCESSOS} vazio="Nenhum pedido de crédito." />
  }

  const segmentos: SegmentoDaRosca[] = [
    { rotulo: 'Pendentes', valor: s.pendentes, tom: 'serie-2' },
    { rotulo: 'Acolhidos', valor: s.acolhidos, tom: 'serie-1' },
    { rotulo: 'Rejeitados', valor: s.rejeitados, tom: 'serie-4' },
  ]
  const mais = s.maisPendentes
  const link: LinkDoQuadro = mais
    ? { para: `/processos/${mais.processoId}/credores`, rotulo: 'Ver', modulo: 'credores' }
    : LINK_PROCESSOS

  return (
    <Quadro {...comum} link={link}>
      <div className={estilos.corpo}>
        <div className={estilos.grafico}>
          <Rosca
            descricao="Pedidos de crédito por status"
            segmentos={segmentos}
            tamanho={variante === 'celular' ? 100 : 84}
            centro={{
              valor: String(s.pendentes),
              rotulo: s.pendentes === 1 ? 'pendente' : 'pendentes',
            }}
          />
          <div className={estilos.legenda}>
            <Legenda
              emColuna
              itens={segmentos.map((seg) => ({
                rotulo: seg.rotulo,
                valor: String(seg.valor),
                tom: seg.tom,
              }))}
            />
          </div>
        </div>
        {mais && (
          <p className={estilos.nota} data-nota="">
            Mais pendentes: <b>{apelidos.get(mais.processoId)}</b> ({mais.pendentes})
          </p>
        )}
      </div>
    </Quadro>
  )
}
