// Grupos do QGC para impressão (RF-30, CRD-12, CRD-15): credores por classe concursal, com
// subtotais e total geral pelo valor vigente (T-26), em centavos (INV-03). Extraconcursais à
// parte, fora do total; não sujeitos não entram no QGC (RF-26).
import type { Tipos } from '../../dados/schemas'
import { CLASSES_A_PARTE, type Classe, resumoPorClasse, valorVigente } from '../../regras/qgc'

type Credor = Tipos['credores']

export interface GrupoQgc {
  classe: Classe
  credores: Credor[]
  /** Soma das linhas do grupo, em centavos. */
  subtotal: number
}

export interface Qgc {
  grupos: GrupoQgc[]
  total: { quantidade: number; valor: number }
  extraconcursais: GrupoQgc | null
  naoSujeitos: number
}

const COLADOR = new Intl.Collator('pt-BR', { sensitivity: 'base' })

function grupo(classe: Classe, credores: readonly Credor[]): GrupoQgc {
  const daClasse = credores
    .filter((credor) => credor.classe === classe)
    .sort((a, b) => COLADOR.compare(a.nome, b.nome) || a.id.localeCompare(b.id))
  return {
    classe,
    credores: daClasse,
    subtotal: daClasse.reduce((soma, credor) => soma + valorVigente(credor), 0),
  }
}

/** Monta o QGC na ordem das classes do quadro-resumo. */
export function montarQgc(credores: readonly Credor[]): Qgc {
  const { linhas } = resumoPorClasse(credores)
  const grupos = linhas.map((linha) => grupo(linha.classe, credores))
  const extra = grupo('extraconcursal', credores)
  return {
    grupos,
    total: {
      quantidade: grupos.reduce((soma, g) => soma + g.credores.length, 0),
      valor: grupos.reduce((soma, g) => soma + g.subtotal, 0),
    },
    extraconcursais: extra.credores.length > 0 ? extra : null,
    naoSujeitos: credores.filter(
      (credor) => CLASSES_A_PARTE.includes(credor.classe) && credor.classe !== 'extraconcursal',
    ).length,
  }
}
