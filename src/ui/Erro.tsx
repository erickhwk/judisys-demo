import { TriangleExclamationPoint } from 'lucide-react'
import type { ReactNode } from 'react'
import estilos from './Erro.module.css'

export type PropsErro = {
  titulo?: string
  /** O que deu errado, em linguagem de usuário (ex.: "Seu papel não permite esta ação"). */
  mensagem: ReactNode
  /** Ex.: botão "Tentar de novo" ou "Voltar ao dashboard". */
  acao?: ReactNode
}

/** Aviso de erro, anunciado ao leitor de tela (`role="alert"`). */
export function Erro({ titulo = 'Algo deu errado', mensagem, acao }: PropsErro) {
  return (
    <div className={estilos.erro} role="alert">
      <span className={estilos.icone} aria-hidden="true">
        <TriangleExclamationPoint size={22} />
      </span>
      <div className={estilos.texto}>
        <p className={estilos.titulo}>{titulo}</p>
        <div className={estilos.mensagem}>{mensagem}</div>
        {acao && <div className={estilos.acao}>{acao}</div>}
      </div>
    </div>
  )
}
