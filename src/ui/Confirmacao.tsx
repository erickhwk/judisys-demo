import type { ReactNode } from 'react'
import { Botao } from './Botao'
import { Dialogo } from './Dialogo'

export type PropsConfirmacao = {
  aberto: boolean
  titulo: ReactNode
  /** O que vai acontecer (ex.: a lista de prazos que serão removidos no RF-15). */
  mensagem: ReactNode
  aoConfirmar: () => void
  aoCancelar: () => void
  rotuloConfirmar?: string
  rotuloCancelar?: string
  /** Ação destrutiva: botão de confirmar em vermelho. */
  perigo?: boolean
  /** Enquanto a gravação roda: botões desabilitados. */
  ocupado?: boolean
}

/**
 * Confirmação em `<dialog>` nativo (alertdialog). O foco começa em Cancelar;
 * Esc cancela; clique fora não faz nada.
 */
export function Confirmacao({
  aberto,
  titulo,
  mensagem,
  aoConfirmar,
  aoCancelar,
  rotuloConfirmar = 'Confirmar',
  rotuloCancelar = 'Cancelar',
  perigo = false,
  ocupado = false,
}: PropsConfirmacao) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={() => {
        if (!ocupado) aoCancelar()
      }}
      titulo={titulo}
      papel="alertdialog"
      fecharAoClicarFora={false}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoCancelar} disabled={ocupado} data-foco-inicial>
            {rotuloCancelar}
          </Botao>
          <Botao
            variante={perigo ? 'perigo' : 'primario'}
            onClick={aoConfirmar}
            disabled={ocupado}
            aria-busy={ocupado || undefined}
          >
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      {mensagem}
    </Dialogo>
  )
}
