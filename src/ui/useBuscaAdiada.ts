// Texto de busca em estado local, gravado na URL depois de uma pausa na digitação (AJ-07).
// Com o campo preso direto à URL, cada tecla esperava a navegação terminar e o React devolvia o
// valor antigo ao campo no meio do caminho: digitando rápido, sobravam só as últimas letras.
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'

/** Pausa na digitação antes de gravar a busca na URL. */
export const ATRASO_BUSCA_MS = 250

/**
 * Devolve o texto do campo, o seu setter e o `limpar`. `valor` é a busca que está na URL; `gravar`
 * a põe lá. O `limpar` zera o campo, e o texto que esperava a pausa não chega à URL (AJ-18); quem
 * chama limpa a URL no mesmo handler, e é essa mudança que cancela também uma gravação de '' pendente.
 * Mudança na URL que não veio daqui (voltar, "Limpar busca") volta para o campo; o eco das
 * próprias gravações não, para não apagar o que se digitou enquanto elas chegavam.
 */
export function useBuscaAdiada(
  valor: string,
  gravar: (texto: string) => void,
  atrasoMs = ATRASO_BUSCA_MS,
): [string, (texto: string) => void, () => void] {
  const [texto, setTexto] = useState(valor)
  const [valorVisto, setValorVisto] = useState(valor)
  // Textos já mandados para a URL que ela ainda não devolveu, na ordem. Só os efeitos e o timer
  // escrevem aqui: o render só lê, e um render descartado pelo React não deixa rastro.
  const emVoo = useRef<string[]>([])
  const gravarAtual = useEffectEvent(gravar)

  if (valor !== valorVisto) {
    setValorVisto(valor)
    if (!emVoo.current.includes(valor)) setTexto(valor)
  }

  useEffect(() => {
    // Eco recebido: ele e os anteriores saíram de voo. Mudança de fora: nenhum eco vale mais.
    const eco = emVoo.current.indexOf(valor)
    emVoo.current = eco >= 0 ? emVoo.current.slice(eco + 1) : []
  }, [valor])

  useEffect(() => {
    if (texto === valor || texto === emVoo.current.at(-1)) return
    const espera = setTimeout(() => {
      emVoo.current.push(texto)
      gravarAtual(texto)
    }, atrasoMs)
    return () => clearTimeout(espera)
  }, [texto, valor, atrasoMs])

  // Com o texto vazio, o efeito acima cancela o timer: o texto que esperava a pausa não é gravado.
  const limpar = useCallback(() => setTexto(''), [])

  return [texto, setTexto, limpar]
}
