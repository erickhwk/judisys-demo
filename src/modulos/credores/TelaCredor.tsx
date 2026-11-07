// Tela do credor (#/processos/:id/credores/:credorId): os três valores (devedor → AJ → QGC) com as
// variações (RF-27, CRD-02) e os pedidos de crédito com as decisões (RF-29).
import { ArrowRight, FilePlus2, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useServico } from '../../dados/contexto'
import type { Tipos } from '../../dados/schemas'
import { ErroRegra, type Vinculo } from '../../dados/servicos/comum'
import { excluirCredor } from '../../dados/servicos/exclusoes'
import { formatarMoeda } from '../../regras/datas'
import { formatarDocumento } from '../../regras/documentos'
import { pode } from '../../regras/permissoes'
import {
  CLASSES_A_PARTE,
  formatarVariacao,
  rotuloClasse,
  type Variacao,
  variacao,
} from '../../regras/qgc'
import { Botao } from '../../ui/Botao'
import { Confirmacao } from '../../ui/Confirmacao'
import { Selo } from '../../ui/Selo'
import { NaoEncontrada } from '../../ui/TelasDeAviso'
import { useSessao } from '../entrada/sessao'
import { CabecalhoPagina } from './CabecalhoPagina'
import { useCredor, usePedidosDoCredor, useProcesso, useRelacaoPublicada } from './consultas'
import estilos from './credores.module.css'
import { DialogoCredor } from './DialogoCredor'
import { DialogoPedido } from './DialogoPedido'
import { mensagemDeErro } from './erros'
import { ListaPedidos } from './ListaPedidos'
import { valorOuTraco } from './moeda'
import { NOTA_A_PARTE } from './QuadroResumo'

type Credor = Tipos['credores']
type Processo = Tipos['processos']

export function TelaCredor() {
  const { id = '', credorId = '' } = useParams()
  const processo = useProcesso(id)
  const credor = useCredor(credorId)
  if (processo.isPending || credor.isPending) {
    return <p className={estilos.carregando}>Carregando credor…</p>
  }
  if (!processo.data || !credor.data || credor.data.processoId !== id) return <NaoEncontrada />
  return <ConteudoCredor processo={processo.data} credor={credor.data} />
}

function ConteudoCredor({ processo, credor }: { processo: Processo; credor: Credor }) {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'credores') : false
  const navegar = useNavigate()
  const excluir = useServico(excluirCredor)
  const pedidos = usePedidosDoCredor(credor.id)
  const publicada = useRelacaoPublicada(processo.id)
  const [dialogo, setDialogo] = useState<'editar' | 'pedido' | 'excluir' | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<{ mensagem: string; vinculos: Vinculo[] }>()

  const variacoes = variacao(credor)
  const aba = `/processos/${processo.id}/credores`

  async function confirmarExclusao() {
    setOcupado(true)
    setErroExclusao(undefined)
    try {
      await excluir(credor.id)
      navegar(aba)
    } catch (falha) {
      setErroExclusao({
        mensagem: mensagemDeErro(falha),
        vinculos: falha instanceof ErroRegra ? falha.vinculos : [],
      })
      setOcupado(false)
    }
  }

  return (
    <>
      <CabecalhoPagina
        migalhas={[
          { rotulo: 'Processos', para: '/processos' },
          { rotulo: processo.apelido, para: aba },
          { rotulo: 'Credores', para: aba },
        ]}
        titulo={credor.nome}
        subtitulo={
          <>
            <span className={estilos.numeroTexto}>{formatarDocumento(credor.documento)}</span>
            <Selo tom={CLASSES_A_PARTE.includes(credor.classe) ? 'neutro' : 'azul'}>
              {rotuloClasse(credor.classe, processo.tipo)}
            </Selo>
            {credor.natureza && <span>{credor.natureza}</span>}
          </>
        }
        acoes={
          podeEditar && (
            <>
              <Botao
                variante="perigo"
                icone={<Trash2 size={18} />}
                onClick={() => {
                  setErroExclusao(undefined)
                  setDialogo('excluir')
                }}
              >
                Excluir
              </Botao>
              <Botao
                variante="secundario"
                icone={<Pencil size={18} />}
                onClick={() => setDialogo('editar')}
              >
                Editar
              </Botao>
            </>
          )
        }
      />

      {CLASSES_A_PARTE.includes(credor.classe) && (
        <p className={estilos.notaFormulario}>
          {NOTA_A_PARTE[credor.classe as keyof typeof NOTA_A_PARTE]}
        </p>
      )}

      <TresValores credor={credor} variacoes={variacoes} />

      <section className={estilos.secao} aria-labelledby="titulo-pedidos">
        <div className={estilos.secaoTopo}>
          <div>
            <h2 id="titulo-pedidos" className={estilos.tituloSecao}>
              Pedidos de crédito
            </h2>
            <p className={estilos.notaSecao}>
              {publicada.data
                ? 'Relação do AJ publicada: novos pedidos são impugnações (art. 8º) e, acolhidos, mudam o QGC.'
                : 'Antes da relação do AJ: divergências (art. 7º, §1º) e, acolhidas, mudam a relação do AJ.'}
            </p>
          </div>
          {podeEditar && publicada.data !== undefined && (
            <Botao
              variante="primario"
              icone={<FilePlus2 size={18} />}
              onClick={() => setDialogo('pedido')}
            >
              Registrar pedido
            </Botao>
          )}
        </div>
        <ListaPedidos
          rotulo={`Pedidos de crédito de ${credor.nome}`}
          pedidos={pedidos.data ?? []}
          tipoProcesso={processo.tipo}
          comRequerente={false}
          podeEditar={podeEditar}
        />
      </section>

      <DialogoCredor
        aberto={dialogo === 'editar'}
        aoFechar={() => setDialogo(null)}
        processo={processo}
        credor={credor}
      />
      {publicada.data !== undefined && (
        <DialogoPedido
          aberto={dialogo === 'pedido'}
          aoFechar={() => setDialogo(null)}
          processo={processo}
          credor={credor}
          publicada={publicada.data}
        />
      )}
      <Confirmacao
        aberto={dialogo === 'excluir'}
        titulo="Excluir o credor?"
        perigo
        ocupado={ocupado}
        rotuloConfirmar="Excluir"
        aoCancelar={() => setDialogo(null)}
        aoConfirmar={confirmarExclusao}
        mensagem={
          <div className={estilos.pilha}>
            <p>
              {credor.nome} sai do processo, com os pedidos de crédito e as presenças e votos em
              AGCs abertas.
            </p>
            {erroExclusao && (
              <div className={estilos.erroTexto} role="alert">
                <p>{erroExclusao.mensagem}</p>
                {erroExclusao.vinculos.length > 0 && (
                  <ul>
                    {erroExclusao.vinculos.map((vinculo) => (
                      <li key={vinculo.id}>{vinculo.rotulo}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        }
      />
    </>
  )
}

function TresValores({
  credor,
  variacoes,
}: {
  credor: Credor
  variacoes: ReturnType<typeof variacao>
}) {
  return (
    <section className={estilos.valores} aria-label="Valores do crédito">
      <Valor rotulo="Relação do devedor" valor={credor.valorDevedor} dado="devedor" />
      <Seta variacao={variacoes.devedorParaAj} rotulo="Variação do devedor para o AJ" />
      <Valor rotulo="Relação do AJ" valor={credor.valorAj} dado="aj" />
      <Seta variacao={variacoes.ajParaQgc} rotulo="Variação do AJ para o QGC" />
      <Valor rotulo="QGC" valor={credor.valorQgc} dado="qgc" />
    </section>
  )
}

function Valor({
  rotulo,
  valor,
  dado,
}: {
  rotulo: string
  valor: number | null | undefined
  dado: string
}) {
  return (
    <div className={estilos.valor} data-valor={dado}>
      <span className={estilos.rotuloValor}>{rotulo}</span>
      <span className={estilos.numeroValor}>{valorOuTraco(valor)}</span>
    </div>
  )
}

function Seta({ variacao: calculada, rotulo }: { variacao: Variacao | null; rotulo: string }) {
  const sinal = calculada && calculada.diferenca > 0 ? '+' : ''
  return (
    <div className={estilos.seta}>
      <span className="somente-leitor">{rotulo}:</span>
      <ArrowRight size={20} aria-hidden="true" className={estilos.iconeSeta} />
      <span className={estilos.percentual}>{formatarVariacao(calculada)}</span>
      {calculada && (
        <span className={estilos.diferenca}>
          {sinal}
          {formatarMoeda(calculada.diferenca)}
        </span>
      )}
    </div>
  )
}
