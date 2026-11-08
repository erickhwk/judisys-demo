// Rosca em SVG (S-06): um círculo por segmento, com o traço medido em % da volta (pathLength).
// Escala por igual com o tamanho; o centro leva o número em destaque (Q-03).
import { useId } from 'react'
import {
  type Formatar,
  fatiasDoTotal,
  formatarNumero,
  type ItemGrafico,
  textoAlternativo,
} from './calculos'
import estilos from './graficos.module.css'
import { corDoTom, type Tom } from './tons'

export interface SegmentoDaRosca extends ItemGrafico {
  tom?: Tom
}

export interface PropsRosca {
  /** Vira o título do SVG, seguido dos valores (INV-05). */
  descricao: string
  segmentos: readonly SegmentoDaRosca[]
  /** Número e legenda curta no meio da rosca (ex.: "8" e "pendentes"). */
  centro?: { valor: string; rotulo?: string }
  /** Lado em px; padrão 100. */
  tamanho?: number
  formatar?: Formatar
}

const RAIO = 40
const ESPESSURA = 13

export function Rosca({
  descricao,
  segmentos,
  centro,
  tamanho = 100,
  formatar = formatarNumero,
}: PropsRosca) {
  const idTitulo = useId()
  const desenho = fatiasDoTotal(segmentos.map((s) => s.valor))
  return (
    <svg
      className={estilos.rosca}
      viewBox="0 0 100 100"
      width={tamanho}
      height={tamanho}
      role="img"
      aria-labelledby={idTitulo}
      data-grafico="rosca"
    >
      <title id={idTitulo}>{textoAlternativo(descricao, segmentos, formatar)}</title>
      <g transform="rotate(-90 50 50)" fill="none" strokeWidth={ESPESSURA}>
        <circle cx="50" cy="50" r={RAIO} stroke={corDoTom('trilho')} />
        {desenho.map(({ indice, inicio, comprimento }) => (
          <circle
            key={indice}
            data-segmento={indice}
            cx="50"
            cy="50"
            r={RAIO}
            pathLength={100}
            stroke={corDoTom(segmentos[indice]?.tom, indice)}
            strokeDasharray={`${comprimento} ${100 - comprimento}`}
            strokeDashoffset={-inicio}
          />
        ))}
      </g>
      {centro && (
        <>
          <text
            x="50"
            y={centro.rotulo ? 50 : 58}
            textAnchor="middle"
            className={estilos.roscaValor}
          >
            {centro.valor}
          </text>
          {centro.rotulo && (
            <text x="50" y="64" textAnchor="middle" className={estilos.roscaRotulo}>
              {centro.rotulo}
            </text>
          )}
        </>
      )}
    </svg>
  )
}
