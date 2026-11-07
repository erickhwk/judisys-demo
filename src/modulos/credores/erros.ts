// Mensagem de falha de gravação para a tela, em linguagem de usuário.
import { ErroNaoEncontrado, ErroPermissao, ErroValidacao } from '../../dados/repositorio'
import { ErroRegra } from '../../dados/servicos/comum'

export function mensagemDeErro(falha: unknown): string {
  if (
    falha instanceof ErroRegra ||
    falha instanceof ErroPermissao ||
    falha instanceof ErroNaoEncontrado ||
    falha instanceof ErroValidacao
  ) {
    return falha.message
  }
  console.error(falha)
  return 'Não foi possível gravar. Tente de novo.'
}
