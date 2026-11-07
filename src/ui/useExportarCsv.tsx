// Botão "Exportar CSV" das listas (RF-44): processos, empresas, credores e prazos. Quem pode ler a
// lista exporta (a rota já exige `ler`). A tela entrega o arquivo pronto, com todas as linhas que
// passam no filtro, não só a página (CRD-11); aqui fica o estado do botão e o aviso de falha.
import { Download } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Botao } from './Botao'
import { baixarArquivo } from './baixarArquivo'
import { Erro } from './Erro'

export interface ArquivoCsv {
  /** `judisys-<módulo>-aaaa-mm-dd.csv` (`nomeArquivoCsv`). */
  nome: string
  /** Conteúdo de `gerarCsv`. */
  conteudo: string
}

export interface ExportacaoCsv {
  botao: ReactNode
  /** Aviso de falha; `null` enquanto não houver. */
  erro: ReactNode
}

export function useExportarCsv(gerar: () => Promise<ArquivoCsv>): ExportacaoCsv {
  const [exportando, setExportando] = useState(false)
  const [falhou, setFalhou] = useState(false)

  async function exportar() {
    setExportando(true)
    setFalhou(false)
    try {
      const { nome, conteudo } = await gerar()
      baixarArquivo(nome, conteudo)
    } catch {
      setFalhou(true)
    } finally {
      setExportando(false)
    }
  }

  return {
    botao: (
      <Botao icone={<Download size={18} />} onClick={exportar} disabled={exportando}>
        Exportar CSV
      </Botao>
    ),
    erro: falhou ? <Erro mensagem="Não foi possível exportar o CSV." /> : null,
  }
}
