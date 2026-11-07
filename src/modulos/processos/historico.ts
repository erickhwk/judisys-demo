// Texto do histórico do processo (RF-13, RF-41): o que cada log diz, campo a campo, com os
// valores formatados. `de` ausente (`null` ou `undefined`) aparece como vazio.
import type { Tabela } from '../../dados/armazenamento'
import { CATEGORIAS_INFORME, type CategoriaInforme, type Log } from '../../dados/schemas'
import { PREFIXO_CASCATA } from '../../dados/servicos/exclusoes'
import { CAMPO_EMPRESAS } from '../../dados/servicos/processos'
import { formatarData, formatarMoeda } from '../../regras/datas'
import { formatarCnj, formatarDocumento } from '../../regras/documentos'
import { type Fase, ROTULOS_FASE } from '../../regras/fases'
import { formatarPercentual } from './formulario'
import { ROTULOS_CONSOLIDACAO, ROTULOS_TIPO } from './rotulos'

export const ROTULOS_ACAO: Record<Log['acao'], string> = {
  criou: 'Criou',
  editou: 'Editou',
  excluiu: 'Excluiu',
}

export const ROTULOS_COLECAO: Partial<Record<Tabela, string>> = {
  processos: 'processo',
  processoEmpresas: 'vínculo com empresa',
  marcosDeFase: 'marco de fase',
  prazos: 'prazo',
  credores: 'credor',
  pedidosDeCredito: 'pedido de crédito',
  agcs: 'AGC',
  presencas: 'presença em AGC',
  votos: 'voto',
  informes: 'informe',
  empresas: 'empresa',
}

const ROTULOS_CAMPO: Record<string, string> = {
  apelido: 'Apelido',
  numeroCnj: 'Número CNJ',
  tipo: 'Tipo',
  comarca: 'Comarca',
  uf: 'UF',
  vara: 'Vara',
  email: 'E-mail',
  consolidacao: 'Consolidação',
  passivoDeclarado: 'Passivo declarado',
  responsavelId: 'Responsável',
  honorariosPercentual: 'Honorários (%)',
  honorariosValor: 'Honorários (R$)',
  faseAtual: 'Fase atual',
  fase: 'Fase',
  data: 'Data',
  titulo: 'Título',
  baseLegal: 'Base legal',
  vencimento: 'Vencimento',
  origem: 'Origem',
  status: 'Situação',
  nome: 'Nome',
  documento: 'CPF/CNPJ',
  classe: 'Classe',
  natureza: 'Natureza',
  valorDevedor: 'Valor (devedor)',
  valorAj: 'Valor (AJ)',
  valorQgc: 'Valor (QGC)',
  valorPedido: 'Valor pedido',
  categoria: 'Categoria',
  publicadoNoSite: 'Publicado no site',
  pauta: 'Pauta',
  voto: 'Voto',
  [CAMPO_EMPRESAS]: 'Empresas',
}

const CAMPOS_MOEDA = new Set([
  'passivoDeclarado',
  'honorariosValor',
  'valorDevedor',
  'valorAj',
  'valorQgc',
  'valorPedido',
])
const CAMPOS_DATA = new Set(['data', 'vencimento', 'dataPrimeira', 'dataSegunda', 'dataAgc'])
const CAMPOS_FASE = new Set(['fase', 'faseAtual'])
/** Valores de enumeração em texto (tipo, consolidação, origem e situação dos registros). */
const ROTULOS_VALOR: Record<string, Readonly<Record<string, string>>> = {
  tipo: ROTULOS_TIPO,
  consolidacao: ROTULOS_CONSOLIDACAO,
  origem: { automatico: 'Automático', manual: 'Manual' },
  status: {
    aberto: 'Aberto',
    cumprido: 'Cumprido',
    pendente: 'Pendente',
    acolhido: 'Acolhido',
    rejeitado: 'Rejeitado',
    agendada: 'Agendada',
    instalada: 'Instalada',
    encerrada: 'Encerrada',
  },
}
/** Campos internos que não dizem nada ao leitor do histórico. */
const CAMPOS_OCULTOS = new Set(['processoId', 'marcoId', 'agcId', 'credorId', 'empresaId'])

export interface Nomes {
  usuarios: Map<string, string>
  empresas: Map<string, string>
}

export interface MudancaLegivel {
  campo: string
  de: string
  para: string
}

function formatarValor(campo: string, valor: unknown, nomes: Nomes): string {
  if (valor === null || valor === undefined || valor === '') return ''
  if (campo === CAMPO_EMPRESAS && Array.isArray(valor)) {
    return valor.map((id) => nomes.empresas.get(String(id)) ?? String(id)).join(', ')
  }
  if (campo === 'responsavelId') return nomes.usuarios.get(String(valor)) ?? String(valor)
  if (CAMPOS_MOEDA.has(campo) && typeof valor === 'number') return formatarMoeda(valor)
  if (CAMPOS_DATA.has(campo) && typeof valor === 'string') return formatarData(valor)
  if (CAMPOS_FASE.has(campo) && typeof valor === 'string') {
    return ROTULOS_FASE[valor as Fase] ?? valor
  }
  if (campo === 'honorariosPercentual' && typeof valor === 'number') {
    return `${formatarPercentual(valor)}%`
  }
  if (typeof valor === 'string' && ROTULOS_VALOR[campo]?.[valor]) return ROTULOS_VALOR[campo][valor]
  if (campo === 'numeroCnj' && typeof valor === 'string') return formatarCnj(valor)
  if (campo === 'categoria' && typeof valor === 'string') {
    return CATEGORIAS_INFORME[valor as CategoriaInforme] ?? valor
  }
  if (campo === 'documento' && typeof valor === 'string') return formatarDocumento(valor)
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

/** Mudanças do log em texto, sem os campos internos (ids de ligação). */
export function mudancasLegiveis(log: Pick<Log, 'mudancas'>, nomes: Nomes): MudancaLegivel[] {
  return log.mudancas
    .filter((mudanca) => !CAMPOS_OCULTOS.has(mudanca.campo))
    .map(({ campo, de, para }) => {
      if (campo.startsWith(PREFIXO_CASCATA)) {
        const tabela = campo.slice(PREFIXO_CASCATA.length) as Tabela
        return {
          campo: `Excluídos junto: ${ROTULOS_COLECAO[tabela] ?? tabela}`,
          de: String(de ?? ''),
          para: String(para ?? ''),
        }
      }
      return {
        campo: ROTULOS_CAMPO[campo] ?? campo,
        de: formatarValor(campo, de, nomes),
        para: formatarValor(campo, para, nomes),
      }
    })
}
