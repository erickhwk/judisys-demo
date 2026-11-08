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

// Teto das linhas: os 12 quadros empilhados ocupam no máximo 24. Uma linha absurda (chave editada à
// mão) invalidaria a grade e faria o `primeiroLugarLivre` percorrer milhões de linhas.
const LINHA_MAXIMA = 100

// O quadro fica como texto: quadro inexistente é descartado pelo `normalizar`, não invalida tudo.
const schemaGravado = z.object({
  versao: z.literal(VERSAO),
  itens: z.array(
    z.object({
      quadro: z.string(),
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative().max(LINHA_MAXIMA),
    }),
  ),
})

/** `localStorage` do navegador, ou `null` se ele não deixa usar (o mesmo da carga). */
export type FonteStorage = DependenciasCarga['localStorage']

// Concluir desta aba que o localStorage não guardou (ausente ou recusando gravar: cota, modo
// privado), por chave: vale até recarregar (MNT-06). Gravação que deu certo não fica aqui, para o
// reset feito noutra aba valer também nesta.
const memoria = new Map<string, Montagem>()

/**
 * Montagem do usuário, pronta para exibir: a salva, normalizada para o papel (INV-01), ou o padrão
 * do papel se não há montagem salva, se ela é ilegível ou de versão desconhecida (RF-26, MNT-03), ou
 * se todos os quadros dela foram descartados (MNT-08). A montagem salva vazia de propósito (PRS-11)
 * continua vazia.
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
  // O padrão também passa pelo filtro do papel (S-05): vale se o RF-39 mudar.
  return normalizar(salva ? salva.itens : padraoDoPapel(papel), papel)
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
  try {
    const storage = fonte()
    if (storage) {
      storage.setItem(chave, JSON.stringify({ versao: VERSAO, itens }))
      memoria.delete(chave)
      return
    }
  } catch {
    // O localStorage recusou: fica a cópia da aba.
  }
  memoria.set(chave, itens)
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
