// Ponto de registro dos quadros do início (SDD-INI S-07): o componente de cada `IdQuadro`. A grade
// renderiza `QUADROS[id]` com a variante da largura; o tamanho vem sempre do `CATALOGO` (S-02).
//
// Contrato das tarefas de quadros (INI-06 a INI-09):
// - o quadro é um componente `(props: PropsDoQuadro) => ReactNode`, num arquivo próprio em
//   `quadros/`, que busca os próprios dados e devolve um `<Quadro>` (moldura em `Quadro.tsx`);
// - a moldura cuida do cabeçalho, do link (com a permissão), do modo de edição e do estado vazio:
//   o quadro não sabe se está em edição;
// - para registrar, acrescente o componente na linha do seu `IdQuadro`.
import type { ComponentType } from 'react'
import type { IdQuadro } from '../montagem'
import type { Variante } from './Quadro'
import { QuadroAgc } from './QuadroAgc'
import { QuadroAtividade } from './QuadroAtividade'
import { QuadroCalendario } from './QuadroCalendario'
import { QuadroCarteira } from './QuadroCarteira'
import { QuadroClasses } from './QuadroClasses'
import { QuadroCumpridos } from './QuadroCumpridos'
import { QuadroInformes } from './QuadroInformes'
import { QuadroPassivo } from './QuadroPassivo'
import { QuadroPedidos } from './QuadroPedidos'
import { QuadroPrazos } from './QuadroPrazos'
import { QuadroProximos } from './QuadroProximos'
import { QuadroPublicados } from './QuadroPublicados'

export interface PropsDoQuadro {
  /** Desenho da largura atual: 4 colunas, 2 colunas ou a lista do celular (RF-14). */
  variante: Variante
}

export const QUADROS: Readonly<Record<IdQuadro, ComponentType<PropsDoQuadro>>> = {
  // INI-06 · quadros 1×1
  prazos: QuadroPrazos,
  agc: QuadroAgc,
  pedidos: QuadroPedidos,

  // INI-07 · quadros 1×2
  proximos: QuadroProximos,
  calendario: QuadroCalendario,
  atividade: QuadroAtividade,
  informes: QuadroInformes,

  // INI-08 · quadros 2×1
  passivo: QuadroPassivo,
  publicados: QuadroPublicados,
  cumpridos: QuadroCumpridos,
  classes: QuadroClasses,

  // INI-09 · carteira por fase (4×1)
  carteira: QuadroCarteira,
}
