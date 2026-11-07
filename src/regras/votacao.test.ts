import { describe, expect, it } from 'vitest'
import type { ClasseVotante } from './qgc'
import {
  CENARIOS,
  type CredorVotacao,
  cenario,
  cramDown,
  credoresVotantes,
  criarRng,
  instalacao,
  MENSAGEM_CENARIO_IMPOSSIVEL,
  motivoSemVoto,
  type OpcaoVoto,
  type ResultadoClasse,
  resultadoAgc,
  resultadoClasse,
  type Votante,
  type VotoLancado,
} from './votacao'

let sequencia = 0
function votante(classe: ClasseVotante, valor: number): Votante {
  sequencia += 1
  return { credorId: `crd-${sequencia}`, classe, valor }
}

/** Vários votantes da mesma classe, um por valor. */
function votantes(classe: ClasseVotante, ...valores: number[]): Votante[] {
  return valores.map((valor) => votante(classe, valor))
}

/** Votos da classe a partir de uma string: s = sim, n = não, a = abstenção, valor 100 cada. */
function votosPorCabeca(padrao: string) {
  const mapa: Record<string, OpcaoVoto> = { s: 'sim', n: 'nao', a: 'abstencao' }
  return [...padrao].map((letra) => ({ valor: 100, voto: mapa[letra] as OpcaoVoto }))
}

function votar(lista: readonly Votante[], ...opcoes: OpcaoVoto[]): VotoLancado[] {
  return lista.map((v, i) => ({ credorId: v.credorId, voto: opcoes[i] as OpcaoVoto }))
}

function todos(lista: readonly Votante[], voto: OpcaoVoto): VotoLancado[] {
  return lista.map((v) => ({ credorId: v.credorId, voto }))
}

const ids = (lista: readonly Votante[]) => lista.map((v) => v.credorId)

describe('credoresVotantes (RF-32, INV-06)', () => {
  const base = { valorAj: 1000, valorQgc: null }
  const credores: CredorVotacao[] = [
    { id: 'a', classe: 'trabalhista', ...base },
    { id: 'b', classe: 'nao-sujeito', ...base },
    { id: 'c', classe: 'quirografario', valorAj: 0, valorQgc: null },
    { id: 'd', classe: 'quirografario', valorAj: 1000, valorQgc: 0 },
    { id: 'e', classe: 'extraconcursal', ...base },
    { id: 'f', classe: 'me-epp', valorAj: 1000, valorQgc: 3000 },
    { id: 'g', classe: 'garantia-real', valorAj: null, valorQgc: null },
  ]

  it('AGC-24 · não sujeito, valor zero e extraconcursal fora dos votantes', () => {
    expect(credoresVotantes(credores)).toEqual([
      { credorId: 'a', classe: 'trabalhista', valor: 1000 },
      { credorId: 'f', classe: 'me-epp', valor: 3000 },
    ])
  })

  it('AGC-24 · motivo para a lista de presença', () => {
    const motivos = Object.fromEntries(credores.map((c) => [c.id, motivoSemVoto(c)]))
    expect(motivos).toEqual({
      a: null,
      b: 'Credor não sujeito à recuperação judicial',
      c: 'Crédito com valor zero',
      d: 'Crédito com valor zero',
      e: 'Classe sem direito a voto na AGC',
      f: null,
      g: 'Crédito com valor zero',
    })
  })
})

describe('instalacao (art. 37, §2º, C-09)', () => {
  it('AGC-03 · 1ª convocação, 60% do valor votante em todas as classes: instala', () => {
    const i = votantes('trabalhista', 600, 400)
    const ii = votantes('garantia-real', 6000, 4000)
    const iii = votantes('quirografario', 300, 300, 400)
    const iv = votantes('me-epp', 60, 40)
    const presentes = [i[0], ii[0], iii[0], iii[1], iv[0]] as Votante[]
    const r = instalacao([...i, ...ii, ...iii, ...iv], ids(presentes), 1)
    expect(r.classes.map((c) => c.situacao)).toEqual(['atinge', 'atinge', 'atinge', 'atinge'])
    expect(r.classes[2]).toMatchObject({ valorTotal: 1000, valorPresente: 600 })
    expect(r.instalada).toBe(true)
  })

  it('AGC-04 · classe III com exatamente 50% do valor: não atinge e não instala', () => {
    const i = votantes('trabalhista', 100)
    const iii = votantes('quirografario', 500, 300, 200)
    const presentes = [i[0], iii[0]] as Votante[]
    const r = instalacao([...i, ...iii], ids(presentes), 1)
    expect(r.classes.find((c) => c.classe === 'quirografario')?.situacao).toBe('nao-atinge')
    expect(r.instalada).toBe(false)
  })

  it('C-09 · base é o valor votante da classe, não só o dos presentes', () => {
    const iii = votantes('quirografario', 100, 900)
    const r = instalacao(iii, [iii[0]?.credorId as string], 1)
    expect(r.classes[2]).toMatchObject({ valorTotal: 1000, valorPresente: 100 })
    expect(r.instalada).toBe(false)
  })

  it('AGC-05 · 2ª convocação com um único presente: instala', () => {
    const lista = [...votantes('trabalhista', 100, 100), ...votantes('quirografario', 5000)]
    const r = instalacao(lista, [lista[0]?.credorId as string], 2)
    expect(r.instalada).toBe(true)
  })

  it('2ª convocação sem nenhum presente não instala', () => {
    expect(instalacao(votantes('trabalhista', 100), [], 2).instalada).toBe(false)
  })

  it('AGC-06 · classe sem credores votantes aparece "sem credores" e não bloqueia', () => {
    const lista = [...votantes('trabalhista', 100), ...votantes('quirografario', 100)]
    const r = instalacao(lista, ids(lista), 1)
    expect(r.classes.map((c) => c.situacao)).toEqual([
      'atinge',
      'sem-credores',
      'atinge',
      'sem-credores',
    ])
    expect(r.instalada).toBe(true)
  })
})

describe('resultadoClasse (art. 45, RF-35)', () => {
  it('AGC-07 · classe I: 3 sim, 2 não → aprovada por cabeça', () => {
    const r = resultadoClasse('trabalhista', votosPorCabeca('sssnn'))
    expect(r.criterio).toBe('cabeca')
    expect(r.cabeca).toEqual({ sim: 3, nao: 2, abstencao: 0 })
    expect(r.situacao).toBe('aprovada')
  })

  it('classe I por cabeça: o valor não decide', () => {
    const r = resultadoClasse('trabalhista', [
      { valor: 1, voto: 'sim' },
      { valor: 1, voto: 'sim' },
      { valor: 1000, voto: 'nao' },
    ])
    expect(r.situacao).toBe('aprovada')
  })

  it('AGC-08 · classe III: valor sim 60%, cabeça 2 de 5 → rejeitada na cabeça', () => {
    const r = resultadoClasse('quirografario', [
      { valor: 3000, voto: 'sim' },
      { valor: 3000, voto: 'sim' },
      { valor: 1500, voto: 'nao' },
      { valor: 1500, voto: 'nao' },
      { valor: 1000, voto: 'nao' },
    ])
    expect(r.maioriaValor).toBe(true)
    expect(r.maioriaCabeca).toBe(false)
    expect(r.situacao).toBe('rejeitada')
  })

  it('AGC-09 · classe II com valor sim exatamente 50% → rejeitada (empate)', () => {
    const r = resultadoClasse('garantia-real', [
      { valor: 500, voto: 'sim' },
      { valor: 300, voto: 'sim' },
      { valor: 800, voto: 'nao' },
    ])
    expect(r.maioriaCabeca).toBe(true)
    expect(r.maioriaValor).toBe(false)
    expect(r.situacao).toBe('rejeitada')
  })

  it('empate por cabeça na classe IV → rejeitada', () => {
    expect(resultadoClasse('me-epp', votosPorCabeca('ssnn')).situacao).toBe('rejeitada')
  })

  it('AGC-10 · classe I: 2 sim, 1 não, 3 abstenções → aprovada (abstenções fora da base)', () => {
    const r = resultadoClasse('trabalhista', votosPorCabeca('ssnaaa'))
    expect(r.cabeca).toEqual({ sim: 2, nao: 1, abstencao: 3 })
    expect(r.situacao).toBe('aprovada')
  })

  it('abstenções fora da base também no valor (classe III)', () => {
    const r = resultadoClasse('quirografario', [
      { valor: 400, voto: 'sim' },
      { valor: 300, voto: 'nao' },
      { valor: 10000, voto: 'abstencao' },
    ])
    expect(r.situacao).toBe('rejeitada') // 1 x 1 por cabeça
    const r2 = resultadoClasse('quirografario', [
      { valor: 400, voto: 'sim' },
      { valor: 300, voto: 'sim' },
      { valor: 600, voto: 'nao' },
      { valor: 10000, voto: 'abstencao' },
    ])
    expect(r2.maioriaValor).toBe(true)
    expect(r2.situacao).toBe('aprovada')
  })

  it('AGC-11 · classe IV: todos os presentes se abstêm → "não votou"', () => {
    expect(resultadoClasse('me-epp', votosPorCabeca('aaa')).situacao).toBe('nao-votou')
  })

  it('classe sem presentes → "não votou"; presente sem voto fica fora da base', () => {
    expect(resultadoClasse('trabalhista', []).situacao).toBe('nao-votou')
    const r = resultadoClasse('trabalhista', [
      { valor: 100, voto: 'sim' },
      { valor: 100, voto: null },
      { valor: 100, voto: null },
    ])
    expect(r).toMatchObject({ presentes: 3, semVoto: 2, situacao: 'aprovada' })
  })
})

/** Resultado de classe só por cabeça, para montar os testes de cram down. */
function classe(nome: ClasseVotante, padrao: string): ResultadoClasse {
  return resultadoClasse(nome, votosPorCabeca(padrao))
}

describe('cramDown (art. 58, §1º, C-08)', () => {
  it('AGC-12 · 4 classes, III rejeita com > 1/3 por valor e cabeça, sim > 50%: cumprido', () => {
    const iii = resultadoClasse('quirografario', [
      { valor: 400, voto: 'sim' },
      { valor: 400, voto: 'sim' },
      { valor: 500, voto: 'nao' },
      { valor: 500, voto: 'nao' },
      { valor: 200, voto: 'nao' },
    ])
    expect(iii.situacao).toBe('rejeitada')
    const r = cramDown([
      classe('trabalhista', 'sss'),
      resultadoClasse('garantia-real', [{ valor: 5000, voto: 'sim' }]),
      iii,
      classe('me-epp', 'ssn'),
    ])
    expect(r.requisitos.map((q) => q.cumprido)).toEqual([true, true, true])
    expect(r.cumprido).toBe(true)
  })

  it('requisito 1: sim exatamente 50% do valor presente (700 de 1.400) não cumpre', () => {
    const r = cramDown([
      resultadoClasse('garantia-real', [{ valor: 500, voto: 'sim' }]),
      resultadoClasse('quirografario', [
        { valor: 100, voto: 'sim' },
        { valor: 700, voto: 'nao' },
      ]),
      classe('trabalhista', 's'),
    ])
    expect(r.requisitos[0].cumprido).toBe(false)
  })

  it('AGC-13 · só 3 classes votam, 2 aprovam: requisito 2 cumprido', () => {
    const r = cramDown([
      classe('trabalhista', 'ss'),
      classe('quirografario', 'snn'),
      classe('me-epp', 's'),
      classe('garantia-real', 'aa'),
    ])
    expect(r.requisitos[1].cumprido).toBe(true)
  })

  it('AGC-14 · só 2 classes votam, 1 aprova: requisito 2 cumprido', () => {
    const r = cramDown([classe('trabalhista', 's'), classe('me-epp', 'snn')])
    expect(r.requisitos[1].cumprido).toBe(true)
  })

  it('AGC-15 · 4 classes votam, 2 aprovam: requisito 2 não cumprido', () => {
    const r = cramDown([
      classe('trabalhista', 's'),
      classe('garantia-real', 's'),
      classe('quirografario', 'snn'),
      classe('me-epp', 'snn'),
    ])
    expect(r.requisitos[1].cumprido).toBe(false)
  })

  it('uma única classe votante: requisito 2 não cumprido', () => {
    expect(cramDown([classe('me-epp', 'snn')]).requisitos[1].cumprido).toBe(false)
  })

  it('AGC-16 · classe IV rejeita com exatamente 1/3 por cabeça: requisito 3 não cumprido', () => {
    const r = cramDown([classe('trabalhista', 's'), classe('me-epp', 'snn')])
    expect(r.requisitos[2].cumprido).toBe(false)
    expect(r.requisitos[2].detalhe).toContain('IV · ME/EPP')
  })

  it('classe IV com mais de 1/3 por cabeça: requisito 3 cumprido', () => {
    expect(
      cramDown([classe('trabalhista', 's'), classe('me-epp', 'ssnnn')]).requisitos[2].cumprido,
    ).toBe(true)
  })

  it('AGC-17 · classe II com > 1/3 por cabeça e ≤ 1/3 por valor: requisito 3 não cumprido', () => {
    const ii = resultadoClasse('garantia-real', [
      { valor: 100, voto: 'sim' },
      { valor: 100, voto: 'sim' },
      { valor: 200, voto: 'nao' },
      { valor: 200, voto: 'nao' },
    ]) // cabeça 2/4 > 1/3; valor 200/600 = exatamente 1/3
    expect(ii.situacao).toBe('rejeitada')
    const r = cramDown([classe('trabalhista', 's'), ii])
    expect(r.requisitos[2].cumprido).toBe(false)
  })
})

describe('resultadoAgc', () => {
  it('AGC-18 · todas as classes votantes aprovam: aprovado, sem cram down', () => {
    const lista = [
      ...votantes('trabalhista', 100, 100),
      ...votantes('quirografario', 100),
      ...votantes('me-epp', 100),
    ]
    const r = resultadoAgc(lista, ids(lista), todos(lista, 'sim'))
    expect(r.situacao).toBe('aprovado')
    expect(r.cramDown).toBeNull()
  })

  it('AGC-11 · classe só com abstenções não conta como votante na contagem de classes', () => {
    const i = votantes('trabalhista', 100)
    const iii = votantes('quirografario', 100, 100, 100, 100)
    const iv = votantes('me-epp', 100, 100)
    const lista = [...i, ...iii, ...iv]
    const votos = [
      ...todos(i, 'sim'),
      ...votar(iii, 'sim', 'sim', 'nao', 'nao'),
      ...todos(iv, 'abstencao'),
    ]
    const r = resultadoAgc(lista, ids(lista), votos)
    expect(r.classes.find((c) => c.classe === 'me-epp')?.situacao).toBe('nao-votou')
    // 2 classes votaram, 1 aprovou; III com 2/4 > 1/3 por cabeça e por valor; sim 300 de 500.
    expect(r.situacao).toBe('cram-down')
  })

  it('rejeitado quando algum requisito falha', () => {
    const i = votantes('trabalhista', 100)
    const iii = votantes('quirografario', 100, 100, 100)
    const lista = [...i, ...iii]
    const r = resultadoAgc(lista, ids(lista), [...todos(i, 'sim'), ...todos(iii, 'nao')])
    expect(r.situacao).toBe('rejeitado')
    expect(r.cramDown?.requisitos[2].cumprido).toBe(false)
  })

  it('ausentes e não votantes não entram; sem votos: "sem-votos"', () => {
    const lista = votantes('trabalhista', 100, 100)
    expect(resultadoAgc(lista, [], todos(lista, 'sim')).situacao).toBe('sem-votos')
    expect(resultadoAgc(lista, ids(lista), []).situacao).toBe('sem-votos')
  })
})

/** Presenças no formato do processo vitrine: as quatro classes, valores variados. */
function presencasVitrine(): Votante[] {
  return [
    ...votantes('trabalhista', 1500000, 800000, 1200000, 950000, 600000, 2000000),
    ...votantes('garantia-real', 450000000, 320000000),
    ...votantes(
      'quirografario',
      12000000,
      8500000,
      31000000,
      4700000,
      9900000,
      15500000,
      2200000,
      6600000,
    ),
    ...votantes('me-epp', 3500000, 1800000, 2900000, 4100000),
  ]
}

function aplicar(presentes: Votante[], votos: VotoLancado[]) {
  return resultadoAgc(presentes, ids(presentes), votos)
}

describe('cenario (RF-34, T-29)', () => {
  it('nomes e rótulos do RF-34', () => {
    expect(CENARIOS.map((c) => c.rotulo)).toEqual([
      'Aprovação folgada',
      'Classe III rejeita',
      'Aprovação por cram down',
      'Aleatório',
      'Limpar',
    ])
  })

  it('AGC-19 · "Aprovação por cram down" com as presenças do vitrine (RNG fixo)', () => {
    const presentes = presencasVitrine()
    const r = cenario('cram-down', presentes, criarRng(42))
    if (!r.possivel) throw new Error(r.mensagem)
    expect(r.votos).toHaveLength(presentes.length)
    const resultado = aplicar(presentes, r.votos)
    expect(resultado.classes.some((c) => c.situacao === 'rejeitada')).toBe(true)
    expect(resultado.situacao).toBe('cram-down')
    expect(resultado.cramDown?.requisitos.every((q) => q.cumprido)).toBe(true)
  })

  it('AGC-19 · mesmo RNG, mesmos votos', () => {
    const presentes = presencasVitrine()
    expect(cenario('aleatorio', presentes, criarRng(7))).toEqual(
      cenario('aleatorio', presentes, criarRng(7)),
    )
  })

  it('AGC-20 · uma classe presente: cram down impossível, com a mensagem de T-29', () => {
    expect(
      cenario('cram-down', votantes('quirografario', 100, 200, 300, 400), criarRng(1)),
    ).toEqual({ possivel: false, mensagem: MENSAGEM_CENARIO_IMPOSSIVEL })
    expect(MENSAGEM_CENARIO_IMPOSSIVEL).toBe('Este cenário não é possível com as presenças atuais')
  })

  it('cram down com só classes I/IV de 3 presentes é impossível (nenhum subconjunto serve)', () => {
    const presentes = [
      ...votantes('trabalhista', 100, 100, 100),
      ...votantes('me-epp', 100, 100, 100),
    ]
    expect(cenario('cram-down', presentes, criarRng(3)).possivel).toBe(false)
  })

  it('"Aprovação folgada" aprova em todas as classes', () => {
    const presentes = presencasVitrine()
    for (const semente of [1, 2, 3, 4, 5]) {
      const r = cenario('aprovacao-folgada', presentes, criarRng(semente))
      if (!r.possivel) throw new Error(r.mensagem)
      expect(aplicar(presentes, r.votos).situacao).toBe('aprovado')
    }
  })

  it('"Classe III rejeita": III rejeitada e as demais aprovam', () => {
    const presentes = presencasVitrine()
    const r = cenario('classe-iii-rejeita', presentes, criarRng(9))
    if (!r.possivel) throw new Error(r.mensagem)
    const resultado = aplicar(presentes, r.votos)
    expect(resultado.classes.map((c) => c.situacao)).toEqual([
      'aprovada',
      'aprovada',
      'rejeitada',
      'aprovada',
    ])
    expect(resultado.situacao).toBe('rejeitado')
  })

  it('"Classe III rejeita" sem a classe III presente é impossível', () => {
    expect(cenario('classe-iii-rejeita', votantes('trabalhista', 100), criarRng(1)).possivel).toBe(
      false,
    )
  })

  it('"Aleatório" dá um voto a cada presente', () => {
    const presentes = presencasVitrine()
    const r = cenario('aleatorio', presentes, criarRng(11))
    if (!r.possivel) throw new Error(r.mensagem)
    expect(r.votos.map((v) => v.credorId)).toEqual(ids(presentes))
  })

  it('"Limpar" devolve lista vazia, mesmo sem presentes', () => {
    expect(cenario('limpar', [], criarRng(1))).toEqual({ possivel: true, votos: [] })
  })

  it('sem presentes, os demais cenários são impossíveis', () => {
    for (const nome of [
      'aprovacao-folgada',
      'classe-iii-rejeita',
      'cram-down',
      'aleatorio',
    ] as const) {
      expect(cenario(nome, [], criarRng(1)).possivel).toBe(false)
    }
  })
})
