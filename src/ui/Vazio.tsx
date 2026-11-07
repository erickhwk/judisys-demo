import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import estilos from './Vazio.module.css'

export type PropsVazio = {
  titulo: string
  descricao?: ReactNode
  /** Ex.: botão "Novo processo" ou "Limpar busca". */
  acao?: ReactNode
  icone?: ReactNode
}

/** Estado vazio de listas e seções ("Nenhum processo encontrado"). */
export function Vazio({ titulo, descricao, acao, icone }: PropsVazio) {
  return (
    <div className={estilos.vazio}>
      <span className={estilos.icone} aria-hidden="true">
        {icone ?? <Inbox size={24} />}
      </span>
      <p className={estilos.titulo}>{titulo}</p>
      {descricao && <p className={estilos.descricao}>{descricao}</p>}
      {acao && <div className={estilos.acao}>{acao}</div>}
    </div>
  )
}
