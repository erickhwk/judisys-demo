// Os cinco gráficos de ui/graficos (INI-05) no catálogo, nas larguras de uma e de duas unidades do
// início (272 e 560px) e solto na largura da página, com os casos de borda (série toda zero).
// O botão de tema no topo do catálogo troca os dois temas. Dados fictícios, no formato das fichas.
import type { ReactNode } from 'react'
import { Barra100 } from '../graficos/Barra100'
import { BarrasHorizontais } from '../graficos/BarrasHorizontais'
import { Colunas } from '../graficos/Colunas'
import { percentuaisArredondados } from '../graficos/calculos'
import { Legenda } from '../graficos/Legenda'
import { Linha } from '../graficos/Linha'
import { Rosca } from '../graficos/Rosca'
import type { Tom } from '../graficos/tons'
import estilos from './Catalogo.module.css'

const PEDIDOS: { rotulo: string; valor: number; tom: Tom }[] = [
  { rotulo: 'Pendentes', valor: 8, tom: 'serie-2' },
  { rotulo: 'Acolhidos', valor: 25, tom: 'serie-1' },
  { rotulo: 'Rejeitados', valor: 17, tom: 'serie-4' },
]

const MESES = ['dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov']
const PUBLICADOS = [1, 5, 3, 1, 3, 0, 3, 5, 5, 8, 8, 1]
const CUMPRIDOS = [3, 2, 2, 3, 5, 2, 1, 2, 5, 4, 6, 5]

const colunas = MESES.map((rotulo, i) => {
  const valor = PUBLICADOS[i] ?? 0
  return { rotulo, valor, destaque: valor === Math.max(...PUBLICADOS) }
})
const pontos = MESES.map((rotulo, i) => ({ rotulo, valor: CUMPRIDOS[i] ?? 0 }))
const recorde = CUMPRIDOS.indexOf(Math.max(...CUMPRIDOS))

/** Valores em milhões de reais, já como número para o gráfico. */
const CLASSES = [
  { rotulo: 'Trabalhista', valor: 219.3 },
  { rotulo: 'Garantia real', valor: 78.3 },
  { rotulo: 'Quirografário', valor: 48.3 },
  { rotulo: 'ME e EPP', valor: 28 },
  { rotulo: 'Fiscal', valor: 15.6 },
]
const percentuais = percentuaisArredondados(CLASSES.map((c) => c.valor))

const PROCESSOS = [
  { rotulo: 'Grupo Lontra Azul', valor: 182.4, tom: 'serie-1' as const },
  { rotulo: 'Metalúrgica Horizonte Ltda.', valor: 96.1, tom: 'serie-3' as const },
  { rotulo: 'Transportes Jabuticaba', valor: 31.7, tom: 'serie-3' as const },
  { rotulo: 'Boa Mesa Alimentos', valor: 15, tom: 'serie-3' as const },
]

const emMilhoes = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`

export function CatalogoGraficos() {
  return (
    <div className={estilos.pilha}>
      <div className={estilos.graficos}>
        <Cartao titulo="Rosca · 1 unidade">
          <div className={estilos.roscaComLegenda}>
            <Rosca
              descricao="Pedidos de crédito"
              segmentos={PEDIDOS}
              centro={{ valor: '8', rotulo: 'pendentes' }}
            />
            <Legenda
              emColuna
              itens={PEDIDOS.map(({ rotulo, valor, tom }) => ({ rotulo, tom, valor: `${valor}` }))}
            />
          </div>
        </Cartao>

        <Cartao titulo="Barra100 · 1 unidade">
          <Barra100
            descricao="Prazos em aberto por urgência"
            altura={8}
            segmentos={[
              { rotulo: 'Vencidos', valor: 3, tom: 'perigo' },
              { rotulo: 'Hoje', valor: 1, tom: 'serie-2' },
              { rotulo: '7 dias', valor: 1, tom: 'serie-1' },
              { rotulo: '30 dias', valor: 4, tom: 'serie-3' },
              { rotulo: 'Depois', valor: 10, tom: 'serie-4' },
            ]}
          />
          <Legenda
            itens={[
              { rotulo: '7 dias', valor: '1', tom: 'serie-1' },
              { rotulo: '30 dias', valor: '4', tom: 'serie-3' },
              { rotulo: 'depois', valor: '10', tom: 'serie-4' },
            ]}
          />
        </Cartao>

        <Cartao titulo="Colunas · 2 unidades" largura="dupla">
          <Colunas descricao="Informes publicados por mês" colunas={colunas} altura={96} />
        </Cartao>

        <Cartao titulo="Linha · 2 unidades" largura="dupla">
          <Linha
            descricao="Prazos cumpridos por mês de vencimento"
            pontos={pontos}
            marca={{
              indice: recorde,
              rotulo: `${MESES[recorde]}: recorde (${CUMPRIDOS[recorde]})`,
            }}
          />
        </Cartao>

        <Cartao titulo="Barra100 com legenda · 2 unidades" largura="dupla">
          <Barra100 descricao="Passivo por classe (RJ)" segmentos={CLASSES} formatar={emMilhoes} />
          <Legenda
            itens={CLASSES.map((c, i) => ({
              rotulo: c.rotulo,
              valor: `${emMilhoes(c.valor)} · ${percentuais[i]}%`,
            }))}
          />
        </Cartao>

        <Cartao titulo="BarrasHorizontais · 2 unidades" largura="dupla">
          <BarrasHorizontais
            descricao="Passivo sob administração"
            barras={PROCESSOS}
            formatar={emMilhoes}
          />
        </Cartao>

        <Cartao titulo="BarrasHorizontais empilhadas · celular">
          <BarrasHorizontais
            descricao="Passivo sob administração"
            barras={PROCESSOS}
            formatar={emMilhoes}
            empilhado
          />
        </Cartao>

        <Cartao titulo="Colunas · celular (6 meses)">
          <Colunas
            descricao="Informes publicados por mês"
            colunas={colunas.slice(-6)}
            altura={110}
          />
        </Cartao>
      </div>

      <h3 className={estilos.subtitulo}>Séries todas zero (não quebram)</h3>
      <div className={estilos.graficos}>
        <Cartao titulo="Rosca vazia">
          <Rosca
            descricao="Pedidos de crédito"
            segmentos={PEDIDOS.map((p) => ({ ...p, valor: 0 }))}
            centro={{ valor: '0', rotulo: 'pendentes' }}
          />
        </Cartao>
        <Cartao titulo="Colunas zeradas">
          <Colunas
            descricao="Informes publicados por mês"
            colunas={colunas.slice(-6).map((c) => ({ ...c, valor: 0, destaque: false }))}
          />
        </Cartao>
        <Cartao titulo="Linha zerada">
          <Linha
            descricao="Prazos cumpridos por mês"
            pontos={pontos.slice(-6).map((p) => ({ ...p, valor: 0 }))}
          />
        </Cartao>
        <Cartao titulo="Barra100 zerada">
          <Barra100
            descricao="Passivo por classe"
            segmentos={CLASSES.map((c) => ({ ...c, valor: 0 }))}
          />
        </Cartao>
      </div>

      <h3 className={estilos.subtitulo}>Na largura da página</h3>
      <Linha
        descricao="Prazos cumpridos por mês de vencimento"
        pontos={pontos}
        marca={{ indice: recorde, rotulo: `${MESES[recorde]}: recorde (${CUMPRIDOS[recorde]})` }}
      />
    </div>
  )
}

function Cartao({
  titulo,
  largura = 'simples',
  children,
}: {
  titulo: string
  largura?: 'simples' | 'dupla'
  children: ReactNode
}) {
  return (
    <article
      className={largura === 'dupla' ? estilos.cartaoGraficoDuplo : estilos.cartaoGrafico}
      aria-label={titulo}
    >
      <h3 className={estilos.tituloCartao}>{titulo}</h3>
      {children}
    </article>
  )
}
