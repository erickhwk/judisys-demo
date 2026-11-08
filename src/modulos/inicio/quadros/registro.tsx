// Ponto de registro dos quadros do início (SDD-INI S-07): o componente de cada `IdQuadro`. A grade
// renderiza `QUADROS[id]` com a variante da largura; o tamanho vem sempre do `CATALOGO` (S-02).
//
// Contrato das tarefas de quadros (INI-06 a INI-09):
// - o quadro é um componente `(props: PropsDoQuadro) => ReactNode`, num arquivo próprio em
//   `quadros/`, que busca os próprios dados e devolve um `<Quadro>` (moldura em `Quadro.tsx`);
// - a moldura cuida do cabeçalho, do link (com a permissão), do modo de edição e do estado vazio:
//   o quadro não sabe se está em edição;
// - para registrar, troque o `provisorio('<id>')` da sua linha pelo componente e importe-o no
//   bloco de imports da sua tarefa. As linhas estão agrupadas por tarefa para os merges do lote 3
//   não se cruzarem.
import type { ComponentType } from 'react'
import type { IdQuadro } from '../montagem'
import type { Variante } from './Quadro'
import { QuadroAgc } from './QuadroAgc'
import { QuadroPedidos } from './QuadroPedidos'
import { QuadroPrazos } from './QuadroPrazos'
import { provisorio } from './QuadroProvisorio'

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
  proximos: provisorio('proximos'),
  calendario: provisorio('calendario'),
  atividade: provisorio('atividade'),
  informes: provisorio('informes'),

  // INI-08 · quadros 2×1
  passivo: provisorio('passivo'),
  publicados: provisorio('publicados'),
  cumpridos: provisorio('cumpridos'),
  classes: provisorio('classes'),

  // INI-09 · carteira por fase (4×1)
  carteira: provisorio('carteira'),
}
