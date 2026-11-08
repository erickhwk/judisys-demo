// Q-12 · Carteira por fase (SDD-INI §5.7, ficha "carteira" do canvas): uma trilha por tipo, com
// todas as fases da sequência do RF-14 e as vazias apagadas. Desktop (4×1): duas faixas de fases,
// com o tipo à esquerda. Tablet (2×2): fases em grade de cinco. Celular: lista de fases com a
// contagem. Cada fase com processo leva a Processos filtrada por tipo e fase (QDR-14, F-08).
import { Link } from 'react-router'
import { useTodos } from '../../../dados/contexto'
import type { Fase, TipoProcesso } from '../../../regras/fases'
import { pode } from '../../../regras/permissoes'
import { juntarClasses } from '../../../ui/classes'
import { useSessao } from '../../entrada/sessao'
import { plural, ROTULOS_TIPO } from '../../processos/rotulos'
import { type CarteiraDoTipo, carteiraPorFase, type FaseDaCarteira } from '../indicadores'
import { CATALOGO } from '../montagem'
import { Quadro, type Variante } from './Quadro'
import estilos from './QuadroCarteira.module.css'
import type { PropsDoQuadro } from './registro'

/**
 * Nomes curtos das faixas do desktop e da grade do tablet, como no canvas: com dez fases numa
 * unidade de 208px, cada célula tem uns 60px de texto. O nome inteiro fica no `title`, no nome
 * acessível e na lista do celular.
 */
const ROTULOS_CURTOS: Partial<Record<Fase, string>> = {
  'processamento-deferido': 'Deferido',
  'edital-publicado': 'Edital',
  'relacao-aj-publicada': 'Relação do AJ',
  'plano-apresentado': 'Plano',
  'prazo-objecoes': 'Objeções',
  'plano-homologado': 'Homologado',
  'realizacao-ativo': 'Realização',
}

export const VAZIO_CARTEIRA = 'Nenhum processo na carteira'
export const ERRO_CARTEIRA = 'Não foi possível carregar os processos.'

/** "5 ativas · 1 encerrada", como no canvas; sem encerradas, só as ativas. */
export function resumoDoTipo(carteira: Pick<CarteiraDoTipo, 'ativos' | 'encerrados'>): string {
  const ativas = plural(carteira.ativos, 'ativa', 'ativas')
  return carteira.encerrados === 0
    ? ativas
    : `${ativas} · ${plural(carteira.encerrados, 'encerrada', 'encerradas')}`
}

export function paraProcessos(tipo: TipoProcesso, fase: Fase): string {
  return `/processos?${new URLSearchParams({ tipo, fase })}`
}

export function QuadroCarteira({ variante }: PropsDoQuadro) {
  const processos = useTodos('processos')
  const { sessao } = useSessao()
  const podeAbrir = sessao ? pode(sessao.papel, 'ler', 'processos') : false
  const carteira = processos.data ? carteiraPorFase(processos.data) : null
  // Vazio só sem nenhum processo: uma carteira só de convoladas ou desistências mostra as trilhas zeradas.
  const semProcessos = processos.data?.length === 0

  return (
    <Quadro
      id="carteira"
      titulo={CATALOGO.carteira.titulo}
      variante={variante}
      link={{ para: '/processos', rotulo: 'Processos', modulo: 'processos' }}
      vazio={processos.isError ? ERRO_CARTEIRA : semProcessos ? VAZIO_CARTEIRA : undefined}
    >
      {carteira && (
        <div className={juntarClasses(estilos.carteira, estilos[variante])}>
          {carteira.map((doTipo) => (
            <Trilha key={doTipo.tipo} carteira={doTipo} variante={variante} podeAbrir={podeAbrir} />
          ))}
        </div>
      )}
    </Quadro>
  )
}

function Trilha({
  carteira,
  variante,
  podeAbrir,
}: {
  carteira: CarteiraDoTipo
  variante: Variante
  podeAbrir: boolean
}) {
  const nome = ROTULOS_TIPO[carteira.tipo]
  return (
    <div
      className={juntarClasses(estilos.trilha, estilos[carteira.tipo])}
      data-tipo={carteira.tipo}
    >
      <p className={estilos.tipo}>
        <b className={estilos.nomeTipo}>{nome}</b>
        <span className={estilos.separador} aria-hidden="true">
          {' · '}
        </span>
        <span className={estilos.resumo}>{resumoDoTipo(carteira)}</span>
      </p>
      <ol className={estilos.fases} aria-label={`Fases: ${nome.toLowerCase()}`}>
        {carteira.fases.map((fase) => (
          <li key={fase.fase} className={estilos.item}>
            <CelulaDaFase
              tipo={carteira.tipo}
              fase={fase}
              celular={variante === 'celular'}
              podeAbrir={podeAbrir}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

function CelulaDaFase({
  tipo,
  fase,
  celular,
  podeAbrir,
}: {
  tipo: TipoProcesso
  fase: FaseDaCarteira
  celular: boolean
  podeAbrir: boolean
}) {
  const ocupada = fase.quantidade > 0
  const nomeAcessivel = `${fase.rotulo}: ${
    ocupada ? plural(fase.quantidade, 'processo', 'processos') : 'nenhum processo'
  }`
  // O que se vê é "1 Pedido" (ou "Pedido 1" no celular); o leitor de tela ouve o nome acessível.
  const conteudo = celular ? (
    <>
      <span className={estilos.ponto} aria-hidden="true" />
      <span className={estilos.nome} aria-hidden="true">
        {fase.rotulo}
      </span>
      <b className={estilos.numero} aria-hidden="true">
        {fase.quantidade}
      </b>
    </>
  ) : (
    <>
      <b className={estilos.numero} aria-hidden="true">
        {fase.quantidade}
      </b>
      <span className={estilos.nome} aria-hidden="true">
        {ROTULOS_CURTOS[fase.fase] ?? fase.rotulo}
      </span>
    </>
  )
  const classes = juntarClasses(estilos.fase, ocupada ? estilos.ocupada : estilos.apagada)

  // Fase vazia fica apagada e sem link: a lista filtrada viria vazia.
  if (!ocupada || !podeAbrir) {
    return (
      <span className={classes} title={nomeAcessivel} data-fase={fase.fase}>
        <span className="somente-leitor">{nomeAcessivel}</span>
        {conteudo}
      </span>
    )
  }
  return (
    <Link
      to={paraProcessos(tipo, fase.fase)}
      className={classes}
      title={nomeAcessivel}
      aria-label={nomeAcessivel}
      data-fase={fase.fase}
    >
      {conteudo}
    </Link>
  )
}
