// Aba Informes do processo (RF-13, RF-18 a RF-20): só o conteúdo, sem o cabeçalho do processo
// (que é da TelaDoProcesso). Mais recentes primeiro, selo "Publicado no site" e "Novo informe" já
// com o processo escolhido (a fase vem dele, RF-19).
import { Plus } from 'lucide-react'
import { useId } from 'react'
import { useNavigate } from 'react-router'
import { useTodos } from '../../dados/contexto'
import { pode } from '../../regras/permissoes'
import { Botao } from '../../ui/Botao'
import { Erro } from '../../ui/Erro'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import { ORDEM_INFORMES } from './informes'
import estilos from './informes.module.css'
import { TabelaInformes } from './TabelaInformes'

export function AbaInformes({ processoId }: { processoId: string }) {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'informes') : false
  const navegar = useNavigate()
  const idTitulo = useId()
  const consulta = useTodos('informes', { onde: { processoId }, ordem: ORDEM_INFORMES })

  if (consulta.isError) return <Erro mensagem="Não foi possível carregar os informes." />

  const informes = consulta.data ?? []
  const publicados = informes.filter((informe) => informe.publicadoNoSite).length

  return (
    <section className={estilos.aba} aria-labelledby={idTitulo}>
      <div className={estilos.cabecalhoAba}>
        <div>
          <h2 id={idTitulo} className={estilos.tituloAba}>
            Informes
          </h2>
          <p className={estilos.subtituloAba}>
            {consulta.isPending ? 'Carregando…' : resumo(informes.length, publicados)}
          </p>
        </div>
        {podeEditar && (
          <Botao
            variante="primario"
            icone={<Plus size={18} />}
            onClick={() => navegar(`/informes/novo?processo=${encodeURIComponent(processoId)}`)}
          >
            Novo informe
          </Botao>
        )}
      </div>
      <TabelaInformes
        rotulo="Informes do processo"
        informes={informes}
        vazio={
          <Vazio
            titulo={consulta.isPending ? 'Carregando informes…' : 'Nenhum informe neste processo'}
          />
        }
      />
    </section>
  )
}

function resumo(total: number, publicados: number): string {
  if (total === 0) return 'Nenhum informe'
  const informes = total === 1 ? '1 informe' : `${total} informes`
  return `${informes}, ${publicados} ${publicados === 1 ? 'publicado' : 'publicados'} no site`
}
