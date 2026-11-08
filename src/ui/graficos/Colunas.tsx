// Colunas em SVG (S-06), escaladas pelo maior valor. O desenho estica na largura
// (preserveAspectRatio="none"); os números e os rótulos ficam em HTML, numa grade com as mesmas
// colunas, para o texto não deformar em nenhuma largura.
import { useId } from 'react'
import {
  type Formatar,
  formatarNumero,
  type ItemGrafico,
  proporcoesPeloMaximo,
  textoAlternativo,
} from './calculos'
import estilos from './graficos.module.css'
import { corDoTom, type Tom } from './tons'

export interface Coluna extends ItemGrafico {
  /** Coluna em destaque (ex.: mês de pico) usa o tom 2 quando não tem tom próprio. */
  destaque?: boolean
  tom?: Tom
}

export interface PropsColunas {
  /** Vira o nome acessível do gráfico, seguido dos valores (INV-05). */
  descricao: string
  colunas: readonly Coluna[]
  /** Altura da área das colunas em px, sem os rótulos; padrão 120. */
  altura?: number
  /** Mostra o número em cima de cada coluna; padrão sim. */
  mostrarValores?: boolean
  formatar?: Formatar
}

/** Largura da coluna em relação à faixa dela (o resto é o vão). */
const OCUPACAO = 0.6
/** Largura de cada faixa no viewBox (a coluna e o vão dela). */
const FAIXA = 10

export function Colunas({
  descricao,
  colunas,
  altura = 120,
  mostrarValores = true,
  formatar = formatarNumero,
}: PropsColunas) {
  const idTitulo = useId()
  const proporcoes = proporcoesPeloMaximo(colunas.map((c) => c.valor))
  const faixas = Math.max(1, colunas.length)
  const largura = faixas * FAIXA
  const grade = { gridTemplateColumns: `repeat(${faixas}, minmax(0, 1fr))` }
  return (
    <div className={estilos.colunas} data-grafico="colunas">
      <div className={estilos.areaColunas} style={{ height: altura }}>
        <svg
          className={estilos.desenhoColunas}
          viewBox={`0 0 ${largura} 100`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={idTitulo}
        >
          <title id={idTitulo}>{textoAlternativo(descricao, colunas, formatar)}</title>
          {colunas.map((coluna, i) => {
            const alturaColuna = (proporcoes[i] ?? 0) * 100
            if (alturaColuna === 0) return null
            return (
              <rect
                key={coluna.rotulo}
                data-coluna={i}
                x={i * FAIXA + (FAIXA * (1 - OCUPACAO)) / 2}
                y={100 - alturaColuna}
                width={FAIXA * OCUPACAO}
                height={alturaColuna}
                fill={corDoTom(coluna.tom ?? (coluna.destaque ? 'serie-2' : 'serie-1'))}
              />
            )
          })}
          <line
            x1="0"
            x2={largura}
            y1="100"
            y2="100"
            className={estilos.base}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {mostrarValores && (
          <div className={estilos.valoresColunas} style={grade} aria-hidden="true">
            {colunas.map((coluna, i) => (
              <span
                key={coluna.rotulo}
                className={coluna.destaque ? estilos.valorDestaque : undefined}
                style={{ bottom: `calc(${(proporcoes[i] ?? 0) * 100}% + 2px)` }}
              >
                {formatar(coluna.valor)}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={estilos.rotulosColunas} style={grade} aria-hidden="true">
        {colunas.map((coluna) => (
          <span key={coluna.rotulo}>{coluna.rotulo}</span>
        ))}
      </div>
    </div>
  )
}
