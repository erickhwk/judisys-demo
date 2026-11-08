// Quadro provisório da INI-03: só a moldura, com o título do catálogo e o link do cabeçalho. Cada
// tarefa de quadros (INI-06 a INI-09) troca o seu no `registro.tsx`; a INI-10 apaga este arquivo.
import { CATALOGO, type IdQuadro } from '../montagem'
import { type LinkDoQuadro, Quadro } from './Quadro'
import type { PropsDoQuadro } from './registro'

/** Links do cabeçalho, pelos rótulos do componente "Quadro" do canvas. */
const LINKS: Record<IdQuadro, LinkDoQuadro> = {
  prazos: { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' },
  agc: { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' },
  pedidos: { para: '/processos', rotulo: 'Processos', modulo: 'processos' },
  proximos: { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' },
  calendario: { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' },
  atividade: { para: '/logs', rotulo: 'Logs', modulo: 'logs' },
  informes: { para: '/informes', rotulo: 'Informes', modulo: 'informes' },
  passivo: { para: '/processos', rotulo: 'Processos', modulo: 'processos' },
  publicados: { para: '/informes', rotulo: 'Informes', modulo: 'informes' },
  cumpridos: { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' },
  classes: { para: '/processos', rotulo: 'Processos', modulo: 'processos' },
  carteira: { para: '/processos', rotulo: 'Processos', modulo: 'processos' },
}

/** Chamado só no carregamento do `registro.tsx`, uma vez por quadro: o componente é estável. */
export function provisorio(id: IdQuadro) {
  // biome-ignore lint/correctness/noComponentHookFactories: fábrica usada só no nível do módulo
  function QuadroProvisorio({ variante }: PropsDoQuadro) {
    return <Quadro id={id} titulo={CATALOGO[id].titulo} variante={variante} link={LINKS[id]} />
  }
  return QuadroProvisorio
}
