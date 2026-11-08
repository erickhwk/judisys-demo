// Legenda dos gráficos: ponto na cor do tom, rótulo e, à direita, o detalhe opcional (apagado) e o
// valor já formatado. Em coluna (Q-11 no celular, Q-03) ou em linha que quebra (Q-01).
import { juntarClasses } from '../classes'
import estilos from './graficos.module.css'
import { corDoTom, type Tom } from './tons'

export interface ItemLegenda {
  rotulo: string
  /** Valor já formatado (ex.: "8", "R$ 219,3 mi · 56%"). */
  valor?: string
  /** Texto apagado antes do valor (ex.: "R$ 219,3 mi" antes de "56%", Q-11). */
  detalhe?: string
  tom?: Tom
}

export function Legenda({
  itens,
  emColuna = false,
}: {
  itens: readonly ItemLegenda[]
  emColuna?: boolean
}) {
  return (
    <ul className={juntarClasses(estilos.legenda, emColuna && estilos.legendaEmColuna)}>
      {itens.map((item, i) => (
        <li key={item.rotulo} className={estilos.itemLegenda}>
          <span
            className={estilos.ponto}
            style={{ background: corDoTom(item.tom, i) }}
            aria-hidden="true"
          />
          <span className={estilos.rotuloLegenda}>{item.rotulo}</span>
          {item.detalhe !== undefined && (
            <span className={estilos.detalheLegenda}>{item.detalhe}</span>
          )}
          {item.valor !== undefined && <b className={estilos.valorLegenda}>{item.valor}</b>}
        </li>
      ))}
    </ul>
  )
}
