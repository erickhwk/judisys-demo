// PDFs genéricos (T-16, RF-21): tarja, determinismo e arquivos commitados em dia com o gerador.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { PDFS, TARJA } from './anexos'
import { gerarPdf } from './pdfs'

const PASTA = join(import.meta.dirname, '..', '..', 'public', 'anexos')

describe('PDFs genéricos', () => {
  it('são de 6 a 8', () => {
    const quantidade = Object.keys(PDFS).length
    expect(quantidade).toBeGreaterThanOrEqual(6)
    expect(quantidade).toBeLessThanOrEqual(8)
  })

  it.each(Object.values(PDFS))('$arquivo: commitado igual ao gerado, com a tarja', async (pdf) => {
    const gerado = await gerarPdf(pdf)
    expect(Buffer.from(await gerarPdf(pdf)).equals(Buffer.from(gerado))).toBe(true)

    const commitado = readFileSync(join(PASTA, pdf.arquivo))
    // Diferente: rode `pnpm pdfs` e commite public/anexos/.
    expect(commitado.equals(Buffer.from(gerado))).toBe(true)

    const documento = await PDFDocument.load(commitado)
    expect(documento.getPageCount()).toBe(1)
    expect(documento.getTitle()).toContain(TARJA)
    expect(documento.getSubject()).toBe(TARJA)
  })
})
