// Exclusão de processo com confirmação (T-23, PRC-13): a confirmação diz quanto sai junto, em
// cascata, antes de excluir.
import { type ReactNode, useState } from 'react'
import { useServico } from '../../dados/contexto'
import type { Tipos } from '../../dados/schemas'
import {
  type ContagemCascata,
  contarExclusaoProcesso,
  excluirProcesso,
} from '../../dados/servicos/exclusoes'
import { Confirmacao } from '../../ui/Confirmacao'
import { mensagemDeErro } from './mensagens'
import estilos from './processos.module.css'
import { plural } from './rotulos'

/** Singular e plural de cada coleção da cascata, na ordem da contagem. */
const NOMES_CASCATA: Record<keyof ContagemCascata, [string, string]> = {
  processoEmpresas: ['vínculo com empresa', 'vínculos com empresas'],
  marcosDeFase: ['marco de fase', 'marcos de fase'],
  prazos: ['prazo', 'prazos'],
  credores: ['credor', 'credores'],
  pedidosDeCredito: ['pedido de crédito', 'pedidos de crédito'],
  agcs: ['AGC', 'AGCs'],
  presencas: ['presença em AGC', 'presenças em AGC'],
  votos: ['voto', 'votos'],
  informes: ['informe', 'informes'],
  arquivos: ['anexo enviado', 'anexos enviados'],
}

export function descreverCascata(contagem: ContagemCascata): string[] {
  return (Object.keys(NOMES_CASCATA) as (keyof ContagemCascata)[]).flatMap((tabela) => {
    const quantidade = contagem[tabela]
    if (!quantidade) return []
    const [singular, pluralTexto] = NOMES_CASCATA[tabela]
    return [plural(quantidade, singular, pluralTexto)]
  })
}

interface Pedido {
  processo: Tipos['processos']
  contagem: ContagemCascata
}

/**
 * `pedir(processo)` conta o que sai e abre a confirmação; `dialogo` vai na tela. Depois de
 * excluir, chama `aoExcluir`.
 */
export function useExcluirProcesso(aoExcluir?: () => void): {
  pedir: (processo: Tipos['processos']) => Promise<void>
  dialogo: ReactNode
  erro: string | null
  /** A exclusão está em andamento (o registro já pode ter sumido da leitura). */
  excluindo: boolean
} {
  const contar = useServico(contarExclusaoProcesso)
  const excluir = useServico(excluirProcesso)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function pedir(processo: Tipos['processos']) {
    setErro(null)
    try {
      setPedido({ processo, contagem: await contar(processo.id) })
    } catch (e) {
      setErro(mensagemDeErro(e))
    }
  }

  async function confirmar() {
    if (!pedido) return
    setOcupado(true)
    try {
      await excluir(pedido.processo.id)
      setPedido(null)
      aoExcluir?.()
    } catch (e) {
      setPedido(null)
      setErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }

  const itens = pedido ? descreverCascata(pedido.contagem) : []
  const dialogo = (
    <Confirmacao
      aberto={pedido !== null}
      titulo={`Excluir “${pedido?.processo.apelido ?? ''}”?`}
      mensagem={
        <div className={estilos.mensagemConfirmacao}>
          {itens.length > 0 ? (
            <>
              <p>Saem junto com o processo:</p>
              <ul>
                {itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>Nada mais sai junto com o processo.</p>
          )}
          <p>Esta ação não pode ser desfeita.</p>
        </div>
      }
      rotuloConfirmar="Excluir processo"
      perigo
      ocupado={ocupado}
      aoConfirmar={confirmar}
      aoCancelar={() => setPedido(null)}
    />
  )
  return { pedir, dialogo, erro, excluindo: ocupado }
}
