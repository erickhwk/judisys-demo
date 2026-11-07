// Gravação de informe com anexos (RF-18 a RF-21, SDD §5.4, §7.11): os uploads vão para a tabela
// `arquivos` (sem log próprio: o log é o do informe) e o informe guarda só a referência, tudo numa
// transação (T-12). Se a cota do navegador estourar no meio, nada fica gravado e só esta operação
// falha (CAR-11); quem chama reconhece o erro com `ehErroDeCota` e mostra `MENSAGEM_COTA`.
import type { Armazenamento, Id } from '../armazenamento'
import { type ContextoGravacao, criarRepositorio } from '../repositorio'
import type { Anexo, Novo, Tipos } from '../schemas'
import { buscarOuFalhar, exigirPermissao } from './comum'

type Informe = Tipos['informes']

/** Arquivo escolhido pelo visitante, ainda não gravado. */
export interface ArquivoNovo {
  nome: string
  tipo: string
  conteudo: Blob
}

export interface PedidoSalvarInforme {
  /** Sem `id`, cria; com `id`, edita. */
  id?: Id
  dados: Omit<Novo<Informe>, 'anexos'>
  /** Anexos já gravados que continuam no informe; os locais que saírem são apagados. */
  anexos: Anexo[]
  novos: ArquivoNovo[]
}

const TABELAS_INFORME = ['informes', 'arquivos', 'logs'] as const

/** Mesmo anexo, pela referência (caminho público ou arquivo local); serve também de `key` na tela. */
export function chaveAnexo(anexo: Anexo): string {
  return anexo.origem === 'publico' ? `publico:${anexo.caminho}` : `local:${anexo.arquivoId}`
}

export function salvarInforme(armazenamento: Armazenamento, contexto: ContextoGravacao) {
  const repoInformes = criarRepositorio(armazenamento, 'informes', contexto)
  const repoArquivos = criarRepositorio(armazenamento, 'arquivos', contexto)

  return async ({ id, dados, anexos, novos }: PedidoSalvarInforme): Promise<Informe> => {
    exigirPermissao(contexto, 'informes')
    return armazenamento.transacao([...TABELAS_INFORME], async () => {
      const antigo =
        id === undefined ? undefined : await buscarOuFalhar(armazenamento, 'informes', id)
      // Só ficam anexos que o informe já tinha: a tela não inventa referências.
      const daqui = new Set(antigo?.anexos.map(chaveAnexo))
      const mantidos = anexos.filter((anexo) => daqui.has(chaveAnexo(anexo)))

      const enviados: Anexo[] = []
      for (const arquivo of novos) {
        const gravado = await repoArquivos.criar({
          nome: arquivo.nome,
          tipo: arquivo.tipo,
          tamanho: arquivo.conteudo.size,
          conteudo: arquivo.conteudo,
        })
        enviados.push({
          origem: 'local',
          arquivoId: gravado.id,
          nome: gravado.nome,
          tipo: gravado.tipo,
          tamanho: gravado.tamanho,
        })
      }
      const todos = [...mantidos, ...enviados]

      if (!antigo) return repoInformes.criar({ ...dados, anexos: todos })

      const ficam = new Set(mantidos.map(chaveAnexo))
      for (const anexo of antigo.anexos) {
        // O arquivo pode já não estar no navegador ("Arquivo indisponível"): tirar o anexo
        // quebrado do informe não pode falhar por isso.
        if (
          anexo.origem === 'local' &&
          !ficam.has(chaveAnexo(anexo)) &&
          (await armazenamento.get('arquivos', anexo.arquivoId))
        ) {
          await repoArquivos.excluir(anexo.arquivoId)
        }
      }
      return repoInformes.atualizar(antigo.id, { ...dados, anexos: todos })
    })
  }
}
