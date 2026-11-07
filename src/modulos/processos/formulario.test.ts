// Schema e conversões do formulário de processo (RF-12, PRC-14, INV-03).
import { describe, expect, it } from 'vitest'
import { CNJ_RJ, seedMini } from '../../../tests/fixtures/seed-mini'
import { formatarCnj } from '../../regras/documentos'
import {
  type EntradaFormulario,
  lerCentavos,
  lerPercentual,
  paraDadosProcesso,
  paraFormulario,
  schemaFormularioNovoProcesso,
  schemaFormularioProcesso,
} from './formulario'

function valores(mudancas: Partial<EntradaFormulario> = {}): EntradaFormulario {
  return {
    apelido: 'Grupo Novo',
    numeroCnj: formatarCnj(CNJ_RJ),
    tipo: 'rj',
    comarca: 'Campinas',
    uf: 'SP',
    vara: '1ª Vara Empresarial',
    email: '',
    consolidacao: 'nenhuma',
    responsavelId: 'usr-aj',
    dataInicio: '2026-11-02',
    passivoDeclarado: '1.234.567,89',
    honorariosPercentual: '2,5',
    honorariosValor: '',
    empresaIds: ['emp-01'],
    ...mudancas,
  }
}

function errosDe(entrada: EntradaFormulario, schema = schemaFormularioNovoProcesso) {
  const resultado = schema.safeParse(entrada)
  return resultado.success
    ? {}
    : Object.fromEntries(resultado.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('lerCentavos', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['1234,5', 123450],
    ['1234', 123400],
    ['R$ 1.234,56', 123456],
    ['0,01', 1],
    ['50.000.000,00', 5_000_000_000],
  ])('%s → %i centavos', (texto, centavos) => {
    expect(lerCentavos(texto)).toBe(centavos)
  })

  it.each(['', 'abc', '1,234', '1.23,00', '12,345', '-5'])('%s é inválido', (texto) => {
    expect(lerCentavos(texto)).toBeNull()
  })
})

describe('lerPercentual', () => {
  it('aceita vírgula, até 100', () => {
    expect(lerPercentual('2,5')).toBe(2.5)
    expect(lerPercentual('100')).toBe(100)
    expect(lerPercentual('101')).toBeNull()
    expect(lerPercentual('2.5')).toBeNull()
  })
})

describe('schema do formulário de processo', () => {
  it('valores válidos viram o registro em centavos e dígitos', () => {
    const saida = schemaFormularioNovoProcesso.parse(valores())
    expect(paraDadosProcesso(saida)).toMatchObject({
      numeroCnj: CNJ_RJ,
      passivoDeclarado: 123456789,
      honorariosPercentual: 2.5,
      honorariosValor: null,
    })
  })

  it('PRC-14 · número CNJ com dígito verificador errado dá erro no campo', () => {
    const errado = `${CNJ_RJ.slice(0, 7)}${(Number(CNJ_RJ[7]) + 1) % 10}${CNJ_RJ.slice(8)}`
    expect(errosDe(valores({ numeroCnj: formatarCnj(errado) }))).toEqual({
      numeroCnj: 'Número CNJ inválido',
    })
  })

  it('obrigatórios, empresas, valores e data', () => {
    const erros = errosDe(
      valores({
        apelido: ' ',
        passivoDeclarado: '12,345',
        honorariosPercentual: '150',
        empresaIds: [],
        dataInicio: '',
        responsavelId: '',
      }),
    )
    expect(Object.keys(erros).sort()).toEqual([
      'apelido',
      'dataInicio',
      'empresaIds',
      'honorariosPercentual',
      'passivoDeclarado',
      'responsavelId',
    ])
  })

  it('na edição a data do primeiro marco não é pedida', () => {
    expect(errosDe(valores({ dataInicio: '' }), schemaFormularioProcesso)).toEqual({})
  })

  it.each(seedMini().processos.map((p) => [p.id, p] as const))(
    'LOG-02 · %s: paraFormulario e de volta não muda o processo',
    (_id, processo) => {
      const entrada = paraFormulario(processo, ['emp-01'])
      expect(entrada.numeroCnj).toBe(formatarCnj(processo.numeroCnj))
      const dados = paraDadosProcesso(schemaFormularioProcesso.parse(entrada), processo)
      const {
        id: _i,
        escritorioId: _e,
        criadoEm: _c,
        atualizadoEm: _a,
        faseAtual: _f,
        ...resto
      } = processo
      // Campo ausente e `undefined` valem o mesmo para o diff do log.
      expect(dados).toEqual(resto)
    },
  )
})
