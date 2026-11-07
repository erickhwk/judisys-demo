import type { TipoProcesso } from '../../regras/fases'
import { formatarMoeda } from '../../regras/moeda'
import { formatarCentesimos, type ResumoQgc, rotuloClasse } from '../../regras/qgc'
import estilos from './credores.module.css'

/** Nota das classes que aparecem fora do total (RF-26, CRD-15). */
export const NOTA_A_PARTE = {
  'nao-sujeito': 'Não sujeito à recuperação (art. 49, §3º): não entra no QGC nem vota.',
  extraconcursal: 'Extraconcursal (art. 84): pago antes dos concursais, fora do total do QGC.',
} as const

/**
 * Quadro-resumo por classe (RF-28): quantidade, valor vigente (T-26) e percentual sobre o total
 * concursal. Não sujeitos e extraconcursais ficam num bloco à parte, fora do total (CRD-15).
 */
export function QuadroResumo({ resumo, tipo }: { resumo: ResumoQgc; tipo: TipoProcesso }) {
  return (
    <section className={estilos.card} aria-labelledby="titulo-quadro-resumo">
      <div className={estilos.cardTopo}>
        <h2 id="titulo-quadro-resumo" className={estilos.tituloCard}>
          Quadro-resumo por classe
        </h2>
        <p className={estilos.notaCard}>Valor vigente: QGC ou, sem QGC, relação do AJ.</p>
      </div>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: área rolável precisa de foco para rolar pelo teclado */}
      <section className={estilos.rolagem} tabIndex={0} aria-label="Tabela do quadro-resumo">
        <table className={estilos.quadro}>
          <thead>
            <tr>
              <th scope="col">Classe</th>
              <th scope="col" className={estilos.direita}>
                Credores
              </th>
              <th scope="col" className={estilos.direita}>
                Valor
              </th>
              <th scope="col" className={estilos.direita}>
                % do total
              </th>
            </tr>
          </thead>
          <tbody>
            {resumo.linhas.map((linha) => (
              <tr key={linha.classe} data-classe={linha.classe}>
                <th scope="row">{rotuloClasse(linha.classe, tipo)}</th>
                <td className={estilos.numero}>{linha.quantidade}</td>
                <td className={estilos.numero}>{formatarMoeda(linha.valor)}</td>
                <td className={estilos.numero}>
                  {formatarCentesimos(linha.percentualCentesimos ?? 0)}%
                </td>
              </tr>
            ))}
            {resumo.linhas.length === 0 && (
              <tr>
                <td colSpan={4} className={estilos.semLinhas}>
                  Nenhum credor concursal.
                </td>
              </tr>
            )}
            <tr data-classe="total" className={estilos.linhaTotal}>
              <th scope="row">{tipo === 'falencia' ? 'Total concursal' : 'Total'}</th>
              <td className={estilos.numero}>{resumo.total.quantidade}</td>
              <td className={estilos.numero}>{formatarMoeda(resumo.total.valor)}</td>
              <td className={estilos.numero}>{resumo.total.quantidade > 0 ? '100,00%' : '—'}</td>
            </tr>
          </tbody>
          {resumo.aParte.length > 0 && (
            <tbody className={estilos.aParte} aria-label="Fora do total">
              <tr>
                <th scope="colgroup" colSpan={4} className={estilos.tituloAParte}>
                  Fora do total
                </th>
              </tr>
              {resumo.aParte.map((linha) => (
                <tr key={linha.classe} data-classe={linha.classe}>
                  <th scope="row">
                    {rotuloClasse(linha.classe, tipo)}
                    <span className={estilos.notaLinha}>
                      {NOTA_A_PARTE[linha.classe as keyof typeof NOTA_A_PARTE]}
                    </span>
                  </th>
                  <td className={estilos.numero}>{linha.quantidade}</td>
                  <td className={estilos.numero}>{formatarMoeda(linha.valor)}</td>
                  <td className={estilos.numero}>—</td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </section>
    </section>
  )
}
