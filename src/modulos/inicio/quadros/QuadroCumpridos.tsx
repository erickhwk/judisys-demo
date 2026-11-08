// Q-10 · Prazos cumpridos (SDD-INI §5.7, QDR-11): linha dos 12 meses fechados antes do de hoje,
// contados pelo mês do vencimento (C-01, por isso o subtítulo), com o recorde marcado. A linha
// estica com a largura; os rótulos do eixo ficam em até quatro pontos (a primeira ponta, o meio, o
// recorde e a última), e sai o que não couber ao lado do recorde na largura mínima da variante.
import { useTodos } from '../../../dados/contexto'
import { formatarMesAno } from '../../../regras/datas'
import { hoje } from '../../../regras/relogio'
import { Linha } from '../../../ui/graficos/Linha'
import { cumpridosPorMes, rotuloDoMes } from '../indicadores'
import { CATALOGO } from '../montagem'
import { type LinkDoQuadro, Quadro, type Variante } from './Quadro'
import estilos from './QuadroCumpridos.module.css'
import { ResumoNoCorpo } from './ResumoNoCorpo'
import type { PropsDoQuadro } from './registro'

const LINK: LinkDoQuadro = { para: '/agenda', rotulo: 'Agenda', modulo: 'prazos' }

/**
 * Largura mínima do desenho em cada variante (SDD-INI §5.3): duas unidades e o vão, menos os 32px
 * do respiro da moldura; no celular, 288px menos o respiro.
 */
const LARGURA_MINIMA: Record<Variante, number> = {
  desktop: 2 * 208 + 16 - 32,
  tablet: 2 * 292 + 16 - 32,
  celular: 288 - 32,
}

/** Largura estimada do rótulo do eixo (10,5px de Inter: cerca de 5,4px por letra), com folga. */
const larguraDoRotulo = (texto: string) => texto.length * 5.6 + 2
const VAO_ENTRE_ROTULOS = 6

/**
 * Índices dos rótulos do eixo, por prioridade (o recorde, as pontas e o meio), deixando de fora o
 * que encostaria num rótulo já escolhido na largura dada. A posição segue a âncora móvel da `Linha`
 * (o texto começa no ponto na ponta esquerda e termina no ponto na direita).
 */
export function rotulosQueCabem(
  rotulos: readonly string[],
  marca: number | undefined,
  largura: number,
): number[] {
  const ultimo = rotulos.length - 1
  if (ultimo < 0) return []
  const meio = Math.round(ultimo / 2)
  const candidatos = [marca, 0, ultimo, meio].filter(
    (i, k, lista): i is number => i !== undefined && lista.indexOf(i) === k,
  )
  const ocupados: { inicio: number; fim: number }[] = []
  const escolhidos: number[] = []
  for (const i of candidatos) {
    const x = ultimo === 0 ? 0.5 : i / ultimo
    const w = larguraDoRotulo(rotulos[i] ?? '')
    const inicio = x * largura - x * w
    const fim = inicio + w
    const encosta = ocupados.some(
      (o) => inicio < o.fim + VAO_ENTRE_ROTULOS && fim + VAO_ENTRE_ROTULOS > o.inicio,
    )
    if (encosta) continue
    ocupados.push({ inicio, fim })
    escolhidos.push(i)
  }
  return escolhidos.sort((a, b) => a - b)
}

export function QuadroCumpridos({ variante }: PropsDoQuadro) {
  const prazos = useTodos('prazos')
  const moldura = {
    id: 'cumpridos',
    titulo: CATALOGO.cumpridos.titulo,
    variante,
    link: LINK,
  } as const

  if (prazos.isError) return <Quadro {...moldura} vazio="Não foi possível carregar os prazos." />
  if (!prazos.data) return <Quadro {...moldura} />

  const meses = cumpridosPorMes(prazos.data, hoje())
  const total = meses.reduce((soma, m) => soma + m.quantidade, 0)
  if (total === 0) {
    return (
      <Quadro {...moldura} vazio={`Nenhum prazo cumprido nos últimos ${meses.length} meses.`} />
    )
  }
  const maior = Math.max(...meses.map((m) => m.quantidade))
  // Empate: vale o mais recente, que é o recorde a bater.
  const recorde = meses.map((m) => m.quantidade).lastIndexOf(maior)
  const pontos = meses.map((m, i) => ({ rotulo: rotuloDoMes(m.mes, i === 0), valor: m.quantidade }))
  const rotuloDoRecorde = `${pontos[recorde]?.rotulo}: recorde (${maior})`
  const noEixo = rotulosQueCabem(
    pontos.map((p, i) => (i === recorde ? rotuloDoRecorde : p.rotulo)),
    recorde,
    LARGURA_MINIMA[variante],
  )
  const celular = variante === 'celular'
  const primeiro = meses[0]?.mes ?? ''
  const ultimo = meses.at(-1)?.mes ?? ''
  return (
    <Quadro {...moldura} destaque={celular ? undefined : `${total} em ${meses.length} meses`}>
      <div className={estilos.corpo}>
        {celular ? (
          <ResumoNoCorpo
            numero={String(total)}
            texto={`em ${meses.length} meses, por mês de vencimento`}
          />
        ) : (
          <p className={estilos.subtitulo}>por mês de vencimento</p>
        )}
        <Linha
          descricao={`Prazos cumpridos por mês de vencimento, de ${formatarMesAno(`${primeiro}-01`)} a ${formatarMesAno(`${ultimo}-01`)}`}
          pontos={pontos}
          marca={{ indice: recorde, rotulo: rotuloDoRecorde }}
          rotulosNoEixo={noEixo}
          altura={celular ? 96 : 58}
        />
      </div>
    </Quadro>
  )
}
