// Moldura da demo (RF-01 a RF-03, CAR-04, CAR-05): o pedido de reset, com a confirmação, vale para
// a faixa e para o menu da conta; o aviso de banco fechado por outra aba vem do App.
import { useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useDemo } from '../dados/boot'
import { ehBancoFechado } from '../dados/conexao'
import { Confirmacao } from './Confirmacao'

/** Verdadeiro depois que uma operação falhou porque outra aba fechou o banco (DMO-08). */
export const BancoFechado = createContext<{ fechado: boolean; marcar: () => void }>({
  fechado: false,
  marcar: () => {},
})

interface ValorMoldura {
  /** Abre a confirmação do reset (RF-02). */
  pedirReset: () => void
}

const Contexto = createContext<ValorMoldura | null>(null)

export function useMoldura(): ValorMoldura {
  const valor = useContext(Contexto)
  if (!valor) throw new Error('useMoldura fora do MolduraProvider')
  return valor
}

export function MolduraProvider({ children }: { children: ReactNode }) {
  const { resetar } = useDemo()
  const bancoFechado = useContext(BancoFechado)
  const queryClient = useQueryClient()
  const navegar = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [falhou, setFalhou] = useState(false)

  const pedirReset = useCallback(() => {
    setFalhou(false)
    setAberto(true)
  }, [])

  // Cancelar só fecha a confirmação: nada muda (CAR-05).
  const cancelar = useCallback(() => setAberto(false), [])

  const confirmar = useCallback(async () => {
    setOcupado(true)
    setFalhou(false)
    try {
      await resetar()
      // Depois do reset, tudo o que estava em cache é do banco antigo (T-22, CAR-04).
      await queryClient.invalidateQueries()
      setAberto(false)
      navegar('/')
    } catch (erro) {
      console.error(erro)
      if (ehBancoFechado(erro)) {
        bancoFechado.marcar()
        setAberto(false)
      } else setFalhou(true)
    } finally {
      setOcupado(false)
    }
  }, [resetar, queryClient, navegar, bancoFechado])

  const valor = useMemo(() => ({ pedirReset }), [pedirReset])
  return (
    <Contexto.Provider value={valor}>
      {children}
      <Confirmacao
        aberto={aberto}
        titulo="Resetar a demo?"
        mensagem={
          <>
            <p>
              Os dados voltam ao estado inicial, com as datas recalculadas para hoje. O que foi
              criado ou alterado, inclusive os anexos enviados, será apagado.
            </p>
            {falhou && (
              <p role="alert" style={{ marginTop: 12, color: 'var(--cor-perigo)' }}>
                Não foi possível resetar a demo. Os dados continuam como estavam; tente de novo.
              </p>
            )}
          </>
        }
        rotuloConfirmar="Resetar demo"
        perigo
        ocupado={ocupado}
        aoConfirmar={confirmar}
        aoCancelar={cancelar}
      />
    </Contexto.Provider>
  )
}
