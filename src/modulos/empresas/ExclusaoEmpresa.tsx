// Exclusão de empresa pela lista e pelo formulário: confirmação e, se o serviço recusar (empresa
// vinculada, T-23), a mensagem com os processos que a usam, cada um com link para o processo.
import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { useServico } from '../../dados/contexto'
import { ErroRegra } from '../../dados/servicos/comum'
import { excluirEmpresa } from '../../dados/servicos/exclusoes'
import { Botao } from '../../ui/Botao'
import { Confirmacao } from '../../ui/Confirmacao'
import { Dialogo } from '../../ui/Dialogo'
import estilos from './Empresas.module.css'
import type { Empresa } from './empresas'

interface Recusa {
  mensagem: string
  processos: ErroRegra['vinculos']
}

/**
 * `pedir(empresa)` abre a confirmação; `elemento` são os diálogos, para pôr na tela.
 * `aoExcluir` roda depois de excluída (ex.: voltar à lista).
 */
export function useExclusaoEmpresa(aoExcluir?: () => void): {
  pedir: (empresa: Empresa) => void
  elemento: ReactNode
} {
  const excluir = useServico(excluirEmpresa)
  const [alvo, setAlvo] = useState<Empresa | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [recusa, setRecusa] = useState<Recusa | null>(null)

  async function confirmar() {
    if (!alvo) return
    setOcupado(true)
    try {
      await excluir(alvo.id)
      setAlvo(null)
      aoExcluir?.()
    } catch (erro) {
      setAlvo(null)
      setRecusa({
        mensagem: erro instanceof Error ? erro.message : 'Não foi possível excluir a empresa.',
        processos: erro instanceof ErroRegra ? erro.vinculos : [],
      })
    } finally {
      setOcupado(false)
    }
  }

  const elemento = (
    <>
      <Confirmacao
        aberto={alvo !== null}
        titulo="Excluir empresa"
        mensagem={
          <p>
            Excluir <strong>{alvo?.razaoSocial}</strong>? Esta ação não pode ser desfeita.
          </p>
        }
        rotuloConfirmar="Excluir"
        perigo
        ocupado={ocupado}
        aoConfirmar={confirmar}
        aoCancelar={() => setAlvo(null)}
      />
      <Dialogo
        aberto={recusa !== null}
        aoFechar={() => setRecusa(null)}
        titulo="Empresa não excluída"
        papel="alertdialog"
        acoes={
          <Botao variante="primario" onClick={() => setRecusa(null)} data-foco-inicial>
            Entendi
          </Botao>
        }
      >
        <p>{recusa?.mensagem}</p>
        {recusa && recusa.processos.length > 0 && (
          <ul className={estilos.vinculos} aria-label="Processos da empresa">
            {recusa.processos.map((processo) => (
              <li key={processo.id}>
                <Link to={`/processos/${processo.id}/visao-geral`}>{processo.rotulo}</Link>
              </li>
            ))}
          </ul>
        )}
      </Dialogo>
    </>
  )

  return { pedir: setAlvo, elemento }
}
