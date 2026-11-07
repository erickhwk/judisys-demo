// Gravação de informe com anexos (RF-21, SDD §7.11, CAR-11) nas duas implementações (SDD §10).
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../../tests/fixtures/armazenamentos'
import { carregarSeedMini, ESCRITORIO_ID, seedMini } from '../../../tests/fixtures/seed-mini'
import type { Papel } from '../../regras/permissoes'
import type { Armazenamento } from '../armazenamento'
import { ehErroDeCota } from '../carga'
import { type ContextoGravacao, ErroPermissao, ErroValidacao } from '../repositorio'
import type { Log, Tipos } from '../schemas'
import { type PedidoSalvarInforme, salvarInforme } from './informes'

const AGORA = '2026-11-07T10:00:00'

function contexto(papel: Papel = 'aj'): ContextoGravacao {
  return { usuario: { id: 'usr-aj', escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

const DADOS: PedidoSalvarInforme['dados'] = {
  processoId: 'prc-001',
  titulo: 'Relatório mensal',
  categoria: 'relatorios',
  fase: 'plano-apresentado',
  publicadoNoSite: false,
  data: '2026-11-07',
}

function pdf(tamanho = 2 * 1024 * 1024): Blob {
  return new Blob([new Uint8Array(tamanho)], { type: 'application/pdf' })
}

/** Rejeita `put` em `arquivos` com o erro de cota do navegador. */
function comCotaCheia(armazenamento: Armazenamento): Armazenamento {
  return {
    get: (t, id) => armazenamento.get(t, id),
    put: (t, registro) =>
      t === 'arquivos'
        ? Promise.reject(new DOMException('cheio', 'QuotaExceededError'))
        : armazenamento.put(t, registro),
    delete: (t, id) => armazenamento.delete(t, id),
    porIndice: (t, indice, valor) => armazenamento.porIndice(t, indice, valor),
    todos: (t) => armazenamento.todos(t),
    transacao: (tabelas, fn) => armazenamento.transacao(tabelas, fn),
    limpar: () => armazenamento.limpar(),
  }
}

describe.each(IMPLEMENTACOES)('salvarInforme sobre %s', (_nome, criar) => {
  let armazenamento: Armazenamento

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  it('INF-03 · grava o upload em `arquivos` e o informe com a referência, com um log só', async () => {
    const informe = await salvarInforme(
      armazenamento,
      contexto(),
    )({
      dados: DADOS,
      anexos: [],
      novos: [{ nome: 'relatorio.pdf', tipo: 'application/pdf', conteudo: pdf() }],
    })

    expect(informe.anexos).toHaveLength(1)
    const anexo = informe.anexos[0]
    if (anexo?.origem !== 'local') throw new Error('esperava anexo local')
    expect(anexo).toMatchObject({
      nome: 'relatorio.pdf',
      tipo: 'application/pdf',
      tamanho: 2 * 1024 * 1024,
    })
    const arquivo = await armazenamento.get<Tipos['arquivos']>('arquivos', anexo.arquivoId)
    expect(arquivo?.conteudo).toBeInstanceOf(Blob)
    expect(arquivo?.conteudo.size).toBe(2 * 1024 * 1024)

    const logs = (await armazenamento.todos<Log>('logs')).filter((l) => l.data === AGORA)
    expect(logs.map((l) => [l.colecao, l.acao])).toEqual([['informes', 'criou']])
  })

  it('INF-04 · arquivo acima de 10 MB é recusado e nada é gravado', async () => {
    const erro = await salvarInforme(
      armazenamento,
      contexto(),
    )({
      dados: DADOS,
      anexos: [],
      novos: [{ nome: 'grande.pdf', tipo: 'application/pdf', conteudo: pdf(11 * 1024 * 1024) }],
    }).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ErroValidacao)
    expect((erro as ErroValidacao).problemas.map((p) => p.mensagem)).toContain(
      'Arquivo acima de 10 MB.',
    )
    expect(await armazenamento.todos('arquivos')).toEqual([])
    expect(await armazenamento.todos('informes')).toHaveLength(seedMini().informes.length)
  })

  it('CAR-11 · cota cheia: só esta gravação falha, sem informe, arquivo nem log', async () => {
    const logsAntes = (await armazenamento.todos('logs')).length
    const erro = await salvarInforme(
      comCotaCheia(armazenamento),
      contexto(),
    )({
      dados: DADOS,
      anexos: [],
      novos: [{ nome: 'relatorio.pdf', tipo: 'application/pdf', conteudo: pdf() }],
    }).catch((e: unknown) => e)

    expect(ehErroDeCota(erro)).toBe(true)
    expect(await armazenamento.todos('informes')).toHaveLength(seedMini().informes.length)
    expect(await armazenamento.todos('logs')).toHaveLength(logsAntes)
    // O resto continua gravando normalmente.
    const informe = await salvarInforme(
      armazenamento,
      contexto(),
    )({
      dados: DADOS,
      anexos: [],
      novos: [],
    })
    expect(await armazenamento.get('informes', informe.id)).toBeDefined()
  })

  it('edição: mantém o anexo do seed, apaga o upload removido e tira a data da AGC', async () => {
    const salvar = salvarInforme(armazenamento, contexto())
    const ata = await salvar({
      dados: { ...DADOS, categoria: 'atas-agc', dataAgc: '2026-11-01' },
      anexos: [],
      novos: [{ nome: 'ata.pdf', tipo: 'application/pdf', conteudo: pdf(10) }],
    })
    const upload = ata.anexos[0]
    if (upload?.origem !== 'local') throw new Error('esperava anexo local')

    const editado = await salvar({
      id: ata.id,
      dados: { ...DADOS, categoria: 'relatorios', dataAgc: undefined },
      anexos: [],
      novos: [],
    })
    expect(editado.dataAgc).toBeUndefined()
    expect(editado.anexos).toEqual([])
    expect(await armazenamento.get('arquivos', upload.arquivoId)).toBeUndefined()

    const seed = seedMini().informes[0] as Tipos['informes']
    const comSeed = await salvar({
      id: seed.id,
      dados: { ...DADOS, titulo: 'Edital renomeado' },
      // Referência que o informe não tinha é ignorada.
      anexos: [...seed.anexos, { origem: 'publico', caminho: 'anexos/rma.pdf', nome: 'x.pdf' }],
      novos: [],
    })
    expect(comSeed.anexos).toEqual(seed.anexos)
  })

  it('edição: anexo local cujo arquivo já sumiu sai do informe sem erro', async () => {
    const salvar = salvarInforme(armazenamento, contexto())
    const informe = await salvar({
      dados: DADOS,
      anexos: [],
      novos: [{ nome: 'relatorio.pdf', tipo: 'application/pdf', conteudo: pdf(10) }],
    })
    const upload = informe.anexos[0]
    if (upload?.origem !== 'local') throw new Error('esperava anexo local')
    await armazenamento.delete('arquivos', upload.arquivoId)

    const editado = await salvar({ id: informe.id, dados: DADOS, anexos: [], novos: [] })
    expect(editado.anexos).toEqual([])
  })

  it('PER-05 · analista não grava informe', async () => {
    await expect(
      salvarInforme(armazenamento, contexto('analista'))({ dados: DADOS, anexos: [], novos: [] }),
    ).rejects.toBeInstanceOf(ErroPermissao)
    expect(await armazenamento.todos('informes')).toHaveLength(seedMini().informes.length)
  })
})
