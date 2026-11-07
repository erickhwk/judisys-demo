// Tela de usuários renderizada em HTML com o seed mini (RF-39, PER-06). As interações (criar,
// editar, excluir) ficam no e2e (e2e/usuarios-logs.spec.ts).
import { beforeEach, describe, expect, it } from 'vitest'
import { carregarSeedMini } from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { MODULOS, PAPEIS, type Papel, PERMISSOES } from '../../regras/permissoes'
import { renderizarComDados } from '../credores/renderizarParaTeste'
import { NOMES_PAPEIS } from '../entrada/papeis'
import { ROTULOS_MODULO, ROTULOS_NIVEL } from './permissoes'
import { TelaUsuarios } from './TelaUsuarios'

let armazenamento: ArmazenamentoMemoria

beforeEach(async () => {
  armazenamento = new ArmazenamentoMemoria()
  await carregarSeedMini(armazenamento)
})

function texto(html: string): string {
  return html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
}

/** Texto da linha da tabela de permissões que começa com o rótulo do módulo. */
function linhaDoModulo(html: string, rotulo: string): string {
  const tabela = html.slice(html.indexOf('aria-label="Tabela de permissões"'))
  const inicio = tabela.indexOf(`>${rotulo}<`)
  return texto(tabela.slice(inicio, tabela.indexOf('</tr>', inicio)))
}

const tela = (papel: Papel) => renderizarComDados(<TelaUsuarios />, { armazenamento, papel })

describe('TelaUsuarios', () => {
  it('PER-06 · advogado vê a lista e a tabela de permissões, sem botões de edição', async () => {
    const html = await tela('advogado')
    const conteudo = texto(html)
    expect(conteudo).toContain('3 usuários no escritório')
    for (const nome of ['Helena Prado', 'Otávio Reis', 'Lia Campos']) {
      expect(conteudo).toContain(nome)
    }
    expect(conteudo).toContain('helena@vertice.test')
    expect(conteudo).toContain('Permissões por papel')
    expect(conteudo).not.toContain('Novo usuário')
    expect(html).not.toContain('aria-label="Editar ')
    expect(html).not.toContain('aria-label="Excluir ')
    expect(conteudo).not.toContain('Ações')
  })

  it('RF-39 · a tabela de permissões sai de PERMISSOES, módulo × papel', async () => {
    const html = await tela('advogado')
    for (const papel of PAPEIS) expect(html).toContain(`>${NOMES_PAPEIS[papel]}</th>`)
    for (const modulo of MODULOS) {
      const linha = linhaDoModulo(html, ROTULOS_MODULO[modulo])
      const niveis = PAPEIS.map((papel) => ROTULOS_NIVEL[PERMISSOES[modulo][papel]])
      expect(linha).toContain(niveis.join(' '))
    }
    expect(linhaDoModulo(html, 'Usuários')).toContain('Editar Ler Sem acesso')
    expect(linhaDoModulo(html, 'Credores e pedidos de crédito')).toContain('Editar Editar Editar')
  })

  it('RF-39 · AJ cria, edita e exclui; não há excluir na própria linha (T-23)', async () => {
    const html = await tela('aj')
    expect(texto(html)).toContain('Novo usuário')
    expect(texto(html)).toContain('Helena Prado (você)')
    for (const nome of ['Helena Prado', 'Otávio Reis', 'Lia Campos']) {
      expect(html).toContain(`aria-label="Editar ${nome}"`)
    }
    expect(html).not.toContain('aria-label="Excluir Helena Prado"')
    expect(html).toContain('aria-label="Excluir Otávio Reis"')
    expect(html).toContain('aria-label="Excluir Lia Campos"')
  })
})
