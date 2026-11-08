// Grade montável do início (SDD-INI §5.3 e §5.6): 4 colunas a partir de 976px de contêiner, 2
// colunas de 600 a 975px (a montagem do desktop empacotada, S-03) e a lista do celular abaixo disso.
// Grid próprio (Q-01, S-11): CSS grid com a posição explícita de cada quadro, então os buracos
// ficam (S-04), e arrastar por pointer events, só no modo de edição e só em 4 colunas (INV-06).
//
// Arrasto (RF-19): a cada movimento, a célula pretendida vem do ponteiro (`arrasto.ts`). Se o quadro
// sai do grid, a sombra fica vermelha, cortada na borda, com o aviso em `role="status"`, e soltar
// devolve o rascunho de antes. Se cabe, a prévia é a montagem de antes com o quadro solto ali e quem
// ficaria por baixo empurrado para baixo; soltar aceita a prévia.
import {
  type CSSProperties,
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

function QuadroNaGrade({ id, variante }: { id: IdQuadro; variante: Variante }) {
  const Componente = QUADROS[id]
  return <Componente variante={variante} />
}

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
  inicioX: number
  inicioY: number
  /** Ponteiro dentro do quadro, a partir do canto de cima à esquerda. */
  deslocamentoX: number
  deslocamentoY: number
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
  const linhas = base(exibida) + (editando ? 1 : 0)
  const unidade = larguraDaUnidade(largura, 4)
  const unidadeRef = useRef(unidade)
  unidadeRef.current = unidade
  const arrastando = arrasto !== null

  // Sai da edição no meio do arrasto (Cancelar não dá, mas o contêiner pode encolher): esquece.
  useEffect(() => {
    if (!editando) atualizar(null)
  }, [editando, atualizar])

  useEffect(() => {
    if (!arrastando) return
    const mover = (evento: globalThis.PointerEvent) => {
      const atual = arrastoRef.current
      const grade = gradeRef.current
      if (!atual || !grade) return
      const dx = evento.clientX - atual.inicioX
      const dy = evento.clientY - atual.inicioY
      if (!atual.ativo && Math.hypot(dx, dy) < LIMIAR_ARRASTO) return
      evento.preventDefault()
      const caixa = grade.getBoundingClientRect()
      atualizar({
        ...atual,
        ativo: true,
        dx,
        dy,
        coluna: colunaPretendida(
          evento.clientX,
          atual.deslocamentoX,
          caixa.left,
          unidadeRef.current,
        ),
        linha: linhaPretendida(evento.clientY, atual.deslocamentoY, caixa.top),
      })
    }
    const largar = () => {
      const atual = arrastoRef.current
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
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', largar)
      window.removeEventListener('pointercancel', desistir)
      window.removeEventListener('keydown', tecla)
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

  const edicao: EdicaoDaGrade = {
    editando,
    tirar: (quadro) => {
      focarTirar.current = ordem.findIndex((item) => item.quadro === quadro)
      aoMudar?.(montagem.filter((item) => item.quadro !== quadro))
    },
    pegar: (quadro, evento: PointerEvent<HTMLElement>) => {
      if (!editando || evento.button !== 0) return
      const celula = evento.currentTarget.closest('[data-celula]')
      if (!celula) return
      evento.preventDefault()
      const caixa = celula.getBoundingClientRect()
      const item = montagem.find((i) => i.quadro === quadro)
      atualizar({
        quadro,
        antes: montagem,
        inicioX: evento.clientX,
        inicioY: evento.clientY,
        deslocamentoX: evento.clientX - caixa.left,
        deslocamentoY: evento.clientY - caixa.top,
        ativo: false,
        dx: 0,
        dy: 0,
        coluna: item?.x ?? 0,
        linha: item?.y ?? 0,
      })
    },
  }

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

        {ativo && recusado && (
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
            <div
              aria-hidden="true"
              className={estilos.recusa}
              data-recusa=""
              style={sombraCortada(ativo, unidade)}
            >
              {avisoDeRecusa(ativo.quadro)}
            </div>
          </>
        )}

        <p className="somente-leitor" role="status">
          {ativo && recusado ? avisoDeRecusa(ativo.quadro) : ''}
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

/** Retângulo da sombra vermelha, em px dentro do grid, só com a parte que fica dentro dele. */
function sombraCortada(ativo: Arrasto, unidade: number): CSSProperties {
  const { w, h } = CATALOGO[ativo.quadro]
  const larguraDoGrid = medidaPx(4, unidade)
  const esquerda = ativo.coluna * (unidade + VAO)
  const inicio = Math.max(0, esquerda)
  const fim = Math.min(larguraDoGrid, esquerda + medidaPx(w, unidade))
  return {
    left: inicio,
    top: Math.min(ativo.linha, base(ativo.antes)) * (ALTURA_UNIDADE + VAO),
    width: Math.max(0, fim - inicio),
    height: medidaPx(h, ALTURA_UNIDADE),
  }
}

function avisoDeRecusa(quadro: IdQuadro): string {
  const { w } = CATALOGO[quadro]
  return `Não cabe aqui: este quadro ocupa ${w} ${w === 1 ? 'coluna' : 'colunas'}.`
}
