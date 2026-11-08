// Q-04 · Próximos prazos (INI-07, ficha "proximos" do canvas): os 6 prazos em aberto mais próximos,
// vencidos primeiro, com a data curta e a relativa; cada um leva ao prazo na aba do processo, e o
// rodapé leva à agenda com o que sobrou (C-05, QDR-05).
import { Link } from 'react-router'
import { useTodos } from '../../../dados/contexto'
import { pode } from '../../../regras/permissoes'
import { hoje as hojeDoRelogio } from '../../../regras/relogio'
import { juntarClasses } from '../../../ui/classes'
import { useSessao } from '../../entrada/sessao'
import { enderecoDoPrazo } from '../../prazos/TabelaPrazos'
import { proximosDoQuadro } from '../indicadores'
import listas from './listaDoQuadro.module.css'
import { Quadro } from './Quadro'
import estilos from './QuadroProximos.module.css'
import type { PropsDoQuadro } from './registro'
import { dataRelativa, diaEMes } from './textos'

export function QuadroProximos({ variante }: PropsDoQuadro) {
  const hoje = hojeDoRelogio()
  const { sessao } = useSessao()
  const prazos = useTodos('prazos')
  const processos = useTodos('processos')
  const lePrazos = sessao ? pode(sessao.papel, 'ler', 'prazos') : false

  const moldura = {
    id: 'proximos',
    titulo: 'Próximos prazos',
    variante,
    link: { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' },
  } as const
  if (prazos.isError || processos.isError) {
    return <Quadro {...moldura} vazio="Não foi possível carregar os prazos." />
  }
  if (!prazos.data || !processos.data) return <Quadro {...moldura} />

  const { prazos: mostrados, restantes } = proximosDoQuadro(prazos.data, hoje)
  if (mostrados.length === 0) return <Quadro {...moldura} vazio="Nenhum prazo em aberto." />
  const apelidos = new Map(processos.data.map((p) => [p.id, p.apelido]))

  return (
    <Quadro {...moldura}>
      <ol className={listas.lista}>
        {mostrados.map((prazo) => {
          const situacao =
            prazo.vencimento < hoje ? 'vencido' : prazo.vencimento === hoje ? 'hoje' : 'futuro'
          const conteudo = (
            <>
              <span className={estilos.quando}>
                <b>{diaEMes(prazo.vencimento)}</b>
                <span>{dataRelativa(prazo.vencimento, hoje)}</span>
              </span>
              <span className={listas.texto}>
                <strong className={listas.principal}>{prazo.titulo}</strong>
                <span className={listas.apoio}>
                  {apelidos.get(prazo.processoId) ?? 'Processo excluído'}
                </span>
              </span>
            </>
          )
          const classe = juntarClasses(listas.linha, estilos.linha)
          return (
            <li key={prazo.id} className={listas.item} data-situacao={situacao}>
              {lePrazos ? (
                <Link to={enderecoDoPrazo(prazo)} className={classe}>
                  {conteudo}
                </Link>
              ) : (
                <span className={classe}>{conteudo}</span>
              )}
            </li>
          )
        })}
      </ol>
      {restantes > 0 &&
        (lePrazos ? (
          <Link to="/agenda" className={listas.rodape}>
            {rodape(restantes)}
          </Link>
        ) : (
          <span className={listas.rodape}>{rodape(restantes)}</span>
        ))}
    </Quadro>
  )
}

const rodape = (restantes: number) =>
  `+ ${restantes} ${restantes === 1 ? 'prazo' : 'prazos'} na agenda`
