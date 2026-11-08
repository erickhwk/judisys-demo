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
import { QuadroAtividade } from './QuadroAtividade'
import { QuadroCalendario } from './QuadroCalendario'
import { QuadroInformes } from './QuadroInformes'
import { provisorio } from './QuadroProvisorio'
import { QuadroProximos } from './QuadroProximos'

export interface PropsDoQuadro {
  /** Desenho da largura atual: 4 colunas, 2 colunas ou a lista do celular (RF-14). */
  variante: Variante
}

export const QUADROS: Readonly<Record<IdQuadro, ComponentType<PropsDoQuadro>>> = {
  // INI-06 · quadros 1×1
  prazos: provisorio('prazos'),
  agc: provisorio('agc'),
  pedidos: provisorio('pedidos'),

  // INI-07 · quadros 1×2
  proximos: QuadroProximos,
  calendario: QuadroCalendario,
  atividade: QuadroAtividade,
  informes: QuadroInformes,

  // INI-08 · quadros 2×1
  passivo: provisorio('passivo'),
  publicados: provisorio('publicados'),
  cumpridos: provisorio('cumpridos'),
  classes: provisorio('classes'),

  // INI-09 · carteira por fase (4×1)
  carteira: provisorio('carteira'),
}
