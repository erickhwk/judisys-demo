// Tabela papel × permissões (RF-39), montada a partir de `PERMISSOES`: mudar a regra muda a tela.
import { MODULOS, type Modulo, PAPEIS, PERMISSOES } from '../../regras/permissoes'
import { Selo } from '../../ui/Selo'
import { type ColunaTabela, Tabela } from '../../ui/Tabela'
import { NOMES_PAPEIS } from '../entrada/papeis'
import { ROTULOS_MODULO, ROTULOS_NIVEL, TONS_NIVEL } from './permissoes'

const COLUNAS: ColunaTabela<Modulo>[] = [
  {
    chave: 'modulo',
    titulo: 'Módulo',
    largura: '40%',
    destaque: true,
    celula: (modulo) => ROTULOS_MODULO[modulo],
  },
  ...PAPEIS.map(
    (papel): ColunaTabela<Modulo> => ({
      chave: papel,
      titulo: NOMES_PAPEIS[papel],
      largura: '20%',
      celula: (modulo) => {
        const nivel = PERMISSOES[modulo][papel]
        return <Selo tom={TONS_NIVEL[nivel]}>{ROTULOS_NIVEL[nivel]}</Selo>
      },
    }),
  ),
]

export function TabelaPermissoes() {
  return (
    <Tabela
      rotulo="Tabela de permissões"
      colunas={COLUNAS}
      linhas={[...MODULOS]}
      chaveLinha={(modulo) => modulo}
      larguraMinima={720}
    />
  )
}
