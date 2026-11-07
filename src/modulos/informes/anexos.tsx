// Endereço de um anexo de informe para abrir ou baixar (RF-21, T-09): o PDF genérico do seed vem
// de `public/anexos/` (INV-09: arquivo do próprio site); o upload vem da tabela `arquivos`, como
// URL de blob criada enquanto a tela está aberta e revogada ao sair.
import { useEffect, useState } from 'react'
import { useRegistro } from '../../dados/contexto'
import type { Anexo } from '../../dados/schemas'
import { ehPdf } from './informes'

export function urlPublica(caminho: string): string {
  return `${import.meta.env.BASE_URL}${caminho}`
}

/** URL do anexo; `undefined` enquanto o arquivo local carrega, `null` se ele não existe mais. */
export function useUrlDoAnexo(anexo: Anexo): string | null | undefined {
  const local = anexo.origem === 'local' ? anexo : undefined
  const arquivo = useRegistro('arquivos', local?.arquivoId)
  const conteudo = arquivo.data?.conteudo
  const pdf = ehPdf(anexo)
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!conteudo) return
    // O iframe só mostra o PDF se o blob disser que é PDF (upload com tipo vazio e nome .pdf).
    const blob =
      pdf && conteudo.type !== 'application/pdf'
        ? new Blob([conteudo], { type: 'application/pdf' })
        : conteudo
    const criada = URL.createObjectURL(blob)
    setUrl(criada)
    return () => {
      URL.revokeObjectURL(criada)
      setUrl(undefined)
    }
  }, [conteudo, pdf])

  if (anexo.origem === 'publico') return urlPublica(anexo.caminho)
  return arquivo.data === null ? null : url
}
