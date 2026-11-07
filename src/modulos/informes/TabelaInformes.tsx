// Tabela de informes da lista geral e da aba do processo (RF-19, RF-20): data, título com link
// para a tela do informe, categoria, fase e o selo "Publicado no site".
import { Paperclip } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CATEGORIAS_INFORME, type Tipos } from '../../dados/schemas'
import { formatarData } from '../../regras/datas'
import { ROTULOS_FASE } from '../../regras/fases'
import { Selo } from '../../ui/Selo'
import { type ColunaTabela, Tabela } from '../../ui/Tabela'
import type { Informe } from './informes'
import estilos from './informes.module.css'

type Processo = Tipos['processos']

export const SELO_PUBLICADO = 'Publicado no site'

export function TabelaInformes({
  rotulo,
  informes,
  processos,
  vazio,
  topo,
  rodape,
}: {
  rotulo: string
  informes: Informe[]
  /** Com o mapa, mostra a coluna do processo (lista geral); sem ele, é a aba do processo. */
  processos?: ReadonlyMap<string, Processo>
  vazio: ReactNode
  topo?: ReactNode
  rodape?: ReactNode
}) {
  const colunas: ColunaTabela<Informe>[] = [
    {
      chave: 'data',
      titulo: 'Data',
      largura: '10%',
      numerica: true,
      celula: (informe) => formatarData(informe.data),
    },
    {
      chave: 'titulo',
      titulo: 'Título',
      largura: processos ? '29%' : '45%',
      destaque: true,
      celula: (informe) => (
        <span className={estilos.titulo}>
          <Link to={`/informes/${informe.id}`}>{informe.titulo}</Link>
          {informe.anexos.length > 0 && (
            <span className={estilos.qtdAnexos}>
              <Paperclip size={14} aria-hidden="true" />
              {informe.anexos.length === 1 ? '1 anexo' : `${informe.anexos.length} anexos`}
            </span>
          )}
        </span>
      ),
    },
  ]
  if (processos) {
    colunas.push({
      chave: 'processo',
      titulo: 'Processo',
      largura: '16%',
      celula: (informe) => {
        const processo = processos.get(informe.processoId)
        return processo ? (
          <Link to={`/processos/${processo.id}/informes`}>{processo.apelido}</Link>
        ) : (
          '—'
        )
      },
    })
  }
  colunas.push(
    {
      chave: 'categoria',
      titulo: 'Categoria',
      largura: '14%',
      celula: (informe) => CATEGORIAS_INFORME[informe.categoria],
    },
    {
      chave: 'fase',
      titulo: 'Fase',
      largura: '14%',
      celula: (informe) => (informe.fase ? ROTULOS_FASE[informe.fase] : '—'),
    },
    {
      chave: 'site',
      titulo: 'Site',
      largura: '17%',
      celula: (informe) =>
        informe.publicadoNoSite ? (
          <Selo tom="sucesso">{SELO_PUBLICADO}</Selo>
        ) : (
          <span className={estilos.naoPublicado}>Não publicado</span>
        ),
    },
  )

  return (
    <Tabela
      rotulo={rotulo}
      colunas={colunas}
      linhas={informes}
      chaveLinha={(informe) => informe.id}
      vazio={vazio}
      topo={topo}
      rodape={rodape}
    />
  )
}
