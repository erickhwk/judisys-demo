// Cabeçalho do início (RF-05 a RF-08 do PRD do início, SDD §5.1 e §7.2), conforme o artboard
// "INI · Desktop claro": data por extenso, saudação com o primeiro nome (o `h1` da tela) e a
// frase-resumo do dia, com os vencidos em vermelho. À direita, as ações (busca e Personalizar).
import type { ReactNode } from 'react'
import type { DataIso } from '../../regras/datas'
import estilos from './CabecalhoInicio.module.css'
import { dataPorExtenso, type FraseDoResumo, primeiroNome, saudacao } from './resumo'

export interface PropsCabecalhoInicio {
  /** Nome do usuário da sessão; a saudação usa só o primeiro. */
  nome: string
  /** Hora do relógio da demo (0 a 23). */
  hora: number
  hoje: DataIso
  /** Sem resumo (dados ainda carregando ou com erro), a linha não aparece. */
  resumo?: FraseDoResumo
  /** O lugar da busca e do botão Personalizar (INI-03). */
  acoes?: ReactNode
}

export function CabecalhoInicio({ nome, hora, hoje, resumo, acoes }: PropsCabecalhoInicio) {
  return (
    <header className={estilos.cabecalho}>
      <div className={estilos.texto}>
        <p className={estilos.data}>{dataPorExtenso(hoje)}</p>
        <h1 className={estilos.saudacao}>{`${saudacao(hora)}, ${primeiroNome(nome)}`}</h1>
        {resumo && (
          <p className={estilos.resumo} data-resumo="">
            {resumo.destaque && <b className={estilos.destaque}>{resumo.destaque}</b>}
            {resumo.resto}
          </p>
        )}
      </div>
      {acoes && <div className={estilos.acoes}>{acoes}</div>}
    </header>
  )
}
