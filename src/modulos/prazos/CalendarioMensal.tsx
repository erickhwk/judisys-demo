// Calendário mensal da agenda (RF-25, PRZ-09, T-08: próprio, sem biblioteca). Cada dia mostra os
// prazos que vencem nele, com a cor da situação; o prazo leva à aba Prazos do processo; a
// navegação é mês a mês. No celular, vira uma lista só com os dias que têm prazo.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import type { Tipos } from '../../dados/schemas'
import { type DataIso, formatarDataPorExtenso, formatarMesAno } from '../../regras/datas'
import { situacao } from '../../regras/prazos'
import { Botao, BotaoIcone } from '../../ui/Botao'
import { juntarClasses } from '../../ui/classes'
import estilos from './prazos.module.css'
import {
  DIAS_DA_SEMANA,
  type Mes,
  mesDe,
  prazosPorDia,
  rotuloSituacao,
  semanasDoMes,
  somarMesesAoMes,
} from './regras'
import { enderecoDoPrazo } from './TabelaPrazos'

type Prazo = Tipos['prazos']

export type PropsCalendarioMensal = {
  mes: Mes
  hoje: DataIso
  /** Já filtrados por processo e responsável; o calendário mostra os do mês. */
  prazos: readonly Prazo[]
  processos: ReadonlyMap<string, Tipos['processos']>
  aoMudarMes: (mes: Mes) => void
}

export function CalendarioMensal({
  mes,
  hoje,
  prazos,
  processos,
  aoMudarMes,
}: PropsCalendarioMensal) {
  const idTitulo = useId()
  const semanas = semanasDoMes(mes)
  const primeiro = semanas[0]?.[0]?.data ?? `${mes}-01`
  const ultimo = semanas.at(-1)?.at(-1)?.data ?? `${mes}-01`
  const porDia = prazosPorDia(
    prazos.filter((p) => p.vencimento >= primeiro && p.vencimento <= ultimo),
  )
  const doMes = prazos.filter((p) => mesDe(p.vencimento) === mes).length

  return (
    <section className={estilos.calendario} aria-labelledby={idTitulo}>
      <div className={estilos.calendarioTopo}>
        <div className={estilos.navegacaoMes}>
          <BotaoIcone
            aria-label="Mês anterior"
            icone={<ChevronLeft size={20} />}
            onClick={() => aoMudarMes(somarMesesAoMes(mes, -1))}
          />
          <h2 id={idTitulo} className={estilos.tituloMes} aria-live="polite">
            {formatarMesAno(`${mes}-01`)}
          </h2>
          <BotaoIcone
            aria-label="Próximo mês"
            icone={<ChevronRight size={20} />}
            onClick={() => aoMudarMes(somarMesesAoMes(mes, 1))}
          />
        </div>
        <div className={estilos.navegacaoMes}>
          <span className={estilos.contagemMes}>
            {doMes === 0
              ? 'Nenhum prazo no mês'
              : doMes === 1
                ? '1 prazo no mês'
                : `${doMes} prazos no mês`}
          </span>
          {mes !== mesDe(hoje) && (
            <Botao variante="secundario" onClick={() => aoMudarMes(mesDe(hoje))}>
              Mês atual
            </Botao>
          )}
        </div>
      </div>
      <div className={estilos.semana} aria-hidden="true">
        {DIAS_DA_SEMANA.map((dia) => (
          <span key={dia}>{dia}</span>
        ))}
      </div>
      <ol className={estilos.grade}>
        {semanas.flat().map(({ data, foraDoMes }) => {
          const doDia = porDia.get(data) ?? []
          return (
            <li
              key={data}
              className={juntarClasses(
                estilos.dia,
                foraDoMes && estilos.foraDoMes,
                doDia.length === 0 && estilos.diaVazio,
                data === hoje && estilos.hoje,
              )}
              aria-current={data === hoje ? 'date' : undefined}
            >
              <span className={estilos.numeroDia}>
                <span aria-hidden="true">{Number(data.slice(8))}</span>
                <span className={estilos.dataPorExtenso}>
                  {formatarDataPorExtenso(data)}
                  {data === hoje && ' (hoje)'}
                </span>
              </span>
              {doDia.length > 0 && (
                <ul className={estilos.prazosDoDia}>
                  {doDia.map((prazo) => {
                    const apelido = processos.get(prazo.processoId)?.apelido ?? ''
                    const estado = rotuloSituacao(prazo, hoje)
                    return (
                      <li key={prazo.id}>
                        <Link
                          to={enderecoDoPrazo(prazo)}
                          className={juntarClasses(
                            estilos.prazoDoDia,
                            estilos[`prazo_${situacao(prazo, hoje)}`],
                          )}
                          title={`${prazo.titulo} · ${apelido} · ${estado}`}
                        >
                          <span className={estilos.prazoTitulo}>{prazo.titulo}</span>
                          <span className={estilos.prazoProcesso}>{apelido}</span>
                          <span className="somente-leitor">{`, ${estado}`}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
      {doMes === 0 && <p className={estilos.semPrazosNoMes}>Nenhum prazo neste mês.</p>}
    </section>
  )
}
