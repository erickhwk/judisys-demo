// Login da demo (RF-05; DESIGN.md §Login): metade com os três cartões "Entrar como…", um por papel,
// com o primeiro usuário daquele papel no seed; metade com o painel escuro decorativo.
import { ArrowRight, Bell } from 'lucide-react'
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

/** Fases de cada linha da Carteira por fase na prévia: `true` é fase com processo. */
const CARTEIRA_PREVIA = {
  rj: [true, true, true, false, true, false, false, false, true, true],
  falencia: [true, true, false, true, false, false, true],
} as const
/** Larguras das barras do Passivo sob administração, em % da maior. */
const PASSIVO_PREVIA = [100, 25, 23, 20]
/** Prazos cumpridos por mês: os pontos da linha, de 0 (fundo) a 40 (topo). */
const LINHA_PREVIA = '0,26 22,30 44,30 66,24 88,14 110,30 132,34 154,28 176,16 198,22 220,10 240,16'

/** Metade escura com a prévia do sistema (decorativa, sem dados): o início em miniatura (AJ-23). */
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
            <span className={estilos.grupoMenu} />
            <span className={estilos.itemAtivo}>
              <span />
            </span>
            {[56, 50, 44, 46].map((largura) => (
              <span key={largura} className={estilos.itemMenu}>
                <span style={{ width: largura }} />
              </span>
            ))}
            <span className={estilos.grupoMenu} />
            {[48, 34].map((largura) => (
              <span key={largura} className={estilos.itemMenu}>
                <span style={{ width: largura }} />
              </span>
            ))}
            <span className={estilos.contaMenu}>
              <span />
              <span />
            </span>
          </div>
          <div className={estilos.janelaConteudo}>
            <div className={estilos.saudacao}>
              <span className={estilos.miniTraco} style={{ width: 70 }} />
              <span className={estilos.janelaTitulo}>Bom dia, Helena</span>
              <span className={estilos.resumo}>
                <span />
                <span />
              </span>
            </div>
            <div className={`${estilos.miniQuadro} ${estilos.carteira}`}>
              <span className={estilos.miniTitulo}>Carteira por fase</span>
              {(['rj', 'falencia'] as const).map((tipo) => (
                <div key={tipo} className={`${estilos.fases} ${estilos[tipo]}`}>
                  {CARTEIRA_PREVIA[tipo].map((ocupada, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa e decorativa
                      key={i}
                      className={ocupada ? estilos.faseOcupada : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className={estilos.miniGrade}>
              <div className={`${estilos.miniQuadro} ${estilos.largo}`}>
                <span className={estilos.miniTitulo}>Passivo sob administração</span>
                {PASSIVO_PREVIA.map((largura, i) => (
                  <span key={largura} className={estilos.passivo}>
                    <span className={estilos.miniTraco} />
                    <span className={estilos.trilho}>
                      <span
                        className={i === 0 ? estilos.barraMaior : undefined}
                        style={{ width: `${largura}%` }}
                      />
                    </span>
                  </span>
                ))}
              </div>
              <div className={estilos.miniQuadro}>
                <span className={estilos.miniTitulo}>Prazos em aberto</span>
                <span className={estilos.numero}>
                  19
                  <span className={estilos.vencidos} />
                </span>
                <span className={estilos.segmentos}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              </div>
              <div className={estilos.miniQuadro}>
                <span className={estilos.miniTitulo}>Próxima AGC</span>
                <span className={estilos.agc}>
                  <span className={estilos.dia}>
                    <span>NOV</span>
                    13
                  </span>
                  <span className={estilos.miniTraco} />
                </span>
              </div>
              <div className={`${estilos.miniQuadro} ${estilos.largo}`}>
                <span className={estilos.miniTitulo}>Prazos cumpridos</span>
                <svg className={estilos.linha} viewBox="0 0 240 40" preserveAspectRatio="none">
                  <title>Prazos cumpridos por mês</title>
                  <polyline points={LINHA_PREVIA} />
                </svg>
              </div>
              <div className={estilos.miniQuadro}>
                <span className={estilos.miniTitulo}>Próximos prazos</span>
                {[estilos.atrasado, estilos.atrasado, estilos.hoje].map((tom, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: lista fixa e decorativa
                  <span key={i} className={estilos.prazo}>
                    <span className={tom} />
                    <span className={estilos.miniTraco} />
                  </span>
                ))}
              </div>
              <div className={estilos.miniQuadro}>
                <span className={estilos.miniTitulo}>Atividade recente</span>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={estilos.atividade}>
                    <span />
                    <span className={estilos.miniTraco} />
                  </span>
                ))}
              </div>
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
