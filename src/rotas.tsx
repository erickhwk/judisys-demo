// Rotas da demo e a permissão de cada uma (SDD §5.6, T-13). Cada módulo declara as suas em
// `src/modulos/<m>/rotas.tsx` (AJ-05; `.ts` também vale), e este arquivo só junta: módulo novo entra sem mexer aqui.
// As abas do processo saem da lista ABAS (ordem, rótulo e permissão), com o conteúdo vindo do
// módulo dono. O roteador (roteador.tsx) aplica a guarda de sessão e de permissão a todas.
import { type DefinicaoRota, type RegistroDoModulo, rota } from './definicaoRotas'
import {
  ABAS,
  type Aba,
  type ConteudoAba,
  DEFINICOES_ABAS,
  rotaDoProcesso,
} from './modulos/processos/abas'
import { TelaDoProcesso } from './modulos/processos/TelaDoProcesso'

/** O `registro` de cada `src/modulos/<m>/rotas.tsx` (ou `.ts`), por arquivo. */
const REGISTROS = Object.entries(
  import.meta.glob<RegistroDoModulo | undefined>('./modulos/*/rotas.{ts,tsx}', {
    eager: true,
    import: 'registro',
  }),
)

/**
 * Junta os registros dos módulos. Erro de programação (arquivo sem `registro`, aba fora de ABAS,
 * aba sem dono ou com dois, caminho repetido) derruba a demo na carga, com o arquivo culpado.
 */
export function juntarRegistros(registros: [arquivo: string, registro?: RegistroDoModulo][]) {
  const donosDasAbas: Partial<Record<Aba, string>> = {}
  const conteudos: Partial<Record<Aba, ConteudoAba>> = {}
  for (const [arquivo, registro] of registros) {
    if (!registro) throw new Error(`${arquivo} não exporta \`registro\``)
    for (const [aba, conteudo] of Object.entries(registro.abas ?? {})) {
      if (!(aba in DEFINICOES_ABAS)) throw new Error(`aba "${aba}" de ${arquivo} não está em ABAS`)
      const dono = donosDasAbas[aba as Aba]
      if (dono) throw new Error(`aba "${aba}" declarada em ${dono} e em ${arquivo}`)
      donosDasAbas[aba as Aba] = arquivo
      conteudos[aba as Aba] = conteudo
    }
  }
  const semConteudo = ABAS.filter((aba) => !conteudos[aba])
  if (semConteudo.length) throw new Error(`abas sem conteúdo: ${semConteudo.join(', ')}`)

  const daLista = (campo: 'rotas' | 'rotasSemLayout') =>
    registros.flatMap(([, registro]) => registro?.[campo] ?? [])
  const rotasDasAbas = ABAS.map((aba) => {
    const Conteudo = conteudos[aba] as ConteudoAba
    return rota(
      rotaDoProcesso(':id', aba),
      'ler',
      DEFINICOES_ABAS[aba].modulo,
      <TelaDoProcesso aba={aba} Conteudo={Conteudo} />,
    )
  })
  const rotas = [...daLista('rotas'), ...rotasDasAbas]
  const rotasSemLayout = daLista('rotasSemLayout')

  const vistos = new Set<string>()
  for (const { caminho } of [...rotas, ...rotasSemLayout]) {
    if (vistos.has(caminho)) throw new Error(`rota "${caminho}" registrada duas vezes`)
    vistos.add(caminho)
  }
  return { rotas, rotasSemLayout }
}

const JUNTAS = juntarRegistros(REGISTROS)

/** Telas dentro do layout (faixa, menu lateral, rodapé). */
export const ROTAS: DefinicaoRota[] = JUNTAS.rotas

/** Telas sem o layout (impressão). */
export const ROTAS_SEM_LAYOUT: DefinicaoRota[] = JUNTAS.rotasSemLayout
