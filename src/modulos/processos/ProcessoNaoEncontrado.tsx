// Processo que não existe (excluído ou link errado; LOG-03: "Registro não existe mais").
import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { Vazio } from '../../ui/Vazio'
import estilos from './processos.module.css'

export function ProcessoNaoEncontrado() {
  return (
    <>
      <h1>Processo não encontrado</h1>
      <div className={estilos.cartao}>
        <Vazio
          icone={<SearchX size={24} />}
          titulo="Registro não existe mais"
          descricao="O processo pode ter sido excluído."
          acao={
            <Link to="/processos" className={estilos.linkComIcone}>
              <ArrowLeft size={18} aria-hidden="true" />
              Voltar para os processos
            </Link>
          }
        />
      </div>
    </>
  )
}
