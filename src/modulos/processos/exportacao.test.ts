// CSV da lista de processos sobre o seed mini (RF-44; SDD CSV-01).
import { beforeEach, describe, expect, it } from 'vitest'
import {
  CNJ_FALENCIA,
  CNJ_RJ,
  carregarSeedMini,
  ESCRITORIO_ID,
} from '../../../tests/fixtures/seed-mini'
import { ArmazenamentoMemoria } from '../../dados/memoria'
import { type ContextoGravacao, criarRepositorio } from '../../dados/repositorio'
import { formatarCnj } from '../../regras/documentos'
import { exportarProcessos, type ReposExportacao } from './exportacao'

const CONTEXTO: ContextoGravacao = {
  usuario: { id: 'usr-ana', escritorioId: ESCRITORIO_ID },
  papel: 'analista',
  agora: () => '2026-11-07T10:00:00',
}

describe('exportarProcessos', () => {
  let repos: ReposExportacao

  beforeEach(async () => {
    const armazenamento = new ArmazenamentoMemoria()
    await carregarSeedMini(armazenamento)
    repos = {
      processos: criarRepositorio(armazenamento, 'processos', CONTEXTO),
      empresas: criarRepositorio(armazenamento, 'empresas', CONTEXTO),
      processoEmpresas: criarRepositorio(armazenamento, 'processoEmpresas', CONTEXTO),
      usuarios: criarRepositorio(armazenamento, 'usuarios', CONTEXTO),
    }
  })

  it('CSV-01 · BOM, separador e nome do arquivo; CNJ com pontuação e passivo em 1234,56', async () => {
    const arquivo = await exportarProcessos(repos, {}, '2026-11-07')
    expect(arquivo.nome).toBe('judisys-processos-2026-11-07.csv')
    const [cabecalho, ...linhas] = arquivo.conteudo.split('\r\n')
    expect(cabecalho).toBe(
      '﻿Apelido;Número CNJ;Tipo;Fase;Comarca;UF;Vara;Consolidação;Passivo declarado;Responsável',
    )
    expect(linhas).toEqual([
      `Boreal;${formatarCnj(CNJ_FALENCIA)};Falência;Decretada;Sorocaba;SP;2ª Vara Cível;Nenhuma;3000000,00;Otávio Reis`,
      `Grupo Aurora;${formatarCnj(CNJ_RJ)};Recuperação judicial;Plano apresentado;Campinas;SP;1ª Vara Empresarial;Substancial;50000000,00;Helena Prado`,
      '',
    ])
  })

  it('leva o que passa nos filtros da tela (tipo, fase e busca, inclusive pela empresa)', async () => {
    const apelidos = async (filtro: Parameters<typeof exportarProcessos>[1]) =>
      (await exportarProcessos(repos, filtro, '2026-11-07')).conteudo
        .split('\r\n')
        .slice(1, -1)
        .map((linha) => linha.split(';')[0])

    expect(await apelidos({ tipo: 'rj' })).toEqual(['Grupo Aurora'])
    expect(await apelidos({ fase: 'decretada' })).toEqual(['Boreal'])
    expect(await apelidos({ busca: 'fiacao' })).toEqual(['Boreal'])
    expect(await apelidos({ busca: 'fiacao', tipo: 'rj' })).toEqual([])
  })
})
