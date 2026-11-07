// Informes e anexos (DMO-19; RF-18 a RF-21; SDD §7.11, T-09, T-30): regras do formulário e dos
// anexos, e a aba do processo e a tela do informe renderizadas com os dados do seed mini. A
// interação com o formulário (trocar categoria, escolher arquivo, baixar) fica no e2e.
import { beforeEach, describe, expect, it } from 'vitest'
import { carregarSeedMini, seedMini } from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import type { Anexo, Tipos } from '../../dados/schemas'
import type { Papel } from '../../regras/permissoes'
import { renderizarComDados } from '../../ui/renderizarParaTeste'
import { AbaInformes } from './AbaInformes'
import {
  dadosDoFormulario,
  ehPdf,
  erroDoArquivo,
  formatarTamanho,
  MENSAGEM_ARQUIVO_GRANDE,
  schemaFormularioInforme,
  valoresDoInforme,
  valoresIniciais,
} from './informes'
import { TelaInforme } from './TelaInforme'

type Informe = Tipos['informes']

const MB = 1024 * 1024
const PROCESSO = seedMini().processos[0] as Tipos['processos']
const BASE = seedMini().informes[0] as Informe

describe('formulário', () => {
  it('INF-01 · informe novo vem com a fase atual do processo, e a fase é editável', () => {
    const valores = valoresIniciais({ ...PROCESSO, faseAtual: 'agc' }, '2026-11-07')
    expect(valores).toMatchObject({ processoId: PROCESSO.id, fase: 'agc', data: '2026-11-07' })
    const editada = dadosDoFormulario({
      ...valores,
      titulo: 'Ata',
      categoria: 'atas-agc',
      fase: 'plano-apresentado',
    })
    expect(editada.fase).toBe('plano-apresentado')
    expect(valoresIniciais(undefined, '2026-11-07')).toMatchObject({ processoId: '', fase: '' })
  })

  it('INF-02 · "Data da AGC" só vale em Atas de AGC; nas outras categorias sai vazia', () => {
    const valores = {
      ...valoresIniciais(PROCESSO, '2026-11-07'),
      titulo: 'Documento',
      dataAgc: '2026-11-13',
    }
    expect(dadosDoFormulario({ ...valores, categoria: 'atas-agc' }).dataAgc).toBe('2026-11-13')
    const outra = dadosDoFormulario({ ...valores, categoria: 'editais' })
    // `undefined` explícito: na edição, trocar de categoria apaga a data que havia.
    expect('dataAgc' in outra && outra.dataAgc === undefined).toBe(true)
    expect(
      schemaFormularioInforme.safeParse({ ...valores, categoria: 'editais', dataAgc: 'x' }).success,
    ).toBe(true)
    expect(
      schemaFormularioInforme.safeParse({ ...valores, categoria: 'atas-agc', dataAgc: 'x' })
        .success,
    ).toBe(false)
  })

  it('folhas e categoria validadas; ida e volta de um informe gravado', () => {
    const valores = valoresDoInforme(BASE)
    expect(dadosDoFormulario(valores)).toMatchObject({
      processoId: BASE.processoId,
      categoria: BASE.categoria,
      folhaInicial: 120,
      folhaFinal: 124,
      publicadoNoSite: true,
    })
    const invalido = schemaFormularioInforme.safeParse({
      ...valores,
      categoria: '',
      folhaInicial: '10',
      folhaFinal: '9',
    })
    expect(invalido.error?.issues.map((i) => i.path.join('.')).sort()).toEqual([
      'categoria',
      'folhaFinal',
    ])
  })
})

describe('anexos', () => {
  it('INF-04 · arquivo acima de 10 MB é recusado na escolha', () => {
    expect(erroDoArquivo({ size: 11 * MB })).toBe(MENSAGEM_ARQUIVO_GRANDE)
    expect(MENSAGEM_ARQUIVO_GRANDE).toBe('Arquivo acima de 10 MB.')
    expect(erroDoArquivo({ size: 10 * MB })).toBeNull()
    expect(erroDoArquivo({ size: 2 * MB })).toBeNull()
  })

  it('INF-03 / INF-05 · PDF vai para o visualizador; .docx e outros tipos são baixados', () => {
    const local = (nome: string, tipo: string): Anexo => ({
      origem: 'local',
      arquivoId: 'a',
      nome,
      tipo,
      tamanho: 1,
    })
    expect(ehPdf({ origem: 'publico', caminho: 'anexos/edital.pdf', nome: 'Edital' })).toBe(true)
    expect(ehPdf(local('relatorio.pdf', 'application/pdf'))).toBe(true)
    expect(ehPdf(local('sem-tipo.PDF', ''))).toBe(true)
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    expect(ehPdf(local('parecer.docx', docx))).toBe(false)
    expect(ehPdf(local('planilha.xlsx', ''))).toBe(false)
  })

  it('tamanho legível', () => {
    expect(formatarTamanho(800)).toBe('800 B')
    expect(formatarTamanho(512 * 1024)).toBe('512 KB')
    expect(formatarTamanho(2 * MB)).toBe('2,0 MB')
  })
})

describe('telas', () => {
  let armazenamento: ArmazenamentoMemoria

  beforeEach(async () => {
    armazenamento = new ArmazenamentoMemoria()
    await carregarSeedMini(armazenamento)
    const extras: Informe[] = [
      { ...BASE, id: 'inf-antigo', titulo: 'Informe antigo', data: '2026-01-15' },
      {
        ...BASE,
        id: 'inf-recente',
        titulo: 'Informe recente',
        data: '2026-11-01',
        publicadoNoSite: false,
      },
      {
        ...BASE,
        id: 'inf-ata',
        titulo: 'Ata da AGC',
        categoria: 'atas-agc',
        fase: 'agc',
        data: '2026-10-20',
        dataAgc: '2026-10-20',
        anexos: [{ origem: 'publico', caminho: 'anexos/ata-agc.pdf', nome: 'Ata da AGC.pdf' }],
        resumo: 'Instalada em 1ª convocação.\nPlano aprovado em todas as classes.',
      },
      { ...BASE, id: 'inf-outro', processoId: 'prc-002', titulo: 'De outro processo' },
    ]
    for (const informe of extras) await armazenamento.put('informes', informe)
  })

  function aba(papel: Papel = 'aj') {
    return renderizarComDados(<AbaInformes processoId="prc-001" />, {
      armazenamento,
      papel,
      caminho: '/processos/prc-001/informes',
    })
  }

  /** Trecho do HTML da linha do informe (o título é o link; a fase pode repetir o texto). */
  function linha(html: string, titulo: string): string {
    const inicio = html.lastIndexOf('<tr', html.indexOf(`>${titulo}</a>`))
    return html.slice(inicio, html.indexOf('</tr>', inicio))
  }

  it('INF-06 · aba do processo: mais recente primeiro e selo quando publicado no site', async () => {
    const html = await aba()
    const ordem = ['Informe recente', 'Ata da AGC', 'Edital de credores', 'Informe antigo'].map(
      (titulo) => html.indexOf(`>${titulo}</a>`),
    )
    expect(ordem.every((posicao) => posicao > 0)).toBe(true)
    expect(ordem).toEqual([...ordem].sort((a, b) => a - b))
    expect(html).not.toContain('De outro processo')
    expect(linha(html, 'Edital de credores')).toContain('Publicado no site')
    expect(linha(html, 'Informe recente')).not.toContain('Publicado no site')
    expect(linha(html, 'Informe recente')).toContain('Não publicado')
    expect(html).toContain('4 informes, 3 publicados no site')
  })

  it('PER-03 · analista vê a aba sem "Novo informe"; quem edita vê o botão', async () => {
    expect(await aba('analista')).not.toContain('Novo informe')
    expect(await aba('advogado')).toContain('Novo informe')
  })

  it('T-30 · tela da ata mostra o resumo acima do PDF, no visualizador (INF-03)', async () => {
    const html = await renderizarComDados(<TelaInforme />, {
      armazenamento,
      caminho: '/informes/inf-ata',
      rota: '/informes/:id',
    })
    expect(html).toContain('Plano aprovado em todas as classes.')
    expect(html).toContain('Data da AGC')
    expect(html).toMatch(
      /<iframe[^>]*src="\/[^"]*anexos\/ata-agc\.pdf"[^>]*title="Ata da AGC\.pdf"/,
    )
    expect(html.indexOf('Resumo')).toBeLessThan(html.indexOf('<iframe'))
    expect(html).toContain('Editar')
  })

  it('tela de informe sem resumo nem data da AGC; analista não vê "Editar"', async () => {
    const html = await renderizarComDados(<TelaInforme />, {
      armazenamento,
      papel: 'analista',
      caminho: '/informes/inf-001',
      rota: '/informes/:id',
    })
    expect(html).toContain('Edital de credores')
    expect(html).not.toContain('Resumo')
    expect(html).not.toContain('Data da AGC')
    expect(html).not.toContain('Editar')
  })
})
