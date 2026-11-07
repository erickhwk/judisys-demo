// Os 12 processos do seed, escritos à mão (RF-46, RF-47, T-07): devedoras e apelidos fictícios,
// comarcas reais (só a cidade). Os marcos são deslocamentos em dias a partir de DATA_BASE; prazos,
// RMAs e o resto saem das regras (gerar.ts).
import type { Fase, TipoProcesso } from '../../src/regras/fases'

export interface EmpresaDoSeed {
  razaoSocial: string
  nomeFantasia: string
  porte: 'me' | 'epp' | 'demais'
  cnae: string
}

/** Até onde as relações de credores chegaram: define quais valores do credor existem. */
export type Relacoes = 'devedor' | 'aj' | 'qgc'

/** AGC do processo: a do vitrine (agendada) ou uma já encerrada, com o resultado desejado. */
export type AgcDoSeed = 'agendada' | 'aprovada' | 'rejeitada'

export interface ProcessoDoSeed {
  id: string
  apelido: string
  tipo: TipoProcesso
  comarca: string
  uf: string
  /** Código do tribunal no número CNJ (segmento 8, Justiça Estadual). */
  tribunal: string
  vara: string
  responsavelId: string
  consolidacao: 'nenhuma' | 'processual' | 'substancial'
  honorariosPercentual: number
  empresas: readonly EmpresaDoSeed[]
  /** Usa também as empresas de outro processo (falência que veio de RJ convolada). */
  empresasDe?: string
  /** Marcos em ordem: fase e deslocamento em dias a partir de DATA_BASE. */
  marcos: readonly (readonly [Fase, number])[]
  credores: number
  relacoes: Relacoes
  /** O RMA do mês passado ficou sem cumprir (SED-05, RF-22). */
  rmaVencido?: boolean
  agc?: AgcDoSeed
}

const VARA_RJ = '1ª Vara de Falências e Recuperações Judiciais'
const VARA_EMPRESARIAL = '2ª Vara Empresarial'
const VARA_CIVEL = '3ª Vara Cível'

/** Processo vitrine (RF-46, SED-04): o roteiro da demo passa por ele. */
export const ID_VITRINE = 'prc-001'

export const PROCESSOS: readonly ProcessoDoSeed[] = [
  {
    id: ID_VITRINE,
    apelido: 'Grupo Lontra Azul',
    tipo: 'rj',
    comarca: 'Campinas',
    uf: 'SP',
    tribunal: '26',
    vara: VARA_RJ,
    responsavelId: 'usr-01',
    consolidacao: 'substancial',
    honorariosPercentual: 3,
    empresas: [
      {
        razaoSocial: 'Lontra Azul Alimentos Ltda.',
        nomeFantasia: 'Lontra Azul',
        porte: 'demais',
        cnae: '1091-1/01',
      },
      {
        razaoSocial: 'Lontra Azul Logística Ltda.',
        nomeFantasia: 'Lontra Log',
        porte: 'demais',
        cnae: '4930-2/02',
      },
      {
        razaoSocial: 'Lontra Azul Embalagens Ltda.',
        nomeFantasia: '',
        porte: 'demais',
        cnae: '2222-6/00',
      },
      {
        razaoSocial: 'Lontra Azul Agropecuária Ltda.',
        nomeFantasia: 'Fazendas Lontra',
        porte: 'epp',
        cnae: '0111-3/01',
      },
      {
        razaoSocial: 'Lontra Azul Participações S.A.',
        nomeFantasia: '',
        porte: 'demais',
        cnae: '6462-0/00',
      },
    ],
    marcos: [
      ['pedido', -130],
      ['processamento-deferido', -120],
      ['edital-publicado', -114],
      ['relacao-aj-publicada', -62],
      ['plano-apresentado', -61],
    ],
    credores: 600,
    relacoes: 'aj',
    agc: 'agendada',
  },
  {
    id: 'prc-002',
    apelido: 'Cerâmica Tatu-Bola',
    tipo: 'rj',
    comarca: 'Ribeirão Preto',
    uf: 'SP',
    tribunal: '26',
    vara: VARA_EMPRESARIAL,
    responsavelId: 'usr-02',
    consolidacao: 'processual',
    honorariosPercentual: 4,
    empresas: [
      {
        razaoSocial: 'Cerâmica Tatu-Bola Ltda.',
        nomeFantasia: 'Tatu-Bola',
        porte: 'demais',
        cnae: '2342-7/02',
      },
      {
        razaoSocial: 'Tatu-Bola Revestimentos Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '4744-0/05',
      },
      {
        razaoSocial: 'Tatu-Bola Mineração Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '0810-0/02',
      },
    ],
    marcos: [['pedido', -5]],
    credores: 60,
    relacoes: 'devedor',
  },
  {
    id: 'prc-003',
    apelido: 'Tecelagem Pé-de-Moleque',
    tipo: 'rj',
    comarca: 'Blumenau',
    uf: 'SC',
    tribunal: '24',
    vara: VARA_RJ,
    responsavelId: 'usr-01',
    consolidacao: 'processual',
    honorariosPercentual: 3.5,
    empresas: [
      {
        razaoSocial: 'Tecelagem Pé-de-Moleque S.A.',
        nomeFantasia: 'Pé-de-Moleque Têxtil',
        porte: 'demais',
        cnae: '1321-9/00',
      },
      {
        razaoSocial: 'Pé-de-Moleque Fios Ltda.',
        nomeFantasia: '',
        porte: 'demais',
        cnae: '1311-1/00',
      },
      {
        razaoSocial: 'Pé-de-Moleque Confecções Ltda.',
        nomeFantasia: 'Moleque Moda',
        porte: 'epp',
        cnae: '1412-6/01',
      },
      {
        razaoSocial: 'Pé-de-Moleque Comercial Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '4641-9/01',
      },
    ],
    // Deferido há 62 dias e sem plano: "Apresentação do plano" vencida e aberta (SED-05).
    marcos: [
      ['pedido', -75],
      ['processamento-deferido', -62],
    ],
    credores: 90,
    relacoes: 'devedor',
  },
  {
    id: 'prc-004',
    apelido: 'Transportes Jabuticaba',
    tipo: 'rj',
    comarca: 'Belo Horizonte',
    uf: 'MG',
    tribunal: '13',
    vara: VARA_EMPRESARIAL,
    responsavelId: 'usr-02',
    consolidacao: 'processual',
    honorariosPercentual: 2.5,
    empresas: [
      {
        razaoSocial: 'Transportes Jabuticaba Ltda.',
        nomeFantasia: 'Jabuticaba Cargas',
        porte: 'demais',
        cnae: '4930-2/02',
      },
      {
        razaoSocial: 'Jabuticaba Armazéns Gerais Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '5211-7/01',
      },
      {
        razaoSocial: 'Jabuticaba Locação de Veículos Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '7719-5/99',
      },
    ],
    // Edital há 15 dias: habilitações vencem hoje (SED-05).
    marcos: [
      ['pedido', -55],
      ['processamento-deferido', -40],
      ['edital-publicado', -15],
    ],
    credores: 110,
    relacoes: 'devedor',
    rmaVencido: true,
  },
  {
    id: 'prc-005',
    apelido: 'Moinho Quero-Quero',
    tipo: 'rj',
    comarca: 'Porto Alegre',
    uf: 'RS',
    tribunal: '21',
    vara: VARA_RJ,
    responsavelId: 'usr-01',
    consolidacao: 'processual',
    honorariosPercentual: 2,
    empresas: [
      {
        razaoSocial: 'Moinho Quero-Quero S.A.',
        nomeFantasia: 'Quero-Quero',
        porte: 'demais',
        cnae: '1062-7/00',
      },
      {
        razaoSocial: 'Quero-Quero Massas Ltda.',
        nomeFantasia: '',
        porte: 'demais',
        cnae: '1094-5/00',
      },
      {
        razaoSocial: 'Quero-Quero Rações Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '1066-0/00',
      },
      {
        razaoSocial: 'Quero-Quero Silos e Grãos Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '5211-7/99',
      },
      {
        razaoSocial: 'Quero-Quero Distribuidora Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '4637-1/07',
      },
    ],
    marcos: [
      ['pedido', -760],
      ['processamento-deferido', -745],
      ['edital-publicado', -735],
      ['relacao-aj-publicada', -684],
      ['plano-apresentado', -680],
      ['prazo-objecoes', -650],
      ['agc', -560],
      ['plano-homologado', -540],
      ['fiscalizacao', -539],
    ],
    credores: 120,
    relacoes: 'qgc',
    agc: 'aprovada',
  },
  {
    id: 'prc-006',
    apelido: 'Doceria Bem-te-vi',
    tipo: 'rj',
    comarca: 'Goiânia',
    uf: 'GO',
    tribunal: '09',
    vara: VARA_CIVEL,
    responsavelId: 'usr-02',
    consolidacao: 'processual',
    honorariosPercentual: 3,
    empresas: [
      {
        razaoSocial: 'Doceria Bem-te-vi Ltda.',
        nomeFantasia: 'Bem-te-vi Doces',
        porte: 'epp',
        cnae: '1091-1/02',
      },
      {
        razaoSocial: 'Bem-te-vi Chocolates Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '1093-7/01',
      },
      {
        razaoSocial: 'Bem-te-vi Cafeterias Ltda.',
        nomeFantasia: 'Café Bem-te-vi',
        porte: 'me',
        cnae: '5611-2/03',
      },
      {
        razaoSocial: 'Bem-te-vi Franquias Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '7740-3/00',
      },
    ],
    marcos: [
      ['pedido', -1500],
      ['processamento-deferido', -1490],
      ['edital-publicado', -1480],
      ['relacao-aj-publicada', -1424],
      ['plano-apresentado', -1420],
      ['prazo-objecoes', -1390],
      ['agc', -1300],
      ['plano-homologado', -1290],
      ['fiscalizacao', -1289],
      ['encerrada', -560],
    ],
    credores: 80,
    relacoes: 'qgc',
    agc: 'aprovada',
  },
  {
    id: 'prc-007',
    apelido: 'Fundição Sapo-Cururu',
    tipo: 'rj',
    comarca: 'Joinville',
    uf: 'SC',
    tribunal: '24',
    vara: VARA_RJ,
    responsavelId: 'usr-03',
    consolidacao: 'processual',
    honorariosPercentual: 3,
    empresas: [
      {
        razaoSocial: 'Fundição Sapo-Cururu Ltda.',
        nomeFantasia: 'Sapo-Cururu',
        porte: 'demais',
        cnae: '2451-2/00',
      },
      {
        razaoSocial: 'Sapo-Cururu Usinagem Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '2539-0/01',
      },
      {
        razaoSocial: 'Sapo-Cururu Ferramentaria Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '2543-8/00',
      },
    ],
    // Plano rejeitado na AGC e convolação em falência (continua no prc-011).
    marcos: [
      ['pedido', -560],
      ['processamento-deferido', -550],
      ['edital-publicado', -540],
      ['relacao-aj-publicada', -484],
      ['plano-apresentado', -480],
      ['prazo-objecoes', -450],
      ['agc', -300],
      ['convolada-falencia', -290],
    ],
    credores: 70,
    relacoes: 'aj',
    agc: 'rejeitada',
  },
  {
    id: 'prc-008',
    apelido: 'Padaria Joaninha Dourada',
    tipo: 'rj',
    comarca: 'Recife',
    uf: 'PE',
    tribunal: '17',
    vara: VARA_EMPRESARIAL,
    responsavelId: 'usr-04',
    consolidacao: 'processual',
    honorariosPercentual: 4,
    empresas: [
      {
        razaoSocial: 'Padaria Joaninha Dourada Ltda.',
        nomeFantasia: 'Joaninha Dourada',
        porte: 'epp',
        cnae: '1091-1/02',
      },
      {
        razaoSocial: 'Joaninha Dourada Confeitaria Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '4721-1/02',
      },
      {
        razaoSocial: 'Joaninha Dourada Eventos Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '5620-1/02',
      },
    ],
    marcos: [
      ['pedido', -300],
      ['processamento-deferido', -290],
      ['desistencia', -200],
    ],
    credores: 40,
    relacoes: 'devedor',
  },
  {
    id: 'prc-009',
    apelido: 'Calçados Tico-Tico',
    tipo: 'falencia',
    comarca: 'Franca',
    uf: 'SP',
    tribunal: '26',
    vara: VARA_CIVEL,
    responsavelId: 'usr-03',
    consolidacao: 'processual',
    honorariosPercentual: 5,
    empresas: [
      {
        razaoSocial: 'Calçados Tico-Tico Ltda.',
        nomeFantasia: 'Tico-Tico',
        porte: 'demais',
        cnae: '1531-9/01',
      },
      {
        razaoSocial: 'Tico-Tico Solados Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '1540-8/00',
      },
      {
        razaoSocial: 'Tico-Tico Curtume Ltda.',
        nomeFantasia: '',
        porte: 'epp',
        cnae: '1510-6/00',
      },
    ],
    // Decretada há 35 dias: relatório do AJ vence em 5 (prazo da semana, SED-05).
    marcos: [['decretada', -35]],
    credores: 70,
    relacoes: 'devedor',
  },
  {
    id: 'prc-010',
    apelido: 'Gráfica Beija-Flor',
    tipo: 'falencia',
    comarca: 'Londrina',
    uf: 'PR',
    tribunal: '16',
    vara: VARA_CIVEL,
    responsavelId: 'usr-04',
    consolidacao: 'processual',
    honorariosPercentual: 5,
    empresas: [
      {
        razaoSocial: 'Gráfica Beija-Flor Ltda.',
        nomeFantasia: 'Beija-Flor',
        porte: 'epp',
        cnae: '1813-0/01',
      },
      {
        razaoSocial: 'Beija-Flor Papéis Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '4647-8/01',
      },
      {
        razaoSocial: 'Beija-Flor Editora Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '5811-5/00',
      },
    ],
    marcos: [
      ['decretada', -130],
      ['arrecadacao', -100],
    ],
    credores: 90,
    relacoes: 'aj',
  },
  {
    id: 'prc-011',
    apelido: 'Fundição Sapo-Cururu (falência)',
    tipo: 'falencia',
    comarca: 'Joinville',
    uf: 'SC',
    tribunal: '24',
    vara: VARA_RJ,
    responsavelId: 'usr-03',
    consolidacao: 'processual',
    honorariosPercentual: 5,
    empresasDe: 'prc-007',
    empresas: [
      {
        razaoSocial: 'Sapo-Cururu Participações Ltda.',
        nomeFantasia: '',
        porte: 'demais',
        cnae: '6462-0/00',
      },
    ],
    // Em realização do ativo (RF-46).
    marcos: [
      ['decretada', -290],
      ['arrecadacao', -270],
      ['quadro-credores', -150],
      ['realizacao-ativo', -90],
    ],
    credores: 100,
    relacoes: 'qgc',
  },
  {
    id: 'prc-012',
    apelido: 'Brinquedos Pirilampo',
    tipo: 'falencia',
    comarca: 'Uberlândia',
    uf: 'MG',
    tribunal: '13',
    vara: VARA_CIVEL,
    responsavelId: 'usr-02',
    consolidacao: 'processual',
    honorariosPercentual: 5,
    empresas: [
      {
        razaoSocial: 'Brinquedos Pirilampo Ltda.',
        nomeFantasia: 'Pirilampo',
        porte: 'epp',
        cnae: '3240-0/99',
      },
      {
        razaoSocial: 'Pirilampo Plásticos Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '2229-3/99',
      },
      {
        razaoSocial: 'Pirilampo Lojas Ltda.',
        nomeFantasia: '',
        porte: 'me',
        cnae: '4763-6/01',
      },
    ],
    marcos: [
      ['decretada', -1100],
      ['arrecadacao', -1080],
      ['quadro-credores', -950],
      ['realizacao-ativo', -900],
      ['pagamentos', -500],
      ['prestacao-contas', -200],
      ['encerrada', -90],
    ],
    credores: 70,
    relacoes: 'qgc',
  },
]
