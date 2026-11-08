// Barra 100% em SVG (S-06): estica na largura (preserveAspectRatio="none") e separa os segmentos
// com um traço da cor da superfície que não escala. Os percentuais do texto alternativo são
// inteiros que somam 100; o desenho usa os valores exatos.
import { useId } from 'react'
import {
  type Formatar,
  fatiasDoTotal,
  formatarNumero,
  type ItemGrafico,
  percentuaisArredondados,
  textoAlternativo,
} from './calculos'
import estilos from './graficos.module.css'
import { corDoTom, type Tom } from './tons'

export interface SegmentoDaBarra extends ItemGrafico {
  tom?: Tom
}

export interface PropsBarra100 {
  /** Vira o título do SVG, seguido dos valores e percentuais (INV-05). */
  descricao: string
  segmentos: readonly SegmentoDaBarra[]
  /** Altura em px; padrão 14. */
  altura?: number
  formatar?: Formatar
}

export function Barra100({
  descricao,
  segmentos,
  altura = 14,
  formatar = formatarNumero,
}: PropsBarra100) {
  const idTitulo = useId()
  const valores = segmentos.map((s) => s.valor)
  const percentuais = percentuaisArredondados(valores)
  const desenho = fatiasDoTotal(valores)
  return (
    <svg
      className={estilos.barra100}
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      style={{ height: altura }}
      role="img"
      aria-labelledby={idTitulo}
      data-grafico="barra100"
    >
      <title id={idTitulo}>
        {textoAlternativo(descricao, segmentos, formatar, (i) => ` (${percentuais[i]}%)`)}
      </title>
      <rect x="0" y="0" width="100" height="10" fill={corDoTom('trilho')} />
      {desenho.map(({ indice, inicio, comprimento }) => (
        <rect
          key={indice}
          data-segmento={indice}
          x={inicio}
          y="0"
          width={comprimento}
          height="10"
          fill={corDoTom(segmentos[indice]?.tom, indice)}
        />
      ))}
      {desenho.slice(1).map(({ indice, inicio }) => (
        <line
          key={`divisa-${indice}`}
          x1={inicio}
          x2={inicio}
          y1="0"
          y2="10"
          className={estilos.divisa}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
