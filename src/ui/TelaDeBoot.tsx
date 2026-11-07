// Telas de antes das rotas (DMO-08, SDD §5.5): carregando o seed e erro da carga (CAR-08/09).
import { RotateCcw } from 'lucide-react'
import { Botao } from './Botao'
import { Erro } from './Erro'
import { Logo } from './Logo'
import estilos from './TelaDeBoot.module.css'

export function TelaCarregando() {
  return (
    <main className={estilos.tela} aria-busy="true">
      <Logo altura={52} />
      <p className={estilos.carregando} role="status">
        <span className={estilos.indicador} aria-hidden="true" />
        Carregando a demo…
      </p>
    </main>
  )
}

export type PropsTelaErroCarga = {
  titulo: string
  onTentarDeNovo: () => void
}

export function TelaErroCarga({ titulo, onTentarDeNovo }: PropsTelaErroCarga) {
  return (
    <main className={estilos.tela}>
      <Logo altura={52} />
      <div className={estilos.erro}>
        <Erro
          titulo={titulo}
          mensagem="Os dados da demo não chegaram completos. Confira a conexão e tente de novo."
          acao={
            <Botao variante="primario" icone={<RotateCcw size={18} />} onClick={onTentarDeNovo}>
              Tentar de novo
            </Botao>
          }
        />
      </div>
    </main>
  )
}
