// Rotas da demo e a permissão de cada uma (SDD §5.6, T-13). Cada módulo declara as suas em
// `src/modulos/<m>/rotas.tsx` (AJ-05), e este arquivo só junta: módulo novo entra sem mexer aqui.
// As abas do processo saem da lista ABAS (ordem, rótulo e permissão), com o conteúdo vindo do
// módulo dono. O roteador (roteador.tsx) aplica a guarda de sessão e de permissão a todas.
import { type DefinicaoRota, type RegistroDoModulo, rota } from './definicaoRotas'
import { ABAS, type Aba, type ConteudoAba, DEFINICOES_ABAS } from './modulos/processos/abas'
import { TelaDoProcesso } from './modulos/processos/TelaDoProcesso'

/** O `registro` de cada `src/modulos/<m>/rotas.tsx`, por arquivo. */
const REGISTROS = Object.entries(
  import.meta.glob<RegistroDoModulo>('./modulos/*/rotas.tsx', { eager: true, import: 'registro' }),
)

/**
 * O conteúdo de cada aba, pelo módulo que a declara. Aba sem dono, ou com dois, é erro de
 * programação: a demo nem sobe, e a suíte acusa.
 */
export function juntarConteudosDasAbas(
  registros: [arquivo: string, registro: RegistroDoModulo][],
): Record<Aba, ConteudoAba> {
  const achadas: Partial<Record<Aba, { arquivo: string; conteudo: ConteudoAba }>> = {}
  for (const [arquivo, registro] of registros) {
    for (const [aba, conteudo] of Object.entries(registro.abas ?? {}) as [Aba, ConteudoAba][]) {
      const anterior = achadas[aba]
      if (anterior) throw new Error(`aba "${aba}" declarada em ${anterior.arquivo} e em ${arquivo}`)
      achadas[aba] = { arquivo, conteudo }
    }
  }
  const semConteudo = ABAS.filter((aba) => !achadas[aba])
  if (semConteudo.length) throw new Error(`abas sem conteúdo: ${semConteudo.join(', ')}`)
  return Object.fromEntries(ABAS.map((aba) => [aba, achadas[aba]?.conteudo])) as Record<
    Aba,
    ConteudoAba
  >
}

const CONTEUDOS_DAS_ABAS = juntarConteudosDasAbas(REGISTROS)

const ROTAS_DAS_ABAS = ABAS.map((aba) =>
  rota(
    `/processos/:id/${aba}`,
    'ler',
    DEFINICOES_ABAS[aba].modulo,
    <TelaDoProcesso aba={aba} Conteudo={CONTEUDOS_DAS_ABAS[aba]} />,
  ),
)

/** Telas dentro do layout (faixa, menu lateral, rodapé). */
export const ROTAS: DefinicaoRota[] = [
  ...REGISTROS.flatMap(([, registro]) => registro.rotas ?? []),
  ...ROTAS_DAS_ABAS,
]

/** Telas sem o layout (impressão). */
export const ROTAS_SEM_LAYOUT: DefinicaoRota[] = REGISTROS.flatMap(
  ([, registro]) => registro.rotasSemLayout ?? [],
)
