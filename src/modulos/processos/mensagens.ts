// Mensagem de erro de gravação para a tela: regra, permissão, validação ou registro sumido.
import { ErroNaoEncontrado, ErroPermissao, ErroValidacao } from '../../dados/repositorio'
import { ErroRegra } from '../../dados/servicos/comum'

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroValidacao) {
    return erro.problemas.map((p) => p.mensagem).join(' ')
  }
  if (
    erro instanceof ErroRegra ||
    erro instanceof ErroPermissao ||
    erro instanceof ErroNaoEncontrado
  ) {
    return erro.message
  }
  return 'Não foi possível gravar. Tente de novo.'
}
