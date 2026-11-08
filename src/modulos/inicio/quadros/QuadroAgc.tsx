// Q-02 · Próxima AGC (INI-06), conforme a ficha "agc" do canvas: a data em destaque numa folhinha,
// o processo, o dia da semana com a distância de hoje e as duas convocações. O link do cabeçalho
// abre a AGC; sem AGC agendada, o estado vazio e o link para a agenda (RF-15, QDR-03).
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTodos } from '../../../dados/contexto'
import { type DataIso, diasEntre } from '../../../regras/datas'
import { hoje as hojeDoRelogio } from '../../../regras/relogio'
import { proximaAgc } from '../indicadores'
import { type LinkDoQuadro, Quadro } from './Quadro'
import estilos from './QuadroAgc.module.css'
import type { PropsDoQuadro } from './registro'

const TITULO = 'Próxima AGC'
const LINK_AGENDA: LinkDoQuadro = { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' }

/** "13/11". As convocações não têm hora na demo (o "10h" do canvas é ilustrativo, PRD §9). */
const diaEMes = (data: DataIso) => format(parseISO(data), 'dd/MM')

/** "sexta · em 6 dias", "hoje" ou "amanhã" (sem o "-feira" do dia da semana). */
export function quandoEhAgc(data: DataIso, hoje: DataIso): string {
  const dias = diasEntre(hoje, data)
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  const semana = format(parseISO(data), 'EEEE', { locale: ptBR }).replace('-feira', '')
  return `${semana} · em ${dias} dias`
}

export function QuadroAgc({ variante }: PropsDoQuadro) {
  const agcs = useTodos('agcs')
  const processos = useTodos('processos')
  const comum = { id: 'agc', titulo: TITULO, variante } as const

  if (agcs.isError || processos.isError) {
    return <Quadro {...comum} link={LINK_AGENDA} vazio="Não foi possível carregar as AGCs." />
  }
  if (!agcs.data || !processos.data) return <Quadro {...comum} link={LINK_AGENDA} />

  const hoje = hojeDoRelogio()
  // Como no resumo do dia: AGC de processo que não existe mais fica de fora.
  const apelidos = new Map(processos.data.map((p) => [p.id, p.apelido]))
  const agc = proximaAgc(
    agcs.data.filter((a) => apelidos.has(a.processoId)),
    hoje,
  )
  if (!agc) return <Quadro {...comum} link={LINK_AGENDA} vazio="Nenhuma AGC agendada" />

  const data = parseISO(agc.dataPrimeira)
  return (
    <Quadro
      {...comum}
      link={{ para: `/processos/${agc.processoId}/agc/${agc.id}`, rotulo: 'Abrir', modulo: 'agc' }}
    >
      <div className={estilos.corpo}>
        <div className={estilos.topo}>
          <span className={estilos.folhinha} aria-hidden="true">
            <span className={estilos.mes}>
              {format(data, 'MMM', { locale: ptBR }).replace('.', '')}
            </span>
            <span className={estilos.dia}>{format(data, 'd')}</span>
          </span>
          <span className={estilos.texto}>
            <strong className={estilos.processo}>{apelidos.get(agc.processoId)}</strong>
            <span className={estilos.quando}>{quandoEhAgc(agc.dataPrimeira, hoje)}</span>
          </span>
        </div>
        <dl className={estilos.convocacoes}>
          <div className={estilos.convocacao}>
            <dt>
              1ª <span className={estilos.longo}>convocação</span>
              <span className={estilos.curto} aria-hidden="true">
                conv.
              </span>
            </dt>
            <dd>{diaEMes(agc.dataPrimeira)}</dd>
          </div>
          <div className={estilos.convocacao}>
            <dt>
              2ª <span className={estilos.longo}>convocação</span>
              <span className={estilos.curto} aria-hidden="true">
                conv.
              </span>
            </dt>
            <dd>{diaEMes(agc.dataSegunda)}</dd>
          </div>
        </dl>
      </div>
    </Quadro>
  )
}
