// Endereço de um anexo de informe para abrir ou baixar (RF-21, T-09): o PDF genérico do seed vem
// de `public/anexos/` (INV-09: arquivo do próprio site); o upload vem da tabela `arquivos`, como
// URL de blob criada enquanto a tela está aberta e revogada ao sair.
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useRepo } from '../../dados/contexto'
import type { Anexo } from '../../dados/schemas'
import { ehPdf } from './informes'

export function urlPublica(caminho: string): string {
  return `${import.meta.env.BASE_URL}${caminho}`
}

/** URL do anexo; `undefined` enquanto o arquivo local carrega, `null` se ele não existe mais. */
export function useUrlDoAnexo(anexo: Anexo): string | null | undefined {
  const arquivoId = anexo.origem === 'local' ? anexo.arquivoId : undefined
  const repo = useRepo('arquivos')
  // O conteúdo de um upload não muda: sem refazer a consulta ao voltar para a janela, o Blob
  // continua o mesmo e o iframe não recarrega o PDF do começo.
  const arquivo = useQuery({
    queryKey: ['arquivos', 'conteudo', arquivoId],
    queryFn: async () =>
      arquivoId === undefined ? null : ((await repo.buscar(arquivoId)) ?? null),
    enabled: arquivoId !== undefined,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  })
  const conteudo = arquivo.data?.conteudo
  const pdf = ehPdf(anexo)
  const [criada, setCriada] = useState<{ conteudo: Blob; url: string }>()

  useEffect(() => {
    if (!conteudo) return
    // O iframe só mostra o PDF se o blob disser que é PDF (upload com tipo vazio e nome .pdf);
    // `slice` troca o tipo sem copiar o arquivo.
    const blob =
      pdf && conteudo.type !== 'application/pdf'
        ? conteudo.slice(0, conteudo.size, 'application/pdf')
        : conteudo
    const url = URL.createObjectURL(blob)
    setCriada({ conteudo, url })
    return () => {
      URL.revokeObjectURL(url)
      setCriada(undefined)
    }
  }, [conteudo, pdf])

  if (anexo.origem === 'publico') return urlPublica(anexo.caminho)
  if (arquivo.data === null) return null
  // Só a URL do conteúdo atual: na troca de anexo, a do anterior já está sendo revogada.
  return conteudo && criada?.conteudo === conteudo ? criada.url : undefined
}
