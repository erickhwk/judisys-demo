// Tela de usuários (RF-39, PER-06): a lista dos usuários do escritório e a tabela papel ×
// permissões. Só quem edita usuários (o AJ) vê criar, editar e excluir; a exclusão passa pelo
// serviço, que recusa o próprio usuário e o responsável por processo (T-23).
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useServico, useTodos } from '../../dados/contexto'
import type { Usuario } from '../../dados/schemas'
import { ErroRegra } from '../../dados/servicos/comum'
import { excluirUsuario } from '../../dados/servicos/exclusoes'
import { pode } from '../../regras/permissoes'
import { Botao, BotaoIcone } from '../../ui/Botao'
import { Confirmacao } from '../../ui/Confirmacao'
import { Dialogo } from '../../ui/Dialogo'
import { Erro } from '../../ui/Erro'
import { Selo } from '../../ui/Selo'
import { AcoesLinha, type ColunaTabela, Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import { mensagemDeErro } from '../credores/erros'
import { Cabecalho } from '../empresas/Cabecalho'
import { NOMES_PAPEIS } from '../entrada/papeis'
import { useSessao } from '../entrada/sessao'
import { DialogoUsuario } from './DialogoUsuario'
import { TabelaPermissoes } from './TabelaPermissoes'
import estilos from './usuarios.module.css'

const ORDEM = { campo: 'nome', direcao: 'asc' } as const

/** Diálogo aberto: novo usuário (`null`) ou edição de um. */
type Edicao = { usuario: Usuario | null }

interface Recusa {
  mensagem: string
  vinculos: ErroRegra['vinculos']
}

export function TelaUsuarios() {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'usuarios') : false
  const usuarios = useTodos('usuarios', { ordem: ORDEM })
  const excluir = useServico(excluirUsuario)
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [alvo, setAlvo] = useState<Usuario | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [recusa, setRecusa] = useState<Recusa | null>(null)

  async function confirmarExclusao() {
    if (!alvo) return
    setOcupado(true)
    try {
      await excluir(alvo.id)
    } catch (falha) {
      setRecusa({
        mensagem: mensagemDeErro(falha),
        vinculos: falha instanceof ErroRegra ? falha.vinculos : [],
      })
    } finally {
      setAlvo(null)
      setOcupado(false)
    }
  }

  const colunas: ColunaTabela<Usuario>[] = [
    {
      chave: 'nome',
      titulo: 'Nome',
      largura: '34%',
      destaque: true,
      celula: (usuario) => (
        <span className={estilos.nome}>
          {usuario.nome}
          {usuario.id === sessao?.usuarioId && <span className={estilos.voce}>(você)</span>}
        </span>
      ),
    },
    { chave: 'email', titulo: 'E-mail', largura: '36%', celula: (usuario) => usuario.email },
    {
      chave: 'papel',
      titulo: 'Papel',
      largura: '20%',
      celula: (usuario) => (
        <Selo tom={usuario.papel === 'aj' ? 'dourado' : 'azul'}>{NOMES_PAPEIS[usuario.papel]}</Selo>
      ),
    },
  ]
  if (podeEditar) {
    colunas.push({
      chave: 'acoes',
      titulo: 'Ações',
      largura: '10%',
      alinhar: 'direita',
      celula: (usuario) => (
        <AcoesLinha>
          <BotaoIcone
            aria-label={`Editar ${usuario.nome}`}
            icone={<Pencil size={18} />}
            onClick={() => setEdicao({ usuario })}
          />
          {/* Ninguém exclui a si mesmo (T-23): o botão nem aparece na própria linha. */}
          {usuario.id !== sessao?.usuarioId && (
            <BotaoIcone
              aria-label={`Excluir ${usuario.nome}`}
              icone={<Trash2 size={18} />}
              perigo
              onClick={() => setAlvo(usuario)}
            />
          )}
        </AcoesLinha>
      ),
    })
  }

  const lista = usuarios.data
  return (
    <div className={estilos.tela}>
      <Cabecalho
        titulo="Usuários"
        apoio={
          lista &&
          `${lista.length} ${lista.length === 1 ? 'usuário no escritório' : 'usuários no escritório'}`
        }
        acoes={
          podeEditar && (
            <Botao
              variante="primario"
              icone={<Plus size={18} />}
              onClick={() => setEdicao({ usuario: null })}
            >
              Novo usuário
            </Botao>
          )
        }
      />
      {usuarios.isError ? (
        <Erro mensagem="Não foi possível carregar os usuários." />
      ) : (
        <Tabela
          rotulo="Lista de usuários"
          colunas={colunas}
          linhas={lista ?? []}
          chaveLinha={(usuario) => usuario.id}
          larguraMinima={720}
          vazio={
            <Vazio titulo={usuarios.isSuccess ? 'Nenhum usuário cadastrado' : 'Carregando…'} />
          }
        />
      )}

      <section className={estilos.secao} aria-labelledby="titulo-permissoes">
        <div>
          <h2 id="titulo-permissoes">Permissões por papel</h2>
          <p className={estilos.descricao}>
            O que cada papel pode fazer na demo. “Editar” inclui criar, editar e excluir.
          </p>
        </div>
        <TabelaPermissoes />
      </section>

      <DialogoUsuario
        aberto={edicao !== null}
        aoFechar={() => setEdicao(null)}
        usuario={edicao?.usuario ?? undefined}
        proprio={edicao?.usuario?.id === sessao?.usuarioId}
      />
      <Confirmacao
        aberto={alvo !== null}
        titulo="Excluir usuário"
        mensagem={
          <p>
            Excluir <strong>{alvo?.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
        }
        rotuloConfirmar="Excluir"
        perigo
        ocupado={ocupado}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setAlvo(null)}
      />
      <Dialogo
        aberto={recusa !== null}
        aoFechar={() => setRecusa(null)}
        titulo="Usuário não excluído"
        papel="alertdialog"
        acoes={
          <Botao variante="primario" onClick={() => setRecusa(null)} data-foco-inicial>
            Entendi
          </Botao>
        }
      >
        <p>{recusa?.mensagem}</p>
        {recusa && recusa.vinculos.length > 0 && (
          <ul className={estilos.vinculos} aria-label="Processos do usuário">
            {recusa.vinculos.map((processo) => (
              <li key={processo.id}>
                <Link to={`/processos/${processo.id}/visao-geral`}>{processo.rotulo}</Link>
              </li>
            ))}
          </ul>
        )}
      </Dialogo>
    </div>
  )
}
