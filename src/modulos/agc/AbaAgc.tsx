// Aba AGC do processo (só RJ, RF-31): as AGCs do processo, a mais recente primeiro, e "Nova AGC".
// Só o conteúdo: o cabeçalho do processo e as abas são da TelaDoProcesso.
import { CalendarPlus } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatarData } from '../../regras/datas'
import { pode } from '../../regras/permissoes'
import { hoje } from '../../regras/relogio'
import { Botao } from '../../ui/Botao'
import { Erro } from '../../ui/Erro'
import { Selo } from '../../ui/Selo'
import { Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import { type Agc, emSimulacao, SITUACOES_AGC } from './agc'
import estilos from './agc.module.css'
import { useAgcsDoProcesso } from './consultas'
import { DialogoAgc } from './DialogoAgc'

export function AbaAgc({ processoId }: { processoId: string }) {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'agc') : false
  const navegar = useNavigate()
  const idTitulo = useId()
  const [novaAberta, setNovaAberta] = useState(false)
  const consulta = useAgcsDoProcesso(processoId)
  const dataDeHoje = hoje()

  if (consulta.isError) return <Erro mensagem="Não foi possível carregar as AGCs." />
  const agcs = consulta.data ?? []
  const caminho = (agc: Agc) => `/processos/${processoId}/agc/${agc.id}`

  return (
    <section className={estilos.aba} aria-labelledby={idTitulo}>
      <div className={estilos.cabecalhoAba}>
        <div>
          <h2 id={idTitulo} className={estilos.tituloAba}>
            Assembleias gerais de credores
          </h2>
          <p className={estilos.subtituloAba}>
            {consulta.isPending ? 'Carregando…' : quantidade(agcs.length)}
          </p>
        </div>
        {podeEditar && (
          <Botao
            variante="primario"
            icone={<CalendarPlus size={18} />}
            onClick={() => setNovaAberta(true)}
          >
            Nova AGC
          </Botao>
        )}
      </div>
      <Tabela<Agc>
        rotulo="AGCs do processo"
        linhas={agcs}
        chaveLinha={(agc) => agc.id}
        larguraMinima={720}
        vazio={
          <Vazio
            titulo={consulta.isPending ? 'Carregando AGCs…' : 'Nenhuma AGC neste processo'}
            descricao={
              !consulta.isPending && podeEditar
                ? 'Cadastre a AGC com as datas da 1ª e da 2ª convocação e a pauta.'
                : undefined
            }
          />
        }
        colunas={[
          {
            chave: 'primeira',
            titulo: '1ª convocação',
            largura: '150px',
            numerica: true,
            destaque: true,
            celula: (agc) => <Link to={caminho(agc)}>{formatarData(agc.dataPrimeira)}</Link>,
          },
          {
            chave: 'segunda',
            titulo: '2ª convocação',
            largura: '150px',
            numerica: true,
            celula: (agc) => formatarData(agc.dataSegunda),
          },
          { chave: 'pauta', titulo: 'Pauta', celula: (agc) => agc.pauta },
          {
            chave: 'situacao',
            titulo: 'Situação',
            largura: '220px',
            celula: (agc) => (
              <span className={estilos.selos}>
                <Selo tom={SITUACOES_AGC[agc.status].tom}>{SITUACOES_AGC[agc.status].rotulo}</Selo>
                {emSimulacao(agc, dataDeHoje) && <Selo tom="alerta">Data futura</Selo>}
              </span>
            ),
          },
        ]}
      />
      {podeEditar && (
        <DialogoAgc
          aberto={novaAberta}
          aoFechar={() => setNovaAberta(false)}
          processoId={processoId}
          aoSalvar={(agc) => navegar(caminho(agc))}
        />
      )}
    </section>
  )
}

function quantidade(total: number): string {
  if (total === 0) return 'Nenhuma AGC'
  return total === 1 ? '1 AGC' : `${total} AGCs`
}
