// CSV da lista de credores (RF-44; SDD CSV-01, CRD-11). Os 600 credores entram direto no
// armazenamento, sem passar pelo repositório (só o filtro e o arquivo interessam aqui).
import { beforeEach, describe, expect, it } from 'vitest'
import { carregarSeedMini, cpfDoCredor, ESCRITORIO_ID } from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { type ContextoGravacao, criarRepositorio, POR_PAGINA } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { formatarDocumento } from '../../regras/documentos'
import { CLASSES_RJ } from '../../regras/qgc'
import { exportarCredores } from './exportacao'

const CONTEXTO: ContextoGravacao = {
  usuario: { id: 'usr-ana', escritorioId: ESCRITORIO_ID },
  papel: 'analista',
  agora: () => '2026-11-07T10:00:00',
}
const HOJE = '2026-11-07'
const PROCESSO = { id: 'prc-600', apelido: 'Grupo Aurora', tipo: 'rj' } as const

/** Linhas do CSV sem o BOM, o cabeçalho e a quebra final. */
function corpo(conteudo: string): string[] {
  return conteudo.split('\r\n').slice(1, -1)
}

describe('exportarCredores', () => {
  let armazenamento: ArmazenamentoMemoria

  beforeEach(async () => {
    armazenamento = new ArmazenamentoMemoria()
    await carregarSeedMini(armazenamento)
    // 600 credores, as cinco classes da RJ em rodízio (120 por classe); um em cada três é "Banco".
    for (let n = 0; n < 600; n++) {
      const credor: Tipos['credores'] = {
        id: `crd-6${String(n).padStart(3, '0')}`,
        escritorioId: ESCRITORIO_ID,
        criadoEm: '2026-11-01T10:00:00',
        atualizadoEm: '2026-11-01T10:00:00',
        processoId: PROCESSO.id,
        nome: `${n % 3 === 0 ? 'Banco' : 'Fornecedor'} ${String(n).padStart(3, '0')}`,
        documento: cpfDoCredor(n),
        classe: CLASSES_RJ[n % CLASSES_RJ.length] ?? 'trabalhista',
        natureza: '',
        valorDevedor: 100_000 + n,
        valorAj: n % 2 === 0 ? 123_456 : null,
        valorQgc: null,
      }
      await armazenamento.put('credores', credor)
    }
  })

  const repo = () => criarRepositorio(armazenamento, 'credores', CONTEXTO)

  it('CRD-11 · 600 credores, filtro classe III: todas as linhas da classe, não só a página', async () => {
    const arquivo = await exportarCredores(
      repo(),
      PROCESSO,
      { busca: '', classe: 'quirografario' },
      HOJE,
    )
    const linhas = corpo(arquivo.conteudo)
    expect(linhas).toHaveLength(120)
    expect(linhas.length).toBeGreaterThan(POR_PAGINA)
    expect(linhas.every((linha) => linha.split(';')[2] === 'III · Quirografário')).toBe(true)
    // Só os do processo: os credores do seed mini (prc-001) ficam fora.
    expect(linhas.every((linha) => /^(Banco|Fornecedor) \d{3};/.test(linha))).toBe(true)
    // Em ordem de nome, como a lista.
    expect(linhas[0]?.startsWith('Banco 012;')).toBe(true)
    expect(linhas.at(-1)?.startsWith('Fornecedor 592;')).toBe(true)
  })

  it('CRD-11 · a busca também vale: classe III e "banco"', async () => {
    const arquivo = await exportarCredores(
      repo(),
      PROCESSO,
      { busca: 'banco', classe: 'quirografario' },
      HOJE,
    )
    // Classe III (n % 5 = 2) e "Banco" (n % 3 = 0): n % 15 = 12, 40 credores.
    const nomes = corpo(arquivo.conteudo).map((linha) => linha.split(';')[0])
    expect(nomes).toHaveLength(40)
    expect(nomes.slice(0, 2)).toEqual(['Banco 012', 'Banco 027'])
  })

  it('CSV-01 · BOM, separador e nome do arquivo com o apelido do processo', async () => {
    const arquivo = await exportarCredores(repo(), PROCESSO, { busca: '', classe: '' }, HOJE)
    expect(arquivo.nome).toBe('judisys-credores-grupo-aurora-2026-11-07.csv')
    expect(arquivo.conteudo.startsWith('﻿Credor;CPF/CNPJ;Classe;Natureza;')).toBe(true)
    expect(arquivo.conteudo.split('\r\n')[0]).toBe(
      '﻿Credor;CPF/CNPJ;Classe;Natureza;Relação do devedor;Relação do AJ;QGC',
    )
    expect(corpo(arquivo.conteudo)).toHaveLength(600)
    // CSV-02 e CSV-04 na linha: CPF com pontuação, centavos com vírgula, vazio sem valor.
    expect(corpo(arquivo.conteudo)[0]).toBe(
      `Banco 000;${formatarDocumento(cpfDoCredor(0))};I · Trabalhista;;1000,00;1234,56;`,
    )
  })
})
