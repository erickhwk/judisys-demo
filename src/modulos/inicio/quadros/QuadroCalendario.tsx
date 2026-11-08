// Q-05 · Calendário do mês (INI-07, ficha "calendario" do canvas): o mês de hoje com os prazos em
// aberto e as AGCs marcados (`prazosDoMes`, QDR-06), o destaque do dia, a legenda e, no pé, o
// primeiro evento de hoje em diante, que leva ao registro. No celular, as células crescem para
// 38px (alvo de toque). A grade é só visual: o leitor de tela lê o resumo do mês.
import { Link } from 'react-router'
import { useTodos } from '../../../dados/contexto'
import { type DataIso, formatarMesAno } from '../../../regras/datas'
import { pode } from '../../../regras/permissoes'
import { hoje as hojeDoRelogio } from '../../../regras/relogio'
import { juntarClasses } from '../../../ui/classes'
import { useSessao } from '../../entrada/sessao'
import { DIAS_DA_SEMANA, mesDe, semanasDoMes } from '../../prazos/regras'
import { enderecoDoPrazo } from '../../prazos/TabelaPrazos'
import { type DestaqueDoMes, destaqueDoMes, type MarcaDoDia, prazosDoMes } from '../indicadores'
import { Quadro } from './Quadro'
import estilos from './QuadroCalendario.module.css'
import type { PropsDoQuadro } from './registro'

const LEGENDA: readonly [MarcaDoDia, string][] = [
  ['vencido', 'vencido'],
  ['hoje', 'hoje'],
  ['prazo', 'prazo'],
  ['agc', 'AGC'],
]

export function QuadroCalendario({ variante }: PropsDoQuadro) {
  const hoje = hojeDoRelogio()
  const prazos = useTodos('prazos')
  const agcs = useTodos('agcs')
  const processos = useTodos('processos')

  const moldura = {
    id: 'calendario',
    titulo: 'Calendário do mês',
    variante,
    link: { para: '/agenda?vista=calendario', rotulo: 'Agenda', modulo: 'prazos' },
  } as const
  if (prazos.isError || agcs.isError || processos.isError) {
    return <Quadro {...moldura} vazio="Não foi possível carregar o calendário." />
  }
  if (!prazos.data || !agcs.data || !processos.data) return <Quadro {...moldura} />

  const marcas = prazosDoMes(prazos.data, agcs.data, hoje)
  const destaque = destaqueDoMes(prazos.data, agcs.data, hoje)
  const semanas = semanasDoMes(mesDe(hoje))
  const nomeDoMes = maiuscula(formatarMesAno(hoje))
  const apelidos = new Map(processos.data.map((p) => [p.id, p.apelido]))

  return (
    <Quadro {...moldura}>
      <div className={estilos.calendario} data-semanas={semanas.length}>
        <p className={estilos.mes}>{nomeDoMes}</p>
        <p className="somente-leitor">{resumoDoMes(marcas, hoje)}</p>
        <div className={estilos.semana} aria-hidden="true">
          {DIAS_DA_SEMANA.map((dia) => (
            <span key={dia}>{dia.charAt(0).toUpperCase()}</span>
          ))}
        </div>
        <div className={estilos.grade} aria-hidden="true">
          {semanas.flat().map(({ data, foraDoMes }) =>
            foraDoMes ? (
              <span key={data} />
            ) : (
              <span
                key={data}
                className={estilos.dia}
                data-marca={marcas.get(data)}
                data-dia={data}
                data-hoje={data === hoje || undefined}
                data-passado={data < hoje || undefined}
              >
                {Number(data.slice(8))}
              </span>
            ),
          )}
        </div>
        <ul className={estilos.legenda} aria-hidden="true">
          {LEGENDA.map(([marca, rotulo]) => (
            <li key={marca} data-marca={marca}>
              {rotulo}
            </li>
          ))}
        </ul>
        {destaque ? (
          <Destaque destaque={destaque} hoje={hoje} apelidos={apelidos} />
        ) : (
          <p className={juntarClasses(estilos.pe, estilos.livre)}>
            {marcas.size === 0
              ? `Nenhum prazo nem AGC em ${formatarMesAno(hoje).split(' ')[0]}.`
              : 'Nenhum prazo nem AGC até o fim do mês.'}
          </p>
        )}
      </div>
    </Quadro>
  )
}

/** O cartão do pé: o evento de hoje (ou o próximo do mês), com o processo e o link do registro. */
function Destaque({
  destaque,
  hoje,
  apelidos,
}: {
  destaque: DestaqueDoMes
  hoje: DataIso
  apelidos: ReadonlyMap<string, string>
}) {
  const { sessao } = useSessao()
  const ehPrazo = destaque.tipo === 'prazo'
  const registro = ehPrazo ? destaque.prazo : destaque.agc
  const podeAbrir = sessao ? pode(sessao.papel, 'ler', ehPrazo ? 'prazos' : 'agc') : false
  const para = ehPrazo
    ? enderecoDoPrazo(destaque.prazo)
    : `/processos/${destaque.agc.processoId}/agc/${destaque.agc.id}`
  const quando = destaque.data === hoje ? 'Hoje' : 'Próximo'
  const apelido = apelidos.get(registro.processoId) ?? 'Processo excluído'
  const conteudo = (
    <>
      <span className={estilos.quando}>{`${quando} · ${diaCurto(destaque.data)}`}</span>
      <span className={estilos.titulo}>
        {ehPrazo ? destaque.prazo.titulo : `AGC · ${destaque.convocacao}ª convocação`}
      </span>
      <span className={estilos.processo}>
        {destaque.outros > 0 ? `${apelido} · e mais ${destaque.outros}` : apelido}
      </span>
    </>
  )
  const classe = juntarClasses(estilos.pe, estilos.cartao)
  const dados = { 'data-hoje': destaque.data === hoje || undefined, 'data-tipo': destaque.tipo }
  return podeAbrir ? (
    <Link to={para} className={classe} {...dados}>
      {conteudo}
    </Link>
  ) : (
    <p className={classe} {...dados}>
      {conteudo}
    </p>
  )
}

/** `7/11`: o dia sem o zero à esquerda, como no canvas. */
function diaCurto(data: DataIso): string {
  return `${Number(data.slice(8, 10))}/${data.slice(5, 7)}`
}

function maiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const NOMES_DA_MARCA: Readonly<Record<MarcaDoDia, [string, string]>> = {
  vencido: ['prazo vencido', 'prazos vencidos'],
  hoje: ['prazo de hoje', 'prazos de hoje'],
  prazo: ['prazo', 'prazos'],
  agc: ['AGC', 'AGCs'],
}

/** Texto do mês para o leitor de tela: "Em novembro: prazo vencido no dia 5; …" (INV-05). */
function resumoDoMes(marcas: ReadonlyMap<DataIso, MarcaDoDia>, hoje: DataIso): string {
  const mes = formatarMesAno(hoje).split(' ')[0]
  if (marcas.size === 0) return `Nenhum prazo nem AGC em ${mes}.`
  const partes = LEGENDA.flatMap(([marca]) => {
    const dias = [...marcas].filter(([, m]) => m === marca).map(([data]) => Number(data.slice(8)))
    if (dias.length === 0) return []
    const [um, varios] = NOMES_DA_MARCA[marca]
    return dias.length === 1
      ? [`${um} no dia ${dias[0]}`]
      : [`${varios} nos dias ${dias.slice(0, -1).join(', ')} e ${dias.at(-1)}`]
  })
  return `Em ${mes}: ${partes.join('; ')}.`
}
