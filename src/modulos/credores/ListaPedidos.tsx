import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { useServico } from '../../dados/contexto'
import type { Tipos } from '../../dados/schemas'
import {
  type Decisao,
  decidirPedido,
  ROTULOS_STATUS_PEDIDO,
  ROTULOS_TIPO_PEDIDO,
} from '../../dados/servicos/pedidos'
import { formatarData, formatarMoeda } from '../../regras/datas'
import { formatarDocumento } from '../../regras/documentos'
import type { TipoProcesso } from '../../regras/fases'
import { rotuloClasse } from '../../regras/qgc'
import { Botao } from '../../ui/Botao'
import { Confirmacao } from '../../ui/Confirmacao'
import { Selo, type TomSelo } from '../../ui/Selo'
import { AcoesLinha, Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import estilos from './credores.module.css'
import { mensagemDeErro } from './erros'

type Pedido = Tipos['pedidosDeCredito']

const TOM_STATUS: Record<Pedido['status'], TomSelo> = {
  pendente: 'alerta',
  acolhido: 'sucesso',
  rejeitado: 'neutro',
}

/** O que acolher faz, para a confirmação (RF-29). */
export function efeitoDoAcolhimento(pedido: Pedido): string {
  const destino =
    pedido.tipo === 'impugnacao'
      ? 'O valor e a classe pedidos vão para o QGC; a relação do AJ fica como está.'
      : 'O valor e a classe pedidos vão para a relação do AJ.'
  if (pedido.credorId || !pedido.requerente) return destino
  const criacao =
    pedido.tipo === 'impugnacao'
      ? 'com zero nas relações do devedor e do AJ e o valor no QGC'
      : 'com zero na relação do devedor e o valor na relação do AJ'
  // decidirPedido aplica ao credor que, até a decisão, passou a ter o CPF/CNPJ do requerente.
  return `${pedido.requerente.nome} passa a ser credor do processo, ${criacao}. Se o CPF/CNPJ já for de um credor do processo, o pedido vale para ele: ${destino.charAt(0).toLowerCase()}${destino.slice(1)}`
}

/**
 * Pedidos de crédito com as decisões (RF-29). Acolher e rejeitar só aparecem no pendente e para
 * quem edita credores (CRD-09, T-13).
 */
export function ListaPedidos({
  pedidos,
  tipoProcesso,
  comRequerente,
  podeEditar,
  relacaoPublicada,
  rotulo,
}: {
  pedidos: Pedido[]
  tipoProcesso: TipoProcesso
  /** Mostra a coluna do requerente (pedidos de quem está fora da lista). */
  comRequerente: boolean
  podeEditar: boolean
  /** Com a relação do AJ publicada, divergência e habilitação pendentes só se rejeitam (T-39). */
  relacaoPublicada: boolean | undefined
  rotulo: string
}) {
  const decidir = useServico(decidirPedido)
  const [emDecisao, setEmDecisao] = useState<{ pedido: Pedido; decisao: Decisao } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function confirmar() {
    if (!emDecisao) return
    setOcupado(true)
    setErro(null)
    try {
      await decidir(emDecisao.pedido.id, emDecisao.decisao)
      setEmDecisao(null)
    } catch (falha) {
      setErro(mensagemDeErro(falha))
    } finally {
      setOcupado(false)
    }
  }

  const descricao = (pedido: Pedido) =>
    `${ROTULOS_TIPO_PEDIDO[pedido.tipo].toLowerCase()} de ${formatarData(pedido.data)}`

  return (
    <>
      <Tabela
        rotulo={rotulo}
        larguraMinima={comRequerente ? 1100 : 900}
        linhas={pedidos}
        chaveLinha={(pedido) => pedido.id}
        vazio={<Vazio titulo="Nenhum pedido de crédito" />}
        colunas={[
          {
            chave: 'data',
            titulo: 'Data',
            largura: '112px',
            numerica: true,
            celula: (pedido) => formatarData(pedido.data),
          },
          {
            chave: 'tipo',
            titulo: 'Tipo',
            largura: '132px',
            celula: (pedido) => ROTULOS_TIPO_PEDIDO[pedido.tipo],
          },
          ...(comRequerente
            ? [
                {
                  chave: 'requerente',
                  titulo: 'Requerente',
                  destaque: true,
                  celula: (pedido: Pedido) => (
                    <span className={estilos.pilha}>
                      <span>{pedido.requerente?.nome ?? '—'}</span>
                      <span className={estilos.secundario}>
                        {pedido.requerente ? formatarDocumento(pedido.requerente.documento) : ''}
                      </span>
                    </span>
                  ),
                },
              ]
            : []),
          {
            chave: 'classe',
            titulo: 'Classe pedida',
            celula: (pedido) => rotuloClasse(pedido.classePedida, tipoProcesso),
          },
          {
            chave: 'valor',
            titulo: 'Valor pedido',
            alinhar: 'direita',
            numerica: true,
            largura: '150px',
            celula: (pedido) => formatarMoeda(pedido.valorPedido),
          },
          {
            chave: 'status',
            titulo: 'Situação',
            largura: '120px',
            celula: (pedido) => (
              <Selo tom={TOM_STATUS[pedido.status]}>{ROTULOS_STATUS_PEDIDO[pedido.status]}</Selo>
            ),
          },
          ...(podeEditar
            ? [
                {
                  chave: 'acoes',
                  titulo: 'Ações',
                  largura: '236px',
                  alinhar: 'direita' as const,
                  celula: (pedido: Pedido) =>
                    pedido.status === 'pendente' && (
                      <AcoesLinha>
                        {(pedido.tipo === 'impugnacao' || relacaoPublicada === false) && (
                          <Botao
                            variante="secundario"
                            icone={<Check size={16} />}
                            aria-label={`Acolher ${descricao(pedido)}`}
                            onClick={() => {
                              setErro(null)
                              setEmDecisao({ pedido, decisao: 'acolhido' })
                            }}
                          >
                            Acolher
                          </Botao>
                        )}
                        <Botao
                          variante="fantasma"
                          icone={<X size={16} />}
                          aria-label={`Rejeitar ${descricao(pedido)}`}
                          onClick={() => {
                            setErro(null)
                            setEmDecisao({ pedido, decisao: 'rejeitado' })
                          }}
                        >
                          Rejeitar
                        </Botao>
                      </AcoesLinha>
                    ),
                },
              ]
            : []),
        ]}
      />
      <Confirmacao
        aberto={emDecisao !== null}
        titulo={emDecisao?.decisao === 'acolhido' ? 'Acolher o pedido?' : 'Rejeitar o pedido?'}
        mensagem={
          emDecisao && (
            <div className={estilos.pilha}>
              <p>
                {emDecisao.decisao === 'acolhido'
                  ? efeitoDoAcolhimento(emDecisao.pedido)
                  : 'Só a situação do pedido muda; nenhum valor é alterado.'}
              </p>
              {erro && (
                <p className={estilos.erroTexto} role="alert">
                  {erro}
                </p>
              )}
            </div>
          )
        }
        rotuloConfirmar={emDecisao?.decisao === 'acolhido' ? 'Acolher' : 'Rejeitar'}
        perigo={emDecisao?.decisao === 'rejeitado'}
        ocupado={ocupado}
        aoConfirmar={confirmar}
        aoCancelar={() => setEmDecisao(null)}
      />
    </>
  )
}
