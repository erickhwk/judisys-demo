// Painel de instalação da AGC (art. 37, §2º; RF-33, C-09, T-32): por classe, presentes, valor
// presente e percentual do valor votante, com "Todos da classe" (RF-32) e o botão de instalar na
// convocação escolhida, desabilitado com o motivo enquanto o quórum não fecha.
import { CheckCheck, Gavel, UserMinus } from 'lucide-react'
import { useId, useState } from 'react'
import { useServico } from '../../dados/contexto'
import { instalarAgc, marcarClasse, motivoSemInstalacao } from '../../dados/servicos/agc'
import { formatarData, formatarMoeda } from '../../regras/datas'
import { rotuloClasse } from '../../regras/qgc'
import {
  type Convocacao,
  type InstalacaoClasse,
  instalacao,
  type SituacaoInstalacaoClasse,
  type Votante,
} from '../../regras/votacao'
import { Botao } from '../../ui/Botao'
import { Confirmacao } from '../../ui/Confirmacao'
import { Selo, type TomSelo } from '../../ui/Selo'
import { Tabela } from '../../ui/Tabela'
import { mensagemDeErro } from '../credores/erros'
import { plural } from '../processos/rotulos'
import type { Agc } from './agc'
import estilos from './agc.module.css'
import { percentualDe } from './mesa'

const SITUACOES: Record<SituacaoInstalacaoClasse, { rotulo: string; tom: TomSelo }> = {
  atinge: { rotulo: 'Acima de 50%', tom: 'sucesso' },
  'nao-atinge': { rotulo: 'Não passa de 50%', tom: 'alerta' },
  'sem-credores': { rotulo: 'Sem credores', tom: 'neutro' },
}

/** Percentual do valor votante presente, truncado em centésimos (50,004% não vira 50,01%). */
function percentual(classe: InstalacaoClasse): string {
  return percentualDe(classe.valorPresente, classe.valorTotal)
}

export function PainelInstalacao({
  agc,
  votantes,
  presentes,
  convocacaoInicial,
  editavel,
}: {
  agc: Agc
  votantes: readonly Votante[]
  presentes: ReadonlySet<string>
  convocacaoInicial: Convocacao
  /** Papel que edita AGC e AGC ainda agendada. */
  editavel: boolean
}) {
  const idTitulo = useId()
  const idMotivo = useId()
  const [escolhida, setEscolhida] = useState<Convocacao>(convocacaoInicial)
  const [confirmando, setConfirmando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const marcarTodos = useServico(marcarClasse)
  const instalar = useServico(instalarAgc)

  const agendada = agc.status === 'agendada'
  const convocacao = agc.convocacaoInstalada ?? escolhida
  const situacao = instalacao(votantes, presentes, convocacao)
  const motivo = motivoSemInstalacao(situacao)

  async function executar(acao: () => Promise<unknown>) {
    setOcupado(true)
    setErro(null)
    try {
      await acao()
      return true
    } catch (falha) {
      setErro(mensagemDeErro(falha))
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarInstalacao() {
    if (await executar(() => instalar({ agcId: agc.id, convocacao }))) setConfirmando(false)
  }

  return (
    <section className={estilos.secao} aria-labelledby={idTitulo}>
      <div className={estilos.secaoTopo}>
        <div>
          <h2 id={idTitulo} className={estilos.tituloSecao}>
            Instalação
          </h2>
          <p className={estilos.notaSecao}>
            Em 1ª convocação, a AGC instala com presentes que somem mais de 50% do valor votante de
            cada classe; em 2ª, com qualquer número de presentes (art. 37, §2º).
          </p>
        </div>
        {agendada ? (
          <fieldset className={estilos.convocacoes}>
            <legend className="somente-leitor">Convocação</legend>
            {([1, 2] as const).map((numero) => (
              <label key={numero} className={estilos.convocacao}>
                <input
                  type="radio"
                  name={`convocacao-${agc.id}`}
                  value={numero}
                  checked={escolhida === numero}
                  onChange={() => setEscolhida(numero)}
                />
                <span>
                  {numero}ª convocação ·{' '}
                  {formatarData(numero === 1 ? agc.dataPrimeira : agc.dataSegunda)}
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          agc.convocacaoInstalada && (
            <Selo tom="sucesso">{`Instalada em ${agc.convocacaoInstalada}ª convocação`}</Selo>
          )
        )}
      </div>

      <Tabela<InstalacaoClasse>
        rotulo="Quórum de instalação por classe"
        linhas={situacao.classes}
        chaveLinha={(linha) => linha.classe}
        larguraMinima={editavel ? 940 : 720}
        colunas={[
          {
            chave: 'classe',
            titulo: 'Classe',
            destaque: true,
            celula: (linha) => (
              <span data-classe={linha.classe}>{rotuloClasse(linha.classe, 'rj')}</span>
            ),
          },
          {
            chave: 'presentes',
            titulo: 'Presentes',
            largura: '130px',
            alinhar: 'direita',
            numerica: true,
            celula: (linha) => `${linha.quantidadePresente} de ${linha.quantidadeTotal}`,
          },
          {
            chave: 'valor',
            titulo: 'Valor presente',
            largura: '170px',
            alinhar: 'direita',
            numerica: true,
            celula: (linha) => formatarMoeda(linha.valorPresente),
          },
          {
            chave: 'percentual',
            titulo: '% do valor votante',
            largura: '150px',
            alinhar: 'direita',
            numerica: true,
            celula: percentual,
          },
          {
            chave: 'situacao',
            titulo: 'Quórum de 1ª',
            largura: '160px',
            celula: (linha) => (
              <Selo tom={SITUACOES[linha.situacao].tom}>{SITUACOES[linha.situacao].rotulo}</Selo>
            ),
          },
          ...(editavel
            ? [
                {
                  chave: 'acao',
                  titulo: <span className="somente-leitor">Ações</span>,
                  largura: '240px',
                  alinhar: 'direita' as const,
                  celula: (linha: InstalacaoClasse) => {
                    if (linha.quantidadeTotal === 0) return null
                    const todos = linha.quantidadePresente === linha.quantidadeTotal
                    const rotulo = rotuloClasse(linha.classe, 'rj')
                    return (
                      <Botao
                        variante="fantasma"
                        icone={todos ? <UserMinus size={18} /> : <CheckCheck size={18} />}
                        disabled={ocupado}
                        aria-label={`${todos ? 'Desmarcar' : 'Todos da'} classe ${rotulo}`}
                        onClick={() =>
                          executar(() =>
                            marcarTodos({ agcId: agc.id, classe: linha.classe, presente: !todos }),
                          )
                        }
                      >
                        {todos ? 'Desmarcar classe' : 'Todos da classe'}
                      </Botao>
                    )
                  },
                },
              ]
            : []),
        ]}
      />

      {convocacao === 2 && agendada && (
        <p className={estilos.notaSecao}>
          Em 2ª convocação o quórum por classe não é exigido: basta um credor presente.
        </p>
      )}
      {erro && !confirmando && (
        <p className={estilos.erroTexto} role="alert">
          {erro}
        </p>
      )}
      {editavel && (
        <div className={estilos.rodapeInstalacao}>
          {motivo && (
            <p id={idMotivo} className={estilos.motivo}>
              {motivo}
            </p>
          )}
          <Botao
            variante="primario"
            icone={<Gavel size={18} />}
            disabled={motivo !== null || ocupado}
            aria-describedby={motivo ? idMotivo : undefined}
            onClick={() => {
              setErro(null)
              setConfirmando(true)
            }}
          >
            {`Instalar em ${convocacao}ª convocação`}
          </Botao>
        </div>
      )}
      <Confirmacao
        aberto={confirmando}
        titulo={`Instalar a AGC em ${convocacao}ª convocação?`}
        mensagem={
          <>
            {plural(
              situacao.classes.reduce((soma, c) => soma + c.quantidadePresente, 0),
              'credor presente',
              'credores presentes',
            )}
            . Depois de instalada, a lista de presença fica fechada.
            {erro && (
              <span className={estilos.erroTexto} role="alert">
                {' '}
                {erro}
              </span>
            )}
          </>
        }
        rotuloConfirmar="Instalar"
        ocupado={ocupado}
        aoConfirmar={confirmarInstalacao}
        aoCancelar={() => setConfirmando(false)}
      />
    </section>
  )
}
