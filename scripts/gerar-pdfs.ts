// Gera os PDFs genéricos em public/anexos/ (T-16, RF-21). Roda à mão com `pnpm pdfs` quando o
// conteúdo de scripts/seed/anexos.ts mudar; os PDFs são commitados.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFS } from './seed/anexos'
import { gerarPdf } from './seed/pdfs'

const pasta = join(import.meta.dirname, '..', 'public', 'anexos')
mkdirSync(pasta, { recursive: true })
for (const pdf of Object.values(PDFS)) {
  writeFileSync(join(pasta, pdf.arquivo), await gerarPdf(pdf))
  console.log(`gerar-pdfs: anexos/${pdf.arquivo}`)
}
