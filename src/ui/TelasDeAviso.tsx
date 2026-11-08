// Telas da casca (SDD §5.6): rota sem permissão (RF-40), não encontrada e o marcador das telas que
// as próximas tarefas ainda vão fazer.
import { ArrowLeft, Compass, Construction } from 'lucide-react'
import { Link } from 'react-router'
import { Erro } from './Erro'
import estilos from './TelasDeAviso.module.css'
import { Vazio } from './Vazio'

/** Mensagem da rota acessada direto sem permissão (RF-40, PER-04). */
export const MENSAGEM_SEM_PERMISSAO = 'Seu papel não permite esta ação'

function VoltarAoInicio() {
  return (
    <Link to="/" className={estilos.voltar}>
      <ArrowLeft size={18} aria-hidden="true" />
      Voltar ao início
    </Link>
  )
}

export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <>
      <h1>{titulo}</h1>
      <div className={estilos.cartao}>
        <Vazio
          icone={<Construction size={24} />}
          titulo="Em construção"
          descricao="Esta tela chega numa próxima etapa da demo."
        />
      </div>
    </>
  )
}

export function SemPermissao() {
  return (
    <>
      <h1>Acesso restrito</h1>
      <Erro
        titulo={MENSAGEM_SEM_PERMISSAO}
        mensagem="Para fazer isso, troque de papel pelo menu da conta."
        acao={<VoltarAoInicio />}
      />
    </>
  )
}

export function NaoEncontrada() {
  return (
    <>
      <h1>Página não encontrada</h1>
      <div className={estilos.cartao}>
        <Vazio
          icone={<Compass size={24} />}
          titulo="Este endereço não existe na demo"
          descricao="Confira o link ou volte ao início."
          acao={<VoltarAoInicio />}
        />
      </div>
    </>
  )
}
