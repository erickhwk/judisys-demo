// Passivo por classe da RJ (RF-09) em barras horizontais (Recharts). Uma série só: uma cor, sem
// legenda; o valor de cada classe também fica na tabela logo abaixo (leitor de tela e celular).
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarMoeda } from '../../regras/datas'
import estilos from './dashboard.module.css'
import { formatarMoedaCurta } from './formato'
import type { PassivoDaClasse } from './indicadores'

const ALTURA_BARRA = 36

export function GraficoPassivo({ classes }: { classes: readonly PassivoDaClasse[] }) {
  return (
    <figure className={estilos.figura}>
      <div
        className={estilos.grafico}
        style={{ height: classes.length * ALTURA_BARRA + 24 }}
        aria-hidden="true"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...classes]}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barCategoryGap={8}
          >
            <XAxis
              type="number"
              dataKey="valor"
              tickFormatter={(valor: number) => formatarMoedaCurta(valor)}
              tick={{ fill: 'var(--cor-texto-muted)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="rotulo"
              width={128}
              tick={{ fill: 'var(--cor-texto)', fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'var(--cor-hover-fantasma)' }}
              formatter={(valor) => [formatarMoeda(Number(valor)), 'Relação do AJ']}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid var(--cor-borda)',
                fontFamily: 'var(--fonte-texto)',
                fontSize: 13,
              }}
            />
            <Bar dataKey="valor" fill="var(--cor-azul-900)" radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="somente-leitor">
        Passivo por classe de credor, nas RJs ativas
      </figcaption>
      <table className={estilos.tabelaValores}>
        <thead className="somente-leitor">
          <tr>
            <th scope="col">Classe</th>
            <th scope="col">Relação do AJ</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((linha) => (
            <tr key={linha.classe} data-classe={linha.classe}>
              <th scope="row">{linha.rotulo}</th>
              <td>{formatarMoeda(linha.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
