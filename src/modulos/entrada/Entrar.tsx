// Login da demo (RF-05; DESIGN.md §Login): metade com os três cartões "Entrar como…", um por papel,
// com o primeiro usuário daquele papel no seed; metade com o painel escuro decorativo.
import { ArrowRight, Bell, FileText } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useTodos } from '../../dados/contexto'
import type { Usuario } from '../../dados/schemas'
import { PAPEIS, type Papel } from '../../regras/permissoes'
import { BotaoTema } from '../../ui/BotaoTema'
import { FaixaDemo } from '../../ui/FaixaDemo'
import { Logo } from '../../ui/Logo'
import estilos from './Entrar.module.css'
import { NOMES_PAPEIS, RESUMOS_PAPEIS } from './papeis'
import { useSessao } from './sessao'

/** Primeiro usuário (pela ordem dos ids) de cada papel. */
function representantes(usuarios: readonly Usuario[]): Partial<Record<Papel, Usuario>> {
  const porPapel: Partial<Record<Papel, Usuario>> = {}
  for (const usuario of [...usuarios].sort((a, b) => a.id.localeCompare(b.id))) {
    porPapel[usuario.papel] ??= usuario
  }
  return porPapel
}

export function Entrar() {
  const { entrar } = useSessao()
  const navegar = useNavigate()
  const usuarios = useTodos('usuarios')
  const escritorios = useTodos('escritorios')
  const porPapel = representantes(usuarios.data ?? [])
  const escritorio = escritorios.data?.[0]?.nome

  const entrarComo = (usuario: Usuario) => {
    entrar({
      usuarioId: usuario.id,
      escritorioId: usuario.escritorioId,
      nome: usuario.nome,
      papel: usuario.papel,
    })
    navegar('/', { replace: true })
  }

  return (
    <div className={estilos.tela}>
      <FaixaDemo />
      <div className={estilos.metades}>
        <main className={estilos.formulario}>
          <div className={estilos.topo}>
            <Logo altura={52} />
            <BotaoTema />
          </div>
          <div className={estilos.centro}>
            <div className={estilos.caixa}>
              <div className={estilos.cabecalho}>
                <span className={estilos.kicker}>Demonstração</span>
                <h1>Entrar no Judisys</h1>
                <p className={estilos.apoio}>
                  Escolha um papel para conhecer o sistema. Cada papel vê e edita coisas diferentes;
                  dá para trocar a qualquer momento pelo menu da conta.
                </p>
              </div>
              <ul className={estilos.cartoes} aria-busy={usuarios.isPending || undefined}>
                {PAPEIS.map((papel) => {
                  const usuario = porPapel[papel]
                  return (
                    <li key={papel}>
                      <button
                        type="button"
                        className={estilos.cartao}
                        disabled={!usuario}
                        onClick={() => usuario && entrarComo(usuario)}
                      >
                        <span className={estilos.textoCartao}>
                          <span className={estilos.entrarComo}>
                            Entrar como {NOMES_PAPEIS[papel]}
                          </span>
                          <span className={estilos.nome}>{usuario?.nome ?? '…'}</span>
                          <span className={estilos.resumo}>{RESUMOS_PAPEIS[papel]}</span>
                        </span>
                        <ArrowRight className={estilos.seta} size={20} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
              {usuarios.isError && (
                <p className={estilos.erro} role="alert">
                  Não foi possível ler os usuários da demo. Recarregue a página.
                </p>
              )}
              <p className={estilos.nota}>
                Sem senha: os usuários são fictícios
                {escritorio ? `, do escritório ${escritorio}` : ''}.
              </p>
            </div>
          </div>
          <span className={estilos.copyright}>© 2026 Judisys</span>
        </main>
        <PainelDecorativo />
      </div>
    </div>
  )
}

const LINHAS_PREVIA = ['Quadro Geral de Credores', 'Ata da AGC', 'Relatório mensal de atividades']

/** Metade escura com a prévia do sistema (decorativa, sem dados). */
function PainelDecorativo() {
  return (
    <aside className={estilos.painel}>
      <div className={estilos.chamada}>
        <span className={estilos.etiqueta}>Gestão jurídica</span>
        <h2 className={estilos.tituloPainel}>Recuperações judiciais e falências em um só lugar.</h2>
        <p className={estilos.textoPainel}>
          Processos, prazos, credores, AGC e informes do escritório de administração judicial, com
          dados fictícios para você explorar à vontade.
        </p>
      </div>
      <div className={estilos.previa} aria-hidden="true">
        <div className={estilos.janela}>
          <div className={estilos.janelaMenu}>
            <Logo variante="marca" fundo="escuro" altura={24} alt="" />
            <span className={estilos.itemAtivo}>
              <span />
            </span>
            {[50, 56, 44, 64].map((largura) => (
              <span key={largura} className={estilos.itemMenu}>
                <span style={{ width: largura }} />
              </span>
            ))}
          </div>
          <div className={estilos.janelaConteudo}>
            <span className={estilos.janelaTitulo}>Dashboard</span>
            <div className={estilos.janelaCards}>
              {['Processos', 'Credores', 'Prazos'].map((rotulo) => (
                <div key={rotulo} className={estilos.miniCard}>
                  <span className={estilos.miniRotulo}>{rotulo}</span>
                  <span className={estilos.miniNumero} />
                  <span className={estilos.miniBarra}>
                    <span />
                    <span />
                  </span>
                </div>
              ))}
            </div>
            <div className={estilos.miniLista}>
              <span className={estilos.miniListaTitulo}>Últimos informes</span>
              {LINHAS_PREVIA.map((titulo) => (
                <div key={titulo} className={estilos.miniLinha}>
                  <span className={estilos.miniIcone}>
                    <FileText size={14} />
                  </span>
                  <span className={estilos.miniTexto}>
                    <span>{titulo}</span>
                    <span className={estilos.miniTraco} />
                  </span>
                  <span className={estilos.miniSelo}>RJ</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={estilos.flutuante}>
          <span className={estilos.flutuanteIcone}>
            <Bell size={18} />
          </span>
          <span className={estilos.flutuanteTexto}>
            <strong>Prazo vence em 3 dias</strong>
            <span>Relatório mensal de atividades</span>
          </span>
        </div>
      </div>
    </aside>
  )
}
