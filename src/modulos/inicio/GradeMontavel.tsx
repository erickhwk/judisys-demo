// Grade montável do início (SDD-INI §5.3 e §5.6): 4 colunas a partir de 880px de contêiner, 2
// colunas de 600 a 879px (a montagem do desktop empacotada, S-03) e a lista do celular abaixo disso.
// Grid próprio (Q-01, S-11): CSS grid com a posição explícita de cada quadro, então os buracos
// ficam (S-04), e arrastar por pointer events, só no modo de edição e só em 4 colunas (INV-06).
//
// Arrasto (RF-19): a cada movimento, a célula pretendida vem do ponteiro (`arrasto.ts`). Se o quadro
// sai do grid, a sombra fica vermelha, cortada na borda, com o aviso em `role="status"`, e soltar
// devolve o rascunho de antes. Se cabe, a prévia é a montagem de antes com o quadro solto ali e quem
// ficaria por baixo empurrado para baixo; soltar aceita a prévia.
import {
  type CSSProperties,
  memo,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { juntarClasses } from '../../ui/classes'
import {
  ALTURA_UNIDADE,
  type Colunas,
  colunaPretendida,
  deslocamentoNoGrid,
  larguraDaUnidade,
  linhaPretendida,
  recusa as saiDoGrid,
  soltar,
  VAO,
} from './arrasto'
import estilos from './GradeMontavel.module.css'
import {
  base,
  CATALOGO,
  COLUNAS_TABLET,
  empacotar,
  type IdQuadro,
  type ItemMontagem,
  MEDIDA_DESKTOP,
  MEDIDA_TABLET,
  type Medida,
  type Montagem,
  ordemDeLeitura,
} from './montagem'
import { ContextoEdicao, type EdicaoDaGrade } from './quadros/edicao'
import type { Variante } from './quadros/Quadro'
import { QUADROS } from './quadros/registro'

/** O ponteiro precisa andar isto antes de o arrasto começar: um clique na alça não move nada. */
const LIMIAR_ARRASTO = 4

export interface PropsGradeMontavel {
  /** A montagem exibida: a salva ou, no modo de edição, o rascunho. */
  montagem: Montagem
  cols: Colunas
  /** Largura do contêiner, para a unidade das sombras (até 1240px). */
  largura: number
  editando: boolean
  /** Mudança do rascunho pelo arrasto ou pelo ×. Só chamada no modo de edição. */
  aoMudar?: (montagem: Montagem) => void
}

export function GradeMontavel({ montagem, cols, largura, editando, aoMudar }: PropsGradeMontavel) {
  if (cols === 1) {
    return (
      <div className={estilos.lista} data-colunas={1}>
        {ordemDeLeitura(montagem).map((item) => (
          <QuadroNaGrade key={item.quadro} id={item.quadro} variante="celular" />
        ))}
      </div>
    )
  }
  if (cols === COLUNAS_TABLET) {
    const tablet = empacotar(montagem, COLUNAS_TABLET, MEDIDA_TABLET)
    return (
      <div
        className={estilos.grade}
        data-colunas={2}
        style={linhasDaGrade(2, base(tablet, MEDIDA_TABLET))}
      >
        {ordemDeLeitura(tablet).map((item) => (
          <Celula key={item.quadro} item={item} medida={MEDIDA_TABLET}>
            <QuadroNaGrade id={item.quadro} variante="tablet" />
          </Celula>
        ))}
      </div>
    )
  }
  return (
    <GradeDesktop montagem={montagem} largura={largura} editando={editando} aoMudar={aoMudar} />
  )
}

// Memorizado: arrastar redesenha a grade a cada movimento, mas não o corpo dos quadros.
const QuadroNaGrade = memo(function QuadroNaGrade({
  id,
  variante,
}: {
  id: IdQuadro
  variante: Variante
}) {
  const Componente = QUADROS[id]
  return <Componente variante={variante} />
})

function linhasDaGrade(cols: number, linhas: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${linhas}, ${ALTURA_UNIDADE}px)`,
  }
}

function lugar({ x, y }: Pick<ItemMontagem, 'x' | 'y'>, w: number, h: number): CSSProperties {
  return { gridColumn: `${x + 1} / span ${w}`, gridRow: `${y + 1} / span ${h}` }
}

function Celula({
  item,
  medida,
  className,
  style,
  children,
}: {
  item: ItemMontagem
  medida: Medida
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const { w, h } = medida(item.quadro)
  return (
    <div
      className={juntarClasses(estilos.celula, className)}
      data-celula={item.quadro}
      data-x={item.x}
      data-y={item.y}
      style={{ ...lugar(item, w, h), ...style }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// 4 colunas: a única com Personalizar

interface Arrasto {
  quadro: IdQuadro
  /** O rascunho quando o ponteiro desceu na alça: volta a ele na recusa (5.6, passo 1). */
  antes: Montagem
  /** Só este ponteiro move e solta o quadro (outro dedo não larga). */
  ponteiro: number
  inicioX: number
  inicioY: number
  /** Ponteiro dentro do quadro, a partir do canto de cima à esquerda. */
  deslocamentoX: number
  deslocamentoY: number
  /** Canto de cima à esquerda da célula de origem, dentro do grid: rolar não descola o quadro. */
  origemX: number
  origemY: number
  larguraDaCelula: number
  /** Passou do limiar: daqui em diante, mostra sombra e prévia. */
  ativo: boolean
  dx: number
  dy: number
  coluna: number
  linha: number
}

function GradeDesktop({
  montagem,
  largura,
  editando,
  aoMudar,
}: {
  montagem: Montagem
  largura: number
  editando: boolean
  aoMudar?: (montagem: Montagem) => void
}) {
  const gradeRef = useRef<HTMLDivElement>(null)
  const [arrasto, setArrasto] = useState<Arrasto | null>(null)
  const arrastoRef = useRef<Arrasto | null>(null)
  const aoMudarRef = useRef(aoMudar)
  aoMudarRef.current = aoMudar
  // Índice, na ordem de leitura, do × que recebe o foco depois de tirar um quadro.
  const focarTirar = useRef<number | null>(null)

  const atualizar = useCallback((proximo: Arrasto | null) => {
    arrastoRef.current = proximo
    setArrasto(proximo)
  }, [])

  const ativo = arrasto?.ativo ? arrasto : null
  const recusado = ativo !== null && saiDoGrid(ativo.quadro, ativo.coluna)
  const previa = useMemo(
    () =>
      ativo && !recusado ? soltar(ativo.antes, ativo.quadro, ativo.coluna, ativo.linha) : null,
    [ativo, recusado],
  )
  const exibida = ativo ? (previa ?? ativo.antes) : montagem
  // No arrasto, o grid não encolhe: a célula de origem do arrastado continua dentro das linhas.
  const linhas = Math.max(base(exibida), ativo ? base(ativo.antes) : 0) + (editando ? 1 : 0)
  const unidade = larguraDaUnidade(largura, 4)
  const unidadeRef = useRef(unidade)
  unidadeRef.current = unidade
  const arrastando = arrasto !== null
  const recusa = ativo && recusado ? sombraCortada(ativo, unidade, linhas) : null

  // Sai da edição no meio do arrasto (Cancelar não dá, mas o contêiner pode encolher): esquece.
  useEffect(() => {
    if (!editando) atualizar(null)
  }, [editando, atualizar])

  useEffect(() => {
    if (!arrastando) return
    // Último ponteiro visto: rolar a página no meio do arrasto recalcula a célula sem mover o mouse.
    let ultimo: { x: number; y: number } | null = null
    const acompanhar = (clienteX: number, clienteY: number) => {
      const atual = arrastoRef.current
      const grade = gradeRef.current
      if (!atual || !grade) return
      const caixa = grade.getBoundingClientRect()
      atualizar({
        ...atual,
        ativo: true,
        dx: deslocamentoNoGrid(
          clienteX - atual.deslocamentoX - caixa.left - atual.origemX,
          atual.origemX,
          atual.larguraDaCelula,
          caixa.width,
        ),
        dy: clienteY - atual.deslocamentoY - caixa.top - atual.origemY,
        coluna: colunaPretendida(clienteX, atual.deslocamentoX, caixa.left, unidadeRef.current),
        linha: linhaPretendida(clienteY, atual.deslocamentoY, caixa.top),
      })
    }
    const mover = (evento: globalThis.PointerEvent) => {
      const atual = arrastoRef.current
      if (!atual || evento.pointerId !== atual.ponteiro) return
      // O botão foi solto sem o pointerup chegar (fora da janela, por exemplo): desiste.
      if (evento.buttons === 0) {
        desistir()
        return
      }
      const andou = Math.hypot(evento.clientX - atual.inicioX, evento.clientY - atual.inicioY)
      if (!atual.ativo && andou < LIMIAR_ARRASTO) return
      evento.preventDefault()
      ultimo = { x: evento.clientX, y: evento.clientY }
      acompanhar(evento.clientX, evento.clientY)
    }
    const rolar = () => {
      if (ultimo && arrastoRef.current?.ativo) acompanhar(ultimo.x, ultimo.y)
    }
    const largar = (evento: globalThis.PointerEvent) => {
      const atual = arrastoRef.current
      if (atual && evento.pointerId !== atual.ponteiro) return
      atualizar(null)
      if (!atual?.ativo || saiDoGrid(atual.quadro, atual.coluna)) return
      aoMudarRef.current?.(soltar(atual.antes, atual.quadro, atual.coluna, atual.linha))
    }
    const desistir = () => atualizar(null)
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') desistir()
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', largar)
    window.addEventListener('pointercancel', desistir)
    window.addEventListener('keydown', tecla)
    // Captura: a rolagem é da coluna de conteúdo, e o evento de rolagem não sobe.
    window.addEventListener('scroll', rolar, true)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', largar)
      window.removeEventListener('pointercancel', desistir)
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', rolar, true)
    }
    // O efeito só liga e desliga os ouvintes; o arrasto corrente vem do ref.
  }, [arrastando, atualizar])

  const ordem = ordemDeLeitura(montagem)

  useEffect(() => {
    const indice = focarTirar.current
    if (indice === null) return
    focarTirar.current = null
    const botoes = gradeRef.current?.querySelectorAll<HTMLButtonElement>(
      '[data-celula] header button',
    )
    if (botoes && botoes.length > 0) botoes[Math.min(indice, botoes.length - 1)]?.focus()
  })

  // Estável durante o arrasto (a montagem só muda ao soltar): os quadros não se redesenham.
  const edicao = useMemo<EdicaoDaGrade>(
    () => ({
      editando,
      tirar: (quadro) => {
        focarTirar.current = ordemDeLeitura(montagem).findIndex((item) => item.quadro === quadro)
        aoMudarRef.current?.(montagem.filter((item) => item.quadro !== quadro))
      },
      pegar: (quadro, evento: PointerEvent<HTMLElement>) => {
        const grade = gradeRef.current
        const celula = evento.currentTarget.closest('[data-celula]')
        if (!editando || evento.button !== 0 || !grade || !celula) return
        evento.preventDefault()
        const caixa = celula.getBoundingClientRect()
        const caixaGrade = grade.getBoundingClientRect()
        const item = montagem.find((i) => i.quadro === quadro)
        atualizar({
          quadro,
          antes: montagem,
          ponteiro: evento.pointerId,
          inicioX: evento.clientX,
          inicioY: evento.clientY,
          deslocamentoX: evento.clientX - caixa.left,
          deslocamentoY: evento.clientY - caixa.top,
          origemX: caixa.left - caixaGrade.left,
          origemY: caixa.top - caixaGrade.top,
          larguraDaCelula: caixa.width,
          ativo: false,
          dx: 0,
          dy: 0,
          coluna: item?.x ?? 0,
          linha: item?.y ?? 0,
        })
      },
    }),
    [editando, montagem, atualizar],
  )

  return (
    <ContextoEdicao.Provider value={edicao}>
      <div
        ref={gradeRef}
        className={juntarClasses(
          estilos.grade,
          editando && estilos.editando,
          ativo && estilos.arrastando,
        )}
        data-colunas={4}
        style={linhasDaGrade(4, linhas)}
      >
        {editando &&
          Array.from({ length: linhas * 4 }, (_, i) => (
            <span
              // As células são fixas: o índice é a identidade delas.
              // biome-ignore lint/suspicious/noArrayIndexKey: célula da guia, sem identidade própria
              key={i}
              aria-hidden="true"
              className={estilos.guia}
              data-guia=""
              style={lugar({ x: i % 4, y: Math.floor(i / 4) }, 1, 1)}
            />
          ))}

        {ordem.map((item) => {
          const arrastado = ativo?.quadro === item.quadro
          // O arrastado fica na célula de antes, seguindo o ponteiro; os outros, na prévia.
          const posicao = arrastado ? item : (exibida.find((e) => e.quadro === item.quadro) ?? item)
          return (
            <Celula
              key={item.quadro}
              item={posicao}
              medida={MEDIDA_DESKTOP}
              className={arrastado ? estilos.arrastado : undefined}
              style={
                arrastado
                  ? { transform: `translate(${ativo.dx}px, ${ativo.dy}px) rotate(-1.5deg)` }
                  : undefined
              }
            >
              <QuadroNaGrade id={item.quadro} variante="desktop" />
            </Celula>
          )
        })}

        {ativo && previa && (
          <div
            aria-hidden="true"
            className={estilos.destino}
            style={lugar(
              posicaoDe(previa, ativo.quadro),
              CATALOGO[ativo.quadro].w,
              CATALOGO[ativo.quadro].h,
            )}
          />
        )}

        {ativo && recusa && (
          <>
            <div
              aria-hidden="true"
              className={estilos.origem}
              style={lugar(
                posicaoDe(ativo.antes, ativo.quadro),
                CATALOGO[ativo.quadro].w,
                CATALOGO[ativo.quadro].h,
              )}
            >
              De onde o quadro saiu
            </div>
            {/* A sombra é cortada na borda do grid (5.6, passo 3): fica só a parte de dentro. */}
            {recusa.fora === null ? (
              <div
                aria-hidden="true"
                className={estilos.recusa}
                data-recusa=""
                style={recusa.estilo}
              >
                {avisoDeRecusa(ativo.quadro)}
              </div>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className={estilos.recusaFaixa}
                  data-recusa="faixa"
                  style={recusa.estilo}
                />
                <div
                  aria-hidden="true"
                  className={estilos.recusaAviso}
                  data-recusa-aviso=""
                  style={{
                    top: recusa.estilo.top,
                    [recusa.fora === 'esquerda' ? 'left' : 'right']: LARGURA_FAIXA + 8,
                  }}
                >
                  {avisoDeRecusa(ativo.quadro)}
                </div>
              </>
            )}
          </>
        )}

        <p className="somente-leitor" role="status">
          {ativo && recusa ? avisoDeRecusa(ativo.quadro) : ''}
        </p>
      </div>
    </ContextoEdicao.Provider>
  )
}

/** Onde o quadro está na montagem (ele sempre está: é o arrastado). */
function posicaoDe(montagem: Montagem, quadro: IdQuadro): Pick<ItemMontagem, 'x' | 'y'> {
  return montagem.find((item) => item.quadro === quadro) ?? { x: 0, y: 0 }
}

const medidaPx = (n: number, tamanho: number) => n * tamanho + (n - 1) * VAO

/** Largura da faixa vermelha na borda do grid quando o quadro sai todo dele (5.6, passo 3). */
const LARGURA_FAIXA = 6

type SombraDaRecusa = { estilo: CSSProperties; fora: 'esquerda' | 'direita' | null }

/**
 * Retângulo da sombra vermelha, em px dentro do grid, só com a parte que fica dentro dele (nas
 * colunas e nas linhas). Se nada dela cai no grid, vira uma faixa estreita na borda por onde o
 * quadro saiu, e o aviso aparece ao lado dela (decidido com o usuário na INI-03).
 */
function sombraCortada(ativo: Arrasto, unidade: number, linhas: number): SombraDaRecusa {
  const { w, h } = CATALOGO[ativo.quadro]
  const larguraDoGrid = medidaPx(4, unidade)
  const esquerda = ativo.coluna * (unidade + VAO)
  const inicio = Math.max(0, esquerda)
  const fim = Math.min(larguraDoGrid, esquerda + medidaPx(w, unidade))
  const linha = Math.min(ativo.linha, Math.max(0, linhas - h))
  const vertical = {
    top: linha * (ALTURA_UNIDADE + VAO),
    height: medidaPx(Math.min(h, linhas), ALTURA_UNIDADE),
  }
  if (fim > inicio)
    return { estilo: { left: inicio, width: fim - inicio, ...vertical }, fora: null }
  // A faixa e o aviso se ancoram na mesma borda da caixa real do grid (left ou right: 0).
  const fora = esquerda < 0 ? 'esquerda' : 'direita'
  return {
    estilo: { [fora === 'esquerda' ? 'left' : 'right']: 0, width: LARGURA_FAIXA, ...vertical },
    fora,
  }
}

function avisoDeRecusa(quadro: IdQuadro): string {
  const { w } = CATALOGO[quadro]
  return `Não cabe aqui: este quadro ocupa ${w} ${w === 1 ? 'coluna' : 'colunas'}.`
}
