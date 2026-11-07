// Aba Empresas (RF-13): as devedoras do processo, com link para a tela de cada uma.
import { Link } from 'react-router'
import { useTodos } from '../../dados/contexto'
import type { Tipos } from '../../dados/schemas'
import { formatarCnpj } from '../../regras/documentos'
import { type ColunaTabela, Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import { plural } from './rotulos'

type Empresa = Tipos['empresas']

const PORTES: Record<Empresa['porte'], string> = { me: 'ME', epp: 'EPP', demais: 'Demais' }

const COLUNAS: ColunaTabela<Empresa>[] = [
  {
    chave: 'razaoSocial',
    titulo: 'Razão social',
    largura: '34%',
    destaque: true,
    celula: (e) => <Link to={`/empresas/${e.id}`}>{e.razaoSocial}</Link>,
  },
  {
    chave: 'fantasia',
    titulo: 'Nome fantasia',
    largura: '20%',
    celula: (e) => e.nomeFantasia || '—',
  },
  {
    chave: 'cnpj',
    titulo: 'CNPJ',
    largura: '20%',
    numerica: true,
    celula: (e) => formatarCnpj(e.cnpj),
  },
  { chave: 'cidade', titulo: 'Cidade', largura: '16%', celula: (e) => `${e.cidade}/${e.uf}` },
  { chave: 'porte', titulo: 'Porte', largura: '10%', celula: (e) => PORTES[e.porte] },
]

export function AbaEmpresas({ processoId }: { processoId: string }) {
  const vinculos = useTodos('processoEmpresas', { onde: { processoId } })
  const empresas = useTodos('empresas', { ordem: { campo: 'razaoSocial', direcao: 'asc' } })
  const ids = new Set(vinculos.data?.map((v) => v.empresaId))
  const doProcesso = (empresas.data ?? []).filter((e) => ids.has(e.id))
  const carregado = vinculos.isSuccess && empresas.isSuccess

  return (
    <Tabela
      rotulo="Empresas do processo"
      colunas={COLUNAS}
      linhas={doProcesso}
      chaveLinha={(e) => e.id}
      topo={carregado && <span>{plural(doProcesso.length, 'empresa', 'empresas')}</span>}
      vazio={<Vazio titulo={carregado ? 'Nenhuma empresa ligada ao processo' : 'Carregando…'} />}
    />
  )
}
