// Resultado da última ação sobre prazos (criado, editado, cumprido ou o erro), anunciado ao leitor
// de tela.
import { juntarClasses } from '../../ui/classes'
import estilos from './prazos.module.css'
import type { Aviso } from './useAcoesPrazo'

export function AvisoDaAcao({ aviso }: { aviso: Aviso | null }) {
  return (
    <div role="status" aria-live="polite" className={estilos.regiaoAviso}>
      {aviso && (
        <p
          className={juntarClasses(
            estilos.aviso,
            aviso.tipo === 'erro' ? estilos.avisoErro : estilos.avisoSucesso,
          )}
        >
          {aviso.texto}
        </p>
      )}
    </div>
  )
}
