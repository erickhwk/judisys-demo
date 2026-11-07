// Montagem dos PDFs genéricos com pdf-lib (T-16). Determinística: datas do documento fixas, para
// que gerar de novo produza os mesmos bytes e o git não acuse mudança à toa.
import { degrees, PDFDocument, type PDFFont, rgb, StandardFonts } from 'pdf-lib'
import { type PdfGenerico, TARJA } from './anexos'
import { ESCRITORIO } from './nomes'

const LARGURA = 595.28
const ALTURA = 841.89
const MARGEM = 64
const DATA_DO_DOCUMENTO = new Date('2026-01-01T00:00:00Z')

const NAVY = rgb(0.039, 0.122, 0.302)
const DOURADO = rgb(0.784, 0.6, 0.247)
const CINZA = rgb(0.35, 0.37, 0.42)
const VERMELHO = rgb(0.75, 0.12, 0.12)

/** Quebra o texto em linhas que cabem em `largura` pontos. */
function quebrarLinhas(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = []
  let atual = ''
  for (const palavra of texto.split(/\s+/)) {
    const tentativa = atual === '' ? palavra : `${atual} ${palavra}`
    if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura || atual === '') {
      atual = tentativa
    } else {
      linhas.push(atual)
      atual = palavra
    }
  }
  if (atual !== '') linhas.push(atual)
  return linhas
}

export async function gerarPdf(pdf: PdfGenerico): Promise<Uint8Array> {
  const documento = await PDFDocument.create({ updateMetadata: false })
  documento.setTitle(`${pdf.titulo} · ${TARJA}`)
  documento.setAuthor(ESCRITORIO.nome)
  documento.setSubject(TARJA)
  documento.setCreator('Judisys · demonstração')
  documento.setProducer('pdf-lib')
  documento.setCreationDate(DATA_DO_DOCUMENTO)
  documento.setModificationDate(DATA_DO_DOCUMENTO)

  const normal = await documento.embedFont(StandardFonts.Helvetica)
  const negrito = await documento.embedFont(StandardFonts.HelveticaBold)
  const pagina = documento.addPage([LARGURA, ALTURA])

  // Tarja no topo e marca d'água na diagonal.
  pagina.drawRectangle({ x: 0, y: ALTURA - 36, width: LARGURA, height: 36, color: VERMELHO })
  const larguraTarja = negrito.widthOfTextAtSize(TARJA, 13)
  pagina.drawText(TARJA, {
    x: (LARGURA - larguraTarja) / 2,
    y: ALTURA - 23,
    size: 13,
    font: negrito,
    color: rgb(1, 1, 1),
  })
  // Centrada na página: o texto começa meia largura antes do centro, ao longo da diagonal.
  const meiaDiagonal = (negrito.widthOfTextAtSize(TARJA, 30) / 2) * Math.SQRT1_2
  pagina.drawText(TARJA, {
    x: LARGURA / 2 - meiaDiagonal,
    y: ALTURA / 2 - meiaDiagonal,
    size: 30,
    font: negrito,
    color: VERMELHO,
    opacity: 0.12,
    rotate: degrees(45),
  })

  let y = ALTURA - 96
  pagina.drawText(ESCRITORIO.nome, { x: MARGEM, y, size: 11, font: negrito, color: DOURADO })
  y -= 34
  for (const linha of quebrarLinhas(pdf.titulo, negrito, 22, LARGURA - 2 * MARGEM)) {
    pagina.drawText(linha, { x: MARGEM, y, size: 22, font: negrito, color: NAVY })
    y -= 28
  }
  pagina.drawLine({
    start: { x: MARGEM, y: y + 8 },
    end: { x: LARGURA - MARGEM, y: y + 8 },
    thickness: 1,
    color: DOURADO,
  })
  y -= 18

  for (const paragrafo of pdf.paragrafos) {
    for (const linha of quebrarLinhas(paragrafo, normal, 11, LARGURA - 2 * MARGEM)) {
      pagina.drawText(linha, { x: MARGEM, y, size: 11, font: normal, color: CINZA })
      y -= 16
    }
    y -= 10
  }

  const rodape = `Judisys · por Draft · ${TARJA}`
  pagina.drawText(rodape, { x: MARGEM, y: 36, size: 9, font: normal, color: CINZA })

  return documento.save()
}
