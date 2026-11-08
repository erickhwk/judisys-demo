// Barras horizontais (S-06): uma linha por item, com nome, barra em SVG e valor. A barra é
// proporcional ao maior valor (ou ao `maximo`) e estica com a largura. Empilhado (Q-08 no
// celular): nome e valor em cima, barra embaixo.

import { juntarClasses } from '../classes'
import {
  type Formatar,
  formatarNumero,
  type ItemGrafico,
  proporcoesPeloMaximo,
  textoAlternativo,
} from './calculos'
import estilos from './graficos.module.css'
import { corDoTom, type Tom } from './tons'

export interface BarraHorizontal extends ItemGrafico {
  tom?: Tom
}

export interface PropsBarrasHorizontais {
  /** Vira o nome acessível do gráfico, seguido dos valores (INV-05). */
  descricao: string
  barras: readonly BarraHorizontal[]
  /** Valor que enche a barra; padrão o maior da lista. */
  maximo?: number
  empilhado?: boolean
  formatar?: Formatar
}

export function BarrasHorizontais({
  descricao,
  barras,
  maximo,
  empilhado = false,
  formatar = formatarNumero,
}: PropsBarrasHorizontais) {
  const proporcoes = proporcoesPeloMaximo(
    barras.map((b) => b.valor),
    maximo,
  )
  return (
    <div
      className={juntarClasses(estilos.barras, empilhado && estilos.barrasEmpilhadas)}
      role="img"
      aria-label={textoAlternativo(descricao, barras, formatar)}
      data-grafico="barras-horizontais"
    >
      {barras.map((barra, i) => (
        <div key={barra.rotulo} className={estilos.linhaBarra}>
          <span className={estilos.nomeBarra}>{barra.rotulo}</span>
          <svg
            className={estilos.trilhoBarra}
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect x="0" y="0" width="100" height="8" fill={corDoTom('trilho')} />
            <rect
              data-barra={i}
              x="0"
              y="0"
              width={(proporcoes[i] ?? 0) * 100}
              height="8"
              fill={corDoTom(barra.tom, 0)}
            />
          </svg>
          <span className={estilos.valorBarra}>{formatar(barra.valor)}</span>
        </div>
      ))}
    </div>
  )
}
