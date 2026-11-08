// Cabeçalho do início renderizado em HTML (SDD do início §7.2, CAB-01 e CAB-03): data, saudação
// como `h1` e o resumo com os vencidos em destaque.
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CabecalhoInicio } from './CabecalhoInicio'

describe('CabecalhoInicio', () => {
  it('CAB-01 · "Bom dia, Otávio" no h1 e "Sábado, 7 de novembro" acima', () => {
    const html = renderToString(<CabecalhoInicio nome="Otávio Reis" hora={10} hoje="2026-11-07" />)
    expect(html).toMatch(/<h1[^>]*>Bom dia, Otávio<\/h1>/)
    expect(html.indexOf('Sábado, 7 de novembro')).toBeLessThan(html.indexOf('<h1'))
    // Sem resumo (carregando ou com erro), a linha do resumo não aparece.
    expect(html).not.toContain('data-resumo')
  })

  it('CAB-03 · vencidos em destaque, o resto da frase em seguida', () => {
    const html = renderToString(
      <CabecalhoInicio
        nome="Otávio Reis"
        hora={10}
        hoje="2026-11-07"
        resumo={{
          destaque: '3 prazos vencidos',
          resto: ', 1 vence hoje e a AGC de Grupo Lontra Azul é na sexta.',
        }}
      />,
    )
    expect(html).toMatch(
      /<p[^>]*data-resumo=""[^>]*><b[^>]*>3 prazos vencidos<\/b>, 1 vence hoje e a AGC de Grupo Lontra Azul é na sexta\.<\/p>/,
    )
  })

  it('CAB-06 · sem vencidos, não há destaque', () => {
    const html = renderToString(
      <CabecalhoInicio
        nome="Lia Campos"
        hora={19}
        hoje="2026-11-07"
        resumo={{ destaque: '', resto: 'Nenhuma pendência para hoje.' }}
      />,
    )
    expect(html).toMatch(/<h1[^>]*>Boa noite, Lia<\/h1>/)
    expect(html).not.toContain('<b')
    expect(html).toContain('Nenhuma pendência para hoje.')
  })
})
