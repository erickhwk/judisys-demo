// Montagem do início guardada por usuário (SDD-INI §5.5, RF-24 a RF-26, C-03): no localStorage,
// numa chave por usuário, apagada pelo "Resetar demo". Sem localStorage (CAR-12 da demo), a
// montagem vive só na memória desta aba: vale até recarregar, sem erro na tela.
import { z } from 'zod'
import { type DependenciasCarga, localStorageDoNavegador } from '../../dados/carga'
import type { Papel } from '../../regras/permissoes'
import { type Montagem, normalizar, padraoDoPapel } from './montagem'

export const PREFIXO_MONTAGEM = 'judisys:inicio:'
const VERSAO = 1

export function chaveDaMontagem(usuarioId: string): string {
  return `${PREFIXO_MONTAGEM}${usuarioId}`
}

// O quadro fica como texto: quadro inexistente é descartado pelo `normalizar`, não invalida tudo.
const schemaGravado = z.object({
  versao: z.literal(VERSAO),
  itens: z.array(
    z.object({
      quadro: z.string(),
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
    }),
  ),
})

/** `localStorage` do navegador, ou `null` se ele não deixa usar (o mesmo da carga). */
export type FonteStorage = DependenciasCarga['localStorage']

// Concluir desta aba, por chave: vale por cima do localStorage até recarregar (MNT-06). Também
// cobre o localStorage que existe mas recusa gravar (cota, modo privado).
const memoria = new Map<string, Montagem>()

/**
 * Montagem do usuário, pronta para exibir: a salva, normalizada para o papel (INV-01), ou o padrão
 * do papel se não há montagem salva ou se ela é ilegível ou de versão desconhecida (RF-26, MNT-03).
 */
export function lerMontagem(
  usuarioId: string,
  papel: Papel,
  fonte: FonteStorage = localStorageDoNavegador,
): Montagem {
  const chave = chaveDaMontagem(usuarioId)
  const daAba = memoria.get(chave)
  if (daAba) return normalizar(daAba, papel)
  const salva = lerGravada(fonte(), chave)
  return salva ? normalizar(salva.itens, papel) : padraoDoPapel(papel)
}

function lerGravada(storage: Storage | null, chave: string) {
  let texto: string | null
  try {
    texto = storage?.getItem(chave) ?? null
  } catch {
    return null
  }
  if (texto === null) return null
  try {
    const lido = schemaGravado.safeParse(JSON.parse(texto))
    return lido.success ? lido.data : null
  } catch {
    return null
  }
}

/** Grava a montagem do usuário. Só o Concluir chama (RF-22, INV-03). Não lança. */
export function gravarMontagem(
  usuarioId: string,
  montagem: Montagem,
  fonte: FonteStorage = localStorageDoNavegador,
): void {
  const chave = chaveDaMontagem(usuarioId)
  const itens = montagem.map(({ quadro, x, y }) => ({ quadro, x, y }))
  memoria.set(chave, itens)
  try {
    fonte()?.setItem(chave, JSON.stringify({ versao: VERSAO, itens }))
  } catch {
    // Sem localStorage: fica só a cópia da aba.
  }
}

/** Apaga as montagens de todos os usuários (RF-25). O `resetarDemo` do boot chama. Não lança. */
export function apagarMontagens(fonte: FonteStorage = localStorageDoNavegador): void {
  memoria.clear()
  try {
    const storage = fonte()
    if (!storage) return
    const chaves: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const chave = storage.key(i)
      if (chave?.startsWith(PREFIXO_MONTAGEM)) chaves.push(chave)
    }
    for (const chave of chaves) storage.removeItem(chave)
  } catch {
    // Sem localStorage não há o que apagar fora da aba.
  }
}
