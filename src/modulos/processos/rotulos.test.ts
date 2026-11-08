import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOM_TIPO } from './rotulos'

// AJ-20: a pílula de tipo segue a Carteira por fase do início (INI-09).
describe('TOM_TIPO', () => {
  it('pinta RJ de azul e falência de dourado', () => {
    expect(TOM_TIPO).toEqual({ rj: 'azul', falencia: 'dourado' })
  })

  it('usa as mesmas famílias de cor da Carteira por fase', () => {
    const css = readFileSync(
      new URL('../inicio/quadros/QuadroCarteira.module.css', import.meta.url),
      'utf8',
    )
    for (const [tipo, tom] of Object.entries(TOM_TIPO)) {
      const regra = css.match(new RegExp(`\\.${tipo} \\.ocupada \\{([^}]*)\\}`))
      expect(regra?.[1]).toContain(`--cor-${tom}-`)
    }
  })
})
