// Q-07 · Últimos informes (INI-07, ficha "informes" do canvas): os 5 informes mais recentes, do mais
// novo ao mais antigo (`ultimosInformes`, QDR-08), com o título em até duas linhas, a categoria, o
// processo e a data. Cada um leva ao informe (RF-40: só para quem lê informes).
import { Link } from 'react-router'
import { useTodos } from '../../../dados/contexto'
import { CATEGORIAS_INFORME } from '../../../dados/schemas'
import { pode } from '../../../regras/permissoes'
import { juntarClasses } from '../../../ui/classes'
import { useSessao } from '../../entrada/sessao'
import { ultimosInformes } from '../indicadores'
import listas from './listaDoQuadro.module.css'
import { Quadro } from './Quadro'
import estilos from './QuadroInformes.module.css'
import type { PropsDoQuadro } from './registro'
import { diaEMes } from './textos'

export function QuadroInformes({ variante }: PropsDoQuadro) {
  const { sessao } = useSessao()
  const informes = useTodos('informes')
  const processos = useTodos('processos')
  const leInformes = sessao ? pode(sessao.papel, 'ler', 'informes') : false

  const moldura = {
    id: 'informes',
    titulo: 'Últimos informes',
    variante,
    link: { para: '/informes', rotulo: 'Informes', modulo: 'informes' },
  } as const
  if (informes.isError || processos.isError) {
    return <Quadro {...moldura} vazio="Não foi possível carregar os informes." />
  }
  if (!informes.data || !processos.data) return <Quadro {...moldura} />

  const ultimos = ultimosInformes(informes.data)
  if (ultimos.length === 0) return <Quadro {...moldura} vazio="Nenhum informe cadastrado." />
  const apelidos = new Map(processos.data.map((p) => [p.id, p.apelido]))

  return (
    <Quadro {...moldura}>
      <ol className={listas.lista}>
        {ultimos.map((informe) => {
          const conteudo = (
            <>
              <strong className={estilos.titulo}>{informe.titulo}</strong>
              <span className={estilos.meta}>
                <span className={estilos.categoria}>{CATEGORIAS_INFORME[informe.categoria]}</span>
                <span className={estilos.processo}>
                  {apelidos.get(informe.processoId) ?? 'Processo excluído'}
                </span>
                <span className={estilos.data}>{diaEMes(informe.data)}</span>
              </span>
            </>
          )
          const classe = juntarClasses(listas.linha, estilos.linha)
          return (
            <li key={informe.id} className={listas.item}>
              {leInformes ? (
                <Link to={`/informes/${informe.id}`} className={classe}>
                  {conteudo}
                </Link>
              ) : (
                <span className={classe}>{conteudo}</span>
              )}
            </li>
          )
        })}
      </ol>
    </Quadro>
  )
}
