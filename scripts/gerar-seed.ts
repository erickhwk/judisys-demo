// Gera public/seed.json e public/seed-versao.json (T-06, RF-45). Roda com `pnpm seed`, antes do
// build (CI). Os dois arquivos ficam fora do git; o conteúdo é determinístico (INV-07).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gerarSeed, serializarSeed } from './seed/gerar'

const pastaPublica = join(import.meta.dirname, '..', 'public')
const seed = gerarSeed()
const arquivos = serializarSeed(seed)

mkdirSync(pastaPublica, { recursive: true })
writeFileSync(join(pastaPublica, 'seed.json'), arquivos.seed)
writeFileSync(join(pastaPublica, 'seed-versao.json'), arquivos.versao)

const contagem = Object.entries(seed.tabelas)
  .filter(([, registros]) => registros.length > 0)
  .map(([tabela, registros]) => `${tabela} ${registros.length}`)
  .join(', ')
console.log(`gerar-seed: versão ${seed.versao} (${Math.round(arquivos.seed.length / 1024)} KB)`)
console.log(`gerar-seed: ${contagem}`)
