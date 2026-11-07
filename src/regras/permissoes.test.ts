import { describe, expect, it } from 'vitest'
import { ACOES, type Acao, MODULOS, type Modulo, PAPEIS, type Papel, pode } from './permissoes'

// Tabela do RF-39 escrita à mão, independente da constante PERMISSOES.
// Cada célula: [ler, editar].
const esperado: Record<Modulo, Record<Papel, [boolean, boolean]>> = {
  dashboard: { aj: [true, false], advogado: [true, false], analista: [true, false] },
  processos: { aj: [true, true], advogado: [true, true], analista: [true, false] },
  empresas: { aj: [true, true], advogado: [true, true], analista: [true, false] },
  informes: { aj: [true, true], advogado: [true, true], analista: [true, false] },
  prazos: { aj: [true, true], advogado: [true, true], analista: [true, false] },
  credores: { aj: [true, true], advogado: [true, true], analista: [true, true] },
  agc: { aj: [true, true], advogado: [true, true], analista: [true, false] },
  usuarios: { aj: [true, true], advogado: [true, false], analista: [false, false] },
  logs: { aj: [true, false], advogado: [true, false], analista: [true, false] },
}

const casos: [Papel, Acao, Modulo, boolean][] = PAPEIS.flatMap((papel) =>
  MODULOS.flatMap((modulo) =>
    ACOES.map((acao, i): [Papel, Acao, Modulo, boolean] => [
      papel,
      acao,
      modulo,
      esperado[modulo][papel][i],
    ]),
  ),
)

describe('pode (RF-39)', () => {
  it('cobre os 3 papéis × 9 módulos × 2 ações', () => {
    expect(casos).toHaveLength(3 * 9 * 2)
  })

  it.each(casos)('pode(%s, %s, %s) = %s', (papel, acao, modulo, resultado) => {
    expect(pode(papel, acao, modulo)).toBe(resultado)
  })

  it('PER-07 · analista lê logs, histórico e dashboard', () => {
    expect(pode('analista', 'ler', 'logs')).toBe(true)
    expect(pode('analista', 'ler', 'dashboard')).toBe(true)
  })

  it('PER-03 · analista edita credores, mas não processos', () => {
    expect(pode('analista', 'editar', 'credores')).toBe(true)
    expect(pode('analista', 'editar', 'processos')).toBe(false)
  })

  it('PER-06 · advogado lê usuários sem editar; analista nem lê', () => {
    expect(pode('advogado', 'ler', 'usuarios')).toBe(true)
    expect(pode('advogado', 'editar', 'usuarios')).toBe(false)
    expect(pode('analista', 'ler', 'usuarios')).toBe(false)
  })

  it('ninguém edita logs (o log é gravado pelo repositório)', () => {
    for (const papel of PAPEIS) expect(pode(papel, 'editar', 'logs')).toBe(false)
  })
})
