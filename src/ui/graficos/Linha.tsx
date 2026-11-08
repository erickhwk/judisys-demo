// Linha em SVG (S-06), escalada pelo maior valor. O desenho estica na largura
// (preserveAspectRatio="none") com traço que não escala; o ponto marcado (ex.: recorde) e os
// rótulos do eixo ficam em HTML, posicionados em %, para não virarem elipse nem texto deformado.
import { useId } from 'react'
import {
  type Formatar,
  formatarNumero,
  type ItemGrafico,
  pontosDaLinha,
  rotulosPadraoDoEixo,
  textoAlternativo,
} from './calculos'
import estilos from './graficos.module.css'
import { corDoTom, type Tom } from './tons'

export interface PropsLinha {
  /** Vira o nome acessível do gráfico, seguido dos valores (INV-05). */
  descricao: string
  pontos: readonly ItemGrafico[]
  /** Ponto em destaque, com o rótulo que ele leva no eixo (ex.: "set: recorde (6)"). */
  marca?: { indice: number; rotulo?: string }
  /** Índices dos pontos com rótulo no eixo; padrão as pontas e a marca (`rotulosPadraoDoEixo`). */
  rotulosNoEixo?: readonly number[]
  /** Altura do desenho em px, sem os rótulos; padrão 96. */
  altura?: number
  tom?: Tom
  formatar?: Formatar
}

export function Linha({
  descricao,
  pontos,
  marca,
  rotulosNoEixo,
  altura = 96,
  tom = 'serie-1',
  formatar = formatarNumero,
}: PropsLinha) {
  const idTitulo = useId()
  const coordenadas = pontosDaLinha(pontos.map((p) => p.valor))
  const marcado = marca ? coordenadas[marca.indice] : undefined
  const noEixo = rotulosNoEixo ?? rotulosPadraoDoEixo(pontos.length, marca?.indice)
  return (
    <div className={estilos.linha} data-grafico="linha">
      <div className={estilos.areaLinha} style={{ height: altura }}>
        <svg
          className={estilos.desenhoLinha}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={idTitulo}
        >
          <title id={idTitulo}>{textoAlternativo(descricao, pontos, formatar)}</title>
          {[0, 50].map((y) => (
            <line
              key={y}
              x1="0"
              x2="100"
              y1={y}
              y2={y}
              className={estilos.guia}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <line
            x1="0"
            x2="100"
            y1="100"
            y2="100"
            className={estilos.base}
            vectorEffect="non-scaling-stroke"
          />
          {coordenadas.length > 0 && (
            <polyline
              points={coordenadas.map(({ x, y }) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={corDoTom(tom)}
              className={estilos.traco}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {marcado && (
          <span
            className={estilos.marca}
            style={{ left: `${marcado.x}%`, top: `${marcado.y}%`, background: corDoTom('serie-2') }}
            data-marca={marca?.indice}
            aria-hidden="true"
          />
        )}
      </div>
      <div className={estilos.rotulosLinha} aria-hidden="true">
        {noEixo.map((i) => {
          const ponto = coordenadas[i]
          if (!ponto) return null
          return (
            <span
              key={i}
              className={marca?.indice === i ? estilos.rotuloMarca : undefined}
              style={estiloDoRotulo(ponto.x)}
            >
              {marca?.indice === i && marca.rotulo ? marca.rotulo : pontos[i]?.rotulo}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Rótulo do eixo no ponto x (%): a âncora anda com o x (começa no ponto na ponta esquerda, centra
 * no meio, termina no ponto na ponta direita), então o texto nunca sai da área, nem o da marca
 * perto de uma ponta nem o de um ponto só.
 */
export function estiloDoRotulo(x: number) {
  return { left: `${x}%`, transform: `translateX(-${x}%)` }
}
