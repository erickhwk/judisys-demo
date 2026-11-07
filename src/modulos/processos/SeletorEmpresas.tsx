// "Empresas relacionadas" do formulário (RF-12): busca por razão social, nome fantasia ou CNPJ
// para adicionar várias empresas; as escolhidas aparecem como etiquetas removíveis.
import { Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import type { Tipos } from '../../dados/schemas'
import { formatarCnpj } from '../../regras/documentos'
import { normalizar } from '../../regras/normalizar'
import { CampoTexto } from '../../ui/Campo'
import estilos from './processos.module.css'

const MAXIMO_SUGESTOES = 8

type Empresa = Tipos['empresas']

export interface PropsSeletorEmpresas {
  empresas: Empresa[]
  selecionadas: string[]
  aoMudar: (ids: string[]) => void
  erro?: string
}

function casa(empresa: Empresa, palavras: string[]): boolean {
  const textos = [empresa.razaoSocial, empresa.nomeFantasia, empresa.cnpj].map(normalizar)
  return palavras.every((palavra) => textos.some((texto) => texto.includes(palavra)))
}

export function SeletorEmpresas({ empresas, selecionadas, aoMudar, erro }: PropsSeletorEmpresas) {
  const [busca, setBusca] = useState('')
  const palavras = normalizar(busca).split(' ').filter(Boolean)
  const sugestoes =
    palavras.length === 0
      ? []
      : empresas
          .filter((e) => !selecionadas.includes(e.id) && casa(e, palavras))
          .slice(0, MAXIMO_SUGESTOES)
  function adicionar(id: string) {
    aoMudar([...selecionadas, id])
    setBusca('')
  }
  const escolhidas = selecionadas.flatMap((id) => empresas.filter((e) => e.id === id))

  return (
    <div className={estilos.seletor}>
      <CampoTexto
        type="search"
        rotulo="Empresas relacionadas"
        obrigatorio
        erro={erro}
        ajuda="Busque pela razão social, nome fantasia ou CNPJ e adicione quantas forem."
        icone={<Search size={18} />}
        autoComplete="off"
        placeholder="Buscar e adicionar empresas"
        value={busca}
        onChange={(evento) => setBusca(evento.target.value)}
        onKeyDown={(evento) => {
          // Enter aqui adiciona a primeira sugestão, em vez de enviar o formulário do processo.
          if (evento.key !== 'Enter') return
          evento.preventDefault()
          if (sugestoes[0]) adicionar(sugestoes[0].id)
        }}
      />
      {palavras.length > 0 && (
        <ul className={estilos.sugestoes} aria-label="Empresas encontradas">
          {sugestoes.length === 0 && (
            <li className={estilos.semSugestao}>Nenhuma empresa encontrada</li>
          )}
          {sugestoes.map((empresa) => (
            <li key={empresa.id}>
              <button
                type="button"
                className={estilos.sugestao}
                onClick={() => adicionar(empresa.id)}
              >
                <Plus size={16} aria-hidden="true" />
                <span className="somente-leitor">Adicionar </span>
                <span>{empresa.razaoSocial}</span>
                <span className={estilos.cnpj}>{formatarCnpj(empresa.cnpj)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {escolhidas.length > 0 && (
        <ul className={estilos.escolhidas} aria-label="Empresas escolhidas">
          {escolhidas.map((empresa) => (
            <li key={empresa.id} className={estilos.escolhida}>
              <span>{empresa.razaoSocial}</span>
              <button
                type="button"
                className={estilos.remover}
                aria-label={`Remover ${empresa.razaoSocial}`}
                onClick={() => aoMudar(selecionadas.filter((id) => id !== empresa.id))}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
