// Seed da demo (SDD §7.12, SED-01 a SED-07). O seed é gerado em memória, sem gravar arquivo (§10).
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Tabela } from '../../src/dados/armazenamento'
import { COLECOES } from '../../src/dados/repositorio'
import { SCHEMAS, type Tipos } from '../../src/dados/schemas'
import { type DataIso, diasEntre } from '../../src/regras/datas'
import { validarCnj, validarCnpj, validarCpf } from '../../src/regras/documentos'
import { ehFaseFinal, fasesDoTipo, fasesSeguintes } from '../../src/regras/fases'
import { pode } from '../../src/regras/permissoes'
import { prazosDoMarco, situacao, TITULO_RMA } from '../../src/regras/prazos'
import { CLASSES_RJ } from '../../src/regras/qgc'
import { credoresVotantes, resultadoAgc } from '../../src/regras/votacao'
import { DATA_BASE, FORMATO_DATA_RELATIVA, resolverDatas } from './datas'
import {
  type ArquivoSeed,
  gerarSeed,
  serializarSeed,
  type TabelasDoSeed,
  versaoDoConteudo,
} from './gerar'
import { ID_VITRINE } from './processos'

/** O seed como o app o lê: o texto de public/seed.json. */
let seed: ArquivoSeed
/** Tabelas com as datas resolvidas para hoje = DATA_BASE, como o carregador faria. */
let t: TabelasDoSeed

beforeAll(() => {
  seed = JSON.parse(serializarSeed(gerarSeed()).seed)
  t = resolverDatas(seed.tabelas, DATA_BASE)
})

const HOJE = DATA_BASE
const RAIZ = join(import.meta.dirname, '..', '..')

function porId<T extends { id: string }>(registros: readonly T[]): Map<string, T> {
  return new Map(registros.map((r) => [r.id, r]))
}

describe('SED-01 · determinismo (INV-07)', () => {
  it('gerar duas vezes produz os mesmos arquivos', () => {
    expect(serializarSeed(gerarSeed())).toEqual(serializarSeed(gerarSeed()))
    expect(serializarSeed(gerarSeed()).seed).toBe(`${JSON.stringify(seed)}\n`)
  })

  it('versão é o hash curto do conteúdo das tabelas', () => {
    expect(seed.versao).toMatch(/^[0-9a-f]{12}$/)
    expect(seed.versao).toBe(versaoDoConteudo(JSON.stringify(seed.tabelas)))
    expect(JSON.parse(serializarSeed(seed).versao)).toEqual({ versao: seed.versao })
  })
})

describe('T-24 · datas relativas', () => {
  it('nenhuma data absoluta no arquivo; toda data está no formato @±N ou @±NThh:mm', () => {
    const texto = serializarSeed(seed).seed
    expect(texto).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    const relativas = texto.match(/"@[^"]*"/g) ?? []
    expect(relativas.length).toBeGreaterThan(1000)
    for (const valor of relativas) expect(valor.slice(1, -1)).toMatch(FORMATO_DATA_RELATIVA)
  })

  it('o mesmo seed serve a outro "hoje": as datas acompanham', () => {
    const outroHoje = resolverDatas(seed.tabelas, '2027-03-01')
    const agc = outroHoje.agcs.find((a) => a.processoId === ID_VITRINE)
    expect(agc?.dataPrimeira).toBe('2027-03-07')
  })
})

describe('seed válido pelos schemas zod (DMO-06)', () => {
  it.each(['2026-11-07', '2028-02-29'])('com hoje = %s', (hoje) => {
    const tabelas = resolverDatas(seed.tabelas, hoje)
    for (const [tabela, registros] of Object.entries(tabelas) as [Tabela, unknown[]][]) {
      for (const registro of registros) {
        const resultado = SCHEMAS[tabela].safeParse(registro)
        if (!resultado.success) {
          throw new Error(`${tabela}: ${JSON.stringify(registro)} → ${resultado.error.message}`)
        }
        // Documentos já vêm só com dígitos: o schema não muda nada.
        expect(resultado.data).toEqual(registro)
      }
    }
  })

  it('ids únicos em cada tabela, com prefixo e número fixo (T-21)', () => {
    for (const [tabela, registros] of Object.entries(t) as [Tabela, { id: string }[]][]) {
      const ids = registros.map((r) => r.id)
      expect(new Set(ids).size, tabela).toBe(ids.length)
      for (const id of ids) expect(id).toMatch(/^[a-z]{3}-\d+$/)
    }
  })
})

describe('SED-02 · documentos válidos', () => {
  it('CPF e CNPJ dos credores e requerentes, CNPJ das empresas, CNJ dos processos', () => {
    const documentos = [
      ...t.credores.map((c) => c.documento),
      ...t.pedidosDeCredito.flatMap((p) => (p.requerente ? [p.requerente.documento] : [])),
    ]
    for (const documento of documentos) {
      expect(documento).toMatch(/^\d+$/)
      expect(validarCpf(documento) || validarCnpj(documento), documento).toBe(true)
    }
    for (const empresa of t.empresas) expect(validarCnpj(empresa.cnpj), empresa.cnpj).toBe(true)
    for (const processo of t.processos) {
      expect(validarCnj(processo.numeroCnj), processo.numeroCnj).toBe(true)
    }
  })

  it('CPFs não se repetem no seed', () => {
    const cpfs = t.credores.map((c) => c.documento).filter((d) => d.length === 11)
    expect(new Set(cpfs).size).toBe(cpfs.length)
  })
})

describe('SED-03 · contagens e todas as fases (RF-46)', () => {
  it('escritório, 6 usuários (2 de cada papel), 12 processos (8 RJ, 4 falências)', () => {
    expect(t.escritorios.map((e) => e.nome)).toEqual(['Vértice Administração Judicial'])
    expect(t.usuarios).toHaveLength(6)
    for (const papel of ['aj', 'advogado', 'analista']) {
      expect(t.usuarios.filter((u) => u.papel === papel)).toHaveLength(2)
    }
    expect(t.processos.filter((p) => p.tipo === 'rj')).toHaveLength(8)
    expect(t.processos.filter((p) => p.tipo === 'falencia')).toHaveLength(4)
  })

  it('~1.500 credores, ~40 empresas, ~80 informes', () => {
    expect(t.credores.length).toBeGreaterThanOrEqual(1_400)
    expect(t.credores.length).toBeLessThanOrEqual(1_600)
    expect(t.empresas.length).toBeGreaterThanOrEqual(35)
    expect(t.empresas.length).toBeLessThanOrEqual(45)
    expect(t.informes.length).toBeGreaterThanOrEqual(70)
    expect(t.informes.length).toBeLessThanOrEqual(90)
  })

  it('toda fase de cada tipo aparece nos marcos de algum processo', () => {
    for (const tipo of ['rj', 'falencia'] as const) {
      const ids = new Set(t.processos.filter((p) => p.tipo === tipo).map((p) => p.id))
      const fases = new Set(t.marcosDeFase.filter((m) => ids.has(m.processoId)).map((m) => m.fase))
      expect([...fases].sort()).toEqual([...fasesDoTipo(tipo)].sort())
    }
  })

  it('marcos em ordem pelas regras de fase e fase atual = último marco (T-27, INV-04)', () => {
    for (const processo of t.processos) {
      const marcos = t.marcosDeFase.filter((m) => m.processoId === processo.id)
      marcos.forEach((marco, i) => {
        const anterior = marcos[i - 1]
        if (!anterior) return
        expect(marco.data >= anterior.data).toBe(true)
        expect(fasesSeguintes(processo.tipo, anterior.fase)).toContain(marco.fase)
      })
      expect(marcos.at(-1)?.fase).toBe(processo.faseAtual)
    }
  })

  it('um processo em fiscalização com AGC encerrada e ata; uma falência em realização do ativo', () => {
    const fiscalizacao = t.processos.filter((p) => p.faseAtual === 'fiscalizacao')
    expect(
      fiscalizacao.some(
        (p) =>
          t.agcs.some((a) => a.processoId === p.id && a.status === 'encerrada') &&
          t.informes.some((i) => i.processoId === p.id && i.categoria === 'atas-agc' && i.resumo),
      ),
    ).toBe(true)
    expect(
      t.processos.some((p) => p.tipo === 'falencia' && p.faseAtual === 'realizacao-ativo'),
    ).toBe(true)
  })
})

describe('SED-04 · processo vitrine', () => {
  it('RJ com consolidação substancial, 4 a 6 empresas e ~600 credores em todas as classes', () => {
    const vitrine = t.processos.find((p) => p.id === ID_VITRINE)
    expect(vitrine?.tipo).toBe('rj')
    expect(vitrine?.consolidacao).toBe('substancial')
    const empresas = t.processoEmpresas.filter((v) => v.processoId === ID_VITRINE)
    expect(empresas.length).toBeGreaterThanOrEqual(4)
    expect(empresas.length).toBeLessThanOrEqual(6)
    const credores = t.credores.filter((c) => c.processoId === ID_VITRINE)
    expect(credores.length).toBeGreaterThanOrEqual(550)
    expect(credores.length).toBeLessThanOrEqual(650)
    expect(new Set(credores.map((c) => c.classe))).toEqual(new Set(CLASSES_RJ))
  })

  it('plano apresentado, relação do AJ publicada, AGC em 1ª convocação em @+6, 3 impugnações pendentes', () => {
    const vitrine = seed.tabelas.processos.find((p) => p.id === ID_VITRINE)
    expect(vitrine?.faseAtual).toBe('plano-apresentado')
    const fases = t.marcosDeFase.filter((m) => m.processoId === ID_VITRINE).map((m) => m.fase)
    expect(fases).toContain('relacao-aj-publicada')
    const credores = t.credores.filter((c) => c.processoId === ID_VITRINE)
    expect(credores.every((c) => c.valorAj !== null && c.valorAj !== undefined)).toBe(true)

    const agcs = seed.tabelas.agcs.filter((a) => a.processoId === ID_VITRINE)
    expect(agcs).toHaveLength(1)
    expect(agcs[0]).toMatchObject({ dataPrimeira: '@+6', status: 'agendada' })

    const impugnacoes = t.pedidosDeCredito.filter(
      (p) => p.processoId === ID_VITRINE && p.tipo === 'impugnacao' && p.status === 'pendente',
    )
    expect(impugnacoes).toHaveLength(3)
  })
})

describe('SED-05 · prazos para o dashboard', () => {
  const abertos = () => t.prazos.filter((p) => p.status === 'aberto')
  const dias = (vencimento: DataIso) => diasEntre(HOJE, vencimento)

  it('ao menos um aberto vencido, um vencendo hoje e um em +1..+7', () => {
    expect(abertos().some((p) => situacao(p, HOJE) === 'vencido')).toBe(true)
    expect(abertos().some((p) => p.vencimento === HOJE)).toBe(true)
    expect(abertos().some((p) => dias(p.vencimento) >= 1 && dias(p.vencimento) <= 7)).toBe(true)
  })

  it('alguma RJ com RMA vencido', () => {
    const rjs = new Set(t.processos.filter((p) => p.tipo === 'rj').map((p) => p.id))
    expect(
      abertos().some(
        (p) => rjs.has(p.processoId) && p.titulo === TITULO_RMA && p.vencimento < HOJE,
      ),
    ).toBe(true)
  })

  it('prazos automáticos dos marcos são os das regras (RF-22, prazosDoMarco)', () => {
    const processos = porId(t.processos)
    for (const marco of t.marcosDeFase) {
      const processo = processos.get(marco.processoId)
      if (!processo) throw new Error(`Processo inexistente: ${marco.processoId}`)
      const marcos = t.marcosDeFase.filter(
        (m) => m.processoId === marco.processoId && m.data <= marco.data,
      )
      const esperados = prazosDoMarco(processo, marco, marcos).map((p) => [p.titulo, p.vencimento])
      const gravados = t.prazos
        .filter((p) => p.marcoId === marco.id)
        .map((p) => [p.titulo, p.vencimento])
      expect(gravados.sort()).toEqual(esperados.sort())
    }
  })
})

describe('SED-06 · um RMA aberto por RJ ativa (INV-05)', () => {
  it('cada RJ fora das fases finais e com processamento deferido tem exatamente um RMA aberto', () => {
    for (const processo of t.processos.filter((p) => p.tipo === 'rj')) {
      const deferido = t.marcosDeFase.some(
        (m) => m.processoId === processo.id && m.fase === 'processamento-deferido',
      )
      const rmasAbertos = t.prazos.filter(
        (p) => p.processoId === processo.id && p.titulo === TITULO_RMA && p.status === 'aberto',
      )
      const esperado = deferido && !ehFaseFinal(processo.faseAtual) ? 1 : 0
      expect(rmasAbertos, processo.id).toHaveLength(esperado)
    }
  })

  it('com hoje = DATA_BASE, todo RMA vence no dia 15', () => {
    const rmas = t.prazos.filter((p) => p.titulo === TITULO_RMA)
    expect(rmas.length).toBeGreaterThan(0)
    for (const rma of rmas) expect(rma.vencimento.slice(8)).toBe('15')
  })
})

describe('SED-07 · logs coerentes', () => {
  it('referenciam registros existentes e usuários do escritório com permissão', () => {
    const usuarios = porId(t.usuarios)
    const processos = porId(t.processos)
    expect(t.logs.length).toBeGreaterThan(100)
    for (const log of t.logs) {
      const registros = t[log.colecao] as { id: string; criadoEm: string }[]
      const registro = registros.find((r) => r.id === log.registroId)
      expect(registro, `${log.colecao} ${log.registroId}`).toBeDefined()
      if (log.acao === 'criou') expect(log.data).toBe(registro?.criadoEm)
      if (log.processoId !== undefined) expect(processos.has(log.processoId)).toBe(true)
      const usuario = usuarios.get(log.usuarioId)
      expect(usuario?.escritorioId).toBe(t.escritorios[0]?.id)
      const { modulo, log: temLog } = COLECOES[log.colecao]
      expect(temLog, log.colecao).toBe(true)
      if (usuario) expect(pode(usuario.papel, 'editar', modulo)).toBe(true)
    }
  })

  it('cobrem os últimos ~60 dias, em ordem, sem nada no futuro (RF-43)', () => {
    const datas = t.logs.map((l) => l.data.slice(0, 10))
    expect([...datas].sort()).toEqual(datas)
    const primeiro = datas[0] ?? HOJE
    const ultimo = datas.at(-1) ?? HOJE
    expect(diasEntre(primeiro, HOJE)).toBeGreaterThanOrEqual(50)
    expect(diasEntre(primeiro, HOJE)).toBeLessThanOrEqual(60)
    expect(ultimo < HOJE).toBe(true)
  })
})

describe('integridade entre coleções', () => {
  it('vínculos apontam para registros do mesmo processo', () => {
    const processos = porId(t.processos)
    const empresas = porId(t.empresas)
    const credores = porId(t.credores)
    const agcs = porId(t.agcs)
    for (const v of t.processoEmpresas) {
      expect(processos.has(v.processoId) && empresas.has(v.empresaId)).toBe(true)
    }
    for (const tabela of ['marcosDeFase', 'prazos', 'credores', 'agcs', 'informes'] as const) {
      for (const r of t[tabela] as { processoId: string }[]) {
        expect(processos.has(r.processoId), tabela).toBe(true)
      }
    }
    for (const pedido of t.pedidosDeCredito) {
      if (pedido.credorId) expect(credores.get(pedido.credorId)?.processoId).toBe(pedido.processoId)
    }
    for (const r of [...t.presencas, ...t.votos]) {
      expect(credores.get(r.credorId)?.processoId).toBe(agcs.get(r.agcId)?.processoId)
    }
  })

  it('votos só de presentes com direito a voto, e resultado coerente com a fase', () => {
    for (const agc of t.agcs.filter((a) => a.status === 'encerrada')) {
      const credores = t.credores.filter((c) => c.processoId === agc.processoId)
      const votantes = credoresVotantes(credores)
      const idsVotantes = new Set(votantes.map((v) => v.credorId))
      const presentes = t.presencas.filter((p) => p.agcId === agc.id).map((p) => p.credorId)
      const votos: Tipos['votos'][] = t.votos.filter((v) => v.agcId === agc.id)
      for (const id of presentes) expect(idsVotantes.has(id)).toBe(true)
      expect(new Set(votos.map((v) => v.credorId))).toEqual(new Set(presentes))

      const resultado = resultadoAgc(votantes, presentes, votos).situacao
      const fases = t.marcosDeFase.filter((m) => m.processoId === agc.processoId).map((m) => m.fase)
      if (fases.includes('plano-homologado')) expect(['aprovado', 'cram-down']).toContain(resultado)
      if (fases.includes('convolada-falencia')) expect(resultado).toBe('rejeitado')
    }
  })

  it('todo anexo do seed existe em public/anexos', () => {
    const caminhos = new Set(
      t.informes.flatMap((i) => i.anexos.map((a) => (a.origem === 'publico' ? a.caminho : ''))),
    )
    expect(caminhos.size).toBeGreaterThanOrEqual(6)
    for (const caminho of caminhos) {
      expect(existsSync(join(RAIZ, 'public', caminho)), caminho).toBe(true)
    }
  })
})
