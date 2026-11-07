// Seed pequeno para os testes de repositórios e serviços (SDD §10). Datas fixas, ids do seed
// (T-21) e documentos com dígitos verificadores válidos. Não é o seed da demo (DMO-07).
import type { Armazenamento, Tabela } from '../../src/dados/armazenamento'
import type { Tipos } from '../../src/dados/schemas'
import { completarCnj, completarCnpj, completarCpf } from '../../src/regras/documentos'

export type SeedMini = { [K in Tabela]: Tipos[K][] }

export const CARIMBO_SEED = '2026-11-01T10:00:00'
export const ESCRITORIO_ID = 'esc-1'
/** Credores do processo RJ: passa de uma página de 50 (RF-28). */
export const CREDORES_RJ = 55

const registro = (id: string) => ({
  id,
  escritorioId: ESCRITORIO_ID,
  criadoEm: CARIMBO_SEED,
  atualizadoEm: CARIMBO_SEED,
})

/** CPF válido e determinístico para o n-ésimo credor. */
export function cpfDoCredor(n: number): string {
  return completarCpf(String(123_000_000 + n))
}

export const CNJ_RJ = completarCnj('000123420268260100')
export const CNJ_FALENCIA = completarCnj('000456720258260224')

const NOMES = ['José Conceição', 'Ana Ávila', 'Bruno Souza', 'Carla Nunes', 'Débora Lima']
const CLASSES_RJ = [
  'trabalhista',
  'garantia-real',
  'quirografario',
  'me-epp',
  'nao-sujeito',
] as const

export function seedMini(): SeedMini {
  const credoresRj: Tipos['credores'][] = Array.from({ length: CREDORES_RJ }, (_, i) => {
    const n = i + 1
    const sufixo = String(n).padStart(4, '0')
    return {
      ...registro(`crd-${sufixo}`),
      processoId: 'prc-001',
      nome: n <= NOMES.length ? (NOMES[i] ?? '') : `Credor ${sufixo}`,
      documento: cpfDoCredor(n),
      classe: CLASSES_RJ[i % CLASSES_RJ.length] ?? 'quirografario',
      natureza: 'Fornecimento',
      valorDevedor: n * 100_00,
      valorAj: n % 7 === 0 ? null : n * 110_00,
      valorQgc: null,
    }
  })

  return {
    escritorios: [{ ...registro(ESCRITORIO_ID), nome: 'Vértice Administração Judicial' }],
    usuarios: [
      { ...registro('usr-aj'), nome: 'Helena Prado', email: 'helena@vertice.test', papel: 'aj' },
      {
        ...registro('usr-adv'),
        nome: 'Otávio Reis',
        email: 'otavio@vertice.test',
        papel: 'advogado',
      },
      {
        ...registro('usr-ana'),
        nome: 'Lia Campos',
        email: 'lia@vertice.test',
        papel: 'analista',
      },
    ],
    empresas: [
      {
        ...registro('emp-01'),
        razaoSocial: 'Aurora Têxtil Ltda.',
        nomeFantasia: 'Aurora',
        cnpj: completarCnpj('112223330001'),
        porte: 'demais',
        cidade: 'Campinas',
        uf: 'SP',
        cnae: '1311-1/00',
      },
      {
        ...registro('emp-02'),
        razaoSocial: 'Fiação Boreal S.A.',
        nomeFantasia: '',
        cnpj: completarCnpj('445556660001'),
        porte: 'epp',
        cidade: 'Sorocaba',
        uf: 'SP',
        cnae: '',
      },
    ],
    processos: [
      {
        ...registro('prc-001'),
        apelido: 'Grupo Aurora',
        numeroCnj: CNJ_RJ,
        tipo: 'rj',
        comarca: 'Campinas',
        uf: 'SP',
        vara: '1ª Vara Empresarial',
        email: 'aurora@vertice.test',
        consolidacao: 'substancial',
        passivoDeclarado: 50_000_000_00,
        responsavelId: 'usr-aj',
        honorariosPercentual: 2.5,
        honorariosValor: null,
        faseAtual: 'plano-apresentado',
      },
      {
        ...registro('prc-002'),
        apelido: 'Boreal',
        numeroCnj: CNJ_FALENCIA,
        tipo: 'falencia',
        comarca: 'Sorocaba',
        uf: 'SP',
        vara: '2ª Vara Cível',
        email: '',
        consolidacao: 'nenhuma',
        passivoDeclarado: 3_000_000_00,
        responsavelId: 'usr-adv',
        faseAtual: 'decretada',
      },
    ],
    processoEmpresas: [
      { ...registro('pe-001'), processoId: 'prc-001', empresaId: 'emp-01' },
      { ...registro('pe-002'), processoId: 'prc-002', empresaId: 'emp-02' },
    ],
    marcosDeFase: [
      { ...registro('mrc-001'), processoId: 'prc-001', fase: 'pedido', data: '2026-03-02' },
      {
        ...registro('mrc-002'),
        processoId: 'prc-001',
        fase: 'plano-apresentado',
        data: '2026-10-20',
      },
      { ...registro('mrc-003'), processoId: 'prc-002', fase: 'decretada', data: '2026-10-01' },
    ],
    prazos: [
      {
        ...registro('prz-001'),
        processoId: 'prc-001',
        titulo: 'Objeções ao plano',
        baseLegal: 'art. 55',
        vencimento: '2026-11-19',
        origem: 'automatico',
        status: 'aberto',
        marcoId: 'mrc-002',
      },
      {
        ...registro('prz-002'),
        processoId: 'prc-002',
        titulo: 'Reunião com o comitê',
        vencimento: '2026-11-10',
        origem: 'manual',
        status: 'cumprido',
      },
    ],
    credores: [
      ...credoresRj,
      {
        ...registro('crd-1001'),
        processoId: 'prc-002',
        nome: 'Fazenda Nacional',
        documento: completarCnpj('003945000001'),
        classe: 'tributario',
        natureza: 'Tributos federais',
        valorDevedor: 900_000_00,
        valorAj: 950_000_00,
        valorQgc: 950_000_00,
      },
    ],
    pedidosDeCredito: [
      {
        ...registro('ped-001'),
        processoId: 'prc-001',
        credorId: 'crd-0002',
        tipo: 'impugnacao',
        valorPedido: 300_00,
        classePedida: 'garantia-real',
        status: 'pendente',
        data: '2026-10-25',
      },
      {
        ...registro('ped-002'),
        processoId: 'prc-001',
        requerente: { nome: 'Gustavo Ferraz', documento: cpfDoCredor(900) },
        tipo: 'impugnacao',
        valorPedido: 1_500_00,
        classePedida: 'quirografario',
        status: 'pendente',
        data: '2026-10-26',
      },
    ],
    agcs: [
      {
        ...registro('agc-001'),
        processoId: 'prc-001',
        dataPrimeira: '2026-11-13',
        dataSegunda: '2026-11-20',
        pauta: 'Deliberação sobre o plano de recuperação',
        status: 'agendada',
      },
    ],
    presencas: [
      { ...registro('pre-001'), agcId: 'agc-001', credorId: 'crd-0001' },
      { ...registro('pre-002'), agcId: 'agc-001', credorId: 'crd-0003' },
    ],
    votos: [{ ...registro('vot-001'), agcId: 'agc-001', credorId: 'crd-0001', voto: 'sim' }],
    informes: [
      {
        ...registro('inf-001'),
        processoId: 'prc-001',
        titulo: 'Edital de credores',
        categoria: 'editais',
        fase: 'edital-publicado',
        folhaInicial: 120,
        folhaFinal: 124,
        publicadoNoSite: true,
        data: '2026-04-10',
        anexos: [{ origem: 'publico', caminho: 'anexos/edital.pdf', nome: 'edital.pdf' }],
      },
    ],
    arquivos: [],
    logs: [
      {
        ...registro('log-001'),
        usuarioId: 'usr-aj',
        acao: 'criou',
        colecao: 'processos',
        registroId: 'prc-001',
        processoId: 'prc-001',
        mudancas: [],
        data: CARIMBO_SEED,
      },
    ],
  }
}

/** Grava o seed mini direto no armazenamento, sem repositório (e sem logs novos). */
export async function carregarSeedMini(armazenamento: Armazenamento): Promise<SeedMini> {
  const seed = seedMini()
  const tabelas = Object.keys(seed) as Tabela[]
  await armazenamento.transacao(tabelas, async () => {
    for (const tabela of tabelas) {
      for (const linha of seed[tabela]) await armazenamento.put(tabela, linha)
    }
  })
  return seed
}
