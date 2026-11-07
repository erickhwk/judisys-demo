// Painel ao vivo do art. 45 (RF-35) e verificação do cram down (art. 58, §1º; RF-36, C-08): por
// classe, barras de cabeça e de valor (base: sim + não, abstenções fora, D-16) com a marca dos 50%,
// o resultado da classe e o geral. Os números saem de `resultadoAgc` (DMO-05).
import { Check, X } from 'lucide-react'
import { useId } from 'react'
import { formatarMoeda } from '../../regras/datas'
import { rotuloClasse } from '../../regras/qgc'
import type {
  Contagem,
  CramDown,
  ResultadoAgc,
  ResultadoClasse,
  SituacaoAgc,
  SituacaoClasse,
} from '../../regras/votacao'
import { Selo, type TomSelo } from '../../ui/Selo'
import { plural } from '../processos/rotulos'
import estilos from './agc.module.css'
import { centesimosDe, percentualDe, presentesSemVoto } from './mesa'

const SITUACOES_CLASSE: Record<SituacaoClasse, { rotulo: string; tom: TomSelo }> = {
  aprovada: { rotulo: 'Aprovada', tom: 'sucesso' },
  rejeitada: { rotulo: 'Rejeitada', tom: 'perigo' },
  'nao-votou': { rotulo: 'Não votou', tom: 'neutro' },
}

export const SITUACOES_GERAIS: Record<SituacaoAgc, { rotulo: string; tom: TomSelo }> = {
  aprovado: { rotulo: 'Aprovado em todas as classes', tom: 'sucesso' },
  rejeitado: { rotulo: 'Rejeitado', tom: 'perigo' },
  'cram-down': { rotulo: 'Passível de cram down', tom: 'dourado' },
  'sem-votos': { rotulo: 'Sem votos', tom: 'neutro' },
}

export function PainelArt45({ resultado }: { resultado: ResultadoAgc }) {
  const idTitulo = useId()
  const faltam = presentesSemVoto(resultado)
  const geral = SITUACOES_GERAIS[resultado.situacao]

  return (
    <section className={estilos.secao} aria-labelledby={idTitulo}>
      <div className={estilos.secaoTopo}>
        <div>
          <h3 id={idTitulo} className={estilos.subtituloSecao}>
            Painel do art. 45
          </h3>
          <p className={estilos.notaSecao}>
            Classes I e IV aprovam com mais da metade dos presentes por cabeça; II e III, também com
            mais da metade do valor. Abstenções ficam fora da base; empate rejeita.
          </p>
        </div>
        <p className={estilos.resultadoGeral} data-resultado-geral={resultado.situacao}>
          <span className={estilos.rotuloResultado}>Resultado</span>
          <Selo tom={geral.tom}>{geral.rotulo}</Selo>
        </p>
      </div>

      {faltam > 0 && (
        <p className={estilos.avisoVotos} role="status">
          {`Falta o voto de ${plural(faltam, 'presente', 'presentes')}. O painel os conta como abstenção, mas o resultado só pode ser registrado com todos os votos lançados.`}
        </p>
      )}

      <ul className={estilos.classesVotacao} aria-label="Resultado por classe">
        {resultado.classes.map((classe) => (
          <CartaoClasse key={classe.classe} classe={classe} />
        ))}
      </ul>

      {resultado.cramDown && <PainelCramDown cramDown={resultado.cramDown} />}
    </section>
  )
}

function CartaoClasse({ classe }: { classe: ResultadoClasse }) {
  const situacao = SITUACOES_CLASSE[classe.situacao]
  const decideValor = classe.criterio === 'cabeca-e-valor'
  return (
    <li
      className={estilos.cartaoClasse}
      data-classe={classe.classe}
      data-resultado={classe.situacao}
    >
      <div className={estilos.topoClasse}>
        <span className={estilos.nomeClasse}>{rotuloClasse(classe.classe, 'rj')}</span>
        <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>
      </div>
      <span className={estilos.secundario}>
        {classe.presentes === 0
          ? 'Sem presentes'
          : `${plural(classe.presentes, 'presente', 'presentes')} · ${decideValor ? 'cabeça e valor' : 'por cabeça'}`}
      </span>
      <Barra
        rotulo="Cabeça"
        contagem={classe.cabeca}
        formatar={(n) => String(n)}
        decide
        atingiu={classe.maioriaCabeca}
      />
      <Barra
        rotulo="Valor"
        contagem={classe.valor}
        formatar={formatarMoeda}
        decide={decideValor}
        atingiu={classe.maioriaValor}
      />
      {(classe.cabeca.abstencao > 0 || classe.semVoto > 0) && (
        <span className={estilos.secundario}>
          {[
            classe.cabeca.abstencao > 0 &&
              plural(classe.cabeca.abstencao, 'abstenção', 'abstenções'),
            classe.semVoto > 0 && `${classe.semVoto} sem voto`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      )}
    </li>
  )
}

/** Barra sim × não sobre a base sim + não, com a marca dos 50% ("mais da metade" é estrito). */
function Barra({
  rotulo,
  contagem,
  formatar,
  decide,
  atingiu,
}: {
  rotulo: string
  contagem: Contagem
  formatar: (n: number) => string
  /** Critério que decide a classe (valor só decide nas classes II e III). */
  decide: boolean
  atingiu: boolean
}) {
  const base = contagem.sim + contagem.nao
  const largura = centesimosDe(contagem.sim, base) / 100
  const descricao =
    base === 0
      ? `${rotulo}: sem votos sim ou não`
      : `${rotulo}: ${formatar(contagem.sim)} sim e ${formatar(contagem.nao)} não, ${percentualDe(contagem.sim, base)} sim${decide ? (atingiu ? ', passa de 50%' : ', não passa de 50%') : ', informativo'}`
  return (
    <div className={estilos.barraVoto}>
      <div className={estilos.legendaBarra}>
        <span className={estilos.rotuloBarra}>
          {rotulo}
          {!decide && <span className={estilos.secundario}> · informativo</span>}
        </span>
        <span className="numeros-tabulares">
          {base === 0 ? '—' : `${percentualDe(contagem.sim, base)} sim`}
        </span>
      </div>
      <div
        className={estilos.trilhoBarra}
        role="img"
        aria-label={descricao}
        data-base={base === 0 ? 'vazia' : undefined}
      >
        {base > 0 && (
          <>
            <span className={estilos.barraSim} style={{ width: `${largura}%` }} />
            <span className={estilos.barraNao} style={{ width: `${100 - largura}%` }} />
          </>
        )}
        <span className={estilos.marcaMetade} aria-hidden="true" />
      </div>
      <span className={`${estilos.secundario} numeros-tabulares`}>
        {`${formatar(contagem.sim)} sim · ${formatar(contagem.nao)} não`}
      </span>
    </div>
  )
}

function PainelCramDown({ cramDown }: { cramDown: CramDown }) {
  const idTitulo = useId()
  return (
    <section
      className={estilos.cramDown}
      aria-labelledby={idTitulo}
      data-cram-down={cramDown.cumprido ? 'cumprido' : 'nao-cumprido'}
    >
      <div className={estilos.topoClasse}>
        <h4 id={idTitulo} className={estilos.nomeClasse}>
          Cram down (art. 58, §1º)
        </h4>
        <Selo tom={cramDown.cumprido ? 'sucesso' : 'perigo'}>
          {cramDown.cumprido ? 'Requisitos cumpridos' : 'Requisitos não cumpridos'}
        </Selo>
      </div>
      <ol className={estilos.requisitos}>
        {cramDown.requisitos.map((requisito) => (
          <li
            key={requisito.numero}
            className={estilos.requisito}
            data-requisito={requisito.numero}
            data-cumprido={requisito.cumprido}
          >
            <span
              className={requisito.cumprido ? estilos.iconeCumprido : estilos.iconeNaoCumprido}
              aria-hidden="true"
            >
              {requisito.cumprido ? <Check size={16} /> : <X size={16} />}
            </span>
            <span className={estilos.pilha}>
              <span>
                {requisito.numero}. {requisito.descricao}
              </span>
              <span className={estilos.secundario}>
                <strong>{requisito.cumprido ? 'Cumprido' : 'Não cumprido'}</strong> ·{' '}
                {requisito.detalhe}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
