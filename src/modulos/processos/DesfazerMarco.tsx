// "Desfazer" o último marco (RF-15, PRC-10): a confirmação lista os prazos abertos que saem
// ("Desfazer 'Plano apresentado'? Serão removidos 1 prazo aberto: Objeções ao plano.") e a fase
// para a qual o processo volta.
import { Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useServico } from '../../dados/contexto'
import type { Tipos } from '../../dados/schemas'
import { desfazerMarco, type PlanoDesfazer, previaDesfazerMarco } from '../../dados/servicos/marcos'
import { formatarData } from '../../regras/datas'
import { ROTULOS_FASE } from '../../regras/fases'
import { Botao } from '../../ui/Botao'
import { Confirmacao } from '../../ui/Confirmacao'
import { mensagemDeErro } from './mensagens'
import estilos from './processos.module.css'
import { plural } from './rotulos'

/** "Serão removidos 1 prazo aberto: Objeções ao plano." (texto do RF-15), por vencimento. */
export function textoPrazosRemovidos(prazos: { titulo: string; vencimento: string }[]): string {
  if (prazos.length === 0) return 'Nenhum prazo aberto será removido.'
  const quantidade = plural(prazos.length, 'prazo aberto', 'prazos abertos')
  const titulos = [...prazos]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .map((p) => p.titulo)
  return `Serão removidos ${quantidade}: ${titulos.join(', ')}.`
}

export function DesfazerMarco({
  processo,
  aoErro,
}: {
  processo: Tipos['processos']
  /** Mensagem de falha (ou `null` ao tentar de novo), mostrada pela tela abaixo do cabeçalho. */
  aoErro: (mensagem: string | null) => void
}) {
  const previa = useServico(previaDesfazerMarco)
  const desfazer = useServico(desfazerMarco)
  const [plano, setPlano] = useState<PlanoDesfazer | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function pedir() {
    aoErro(null)
    try {
      setPlano(await previa(processo.id))
    } catch (e) {
      aoErro(mensagemDeErro(e))
    }
  }

  async function confirmar() {
    if (!plano) return
    setOcupado(true)
    try {
      await desfazer(processo.id, plano.marco.id)
      setPlano(null)
    } catch (e) {
      setPlano(null)
      aoErro(mensagemDeErro(e))
    } finally {
      setOcupado(false)
    }
  }

  const rotulo = plano ? ROTULOS_FASE[plano.marco.fase] : ''
  return (
    <>
      <Botao icone={<Undo2 size={18} />} onClick={pedir}>
        Desfazer fase
      </Botao>
      <Confirmacao
        aberto={plano !== null}
        titulo={`Desfazer “${rotulo}”?`}
        mensagem={
          plano && (
            <div className={estilos.mensagemConfirmacao}>
              <p>
                O marco de {formatarData(plano.marco.data)} sai e a fase volta para “
                {ROTULOS_FASE[plano.faseAnterior]}”.
              </p>
              <p>{textoPrazosRemovidos(plano.prazos)}</p>
              <p>Os prazos já cumpridos ficam como histórico.</p>
            </div>
          )
        }
        rotuloConfirmar="Desfazer"
        perigo
        ocupado={ocupado}
        aoConfirmar={confirmar}
        aoCancelar={() => setPlano(null)}
      />
    </>
  )
}
