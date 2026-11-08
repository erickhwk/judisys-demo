// QGC para impressão (#/processos/:id/qgc, sem layout; RF-30): cabeçalho do processo, credores
// por classe com subtotais e total geral, iguais ao quadro-resumo (CRD-12). O navegador salva em
// PDF; impressao.css esconde botões e `nav`, então nenhum dado fica dentro deles.
import { ArrowLeft, Printer } from 'lucide-react'
import { useParams } from 'react-router'
import type { Tipos } from '../../dados/schemas'
import { formatarData } from '../../regras/datas'
import { formatarCnj, formatarDocumento } from '../../regras/documentos'
import { ROTULOS_FASE } from '../../regras/fases'
import { formatarMoeda } from '../../regras/moeda'
import { rotuloClasse, valorVigente } from '../../regras/qgc'
import { hoje } from '../../regras/relogio'
import { Botao, BotaoLink } from '../../ui/Botao'
import { Erro } from '../../ui/Erro'
import { NaoEncontrada } from '../../ui/TelasDeAviso'
import { rotaDoProcesso } from '../processos/abas'
import { useCredoresDoProcesso, useProcesso } from './consultas'
import estilos from './credores.module.css'
import { QuadroResumo } from './QuadroResumo'
import { type GrupoQgc, montarQgc } from './qgc'
import impressao from './TelaQgc.module.css'

type Processo = Tipos['processos']
type Credor = Tipos['credores']

const TIPOS = { rj: 'Recuperação judicial', falencia: 'Falência' } as const

export function TelaQgc() {
  const { id = '' } = useParams()
  const processo = useProcesso(id)
  const credores = useCredoresDoProcesso(id)
  if (processo.isPending || credores.isPending) {
    return <p className={estilos.carregando}>Carregando o QGC…</p>
  }
  if (processo.isError || credores.isError) {
    // Sem os credores, o QGC sairia vazio e com total zero, como se fosse válido.
    return (
      <main className={impressao.paginaImpressao}>
        <Erro mensagem="Não foi possível carregar o QGC. Recarregue a página." />
      </main>
    )
  }
  if (!processo.data) {
    return (
      <main className={impressao.paginaImpressao}>
        <NaoEncontrada />
      </main>
    )
  }
  return <ConteudoQgc processo={processo.data} credores={credores.data} />
}

export function ConteudoQgc({ processo, credores }: { processo: Processo; credores: Credor[] }) {
  const qgc = montarQgc(credores)
  return (
    <main className={impressao.paginaImpressao}>
      <div className={`${impressao.barraImpressao} nao-imprimir`}>
        <BotaoLink para={rotaDoProcesso(processo.id, 'credores')} icone={<ArrowLeft size={18} />}>
          Voltar ao processo
        </BotaoLink>
        <Botao variante="primario" icone={<Printer size={18} />} onClick={() => window.print()}>
          Imprimir ou salvar em PDF
        </Botao>
      </div>

      <header className={impressao.cabecalhoQgc}>
        <p className={impressao.sobretitulo}>Quadro-geral de credores</p>
        <h1>{processo.apelido}</h1>
        <dl className={impressao.dadosProcesso}>
          <div>
            <dt>Processo</dt>
            <dd className={estilos.numeroTexto}>{formatarCnj(processo.numeroCnj)}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{TIPOS[processo.tipo]}</dd>
          </div>
          <div>
            <dt>Juízo</dt>
            <dd>
              {processo.vara} · {processo.comarca}/{processo.uf}
            </dd>
          </div>
          <div>
            <dt>Fase</dt>
            <dd>{ROTULOS_FASE[processo.faseAtual]}</dd>
          </div>
          <div>
            <dt>Emitido em</dt>
            <dd>{formatarData(hoje())}</dd>
          </div>
        </dl>
        <p className={estilos.notaSecao}>
          Valor de cada crédito: o do QGC ou, sem QGC, o da relação do AJ.
        </p>
      </header>

      {qgc.grupos.map((grupo) => (
        <GrupoImpresso key={grupo.classe} grupo={grupo} tipo={processo.tipo} />
      ))}

      <section className={`${impressao.totalGeral} sem-quebra`} aria-label="Total geral">
        <span>Total geral</span>
        <span>
          {qgc.total.quantidade} {qgc.total.quantidade === 1 ? 'credor' : 'credores'}
        </span>
        <strong className={estilos.numeroTexto} data-total="geral">
          {formatarMoeda(qgc.total.valor)}
        </strong>
      </section>

      {qgc.extraconcursais && (
        <GrupoImpresso
          grupo={qgc.extraconcursais}
          tipo={processo.tipo}
          titulo="Créditos extraconcursais (art. 84) · fora do total geral"
        />
      )}

      {qgc.naoSujeitos > 0 && (
        <p className={estilos.notaSecao}>
          {qgc.naoSujeitos} {qgc.naoSujeitos === 1 ? 'credor não sujeito' : 'credores não sujeitos'}{' '}
          à recuperação (art. 49, §3º) fora do QGC.
        </p>
      )}

      <div className="quebra-antes">
        <QuadroResumo resumo={qgc.resumo} tipo={processo.tipo} />
      </div>
    </main>
  )
}

function GrupoImpresso({
  grupo,
  tipo,
  titulo,
}: {
  grupo: GrupoQgc
  tipo: Processo['tipo']
  titulo?: string
}) {
  const rotulo = titulo ?? rotuloClasse(grupo.classe, tipo)
  return (
    <section className={impressao.grupoQgc} aria-label={rotulo} data-grupo={grupo.classe}>
      <h2 className={estilos.tituloSecao}>{rotulo}</h2>
      <table className={impressao.tabelaQgc}>
        <thead>
          <tr>
            <th scope="col">Credor</th>
            <th scope="col">CPF/CNPJ</th>
            <th scope="col" className={impressao.direita}>
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {grupo.credores.map((credor) => (
            <tr key={credor.id}>
              <td>{credor.nome}</td>
              <td className={estilos.numeroTexto}>{formatarDocumento(credor.documento)}</td>
              <td className={impressao.numero}>{formatarMoeda(valorVigente(credor))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              Subtotal · {grupo.credores.length}{' '}
              {grupo.credores.length === 1 ? 'credor' : 'credores'}
            </th>
            <td className={impressao.numero} data-subtotal={grupo.classe}>
              {formatarMoeda(grupo.subtotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}
