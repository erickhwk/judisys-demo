// Aba Visão geral (RF-13): linha do tempo das fases (com a data de cada marco), próximos prazos
// abertos e os dados do processo.
import { Link } from 'react-router'
import { useRegistro, useTodos } from '../../dados/contexto'
import { diasEntre, formatarData, formatarMoeda } from '../../regras/datas'
import { ROTULOS_FASE } from '../../regras/fases'
import { type SituacaoPrazo, situacao } from '../../regras/prazos'
import { hoje } from '../../regras/relogio'
import { juntarClasses } from '../../ui/classes'
import { Selo, type TomSelo } from '../../ui/Selo'
import { Vazio } from '../../ui/Vazio'
import { linhaDoTempo } from './linhaDoTempo'
import estilos from './processos.module.css'
import { plural, ROTULOS_CONSOLIDACAO } from './rotulos'

const MAXIMO_PRAZOS = 5

const SITUACOES: Record<Exclude<SituacaoPrazo, 'cumprido'>, { tom: TomSelo; texto: string }> = {
  vencido: { tom: 'perigo', texto: 'Vencido' },
  urgente: { tom: 'alerta', texto: 'Vence em breve' },
  normal: { tom: 'neutro', texto: 'No prazo' },
}

function quandoVence(vencimento: string, dataHoje: string): string {
  const dias = diasEntre(dataHoje, vencimento)
  if (dias === 0) return 'vence hoje'
  if (dias < 0) return `venceu há ${plural(-dias, 'dia', 'dias')}`
  return `em ${plural(dias, 'dia', 'dias')}`
}

export function AbaVisaoGeral({ processoId }: { processoId: string }) {
  const processo = useRegistro('processos', processoId)
  const marcos = useTodos('marcosDeFase', { onde: { processoId } })
  const prazos = useTodos('prazos', {
    onde: { processoId, status: 'aberto' },
    ordem: { campo: 'vencimento', direcao: 'asc' },
  })
  const vinculos = useTodos('processoEmpresas', { onde: { processoId } })
  if (!processo.data) return null
  const atual = processo.data
  const dataHoje = hoje()
  const passos = marcos.data ? linhaDoTempo(atual, marcos.data) : []
  const proximos = (prazos.data ?? []).slice(0, MAXIMO_PRAZOS)
  const honorarios = [
    atual.honorariosPercentual != null
      ? `${String(atual.honorariosPercentual).replace('.', ',')}%`
      : null,
    atual.honorariosValor != null ? formatarMoeda(atual.honorariosValor) : null,
  ].filter(Boolean)

  return (
    <div className={estilos.gradeVisaoGeral}>
      <section
        className={juntarClasses(estilos.cartao, estilos.secaoCartao)}
        aria-labelledby="titulo-fases"
      >
        <h2 id="titulo-fases" className={estilos.tituloCartao}>
          Fases
        </h2>
        <ol className={estilos.linhaDoTempo}>
          {passos.map((passo) => (
            <li
              key={passo.fase}
              className={estilos[`passo_${passo.estado}`]}
              aria-current={passo.estado === 'atual' ? 'step' : undefined}
            >
              <span className={estilos.marcador} aria-hidden="true" />
              <span className={estilos.nomeFase}>{ROTULOS_FASE[passo.fase]}</span>
              <span className={estilos.detalheFase}>
                {passo.data
                  ? formatarData(passo.data)
                  : passo.estado === 'pulada'
                    ? 'Pulada'
                    : 'Pendente'}
                {passo.estado === 'atual' && ' · fase atual'}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className={estilos.colunaLateral}>
        <section
          className={juntarClasses(estilos.cartao, estilos.secaoCartao)}
          aria-labelledby="titulo-prazos"
        >
          <div className={estilos.tituloComLink}>
            <h2 id="titulo-prazos" className={estilos.tituloCartao}>
              Próximos prazos
            </h2>
            <Link to={`/processos/${processoId}/prazos`}>Ver todos</Link>
          </div>
          {prazos.isSuccess && proximos.length === 0 ? (
            <Vazio titulo="Nenhum prazo aberto" />
          ) : (
            <ul className={estilos.listaPrazos}>
              {proximos.map((prazo) => {
                const sit = situacao(prazo, dataHoje)
                const selo = sit === 'cumprido' ? null : SITUACOES[sit]
                return (
                  <li key={prazo.id}>
                    <div>
                      <p className={estilos.tituloPrazo}>{prazo.titulo}</p>
                      <p className={estilos.detalhePrazo}>
                        {formatarData(prazo.vencimento)} · {quandoVence(prazo.vencimento, dataHoje)}
                      </p>
                    </div>
                    {selo && <Selo tom={selo.tom}>{selo.texto}</Selo>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section
          className={juntarClasses(estilos.cartao, estilos.secaoCartao)}
          aria-labelledby="titulo-dados"
        >
          <h2 id="titulo-dados" className={estilos.tituloCartao}>
            Dados do processo
          </h2>
          <dl className={estilos.dados}>
            <div>
              <dt>Comarca</dt>
              <dd>
                {atual.comarca}/{atual.uf}
              </dd>
            </div>
            <div>
              <dt>Vara</dt>
              <dd>{atual.vara}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{atual.email || '—'}</dd>
            </div>
            <div>
              <dt>Consolidação</dt>
              <dd>{ROTULOS_CONSOLIDACAO[atual.consolidacao]}</dd>
            </div>
            <div>
              <dt>Passivo declarado</dt>
              <dd className="numeros-tabulares">{formatarMoeda(atual.passivoDeclarado)}</dd>
            </div>
            <div>
              <dt>Honorários</dt>
              <dd className="numeros-tabulares">{honorarios.join(' · ') || '—'}</dd>
            </div>
            <div>
              <dt>Empresas</dt>
              <dd>
                <Link to={`/processos/${processoId}/empresas`}>
                  {plural(vinculos.data?.length ?? 0, 'empresa', 'empresas')}
                </Link>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}
