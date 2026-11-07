// Aba Prazos do processo (RF-22 a RF-24, SDD §7.4): só o conteúdo, sem o cabeçalho do processo
// (que é da TelaDoProcesso, DMO-12). Lista com as cores de situação, prazo manual, marcar como
// cumprido e editar o vencimento do prazo automático.
import { Plus } from 'lucide-react'
import { useEffect, useId, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useRegistro, useTodos } from '../../dados/contexto'
import type { Tipos } from '../../dados/schemas'
import { hoje as hojeDoRelogio } from '../../regras/relogio'
import { Botao } from '../../ui/Botao'
import { Erro } from '../../ui/Erro'
import { Vazio } from '../../ui/Vazio'
import { AvisoDaAcao } from './AvisoDaAcao'
import estilos from './prazos.module.css'
import { compararPrazos } from './regras'
import { ancoraDoPrazo, TabelaPrazos } from './TabelaPrazos'
import { useAcoesPrazo } from './useAcoesPrazo'

export function AbaPrazos({ processoId }: { processoId: string }) {
  const hoje = hojeDoRelogio()
  const idTitulo = useId()
  const [parametros] = useSearchParams()
  const destacado = parametros.get('prazo')
  const consulta = useTodos('prazos', { onde: { processoId } })
  const processo = useRegistro('processos', processoId)
  const processos = useMemo(
    () => new Map<string, Tipos['processos']>(processo.data ? [[processoId, processo.data]] : []),
    [processo.data, processoId],
  )
  const acoes = useAcoesPrazo({ processos })
  const prazos = useMemo(() => [...(consulta.data ?? [])].sort(compararPrazos), [consulta.data])

  // Link do calendário ou da agenda (PRZ-09): rola até o prazo.
  useEffect(() => {
    if (destacado && prazos.length > 0) {
      document
        .getElementById(ancoraDoPrazo(destacado))
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [destacado, prazos.length])

  if (consulta.isError) return <Erro mensagem="Não foi possível carregar os prazos." />

  const abertos = prazos.filter((prazo) => prazo.status === 'aberto').length

  return (
    <section className={estilos.aba} aria-labelledby={idTitulo}>
      <div className={estilos.cabecalhoAba}>
        <div>
          <h2 id={idTitulo} className={estilos.tituloAba}>
            Prazos
          </h2>
          <p className={estilos.subtitulo}>
            {consulta.isPending ? 'Carregando…' : resumo(prazos.length, abertos)}
          </p>
        </div>
        {acoes.podeEditar && (
          <Botao
            variante="primario"
            icone={<Plus size={18} />}
            onClick={() => acoes.novo(processoId)}
          >
            Novo prazo
          </Botao>
        )}
      </div>
      <AvisoDaAcao aviso={acoes.aviso} />
      <TabelaPrazos
        rotulo="Prazos do processo"
        prazos={prazos}
        hoje={hoje}
        acoes={acoes}
        destacado={destacado}
        vazio={
          <Vazio
            titulo={consulta.isPending ? 'Carregando prazos…' : 'Nenhum prazo neste processo'}
            descricao="Os prazos automáticos aparecem quando o processo avança de fase."
          />
        }
      />
      {acoes.dialogos}
    </section>
  )
}

function resumo(total: number, abertos: number): string {
  if (total === 0) return 'Nenhum prazo'
  const prazos = total === 1 ? '1 prazo' : `${total} prazos`
  return `${prazos}, ${abertos === 1 ? '1 em aberto' : `${abertos} em aberto`}`
}
