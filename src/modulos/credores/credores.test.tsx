// Telas de credores renderizadas em HTML com o seed mini (SDD §7.5). Sem DOM: o que se confere é o
// que a tela mostra com os dados; as interações ficam no e2e (e2e/credores.spec.ts).
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { carregarSeedMini, cpfDoCredor, ESCRITORIO_ID } from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import type { Tipos } from '../../dados/schemas'
import { decidirPedido } from '../../dados/servicos/pedidos'
import { formatarMoeda } from '../../regras/datas'
import { completarCnpj } from '../../regras/documentos'
import { resumoPorClasse } from '../../regras/qgc'
import { AbaCredores } from './AbaCredores'
import { DialogoPedido } from './DialogoPedido'
import { MENSAGEM_DOCUMENTO_INVALIDO, schemaFormularioCredor } from './formularios'
import { montarQgc } from './qgc'
import { renderizarComDados } from './renderizarParaTeste'
import { TelaCredor } from './TelaCredor'
import { ConteudoQgc, TelaQgc } from './TelaQgc'

const CARIMBO = '2026-11-01T10:00:00'

function registro(id: string) {
  return { id, escritorioId: ESCRITORIO_ID, criadoEm: CARIMBO, atualizadoEm: CARIMBO }
}

/** Conta as ocorrências de `trecho` no HTML. */
function contar(html: string, trecho: string | RegExp): number {
  return html.split(trecho).length - 1
}

/** Texto do HTML sem as marcas (e com o espaço que o React põe entre trechos). */
function texto(html: string): string {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

/** Linha do quadro-resumo da classe, como texto. */
function linhaDoQuadro(html: string, classe: string): string {
  const inicio = html.indexOf(`data-classe="${classe}"`)
  if (inicio === -1) return ''
  return texto(html.slice(html.indexOf('>', inicio) + 1, html.indexOf('</tr>', inicio)))
}

let armazenamento: ArmazenamentoMemoria

beforeEach(async () => {
  armazenamento = new ArmazenamentoMemoria()
  await carregarSeedMini(armazenamento)
})

const aba = (processoId: string, papel?: 'aj' | 'analista', caminho = '/') =>
  renderizarComDados(<AbaCredores processoId={processoId} />, { armazenamento, papel, caminho })

describe('AbaCredores', () => {
  it('CRD-01 · quadro-resumo por classe (quantidade, valor, %) acima da lista; 50 por página', async () => {
    const html = await aba('prc-001')
    const credores = await armazenamento.porIndice<Tipos['credores']>(
      'credores',
      'processoId',
      'prc-001',
    )
    const resumo = resumoPorClasse(credores)

    // O quadro vem antes da tabela de credores.
    expect(html.indexOf('Quadro-resumo por classe')).toBeLessThan(
      html.indexOf('aria-label="Credores"'),
    )
    for (const linha of resumo.linhas) {
      const textoLinha = linhaDoQuadro(html, linha.classe)
      expect(textoLinha).toContain(` ${linha.quantidade} `)
      expect(textoLinha).toContain(formatarMoeda(linha.valor))
    }
    // 11 credores por classe (seed mini).
    expect(linhaDoQuadro(html, 'trabalhista')).toMatch(/^ I · Trabalhista 11 /)
    expect(linhaDoQuadro(html, 'total')).toContain(` ${resumo.total.quantidade} `)
    expect(linhaDoQuadro(html, 'total')).toContain(formatarMoeda(resumo.total.valor))
    expect(linhaDoQuadro(html, 'total')).toContain('100,00%')
    // Não sujeito à parte, sem percentual (RF-26).
    expect(linhaDoQuadro(html, 'nao-sujeito')).toContain('Não sujeito')
    expect(linhaDoQuadro(html, 'nao-sujeito')).toContain('—')

    // 55 credores, 50 na primeira página (RF-28).
    expect(texto(html)).toContain('55 credores')
    expect(contar(html, /href="\/processos\/prc-001\/credores\/crd-/)).toBe(50)
    expect(texto(html)).toContain('Página 1 de 2')
  })

  it('CRD-01 · segunda página, filtro por classe e busca por nome ou CPF', async () => {
    const segunda = await aba('prc-001', 'aj', '/?pagina=2')
    expect(contar(segunda, /href="\/processos\/prc-001\/credores\/crd-/)).toBe(5)
    expect(texto(segunda)).toContain('Página 2 de 2')

    const classe = await aba('prc-001', 'aj', '/?classe=quirografario')
    expect(texto(classe)).toContain('11 credores')
    expect(texto(classe)).not.toContain('Página 1 de')

    const nome = await aba('prc-001', 'aj', `/?busca=${encodeURIComponent('jose conceicao')}`)
    expect(texto(nome)).toContain('1 credor ')
    expect(texto(nome)).toContain('José Conceição')

    const cpf = cpfDoCredor(3)
    const formatado = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
    const documento = await aba('prc-001', 'aj', `/?busca=${encodeURIComponent(formatado)}`)
    expect(texto(documento)).toContain('1 credor ')
    expect(texto(documento)).toContain('Bruno Souza')
  })

  it('CRD-15 · falência: classes do art. 83 e extraconcursais à parte, fora do total', async () => {
    await armazenamento.put('credores', {
      ...registro('crd-1002'),
      processoId: 'prc-002',
      nome: 'Leiloeiro Oficial',
      documento: completarCnpj('556667770001'),
      classe: 'extraconcursal',
      natureza: 'Despesas da massa',
      valorDevedor: 0,
      valorAj: 80_000_00,
      valorQgc: null,
    })
    const html = await aba('prc-002')
    expect(linhaDoQuadro(html, 'tributario')).toMatch(
      /^ III · Tributário 1 R\$ 950\.000,00 100,00%/,
    )
    expect(linhaDoQuadro(html, 'extraconcursal')).toContain('Extraconcursal')
    expect(linhaDoQuadro(html, 'extraconcursal')).toContain('R$ 80.000,00')
    // O extraconcursal aparece depois do total, que não o inclui.
    expect(linhaDoQuadro(html, 'total')).toMatch(/Total concursal 1 R\$ 950\.000,00/)
    expect(html.indexOf('data-classe="extraconcursal"')).toBeGreaterThan(
      html.indexOf('data-classe="total"'),
    )
    // Filtro com as classes da falência (VI · Quirografário), sem as da RJ (ME/EPP).
    expect(html).toContain('VI · Quirografário')
    expect(html).not.toContain('ME/EPP')
  })

  it('pedido de requerente fora da lista aparece na aba com as decisões', async () => {
    const html = await aba('prc-001')
    expect(texto(html)).toContain('Pedidos de quem está fora da lista')
    expect(texto(html)).toContain('Gustavo Ferraz')
    expect(html).toContain('aria-label="Acolher impugnação de 26/10/2026"')
  })

  it('PER-03 · analista edita credores: botões de criação presentes', async () => {
    const html = await aba('prc-001', 'analista')
    expect(texto(html)).toContain('Novo credor')
    expect(texto(html)).toContain('Pedido de quem está fora da lista')
    expect(html).toContain('Acolher')
  })
})

describe('TelaCredor', () => {
  const tela = (credorId: string, processoId = 'prc-001') =>
    renderizarComDados(<TelaCredor />, {
      armazenamento,
      caminho: `/processos/${processoId}/credores/${credorId}`,
      rota: '/processos/:id/credores/:credorId',
    })

  it('CRD-02 · os três valores e a variação "+20,00%" entre devedor e AJ; QGC "—"', async () => {
    await armazenamento.put('credores', {
      ...registro('crd-0900'),
      processoId: 'prc-001',
      nome: 'Marta Quintana',
      documento: cpfDoCredor(901),
      classe: 'quirografario',
      natureza: 'Fornecimento',
      valorDevedor: 100_000_00,
      valorAj: 120_000_00,
      valorQgc: null,
    })
    const html = await tela('crd-0900')
    const valores = texto(html.slice(html.indexOf('Valores do crédito')))
    expect(valores).toMatch(
      /Relação do devedor R\$ 100\.000,00 Variação do devedor para o AJ: \+20,00% \+R\$ 20\.000,00 Relação do AJ R\$ 120\.000,00 Variação do AJ para o QGC: — QGC —/,
    )
    expect(texto(html)).toContain('III · Quirografário')
  })

  it('CRD-09 · pedido já decidido fica sem as ações; o pendente tem acolher e rejeitar', async () => {
    const pendente = await tela('crd-0002')
    expect(pendente).toContain('aria-label="Acolher impugnação de 25/10/2026"')
    expect(pendente).toContain('aria-label="Rejeitar impugnação de 25/10/2026"')

    await decidirPedido(armazenamento, {
      usuario: { id: 'usr-aj', escritorioId: ESCRITORIO_ID },
      papel: 'aj',
      agora: () => '2026-11-07T10:00:00',
    })('ped-001', 'acolhido')
    const decidido = await tela('crd-0002')
    expect(texto(decidido)).toContain('Acolhido')
    expect(decidido).not.toContain('Acolher impugnação')
    // Impugnação acolhida: valor no QGC (CRD-04).
    expect(texto(decidido)).toMatch(/QGC R\$ 300,00/)
  })

  it('credor de outro processo, ou que não existe, dá "Página não encontrada"', async () => {
    expect(texto(await tela('crd-1001'))).toContain('Página não encontrada')
    expect(texto(await tela('crd-9999'))).toContain('Página não encontrada')
  })
})

describe('DialogoPedido', () => {
  // O diálogo usa repositório e serviço só ao enviar; para renderizar basta o provider.
  async function comDados(publicada: boolean, comCredor: boolean) {
    return renderizarComDados(
      <DialogoPedido
        aberto
        aoFechar={() => {}}
        processo={{ id: 'prc-001', tipo: 'rj' }}
        publicada={publicada}
        credor={
          comCredor
            ? ((await armazenamento.get('credores', 'crd-0001')) as Tipos['credores'])
            : undefined
        }
      />,
      { armazenamento },
    )
  }

  const opcoesDeTipo = (html: string) => {
    const inicio = html.indexOf('>Tipo<')
    const select = html.slice(html.indexOf('<select', inicio), html.indexOf('</select>', inicio))
    return [...select.matchAll(/<option value="(\w*)"/g)].map((opcao) => opcao[1])
  }

  it('CRD-10 · com a relação do AJ publicada, o tipo oferecido é só "impugnação"', async () => {
    expect(opcoesDeTipo(await comDados(true, true))).toEqual(['impugnacao'])
    expect(opcoesDeTipo(await comDados(true, false))).toEqual(['impugnacao'])
    expect(opcoesDeTipo(await comDados(false, true))).toEqual(['divergencia'])
    expect(opcoesDeTipo(await comDados(false, false))).toEqual(['habilitacao'])
  })

  it('requerente fora da lista pede nome e CPF/CNPJ; pedido do credor, não', async () => {
    expect(await comDados(true, false)).toContain('CPF ou CNPJ do requerente')
    const doCredor = await comDados(true, true)
    expect(doCredor).not.toContain('CPF ou CNPJ do requerente')
    expect(texto(doCredor)).toContain('Pedido de José Conceição , credor da lista.')
  })
})

describe('QGC para impressão', () => {
  async function credoresDoRj() {
    return armazenamento.porIndice<Tipos['credores']>('credores', 'processoId', 'prc-001')
  }

  it('CRD-12 · grupos por classe, subtotais e total geral iguais ao quadro-resumo, em centavos', async () => {
    const credores = await credoresDoRj()
    const resumo = resumoPorClasse(credores)
    const qgc = montarQgc(credores)

    expect(qgc.grupos.map((grupo) => grupo.classe)).toEqual(resumo.linhas.map((l) => l.classe))
    for (const [indice, linha] of resumo.linhas.entries()) {
      expect(qgc.grupos[indice]?.subtotal).toBe(linha.valor)
      expect(qgc.grupos[indice]?.credores).toHaveLength(linha.quantidade)
    }
    expect(qgc.total).toEqual(resumo.total)
    // Não sujeito fora do QGC (RF-26).
    expect(qgc.grupos.some((grupo) => grupo.classe === 'nao-sujeito')).toBe(false)
    expect(qgc.naoSujeitos).toBe(11)

    const html = await renderizarComDados(<TelaQgc />, {
      armazenamento,
      caminho: '/processos/prc-001/qgc',
      rota: '/processos/:id/qgc',
    })
    expect(texto(html)).toContain('Quadro-geral de credores')
    expect(texto(html)).toContain('Grupo Aurora')
    expect(texto(html)).toContain('1ª Vara Empresarial · Campinas/SP')
    for (const linha of resumo.linhas) {
      const subtotal = html.slice(html.indexOf(`data-subtotal="${linha.classe}"`))
      expect(texto(subtotal.slice(0, subtotal.indexOf('</td>')))).toContain(
        formatarMoeda(linha.valor),
      )
    }
    const total = html.slice(html.indexOf('data-total="geral"'))
    expect(texto(total.slice(0, total.indexOf('</strong>')))).toContain(
      formatarMoeda(resumo.total.valor),
    )
    // Os dados não ficam dentro de <button> nem de <nav> (impressao.css esconde os dois).
    const semBotoes = html
      .replace(/<button[\s\S]*?<\/button>/g, '')
      .replace(/<nav[\s\S]*?<\/nav>/g, '')
    for (const linha of resumo.linhas) expect(semBotoes).toContain(formatarMoeda(linha.valor))
    expect(html).toContain('nao-imprimir')
  })

  it('CRD-15 · extraconcursais em bloco separado, fora do total geral', async () => {
    const processo = (await armazenamento.get('processos', 'prc-002')) as Tipos['processos']
    const credores = [
      ...(await armazenamento.porIndice<Tipos['credores']>('credores', 'processoId', 'prc-002')),
      {
        ...registro('crd-1002'),
        processoId: 'prc-002',
        nome: 'Leiloeiro Oficial',
        documento: completarCnpj('556667770001'),
        classe: 'extraconcursal' as const,
        natureza: '',
        valorDevedor: 0,
        valorAj: 80_000_00,
        valorQgc: null,
      },
    ]
    const qgc = montarQgc(credores)
    expect(qgc.total).toEqual({ quantidade: 1, valor: 950_000_00 })
    expect(qgc.extraconcursais?.subtotal).toBe(80_000_00)

    const html = renderToString(
      <MemoryRouter>
        <ConteudoQgc processo={processo} credores={credores} />
      </MemoryRouter>,
    )
    expect(texto(html)).toContain('Créditos extraconcursais (art. 84) · fora do total geral')
    expect(texto(html)).toContain('III · Tributário')
    expect(html.indexOf('data-grupo="extraconcursal"')).toBeGreaterThan(
      html.indexOf('data-total="geral"'),
    )
  })

  it('CRD-13 · soma em centavos exata (0,10 + 0,20 + 0,30 = 0,60)', () => {
    const credores = [10, 20, 30].map((valorAj, i) => ({
      ...registro(`crd-x${i}`),
      processoId: 'prc-001',
      nome: `Credor ${i}`,
      documento: cpfDoCredor(600 + i),
      classe: 'quirografario' as const,
      natureza: '',
      valorDevedor: 0,
      valorAj,
    }))
    expect(montarQgc(credores).total.valor).toBe(60)
  })
})

describe('formulário de credor', () => {
  const valido = {
    nome: 'Ítalo Barros',
    documento: cpfDoCredor(500),
    classe: 'quirografario',
    natureza: '',
    valorDevedor: '1.234,56',
    valorAj: '',
    valorQgc: '0,10',
  }

  it('converte os valores para centavos e o documento para dígitos', () => {
    const saida = schemaFormularioCredor('rj').parse(valido)
    expect(saida).toMatchObject({ valorDevedor: 123_456, valorAj: null, valorQgc: 10 })
  })

  it('CRD-16 · CPF com dígito inválido: erro no campo', () => {
    const cpf = cpfDoCredor(500)
    const invalido = `${cpf.slice(0, 10)}${(Number(cpf.at(-1)) + 1) % 10}`
    const resultado = schemaFormularioCredor('rj').safeParse({ ...valido, documento: invalido })
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues).toEqual([
      expect.objectContaining({ path: ['documento'], message: MENSAGEM_DOCUMENTO_INVALIDO }),
    ])
  })

  it('classe de falência não vale na RJ; valor inválido dá erro no campo', () => {
    const resultado = schemaFormularioCredor('rj').safeParse({
      ...valido,
      classe: 'tributario',
      valorDevedor: '12.34',
    })
    expect(resultado.error?.issues.map((issue) => issue.path[0])).toEqual([
      'classe',
      'valorDevedor',
    ])
  })
})
