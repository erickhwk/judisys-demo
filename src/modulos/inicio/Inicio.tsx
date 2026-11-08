// Início (SDD-INI §5.1): o cabeçalho com saudação, data e resumo do dia (CAB) e, abaixo dele, a
// grade montável com os quadros (GRD) e o modo Personalizar (PRS). A montagem exibida é a salva do
// usuário, normalizada para o papel (INV-01); no modo de edição, um rascunho que só se grava no
// Concluir (RF-22, INV-03).
import { LayoutDashboard } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTodos } from '../../dados/contexto'
import type { DataIso } from '../../regras/datas'
import type { Papel } from '../../regras/permissoes'
import { agora, hoje as hojeDoRelogio } from '../../regras/relogio'
import { Botao, BotaoIcone } from '../../ui/Botao'
import { Erro } from '../../ui/Erro'
import { Vazio } from '../../ui/Vazio'
import { type Sessao, useSessao } from '../entrada/sessao'
import { colunasDaLargura } from './arrasto'
import { CabecalhoInicio } from './CabecalhoInicio'
import { CatalogoEdicao } from './CatalogoEdicao'
import { GradeMontavel } from './GradeMontavel'
import { resumoDoDia } from './indicadores'
import estilos from './inicio.module.css'
import {
  COLUNAS_DESKTOP,
  catalogoDoPapel,
  type IdQuadro,
  type Montagem,
  normalizar,
  padraoDoPapel,
  primeiroLugarLivre,
} from './montagem'
import { gravarMontagem, lerMontagem, useGeracaoDasMontagens } from './persistencia'
import { fraseDoResumo, horaDoCarimbo } from './resumo'
import { useLargura } from './useLargura'

export interface PropsInicio {
  /** Só para teste: a largura do contêiner da grade, que no HTML do servidor não se mede (§10). */
  larguraForcada?: number
}

export function Inicio({ larguraForcada }: PropsInicio) {
  const { sessao } = useSessao()
  const geracao = useGeracaoDasMontagens()
  if (!sessao) return null
  // Por usuário: trocar de papel remonta a tela com a montagem do outro; o reset, com o padrão.
  return (
    <InicioDoUsuario
      key={`${sessao.usuarioId}:${geracao}`}
      sessao={sessao}
      larguraForcada={larguraForcada}
    />
  )
}

/** Aviso de quando o contêiner encolhe para menos de 4 colunas no meio da edição (PRS-13). */
const AVISO_TELA_ESTREITA = 'Personalizar só em telas largas. As mudanças não foram salvas.'

function InicioDoUsuario({ sessao, larguraForcada }: { sessao: Sessao; larguraForcada?: number }) {
  const hoje = hojeDoRelogio()
  const [salva, setSalva] = useState<Montagem>(() => lerMontagem(sessao.usuarioId, sessao.papel))
  const [rascunho, setRascunho] = useState<Montagem | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const { ref, largura } = useLargura(larguraForcada)
  const cols = largura === null ? null : colunasDaLargura(largura)
  const editando = rascunho !== null
  const personalizarRef = useRef<HTMLButtonElement>(null)
  const devolverFoco = useRef(false)

  // Abaixo de 4 colunas não há Personalizar (INV-06): sai do modo e descarta o rascunho (PRS-13).
  useEffect(() => {
    if (cols === null) return
    if (cols < COLUNAS_DESKTOP && rascunho !== null) {
      setRascunho(null)
      setAviso(AVISO_TELA_ESTREITA)
    }
    if (cols === COLUNAS_DESKTOP) setAviso(null)
  }, [cols, rascunho])

  // Ao sair do modo pelo Concluir ou pelo Cancelar, o foco volta ao Personalizar.
  useEffect(() => {
    if (!editando && devolverFoco.current) {
      devolverFoco.current = false
      personalizarRef.current?.focus()
    }
  }, [editando])

  const sair = (montagem: Montagem | null) => {
    if (montagem) {
      gravarMontagem(sessao.usuarioId, montagem)
      setSalva(montagem)
    }
    devolverFoco.current = true
    setRascunho(null)
  }

  const exibida = rascunho ?? salva
  const podePersonalizar = cols === COLUNAS_DESKTOP

  return (
    <div className={estilos.tela}>
      <Cabecalho
        sessao={sessao}
        hoje={hoje}
        acoes={
          podePersonalizar &&
          !editando && (
            <BotaoIcone
              ref={personalizarRef}
              aria-label="Personalizar"
              title="Personalizar"
              icone={<LayoutDashboard size={20} />}
              onClick={() => setRascunho(salva.map((item) => ({ ...item })))}
            />
          )
        }
      />

      {rascunho && (
        <CatalogoEdicao
          fora={foraDoRascunho(sessao.papel, rascunho)}
          aoAdicionar={(quadro) => setRascunho(adicionar(rascunho, quadro))}
          aoRestaurar={() => setRascunho(restaurado(sessao.papel))}
          aoCancelar={() => sair(null)}
          aoConcluir={() => sair(rascunho)}
        />
      )}

      {/* A região existe desde o início: o leitor de tela só anuncia o texto que entra nela. */}
      <p className={aviso ? estilos.aviso : 'somente-leitor'} role="status">
        {aviso}
      </p>

      <div ref={ref} className={estilos.conteiner}>
        {largura !== null &&
          cols !== null &&
          (exibida.length === 0 ? (
            <SemQuadros
              focar={editando}
              // Fora do modo, restaurar abre o Personalizar com o padrão: só o Concluir grava.
              aoRestaurar={
                editando || podePersonalizar
                  ? () => setRascunho(restaurado(sessao.papel))
                  : undefined
              }
            />
          ) : (
            <GradeMontavel
              montagem={exibida}
              cols={cols}
              largura={largura}
              editando={editando}
              aoMudar={setRascunho}
            />
          ))}
      </div>
    </div>
  )
}

/** O cabeçalho com o resumo do dia, que depende dos prazos, das AGCs e dos processos (CAB-03). */
function Cabecalho({ sessao, hoje, acoes }: { sessao: Sessao; hoje: DataIso; acoes: ReactNode }) {
  const processos = useTodos('processos')
  const prazos = useTodos('prazos')
  const agcs = useTodos('agcs')
  const erro = processos.isError || prazos.isError || agcs.isError
  const resumo =
    processos.data && prazos.data && agcs.data
      ? fraseDoResumo(resumoDoDia(prazos.data, agcs.data, processos.data, hoje), hoje)
      : undefined
  return (
    <>
      {/* A saudação e a data não dependem dos dados: aparecem já no carregamento e no erro. */}
      <CabecalhoInicio
        nome={sessao.nome}
        hora={horaDoCarimbo(agora())}
        hoje={hoje}
        resumo={resumo}
        acoes={acoes}
      />
      {erro && <Erro mensagem="Não foi possível carregar o resumo do dia." />}
    </>
  )
}

/** Montagem vazia, de propósito (PRS-11, RF-23): o aviso com o Restaurar padrão. */
function SemQuadros({ aoRestaurar, focar }: { aoRestaurar?: () => void; focar: boolean }) {
  const restaurarRef = useRef<HTMLButtonElement>(null)
  // Tirar o último quadro desmonta a grade com o × focado: o foco vem para o Restaurar padrão.
  useEffect(() => {
    if (focar) restaurarRef.current?.focus()
  }, [focar])
  return (
    <div className={estilos.semQuadros}>
      <Vazio
        icone={<LayoutDashboard size={24} />}
        titulo="Nenhum quadro no início"
        descricao={
          aoRestaurar
            ? 'Restaure o padrão do seu papel ou adicione quadros pelo catálogo do Personalizar.'
            : 'Para montar o início, abra o Personalizar numa tela larga.'
        }
        acao={
          aoRestaurar && (
            <Botao ref={restaurarRef} onClick={aoRestaurar}>
              Restaurar padrão
            </Botao>
          )
        }
      />
    </div>
  )
}

/** Quadros do catálogo do papel que não estão no rascunho, na ordem do catálogo (RF-18). */
function foraDoRascunho(papel: Papel, rascunho: Montagem) {
  const dentro = new Set(rascunho.map((item) => item.quadro))
  return catalogoDoPapel(papel).filter((quadro) => !dentro.has(quadro.id))
}

/** No primeiro lugar livre, ou na base se não houver (RF-20, PRS-05, PRS-06). */
function adicionar(rascunho: Montagem, quadro: IdQuadro): Montagem {
  return [...rascunho, { quadro, ...primeiroLugarLivre(quadro, rascunho, COLUNAS_DESKTOP) }]
}

/** O padrão do papel, pelo mesmo filtro da montagem salva (S-05). Só se grava no Concluir. */
function restaurado(papel: Papel): Montagem {
  return normalizar(padraoDoPapel(papel), papel)
}
