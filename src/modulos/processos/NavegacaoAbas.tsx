// Abas em links, como as de `processos-lista.html`: sublinhado dourado na ativa e contagem
// opcional. Servem ao filtro por tipo da lista e às abas da tela do processo (RF-13).
import { Link, type To } from 'react-router'
import { juntarClasses } from '../../ui/classes'
import estilos from './processos.module.css'

export interface ItemAba {
  chave: string
  rotulo: string
  para: To
  ativa: boolean
  contagem?: number
}

export function NavegacaoAbas({ rotulo, itens }: { rotulo: string; itens: ItemAba[] }) {
  return (
    <nav aria-label={rotulo} className={estilos.abas}>
      {itens.map((item) => (
        <Link
          key={item.chave}
          to={item.para}
          aria-current={item.ativa ? 'page' : undefined}
          className={juntarClasses(estilos.aba, item.ativa && estilos.abaAtiva)}
        >
          {item.rotulo}
          {item.contagem !== undefined && <span className={estilos.contagem}>{item.contagem}</span>}
        </Link>
      ))}
    </nav>
  )
}
