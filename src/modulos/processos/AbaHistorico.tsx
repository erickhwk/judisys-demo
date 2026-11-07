// Aba Histórico (RF-13, PER-07): os logs do processo, do mais novo ao mais antigo, 50 por página.
import { useState } from 'react'
import { useListar, useTodos } from '../../dados/contexto'
import type { Log } from '../../dados/schemas'
import { formatarDataHora } from '../../regras/datas'
import { Paginacao } from '../../ui/Paginacao'
import { type ColunaTabela, Tabela } from '../../ui/Tabela'
import { Vazio } from '../../ui/Vazio'
import { mudancasLegiveis, type Nomes, ROTULOS_ACAO, ROTULOS_COLECAO } from './historico'
import estilos from './processos.module.css'
import { plural } from './rotulos'

/** Quantas mudanças mostrar por log antes de resumir ("e mais 3"). */
const MAXIMO_MUDANCAS = 6

export function Mudancas({ log, nomes }: { log: Log; nomes: Nomes }) {
  const mudancas = mudancasLegiveis(log, nomes)
  if (mudancas.length === 0) return <span className={estilos.semMudanca}>—</span>
  const visiveis = mudancas.slice(0, MAXIMO_MUDANCAS)
  const resto = mudancas.length - visiveis.length
  return (
    <ul className={estilos.mudancas}>
      {visiveis.map((m) => (
        <li key={m.campo}>
          <strong>{m.campo}:</strong>{' '}
          {log.acao === 'criou' ? (
            m.para || 'vazio'
          ) : log.acao === 'excluiu' ? (
            m.de || 'vazio'
          ) : (
            <>
              {m.de || 'vazio'} <span aria-hidden="true">→</span>
              <span className="somente-leitor"> para </span> {m.para || 'vazio'}
            </>
          )}
        </li>
      ))}
      {resto > 0 && (
        <li className={estilos.semMudanca}>e mais {plural(resto, 'campo', 'campos')}</li>
      )}
    </ul>
  )
}

export function AbaHistorico({ processoId }: { processoId: string }) {
  const [pagina, setPagina] = useState(1)
  const logs = useListar('logs', {
    onde: { processoId },
    ordem: { campo: 'data', direcao: 'desc' },
    pagina,
  })
  const usuarios = useTodos('usuarios')
  const empresas = useTodos('empresas')
  const nomes: Nomes = {
    usuarios: new Map(usuarios.data?.map((u) => [u.id, u.nome])),
    empresas: new Map(empresas.data?.map((e) => [e.id, e.razaoSocial])),
  }

  const colunas: ColunaTabela<Log>[] = [
    {
      chave: 'data',
      titulo: 'Data',
      largura: '150px',
      numerica: true,
      celula: (log) => formatarDataHora(log.data),
    },
    {
      chave: 'usuario',
      titulo: 'Usuário',
      largura: '18%',
      celula: (log) => nomes.usuarios.get(log.usuarioId) ?? '—',
    },
    {
      chave: 'acao',
      titulo: 'Ação',
      largura: '20%',
      celula: (log) => `${ROTULOS_ACAO[log.acao]} ${ROTULOS_COLECAO[log.colecao] ?? log.colecao}`,
    },
    {
      chave: 'mudancas',
      titulo: 'Mudanças',
      celula: (log) => <Mudancas log={log} nomes={nomes} />,
    },
  ]

  const dados = logs.data
  return (
    <Tabela
      rotulo="Histórico do processo"
      colunas={colunas}
      linhas={dados?.itens ?? []}
      chaveLinha={(log) => log.id}
      topo={dados && <span>{plural(dados.total, 'registro', 'registros')}</span>}
      vazio={<Vazio titulo={logs.isSuccess ? 'Nenhum registro no histórico' : 'Carregando…'} />}
      rodape={
        dados && dados.paginas > 1 ? (
          <Paginacao pagina={dados.pagina} totalPaginas={dados.paginas} aoMudar={setPagina} />
        ) : undefined
      }
    />
  )
}
