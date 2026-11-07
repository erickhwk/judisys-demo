// Faixa fixa no topo (RF-01): aviso de dados fictícios, Resetar demo (RF-02) e Falar com a Draft;
// abaixo, os avisos de versão (RF-03, dispensável), de modo memória (CAR-10) e de banco fechado.
import { MessageCircle, RefreshCw, RotateCcw, X } from 'lucide-react'
import { useContext } from 'react'
import { useDemo } from '../dados/boot'
import { MENSAGEM_MEMORIA, MENSAGEM_VERSAO } from '../dados/carga'
import { MENSAGEM_BANCO_FECHADO } from '../dados/conexao'
import estilos from './FaixaDemo.module.css'
import { BancoFechado, useMoldura } from './Moldura'

const MENSAGEM_WHATSAPP =
  'Olá! Vi a demonstração do Judisys e quero conversar sobre o sistema para o meu escritório.'

/** Link do WhatsApp da Draft com a mensagem pronta (RF-01). */
export const LINK_WHATSAPP = `https://wa.me/5511999606775?text=${encodeURIComponent(MENSAGEM_WHATSAPP)}`

export function FaixaDemo() {
  const { avisoVersao, modoMemoria, dispensarAvisoVersao } = useDemo()
  const { pedirReset } = useMoldura()
  const bancoFechado = useContext(BancoFechado).fechado

  return (
    <section className={`${estilos.faixa} nao-imprimir`} aria-label="Demonstração">
      <div className={estilos.principal}>
        <p className={estilos.rotulo}>
          <span className={estilos.ponto} aria-hidden="true" />
          Ambiente de demonstração · dados fictícios
        </p>
        <div className={estilos.acoes}>
          <button type="button" className={estilos.botao} onClick={pedirReset}>
            <RotateCcw size={16} aria-hidden="true" />
            Resetar demo
          </button>
          <a
            className={`${estilos.botao} ${estilos.destaque}`}
            href={LINK_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Falar com a Draft
          </a>
        </div>
      </div>
      {(avisoVersao || modoMemoria || bancoFechado) && (
        <div className={estilos.avisos}>
          {bancoFechado && (
            <p className={estilos.aviso} role="alert">
              <span>{MENSAGEM_BANCO_FECHADO}</span>
              <button type="button" className={estilos.link} onClick={() => location.reload()}>
                <RefreshCw size={14} aria-hidden="true" />
                Recarregar
              </button>
            </p>
          )}
          {avisoVersao && (
            <p className={estilos.aviso} role="status">
              <span>{MENSAGEM_VERSAO}</span>
              <button
                type="button"
                className={estilos.dispensar}
                aria-label="Dispensar aviso"
                onClick={dispensarAvisoVersao}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </p>
          )}
          {modoMemoria && (
            <p className={estilos.aviso} role="status">
              <span>Armazenamento do navegador indisponível: {MENSAGEM_MEMORIA}.</span>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
