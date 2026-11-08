// Destaque do quadro dentro do corpo, no celular (INI-08): de 288 a 360px de largura, o título, o
// destaque e o link não cabem numa linha só do cabeçalho, e o título perdia o fim. No celular o
// quadro passa o destaque para cá, em cima do gráfico, com uma frase curta que diz o que ele soma.
import estilos from './ResumoNoCorpo.module.css'

export function ResumoNoCorpo({ numero, texto }: { numero: string; texto: string }) {
  return (
    <p className={estilos.resumo}>
      <b className={estilos.numero}>{numero}</b> {texto}
    </p>
  )
}
