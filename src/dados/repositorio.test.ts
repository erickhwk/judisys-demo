// Repositório genérico nas duas implementações de Armazenamento (PRD §10, SDD §10).
import { beforeEach, describe, expect, it } from 'vitest'
import { IMPLEMENTACOES } from '../../tests/fixtures/armazenamentos'
import {
  CNJ_RJ,
  CREDORES_RJ,
  carregarSeedMini,
  cpfDoCredor,
  ESCRITORIO_ID,
} from '../../tests/fixtures/seed-mini'
import { completarCnpj, formatarCnj, formatarCnpj, formatarCpf } from '../regras/documentos'
import { normalizar } from '../regras/normalizar'
import type { Papel } from '../regras/permissoes'
import type { Armazenamento } from './armazenamento'
import {
  AVISO_DOCUMENTO_EXISTENTE,
  COLECOES,
  type ContextoGravacao,
  criarRepositorio,
  ErroNaoEncontrado,
  ErroPermissao,
  ErroValidacao,
} from './repositorio'
import type { Log, Novo, Tipos } from './schemas'

const AGORA = '2026-11-07T10:00:00'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function contexto(papel: Papel = 'aj', usuarioId = 'usr-aj'): ContextoGravacao {
  return { usuario: { id: usuarioId, escritorioId: ESCRITORIO_ID }, papel, agora: () => AGORA }
}

const NOVO_CREDOR: Novo<Tipos['credores']> = {
  processoId: 'prc-001',
  nome: 'Ítalo Barros',
  documento: cpfDoCredor(500),
  classe: 'quirografario',
  natureza: 'Serviços',
  valorDevedor: 1_000_00,
  valorAj: 1_200_00,
}

describe.each(IMPLEMENTACOES)('repositório sobre %s', (_nome, criar) => {
  let armazenamento: Armazenamento
  const logs = () => armazenamento.todos<Log>('logs')
  // O seed mini já traz um log; os testes olham só os novos.
  const logsNovos = async () => (await logs()).filter((log) => log.id !== 'log-001')

  beforeEach(async () => {
    armazenamento = criar()
    await carregarSeedMini(armazenamento)
  })

  describe('criar', () => {
    it('preenche id (UUID, T-21), escritorioId e carimbos do contexto', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const criado = await credores.criar(NOVO_CREDOR)
      expect(criado.id).toMatch(UUID)
      expect(criado).toMatchObject({
        ...NOVO_CREDOR,
        escritorioId: ESCRITORIO_ID,
        criadoEm: AGORA,
        atualizadoEm: AGORA,
      })
      expect(await credores.buscar(criado.id)).toEqual(criado)
    })

    it('ignora id e carimbos vindos de quem chama', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const criado = await credores.criar({
        ...NOVO_CREDOR,
        id: 'crd-0001',
        criadoEm: '2000-01-01T00:00',
      } as Novo<Tipos['credores']>)
      expect(criado.id).not.toBe('crd-0001')
      expect(criado.criadoEm).toBe(AGORA)
      expect((await credores.buscar('crd-0001'))?.nome).toBe('José Conceição')
    })

    it('grava log "criou" com usuário, coleção, processo e os campos (INV-01)', async () => {
      const criado = await criarRepositorio(armazenamento, 'credores', contexto()).criar(
        NOVO_CREDOR,
      )
      const [log] = await logsNovos()
      expect(log).toMatchObject({
        usuarioId: 'usr-aj',
        acao: 'criou',
        colecao: 'credores',
        registroId: criado.id,
        processoId: 'prc-001',
        data: AGORA,
      })
      expect(log?.mudancas).toContainEqual({ campo: 'valorAj', de: undefined, para: 1_200_00 })
      expect(log?.mudancas.map((m) => m.campo)).not.toContain('id')
    })

    it('processo: o log aponta para o próprio processo', async () => {
      const processos = criarRepositorio(armazenamento, 'processos', contexto())
      const original = await processos.buscar('prc-001')
      if (!original) throw new Error('seed sem prc-001')
      const { id: _i, escritorioId: _e, criadoEm: _c, atualizadoEm: _a, ...dados } = original
      const criado = await processos.criar({ ...dados, apelido: 'Outro' })
      expect((await logsNovos())[0]?.processoId).toBe(criado.id)
    })

    it('presença: o processo do log vem da AGC', async () => {
      const presencas = criarRepositorio(armazenamento, 'presencas', contexto())
      await presencas.criar({ agcId: 'agc-001', credorId: 'crd-0005' })
      expect((await logsNovos())[0]).toMatchObject({ colecao: 'presencas', processoId: 'prc-001' })
    })

    it('processoEmpresas não grava log próprio (SDD §5.4)', async () => {
      const vinculos = criarRepositorio(armazenamento, 'processoEmpresas', contexto())
      await vinculos.criar({ processoId: 'prc-001', empresaId: 'emp-02' })
      expect(await logsNovos()).toEqual([])
    })
  })

  describe('atualizar', () => {
    it('LOG-01 · edição grava log com de/para', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto('analista', 'usr-ana'))
      const atualizado = await credores.atualizar('crd-0003', { valorAj: 5_000_00 })
      expect(atualizado).toMatchObject({ valorAj: 5_000_00, atualizadoEm: AGORA })
      expect(atualizado.criadoEm).toBe('2026-11-01T10:00:00')
      expect(await logsNovos()).toEqual([
        expect.objectContaining({
          usuarioId: 'usr-ana',
          acao: 'editou',
          colecao: 'credores',
          registroId: 'crd-0003',
          processoId: 'prc-001',
          mudancas: [{ campo: 'valorAj', de: 330_00, para: 5_000_00 }],
          data: AGORA,
        }),
      ])
    })

    it('LOG-02 · edição sem mudança não grava log nem muda atualizadoEm', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const antes = await credores.buscar('crd-0003')
      // Mesmo CPF com pontuação: depois de normalizado pelo schema, não é mudança.
      const depois = await credores.atualizar('crd-0003', {
        nome: antes?.nome,
        documento: formatarCpf(antes?.documento ?? ''),
      })
      expect(depois).toEqual(antes)
      expect(await credores.buscar('crd-0003')).toEqual(antes)
      expect(await logsNovos()).toEqual([])
    })

    it('LOG-05 · validação falha: nada gravado e nenhum log', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const antes = await credores.buscar('crd-0003')
      const erro = await credores
        .atualizar('crd-0003', { documento: '123.456.789-00', valorAj: 1 })
        .catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas).toEqual([
        { campo: 'documento', mensagem: 'CPF ou CNPJ inválido' },
      ])
      expect(await credores.buscar('crd-0003')).toEqual(antes)
      expect(await logsNovos()).toEqual([])
    })

    it('LOG-05 · criar inválido: nada gravado e nenhum log', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      await expect(credores.criar({ ...NOVO_CREDOR, valorDevedor: 0.5 })).rejects.toBeInstanceOf(
        ErroValidacao,
      )
      expect(await credores.todos({ onde: { nome: 'Ítalo Barros' } })).toEqual([])
      expect(await logsNovos()).toEqual([])
    })

    it('registro inexistente: ErroNaoEncontrado', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      await expect(credores.atualizar('nao-existe', { nome: 'X' })).rejects.toBeInstanceOf(
        ErroNaoEncontrado,
      )
    })
  })

  describe('excluir', () => {
    it('remove e grava log "excluiu" com os valores que saíram', async () => {
      const prazos = criarRepositorio(armazenamento, 'prazos', contexto())
      await prazos.excluir('prz-001')
      expect(await prazos.buscar('prz-001')).toBeUndefined()
      const [log] = await logsNovos()
      expect(log).toMatchObject({ acao: 'excluiu', colecao: 'prazos', registroId: 'prz-001' })
      expect(log?.processoId).toBe('prc-001')
      expect(log?.mudancas).toContainEqual({
        campo: 'titulo',
        de: 'Objeções ao plano',
        para: undefined,
      })
    })

    it('registro inexistente: ErroNaoEncontrado e nenhum log', async () => {
      const prazos = criarRepositorio(armazenamento, 'prazos', contexto())
      await expect(prazos.excluir('nao-existe')).rejects.toBeInstanceOf(ErroNaoEncontrado)
      expect(await logsNovos()).toEqual([])
    })
  })

  describe('unicidade (AJ-03)', () => {
    const NOVA_EMPRESA: Novo<Tipos['empresas']> = {
      razaoSocial: 'Arara Vermelha Comércio Ltda.',
      nomeFantasia: 'Arara',
      cnpj: completarCnpj('778889990001'),
      porte: 'me',
      cidade: 'Sorocaba',
      uf: 'SP',
      cnae: '',
    }
    const cnpjDe = async (id: string) =>
      (await armazenamento.get<Tipos['empresas']>('empresas', id))?.cnpj ?? ''

    it('AJ-03 · criar empresa com CNPJ de outra (com pontuação): recusado no campo, nada gravado', async () => {
      const empresas = criarRepositorio(armazenamento, 'empresas', contexto())
      const erro = await empresas
        .criar({ ...NOVA_EMPRESA, cnpj: formatarCnpj(await cnpjDe('emp-01')) })
        .catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas).toEqual([
        { campo: 'cnpj', mensagem: 'Já existe empresa com este CNPJ' },
      ])
      expect(await empresas.todos({ onde: { razaoSocial: NOVA_EMPRESA.razaoSocial } })).toEqual([])
      expect(await logsNovos()).toEqual([])
    })

    it('AJ-03 · criar empresa com CNPJ novo continua permitido', async () => {
      const empresas = criarRepositorio(armazenamento, 'empresas', contexto())
      const criada = await empresas.criar(NOVA_EMPRESA)
      expect(criada.cnpj).toBe(NOVA_EMPRESA.cnpj)
    })

    it('AJ-03 · editar empresa para o CNPJ de outra: recusado no campo, nada gravado', async () => {
      const empresas = criarRepositorio(armazenamento, 'empresas', contexto())
      const antes = await empresas.buscar('emp-02')
      const erro = await empresas
        .atualizar('emp-02', { cnpj: await cnpjDe('emp-01'), cidade: 'Itu' })
        .catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas).toEqual([
        { campo: 'cnpj', mensagem: 'Já existe empresa com este CNPJ' },
      ])
      expect(await empresas.buscar('emp-02')).toEqual(antes)
      expect(await logsNovos()).toEqual([])
    })

    it('AJ-03 · editar a própria empresa sem mudar o CNPJ continua permitido', async () => {
      const empresas = criarRepositorio(armazenamento, 'empresas', contexto())
      const cnpj = await cnpjDe('emp-01')
      const atualizada = await empresas.atualizar('emp-01', {
        cnpj: formatarCnpj(cnpj),
        cidade: 'Jundiaí',
      })
      expect(atualizada).toMatchObject({ cnpj, cidade: 'Jundiaí' })
    })

    it('AJ-03 · empresa que já repetia o CNPJ (dado antigo) continua editável em outros campos', async () => {
      const empresas = criarRepositorio(armazenamento, 'empresas', contexto())
      const original = await armazenamento.get<Tipos['empresas']>('empresas', 'emp-01')
      if (!original) throw new Error('seed sem emp-01')
      await armazenamento.put('empresas', { ...original, id: 'emp-copia' })
      const atualizada = await empresas.atualizar('emp-copia', { cidade: 'Itu' })
      expect(atualizada.cidade).toBe('Itu')
    })

    it('chave: compara pela forma normalizada, mesmo com o valor gravado diferente', async () => {
      const config = COLECOES.credores
      const original = config.unicos
      config.unicos = [
        {
          campo: 'nome',
          escopo: 'processoId',
          chave: (valor) => normalizar(String(valor)),
          mensagem: 'Nome repetido',
        },
      ]
      try {
        const credores = criarRepositorio(armazenamento, 'credores', contexto())
        await credores.criar(NOVO_CREDOR)
        const erro = await credores
          .criar({ ...NOVO_CREDOR, nome: 'italo barros', documento: cpfDoCredor(501) })
          .catch((e: unknown) => e)
        expect((erro as ErroValidacao).problemas).toEqual([
          { campo: 'nome', mensagem: 'Nome repetido' },
        ])
      } finally {
        config.unicos = original
      }
    })
  })

  describe('documento único entre credores do processo e da classe (AJ-04)', () => {
    const documentoDe = async (id: string) =>
      (await armazenamento.get<Tipos['credores']>('credores', id))?.documento ?? ''
    const problemaNoDocumento = [{ campo: 'documento', mensagem: AVISO_DOCUMENTO_EXISTENTE }]

    // No seed-mini, crd-0001 é trabalhista e crd-0002, garantia real, ambos de prc-001.
    it('AJ-04 · criar credor com CPF de outro da mesma classe do processo (com pontuação): recusado no campo, nada gravado', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const documento = formatarCpf(await documentoDe('crd-0001'))
      const erro = await credores
        .criar({ ...NOVO_CREDOR, classe: 'trabalhista', documento })
        .catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas).toEqual(problemaNoDocumento)
      expect(await credores.todos({ onde: { nome: NOVO_CREDOR.nome } })).toEqual([])
      expect(await logsNovos()).toEqual([])
    })

    it('AJ-04 · o mesmo documento em outra classe do mesmo processo é permitido (art. 41)', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const documento = await documentoDe('crd-0001')
      const criado = await credores.criar({ ...NOVO_CREDOR, classe: 'quirografario', documento })
      expect(criado).toMatchObject({ processoId: 'prc-001', classe: 'quirografario', documento })
    })

    it('AJ-04 · o mesmo documento em outro processo continua permitido', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const documento = await documentoDe('crd-0001')
      const criado = await credores.criar({ ...NOVO_CREDOR, processoId: 'prc-002', documento })
      expect(criado).toMatchObject({ processoId: 'prc-002', documento })
    })

    it('AJ-04 · editar credor para o documento de outro da mesma classe do processo: recusado no campo, nada gravado', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const antes = await credores.buscar('crd-0002')
      const erro = await credores
        .atualizar('crd-0002', {
          documento: await documentoDe('crd-0001'),
          classe: 'trabalhista',
          natureza: 'Outra',
        })
        .catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas).toEqual(problemaNoDocumento)
      expect(await credores.buscar('crd-0002')).toEqual(antes)
      expect(await logsNovos()).toEqual([])
    })

    it('AJ-04 · editar credor para o documento de outro, mantendo outra classe, é permitido', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const documento = await documentoDe('crd-0001')
      const atualizado = await credores.atualizar('crd-0002', { documento })
      expect(atualizado).toMatchObject({ documento, classe: 'garantia-real' })
    })

    it('AJ-04 · trocar só a classe para uma em que o mesmo documento já tem credor: recusado', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const documento = await documentoDe('crd-0001')
      const segundo = await credores.criar({ ...NOVO_CREDOR, classe: 'quirografario', documento })
      const erro = await credores
        .atualizar(segundo.id, { classe: 'trabalhista' })
        .catch((e: unknown) => e)
      expect(erro).toBeInstanceOf(ErroValidacao)
      expect((erro as ErroValidacao).problemas).toEqual(problemaNoDocumento)
      expect((await credores.buscar(segundo.id))?.classe).toBe('quirografario')
    })

    it('AJ-04 · editar o próprio credor sem mudar o documento continua permitido', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const documento = await documentoDe('crd-0001')
      const atualizado = await credores.atualizar('crd-0001', {
        documento: formatarCpf(documento),
        natureza: 'Outra',
      })
      expect(atualizado).toMatchObject({ documento, natureza: 'Outra' })
    })

    it('AJ-04 · credor que já repetia o documento no processo (seed) continua editável em outros campos', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto())
      const original = await armazenamento.get<Tipos['credores']>('credores', 'crd-0001')
      if (!original) throw new Error('seed sem crd-0001')
      await armazenamento.put('credores', { ...original, id: 'crd-copia' })
      const atualizado = await credores.atualizar('crd-copia', { natureza: 'Outra' })
      expect(atualizado.natureza).toBe('Outra')
    })
  })

  describe('permissão (INV-02)', () => {
    it('PER-05 · analista não cria processo por código: nada gravado, nenhum log', async () => {
      const processos = criarRepositorio(armazenamento, 'processos', contexto('analista'))
      const original = await processos.buscar('prc-002')
      if (!original) throw new Error('seed sem prc-002')
      const { id: _i, escritorioId: _e, criadoEm: _c, atualizadoEm: _a, ...dados } = original
      await expect(processos.criar(dados)).rejects.toBeInstanceOf(ErroPermissao)
      await expect(processos.atualizar('prc-002', { apelido: 'X' })).rejects.toThrow(
        'Seu papel não permite esta ação',
      )
      await expect(processos.excluir('prc-002')).rejects.toBeInstanceOf(ErroPermissao)
      expect(await processos.todos()).toHaveLength(2)
      expect((await processos.buscar('prc-002'))?.apelido).toBe('Boreal')
      expect(await logsNovos()).toEqual([])
    })

    it('analista edita credores (RF-39)', async () => {
      const credores = criarRepositorio(armazenamento, 'credores', contexto('analista'))
      await expect(credores.criar(NOVO_CREDOR)).resolves.toMatchObject({ nome: 'Ítalo Barros' })
    })

    it('advogado não edita usuários; ninguém grava logs pelo repositório', async () => {
      const usuarios = criarRepositorio(armazenamento, 'usuarios', contexto('advogado'))
      await expect(usuarios.atualizar('usr-ana', { nome: 'X' })).rejects.toBeInstanceOf(
        ErroPermissao,
      )
      const repoLogs = criarRepositorio(armazenamento, 'logs', contexto('aj'))
      await expect(repoLogs.excluir('log-001')).rejects.toBeInstanceOf(ErroPermissao)
      expect(await logs()).toHaveLength(1)
    })
  })

  it('INV-01 · se o log falha, a gravação é desfeita', async () => {
    const comLogQuebrado: Armazenamento = {
      ...armazenamento,
      get: armazenamento.get.bind(armazenamento),
      delete: armazenamento.delete.bind(armazenamento),
      porIndice: armazenamento.porIndice.bind(armazenamento),
      todos: armazenamento.todos.bind(armazenamento),
      transacao: armazenamento.transacao.bind(armazenamento),
      limpar: armazenamento.limpar.bind(armazenamento),
      put: (tabela, registro) =>
        tabela === 'logs'
          ? Promise.reject(new Error('cota cheia'))
          : armazenamento.put(tabela, registro),
    }
    const credores = criarRepositorio(comLogQuebrado, 'credores', contexto())
    await expect(credores.atualizar('crd-0003', { valorAj: 1 })).rejects.toThrow('cota cheia')
    await expect(credores.criar(NOVO_CREDOR)).rejects.toThrow('cota cheia')
    expect((await credores.buscar('crd-0003'))?.valorAj).toBe(330_00)
    expect(await credores.todos({ busca: 'italo' })).toEqual([])
  })

  describe('listar e todos (T-14)', () => {
    const repo = () => criarRepositorio(armazenamento, 'credores', contexto())

    it('paginação de 50: página 1 com 50, página 2 com o resto', async () => {
      const filtro = { onde: { processoId: 'prc-001' } }
      const primeira = await repo().listar(filtro)
      expect(primeira).toMatchObject({ total: CREDORES_RJ, pagina: 1, paginas: 2 })
      expect(primeira.itens).toHaveLength(50)
      const segunda = await repo().listar({ ...filtro, pagina: 2 })
      expect(segunda.itens).toHaveLength(CREDORES_RJ - 50)
      expect(segunda.itens[0]?.id).toBe('crd-0051')
    })

    it('página fora do intervalo vai para a última ou a primeira', async () => {
      expect((await repo().listar({ pagina: 99 })).pagina).toBe(2)
      expect((await repo().listar({ pagina: 0 })).pagina).toBe(1)
      const vazia = await repo().listar({ onde: { processoId: 'nao-existe' } })
      expect(vazia).toEqual({ itens: [], total: 0, pagina: 1, paginas: 1 })
    })

    it('página ou porPagina inválidos (NaN) valem o padrão', async () => {
      const pagina = await repo().listar({ pagina: Number.NaN, porPagina: Number.NaN })
      expect(pagina).toMatchObject({ pagina: 1, paginas: 2, total: CREDORES_RJ + 1 })
      expect(pagina.itens).toHaveLength(50)
    })

    it('porPagina customizado', async () => {
      const pagina = await repo().listar({ porPagina: 10, pagina: 3 })
      expect(pagina).toMatchObject({ total: CREDORES_RJ + 1, paginas: 6, pagina: 3 })
      expect(pagina.itens.map((c) => c.id)[0]).toBe('crd-0021')
    })

    it('BUS-02 · busca normalizada: sem acento e minúsculas', async () => {
      const achados = await repo().todos({ busca: 'jose conceicao' })
      expect(achados.map((c) => c.nome)).toEqual(['José Conceição'])
      expect((await repo().todos({ busca: '  ANA   avila ' })).map((c) => c.id)).toEqual([
        'crd-0002',
      ])
    })

    it('busca por documento com ou sem pontuação', async () => {
      const formatado = formatarCpf(cpfDoCredor(3))
      expect((await repo().todos({ busca: formatado })).map((c) => c.id)).toEqual(['crd-0003'])
      expect((await repo().todos({ busca: cpfDoCredor(3) })).map((c) => c.id)).toEqual(['crd-0003'])
    })

    it('PRC-12 · processo pelo apelido ou pelo número CNJ com pontuação', async () => {
      const processos = criarRepositorio(armazenamento, 'processos', contexto())
      expect((await processos.todos({ busca: 'aurora' })).map((p) => p.id)).toEqual(['prc-001'])
      expect((await processos.todos({ busca: formatarCnj(CNJ_RJ) })).map((p) => p.id)).toEqual([
        'prc-001',
      ])
    })

    it('busca vazia não filtra; busca numa coleção sem campos não casa', async () => {
      expect(await repo().todos({ busca: '   ' })).toHaveLength(CREDORES_RJ + 1)
      const votos = criarRepositorio(armazenamento, 'votos', contexto())
      expect(await votos.todos({ busca: 'sim' })).toEqual([])
    })

    it('onde combina índice e campos sem índice; undefined ignora; null casa com ausente', async () => {
      const quirografarios = await repo().todos({
        onde: { processoId: 'prc-001', classe: 'quirografario', natureza: 'Fornecimento' },
      })
      expect(quirografarios).toHaveLength(11)
      expect(quirografarios.every((c) => c.classe === 'quirografario')).toBe(true)
      expect(await repo().todos({ onde: { classe: undefined } })).toHaveLength(CREDORES_RJ + 1)
      const semAj = await repo().todos({ onde: { valorAj: null } })
      expect(semAj.map((c) => c.id)).toEqual([
        'crd-0007',
        'crd-0014',
        'crd-0021',
        'crd-0028',
        'crd-0035',
        'crd-0042',
        'crd-0049',
      ])
      const pedidos = criarRepositorio(armazenamento, 'pedidosDeCredito', contexto())
      expect((await pedidos.todos({ onde: { credorId: null } })).map((p) => p.id)).toEqual([
        'ped-002',
      ])
    })

    it('ordem por texto (pt-BR), número e ausentes por último; empate pelo id', async () => {
      const porNome = await repo().todos({ ordem: { campo: 'nome', direcao: 'asc' } })
      expect(porNome.slice(0, 3).map((c) => c.nome)).toEqual([
        'Ana Ávila',
        'Bruno Souza',
        'Carla Nunes',
      ])
      const desc = await repo().todos({
        onde: { processoId: 'prc-001' },
        ordem: { campo: 'valorAj', direcao: 'desc' },
      })
      expect(desc[0]?.id).toBe('crd-0055')
      expect(desc.at(-1)?.id).toBe('crd-0049')
      expect(desc.at(-7)?.id).toBe('crd-0007')
    })

    it('sem ordem, pelo id', async () => {
      const ids = (await repo().todos()).map((c) => c.id)
      expect(ids).toEqual([...ids].sort())
    })

    it('ordem e paginação juntas', async () => {
      const pagina = await repo().listar({
        ordem: { campo: 'valorDevedor', direcao: 'desc' },
        porPagina: 2,
      })
      expect(pagina.itens.map((c) => c.id)).toEqual(['crd-1001', 'crd-0055'])
    })
  })
})
