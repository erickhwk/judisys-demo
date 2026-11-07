// Texto de busca em estado local, gravado na URL depois de uma pausa na digitação (AJ-07).
// Com o campo preso direto à URL, cada tecla esperava a navegação terminar e o React devolvia o
// valor antigo ao campo no meio do caminho: digitando rápido, sobravam só as últimas letras.
import { useEffect, useRef, useState } from 'react'

/** Pausa na digitação antes de gravar a busca na URL. */
export const ATRASO_BUSCA_MS = 250

/**
 * Devolve o texto do campo e o seu setter. `valor` é a busca que está na URL; `gravar` a põe lá.
 * Mudança na URL que não veio daqui (voltar, "Limpar busca") volta para o campo; o eco da
 * própria gravação não, para não apagar o que se digitou enquanto ela chegava.
 */
export function useBuscaAdiada(
  valor: string,
  gravar: (texto: string) => void,
  atrasoMs = ATRASO_BUSCA_MS,
): [string, (texto: string) => void] {
  const [texto, setTexto] = useState(valor)
  const [valorVisto, setValorVisto] = useState(valor)
  const gravado = useRef(valor)
  const gravarAtual = useRef(gravar)

  useEffect(() => {
    gravarAtual.current = gravar
  })

  if (valor !== valorVisto) {
    setValorVisto(valor)
    if (valor !== gravado.current) {
      gravado.current = valor
      setTexto(valor)
    }
  }

  useEffect(() => {
    if (texto === gravado.current) return
    const espera = setTimeout(() => {
      gravado.current = texto
      gravarAtual.current(texto)
    }, atrasoMs)
    return () => clearTimeout(espera)
  }, [texto, atrasoMs])

  return [texto, setTexto]
}
