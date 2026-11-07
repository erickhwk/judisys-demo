// Tela do processo (RF-13): cabeçalho com apelido, número, tipo, fase atual e responsável, as
// ações de editar, excluir, avançar e desfazer fase (só para quem edita processos; PER-03) e as
// abas. A aba AGC só existe na RJ. O conteúdo da aba vem do módulo dono, pela rota (src/rotas.tsx).
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useRegistro, useTodos } from '../../dados/contexto'
import { formatarCnj } from '../../regras/documentos'
import { type Fase, fasesSeguintes, ROTULOS_FASE } from '../../regras/fases'
import { pode } from '../../regras/permissoes'
import { Botao } from '../../ui/Botao'
import { Erro } from '../../ui/Erro'
import { Selo } from '../../ui/Selo'
import { Vazio } from '../../ui/Vazio'
import { useSessao } from '../entrada/sessao'
import { AvancarFase } from './AvancarFase'
import { ABAS, type Aba, type ConteudoAba, DEFINICOES_ABAS } from './abas'
import { Cabecalho } from './Cabecalho'
import { DesfazerMarco } from './DesfazerMarco'
import { useExcluirProcesso } from './ExcluirProcesso'
import { NavegacaoAbas } from './NavegacaoAbas'
import { ProcessoNaoEncontrado } from './ProcessoNaoEncontrado'
import estilos from './processos.module.css'
import { ROTULOS_TIPO, TOM_TIPO } from './rotulos'

export function TelaDoProcesso({ aba, Conteudo }: { aba: Aba; Conteudo: ConteudoAba }) {
  const { id } = useParams()
  const { sessao } = useSessao()
  const navegar = useNavigate()
  const processo = useRegistro('processos', id)
  const usuarios = useTodos('usuarios')
  const marcos = useTodos('marcosDeFase', { onde: { processoId: id } })
  const exclusao = useExcluirProcesso(() => navegar('/processos', { replace: true }))
  const [erroDesfazer, setErroDesfazer] = useState<string | null>(null)

  if (processo.isError) return <Erro mensagem="Não foi possível carregar o processo." />
  // Durante a exclusão, o processo some da leitura antes de a tela navegar para a lista.
  if (processo.data === null) return exclusao.excluindo ? null : <ProcessoNaoEncontrado />
  if (!processo.data || !sessao) return null
  const atual = processo.data

  const papel = sessao.papel
  const podeEditar = pode(papel, 'editar', 'processos')
  const responsavel = usuarios.data?.find((u) => u.id === atual.responsavelId)?.nome
  const podeAvancar = fasesSeguintes(atual.tipo, atual.faseAtual as Fase).length > 0
  // O primeiro marco é a criação do processo (PRC-11).
  const podeDesfazer = (marcos.data?.length ?? 0) > 1

  const visiveis = ABAS.filter((chave) => {
    const definicao = DEFINICOES_ABAS[chave]
    return (!definicao.soRj || atual.tipo === 'rj') && pode(papel, 'ler', definicao.modulo)
  })

  return (
    <>
      <Cabecalho
        trilha={[{ rotulo: 'Processos', para: '/processos' }, { rotulo: atual.apelido }]}
        titulo={atual.apelido}
        subtitulo={
          <dl className={estilos.resumoProcesso} aria-label="Resumo do processo">
            <div>
              <dt>Número</dt>
              <dd className="numeros-tabulares">{formatarCnj(atual.numeroCnj)}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>
                <Selo forma="pilula" tom={TOM_TIPO[atual.tipo]}>
                  {ROTULOS_TIPO[atual.tipo]}
                </Selo>
              </dd>
            </div>
            <div>
              <dt>Fase atual</dt>
              <dd>
                <Selo tom="azul">{ROTULOS_FASE[atual.faseAtual]}</Selo>
              </dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>{responsavel ?? '—'}</dd>
            </div>
          </dl>
        }
        acoes={
          podeEditar && (
            <>
              {podeAvancar && <AvancarFase processo={atual} marcos={marcos.data ?? []} />}
              {podeDesfazer && <DesfazerMarco processo={atual} aoErro={setErroDesfazer} />}
              <Botao
                icone={<Pencil size={18} />}
                onClick={() => navegar(`/processos/${atual.id}/editar`)}
              >
                Editar
              </Botao>
              <Botao
                variante="fantasma"
                className={estilos.botaoExcluir}
                icone={<Trash2 size={18} />}
                onClick={() => exclusao.pedir(atual)}
              >
                Excluir
              </Botao>
            </>
          )
        }
      />
      {exclusao.erro && <Erro titulo="Não foi possível excluir" mensagem={exclusao.erro} />}
      {erroDesfazer && <Erro titulo="Não foi possível desfazer" mensagem={erroDesfazer} />}

      <div className={estilos.cartaoAbas}>
        <NavegacaoAbas
          rotulo="Seções do processo"
          itens={visiveis.map((chave) => ({
            chave,
            rotulo: DEFINICOES_ABAS[chave].rotulo,
            para: `/processos/${atual.id}/${chave}`,
            ativa: chave === aba,
          }))}
        />
      </div>

      {visiveis.includes(aba) ? (
        <Conteudo processoId={atual.id} />
      ) : (
        <div className={estilos.cartao}>
          <Vazio
            titulo="Esta seção não existe neste processo"
            descricao="A AGC só existe na recuperação judicial."
          />
        </div>
      )}
      {exclusao.dialogo}
    </>
  )
}
