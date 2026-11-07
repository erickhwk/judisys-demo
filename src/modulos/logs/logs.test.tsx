// Tela de logs renderizada em HTML com o seed mini (RF-42, LOG-03, PER-07). Os logs novos saem do
// repositório e dos serviços, como na demo; os do seed vêm com `de: null`.
import { beforeEach, describe, expect, it } from 'vitest'
import { carregarSeedMini, cpfDoCredor, ESCRITORIO_ID } from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { type ContextoGravacao, criarRepositorio } from '../../dados/repositorio'
import type { Log } from '../../dados/schemas'
import { excluirProcesso } from '../../dados/servicos/exclusoes'
import type { Papel } from '../../regras/permissoes'
import { renderizarComDados } from '../credores/renderizarParaTeste'
import { TelaLogs } from './TelaLogs'

let armazenamento: ArmazenamentoMemoria

beforeEach(async () => {
  armazenamento = new ArmazenamentoMemoria()
  await carregarSeedMini(armazenamento)
})

function contexto(agora: string): ContextoGravacao {
  return {
    usuario: { id: 'usr-adv', escritorioId: ESCRITORIO_ID },
    papel: 'advogado',
    agora: () => agora,
  }
}

function texto(html: string): string {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
}

/** Linhas do corpo da tabela de logs, como texto, na ordem da tela. */
function linhas(html: string): string[] {
  const corpo = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'))
  return corpo
    .split('<tr>')
    .slice(1)
    .map((linha) => texto(linha).trim())
}

const tela = (caminho = '/', papel: Papel = 'aj') =>
  renderizarComDados(<TelaLogs />, { armazenamento, papel, caminho })

describe('TelaLogs', () => {
  it('PER-07 · analista vê os logs, com link para o registro que existe', async () => {
    const html = await tela('/', 'analista')
    expect(texto(html)).toContain('Mostrando 1–1 de 1')
    expect(linhas(html)[0]).toContain('Helena Prado Criou processo Grupo Aurora')
    expect(html).toContain('href="/processos/prc-001/visao-geral"')
    expect(texto(html)).toContain('Abrir processo')
  })

  it('LOG-03 · registro excluído: "Registro não existe mais" no lugar do link', async () => {
    const repo = criarRepositorio(armazenamento, 'credores', contexto('2026-11-06T09:00:00'))
    const credor = await repo.criar({
      processoId: 'prc-001',
      nome: 'Credor Passageiro',
      documento: cpfDoCredor(901),
      classe: 'quirografario',
      natureza: '',
      valorDevedor: 1_000_00,
    })
    await criarRepositorio(armazenamento, 'credores', contexto('2026-11-06T09:05:00')).excluir(
      credor.id,
    )

    const html = await tela('/?modulo=credores')
    const [excluiu, criou] = linhas(html)
    expect(excluiu).toContain('Otávio Reis Excluiu credor Grupo Aurora')
    expect(excluiu).toContain('Nome: Credor Passageiro')
    expect(excluiu).toContain('Registro não existe mais')
    expect(criou).toContain('Criou credor')
    expect(criou).toContain('Registro não existe mais')
    expect(html).not.toContain(`/credores/${credor.id}"`)
  })

  it('LOG-03 · processo excluído: cascata contada e o processo marcado como excluído', async () => {
    await excluirProcesso(armazenamento, contexto('2026-11-06T09:00:00'))('prc-002')
    const html = await tela('/?processo=prc-002')
    const [exclusao] = linhas(html)
    expect(exclusao).toContain('Excluiu processo Processo excluído')
    expect(exclusao).toContain('Excluídos junto: marco de fase: 1')
    expect(exclusao).toContain('Registro não existe mais')
    // O filtro do processo que saiu continua visível no campo.
    expect(html).toMatch(/<option value="prc-002" selected="">Processo excluído<\/option>/)
  })

  it('RF-40 · sem link para o registro de um módulo que o papel não lê', async () => {
    await criarRepositorio(armazenamento, 'usuarios', {
      ...contexto('2026-11-06T09:00:00'),
      usuario: { id: 'usr-aj', escritorioId: ESCRITORIO_ID },
      papel: 'aj',
    }).criar({ nome: 'Nova Pessoa', email: 'nova@exemplo.test', papel: 'analista' })

    expect(texto(await tela('/?modulo=usuarios', 'aj'))).toContain('Abrir usuário')
    const doAnalista = await tela('/?modulo=usuarios', 'analista')
    expect(linhas(doAnalista)[0]).toContain('Criou usuário')
    expect(texto(doAnalista)).not.toContain('Abrir usuário')
    expect(doAnalista).not.toContain('href="/usuarios"')
  })

  it('mudanças campo a campo; "de" null (seed) ou ausente (demo) aparece como vazio', async () => {
    const editado: Log = {
      id: 'log-002',
      escritorioId: ESCRITORIO_ID,
      criadoEm: '2026-11-02T10:00:00',
      atualizadoEm: '2026-11-02T10:00:00',
      usuarioId: 'usr-adv',
      acao: 'editou',
      colecao: 'credores',
      registroId: 'crd-0001',
      processoId: 'prc-001',
      mudancas: [
        { campo: 'valorAj', de: null, para: 120_000 },
        { campo: 'valorQgc', de: undefined, para: 130_000 },
        { campo: 'nome', de: 'Jose', para: 'José' },
      ],
      data: '2026-11-02T10:00:00',
    }
    await armazenamento.put('logs', editado)
    const html = await tela('/?modulo=credores')
    const [linha] = linhas(html)
    expect(linha).toContain('Valor (AJ): vazio → para R$ 1.200,00')
    expect(linha).toContain('Valor (QGC): vazio → para R$ 1.300,00')
    expect(linha).toContain('Nome: Jose → para José')
    expect(html).toContain('href="/processos/prc-001/credores/crd-0001"')
  })

  it('LOG-04 · filtros por usuário, módulo, processo e período, na URL', async () => {
    const repo = criarRepositorio(armazenamento, 'empresas', contexto('2026-11-03T15:00:00'))
    await repo.atualizar('emp-01', { cidade: 'Sumaré' })

    const todos = await tela()
    expect(texto(todos)).toContain('Mostrando 1–2 de 2')
    // Do mais novo ao mais antigo.
    expect(linhas(todos)[0]).toContain('Editou empresa')

    expect(texto(await tela('/?usuario=usr-aj'))).toContain('Mostrando 1–1 de 1')
    expect(texto(await tela('/?modulo=empresas'))).toContain('Cidade: Campinas → para Sumaré')
    expect(texto(await tela('/?processo=prc-001'))).toContain('Criou processo')
    expect(texto(await tela('/?de=2026-11-02&ate=2026-11-03'))).toContain('Mostrando 1–1 de 1')
    expect(texto(await tela('/?de=2026-11-04'))).toContain('Nenhum log encontrado')
    // Filtro na URL vem marcado no campo.
    expect(await tela('/?modulo=empresas')).toMatch(/<option value="empresas" selected="">/)
  })
})
