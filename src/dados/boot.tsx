// Boot da demo antes das rotas (DMO-08, SDD §5.5): tela de carregamento, tela de erro com "Tentar
// de novo" e, depois da carga, o estado que a casca (DMO-10) lê por `useDemo()`: o armazenamento
// para o DadosProvider, os avisos da faixa (RF-03, CAR-10) e o reset manual (RF-02).
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apagarMontagens } from '../modulos/inicio/persistencia'
import { TelaCarregando, TelaErroCarga } from '../ui/TelaDeBoot'
import type { Armazenamento } from './armazenamento'
import { carregar, type ResultadoCarga, resetar, TITULO_ERRO_CARGA } from './carga'

export interface EstadoDemo {
  armazenamento: Armazenamento
  /** Mostrar `MENSAGEM_VERSAO` na faixa (RF-03) até `dispensarAvisoVersao()`. */
  avisoVersao: boolean
  /** Mostrar `MENSAGEM_MEMORIA` na faixa (CAR-10); vale para a aba toda. */
  modoMemoria: boolean
  dispensarAvisoVersao: () => void
  /**
   * Reset manual (RF-02, CAR-04), já confirmado pela tela. Resolve com os dados do seed gravados
   * (datas para hoje); rejeita com `ErroCarga` deixando os dados como estavam. Quem chama
   * invalida as consultas e vai ao dashboard.
   */
  resetar: () => Promise<void>
}

const Demo = createContext<EstadoDemo | null>(null)

/** Estado da demo carregada. Só dentro de `<Boot>`. */
export function useDemo(): EstadoDemo {
  const valor = useContext(Demo)
  if (!valor) throw new Error('useDemo fora do Boot')
  return valor
}

type Situacao =
  | { tipo: 'carregando' }
  | { tipo: 'erro' }
  | { tipo: 'pronto'; carga: ResultadoCarga }

// Uma carga por tentativa, mesmo com o efeito rodando duas vezes (StrictMode): duas cargas
// simultâneas apagariam e gravariam o banco em paralelo.
let cargaAtual: { tentativa: number; promessa: Promise<ResultadoCarga> } | null = null

function cargaDaTentativa(tentativa: number): Promise<ResultadoCarga> {
  if (cargaAtual?.tentativa !== tentativa) cargaAtual = { tentativa, promessa: carregar() }
  return cargaAtual.promessa
}

export function Boot({ children }: { children: ReactNode }) {
  const [tentativa, setTentativa] = useState(0)
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'carregando' })

  useEffect(() => {
    let ativo = true
    cargaDaTentativa(tentativa).then(
      (carga) => {
        if (ativo) setSituacao({ tipo: 'pronto', carga })
      },
      (erro: unknown) => {
        console.error(erro)
        if (ativo) setSituacao({ tipo: 'erro' })
      },
    )
    return () => {
      ativo = false
    }
  }, [tentativa])

  const tentarDeNovo = useCallback(() => {
    setSituacao({ tipo: 'carregando' })
    setTentativa((n) => n + 1)
  }, [])

  if (situacao.tipo === 'carregando') return <TelaCarregando />
  if (situacao.tipo === 'erro') {
    return <TelaErroCarga titulo={TITULO_ERRO_CARGA} onTentarDeNovo={tentarDeNovo} />
  }
  return <DemoCarregada carga={situacao.carga}>{children}</DemoCarregada>
}

function DemoCarregada({ carga, children }: { carga: ResultadoCarga; children: ReactNode }) {
  const [avisoVersao, setAvisoVersao] = useState(carga.avisoVersao)

  const resetarDemo = useCallback(async () => {
    await resetarDadosDaDemo(carga)
    setAvisoVersao(false)
  }, [carga])

  const valor = useMemo<EstadoDemo>(
    () => ({
      armazenamento: carga.armazenamento,
      avisoVersao,
      modoMemoria: carga.modoMemoria,
      dispensarAvisoVersao: () => setAvisoVersao(false),
      resetar: resetarDemo,
    }),
    [carga, avisoVersao, resetarDemo],
  )
  return <Demo.Provider value={valor}>{children}</Demo.Provider>
}

/**
 * Reset manual (RF-02) com o que vive fora do IndexedDB: depois de o seed ser regravado, apaga as
 * montagens do início (RF-25, SDD-INI §5.5). Se o reset falha, as montagens ficam.
 */
export async function resetarDadosDaDemo(
  carga: ResultadoCarga,
  passos: { resetar: typeof resetar; apagarMontagens: () => void } = { resetar, apagarMontagens },
): Promise<void> {
  await passos.resetar(carga)
  passos.apagarMontagens()
}
