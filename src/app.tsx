// Casca do app (DMO-10): sessão por aba, dados com o contexto da sessão e o roteador hash.
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { type ReactNode, useMemo, useState } from 'react'
import { RouterProvider } from 'react-router'
import { useDemo } from './dados/boot'
import { ehBancoFechado } from './dados/conexao'
import { DadosProvider } from './dados/contexto'
import type { ContextoGravacao } from './dados/repositorio'
import { SessaoProvider, useSessao } from './modulos/entrada/sessao'
import { agora } from './regras/relogio'
import { criarRoteador } from './roteador'
import { BancoFechado } from './ui/Moldura'

export function App() {
  const [fechado, setFechado] = useState(false)
  const [queryClient] = useState(() => {
    // Leitura ou gravação que falhou porque outra aba fechou o banco: pede para recarregar.
    const aoFalhar = (erro: unknown) => {
      if (ehBancoFechado(erro)) setFechado(true)
    }
    return new QueryClient({
      queryCache: new QueryCache({ onError: aoFalhar }),
      mutationCache: new MutationCache({ onError: aoFalhar }),
    })
  })
  const [roteador] = useState(criarRoteador)
  const bancoFechado = useMemo(() => ({ fechado, marcar: () => setFechado(true) }), [fechado])

  return (
    <BancoFechado.Provider value={bancoFechado}>
      <SessaoProvider>
        <DadosDaSessao queryClient={queryClient}>
          <RouterProvider router={roteador} />
        </DadosDaSessao>
      </SessaoProvider>
    </BancoFechado.Provider>
  )
}

/** Repositórios e serviços com o usuário e o papel da sessão (SDD §5.2). */
function DadosDaSessao({
  queryClient,
  children,
}: {
  queryClient: QueryClient
  children: ReactNode
}) {
  const { armazenamento } = useDemo()
  const { sessao } = useSessao()
  const contexto = useMemo<ContextoGravacao | null>(
    () =>
      sessao && {
        usuario: { id: sessao.usuarioId, escritorioId: sessao.escritorioId },
        papel: sessao.papel,
        agora,
      },
    [sessao],
  )
  return (
    <DadosProvider armazenamento={armazenamento} contexto={contexto} queryClient={queryClient}>
      {children}
    </DadosProvider>
  )
}
