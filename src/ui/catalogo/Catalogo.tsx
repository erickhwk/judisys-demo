/*
 * Catálogo dos componentes de `ui/`, só em desenvolvimento:
 * `pnpm dev` → http://localhost:5173/#/catalogo
 * Não entra no build de produção (a rota em roteador.tsx depende de `import.meta.env.DEV`).
 * Os dados são fictícios e os valores já vêm formatados como texto.
 */
import { Pencil, Plus, Trash } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Botao, BotaoIcone } from '../Botao'
import { BotaoTema } from '../BotaoTema'
import { CampoAreaTexto, CampoMarcacao, CampoSelecao, CampoTexto } from '../Campo'
import { Confirmacao } from '../Confirmacao'
import { Dialogo } from '../Dialogo'
import { Erro } from '../Erro'
import { CampoBusca, Filtros } from '../Filtros'
import { Formulario, SecaoFormulario } from '../Formulario'
import { Logo } from '../Logo'
import { Paginacao } from '../Paginacao'
import { Selo } from '../Selo'
import { AcoesLinha, type ColunaTabela, Tabela } from '../Tabela'
import { Vazio } from '../Vazio'
import { VisualizadorPdf } from '../VisualizadorPdf'
import estilos from './Catalogo.module.css'
import { CatalogoGraficos } from './CatalogoGraficos'

type ProcessoExemplo = {
  id: string
  apelido: string
  cnj: string
  tipo: 'Falência' | 'Recuperação Judicial'
  fase: string
  valor: string
}

const processos: ProcessoExemplo[] = [
  {
    id: 'prc-001',
    apelido: 'Metalúrgica Horizonte Ltda.',
    cnj: '0001234-56.2024.8.19.0001',
    tipo: 'Recuperação Judicial',
    fase: 'Plano apresentado',
    valor: 'R$ 12.345.678,90',
  },
  {
    id: 'prc-002',
    apelido: 'Transportes Vale Azul S.A.',
    cnj: '0009876-54.2023.8.19.0021',
    tipo: 'Falência',
    fase: 'Edital publicado',
    valor: 'R$ 845.120,00',
  },
  {
    id: 'prc-003',
    apelido: 'Comércio de Alimentos Boa Mesa Ltda. — nome longo para testar a quebra de linha',
    cnj: '0004567-89.2022.8.19.0042',
    tipo: 'Recuperação Judicial',
    fase: 'AGC convocada',
    valor: 'R$ 3.210,55',
  },
]

const cores = [
  'azul-900',
  'azul-800',
  'azul-700',
  'azul-login',
  'dourado-500',
  'dourado-200',
  'dourado-700',
  'dourado-claro',
  'fundo',
  'superficie',
  'borda',
  'texto-muted',
  'perigo',
  'sucesso',
  'alerta',
]

export function Catalogo() {
  const [pagina, setPagina] = useState(1)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [dialogoAberto, setDialogoAberto] = useState(false)
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false)
  const [ultimaAcao, setUltimaAcao] = useState('nenhuma')
  const urlPdf = useUrlPdfExemplo()

  const colunas: ColunaTabela<ProcessoExemplo>[] = [
    {
      chave: 'apelido',
      titulo: 'Nome principal',
      largura: '30%',
      destaque: true,
      celula: (p) => p.apelido,
    },
    {
      chave: 'cnj',
      titulo: 'Número do processo',
      largura: '23%',
      numerica: true,
      celula: (p) => p.cnj,
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      largura: '20%',
      celula: (p) => (
        <Selo forma="pilula" tom={p.tipo === 'Falência' ? 'azul' : 'dourado'}>
          {p.tipo}
        </Selo>
      ),
    },
    {
      chave: 'valor',
      titulo: 'Valor',
      largura: '15%',
      alinhar: 'direita',
      numerica: true,
      celula: (p) => p.valor,
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      largura: '12%',
      alinhar: 'direita',
      celula: (p) => (
        <AcoesLinha>
          <BotaoIcone aria-label={`Editar ${p.apelido}`} icone={<Pencil size={18} />} />
          <BotaoIcone
            aria-label={`Excluir ${p.apelido}`}
            icone={<Trash size={18} />}
            perigo
            onClick={() => setConfirmacaoAberta(true)}
          />
        </AcoesLinha>
      ),
    },
  ]

  return (
    <main className={estilos.catalogo}>
      <header className={estilos.cabecalho}>
        <div className={estilos.topo}>
          <Logo altura={52} />
          <BotaoTema />
        </div>
        <h1>Catálogo de componentes</h1>
        <p className={estilos.apoio}>
          Página só de desenvolvimento (DMO-09). Confira foco (Tab), alvos de 44px, rolagem da
          tabela em tela estreita e a impressão (Ctrl+P).
        </p>
      </header>

      <Secao titulo="Cores (tokens.css)">
        <ul className={estilos.cores}>
          {cores.map((cor) => (
            <li key={cor} className={estilos.cor}>
              <span className={estilos.amostra} style={{ background: `var(--cor-${cor})` }} />
              <code>--cor-{cor}</code>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Logos">
        <div className={estilos.linha}>
          <Logo altura={52} />
          <Logo variante="marca" altura={52} />
          <div className={estilos.fundoEscuro}>
            <Logo fundo="escuro" altura={38} />
            <Logo variante="marca" fundo="escuro" altura={38} />
          </div>
        </div>
      </Secao>

      <Secao titulo="Botões">
        <div className={estilos.linha}>
          <Botao variante="primario" icone={<Plus size={18} />}>
            Novo processo
          </Botao>
          <Botao>Exportar CSV</Botao>
          <Botao variante="fantasma">Limpar busca</Botao>
          <Botao variante="perigo">Excluir</Botao>
          <Botao variante="primario" disabled>
            Desabilitado
          </Botao>
          <BotaoIcone aria-label="Editar exemplo" icone={<Pencil size={18} />} />
          <BotaoIcone aria-label="Excluir exemplo" icone={<Trash size={18} />} perigo />
        </div>
      </Secao>

      <Secao titulo="Selos">
        <div className={estilos.linha}>
          <Selo tom="azul">MCAA</Selo>
          <Selo tom="dourado">Ethos</Selo>
          <Selo tom="sucesso">cumprido</Selo>
          <Selo tom="alerta">urgente</Selo>
          <Selo tom="perigo">vencido</Selo>
          <Selo>normal</Selo>
          <Selo forma="pilula" tom="azul">
            Falência
          </Selo>
          <Selo forma="pilula" tom="dourado">
            Recuperação Judicial
          </Selo>
          <Selo forma="pilula" tom="sucesso">
            publicado no site
          </Selo>
        </div>
      </Secao>

      <Secao titulo="Filtros, tabela e paginação">
        <div className={estilos.pilha}>
          <Filtros
            aoLimpar={() => {
              setBusca('')
              setTipo('')
            }}
          >
            <CampoBusca
              rotulo="Buscar por apelido, CNJ ou empresa"
              placeholder="Apelido, CNJ ou empresa"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <CampoSelecao
              rotulo="Tipo de processo"
              rotuloOculto
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Tipo de processo</option>
              <option value="falencia">Falência</option>
              <option value="rj">Recuperação Judicial</option>
            </CampoSelecao>
          </Filtros>
          <Tabela
            rotulo="Processos (exemplo)"
            colunas={colunas}
            linhas={processos}
            chaveLinha={(p) => p.id}
            topo={<span>Mostrando 1–3 de 95</span>}
            rodape={<Paginacao pagina={pagina} totalPaginas={10} aoMudar={setPagina} />}
          />
          <Tabela
            rotulo="Lista vazia (exemplo)"
            colunas={colunas}
            linhas={[]}
            chaveLinha={(p) => p.id}
            vazio={
              <Vazio
                titulo="Nenhum processo encontrado"
                descricao="Ajuste a busca ou os filtros para ver outros processos."
                acao={<Botao variante="fantasma">Limpar busca</Botao>}
              />
            }
          />
        </div>
      </Secao>

      <Secao titulo="Formulário em seções">
        <Formulario
          onSubmit={(e) => {
            e.preventDefault()
            setUltimaAcao('formulário enviado')
          }}
          acoes={
            <>
              <Botao>Voltar para os processos</Botao>
              <Botao variante="primario" type="submit">
                Salvar
              </Botao>
            </>
          }
        >
          <SecaoFormulario
            titulo="Informações principais"
            descricao="Identificação do processo e datas relevantes."
          >
            <CampoTexto rotulo="Apelido" colunas={6} obrigatorio placeholder="Ex.: RJ Horizonte" />
            <CampoTexto
              rotulo="Número do processo"
              colunas={3}
              placeholder="0000000-00.0000.8.00.0000"
              erro="Número CNJ inválido (dígito verificador)."
            />
            <CampoTexto rotulo="Data do pedido" colunas={3} type="date" />
            <CampoSelecao rotulo="Tipo" colunas={3}>
              <option>Recuperação Judicial</option>
              <option>Falência</option>
            </CampoSelecao>
            <CampoTexto
              rotulo="Valor da causa"
              colunas={3}
              inputMode="decimal"
              ajuda="Em reais, com vírgula nos centavos."
            />
            <CampoAreaTexto rotulo="Observações" colunas={6} />
            <CampoMarcacao rotulo="Publicado no site" colunas={6} />
          </SecaoFormulario>
        </Formulario>
        <p className={estilos.apoio}>Última ação: {ultimaAcao}</p>
      </Secao>

      <Secao titulo="Diálogo e confirmação">
        <div className={estilos.linha}>
          <Botao onClick={() => setDialogoAberto(true)}>Abrir diálogo</Botao>
          <Botao variante="perigo" onClick={() => setConfirmacaoAberta(true)}>
            Desfazer marco
          </Botao>
        </div>
        <Dialogo
          aberto={dialogoAberto}
          aoFechar={() => setDialogoAberto(false)}
          titulo="Avançar fase"
          acoes={
            <>
              <Botao onClick={() => setDialogoAberto(false)}>Cancelar</Botao>
              <Botao
                variante="primario"
                onClick={() => {
                  setDialogoAberto(false)
                  setUltimaAcao('fase avançada')
                }}
              >
                Avançar
              </Botao>
            </>
          }
        >
          <div className={estilos.pilha}>
            <CampoSelecao rotulo="Próxima fase">
              <option>Plano apresentado</option>
              <option>AGC convocada</option>
            </CampoSelecao>
            <CampoTexto rotulo="Data do marco" type="date" />
          </div>
        </Dialogo>
        <Confirmacao
          aberto={confirmacaoAberta}
          titulo="Desfazer “Plano apresentado”?"
          mensagem="Serão removidos 1 prazo aberto: Objeções ao plano."
          rotuloConfirmar="Desfazer"
          perigo
          aoCancelar={() => {
            setConfirmacaoAberta(false)
            setUltimaAcao('confirmação cancelada')
          }}
          aoConfirmar={() => {
            setConfirmacaoAberta(false)
            setUltimaAcao('confirmação aceita')
          }}
        />
      </Secao>

      <Secao titulo="Vazio e erro">
        <div className={estilos.pilha}>
          <Vazio
            titulo="Nenhum prazo nesta semana"
            descricao="Os prazos vencidos aparecem no topo."
          />
          <Erro
            titulo="Seu papel não permite esta ação"
            mensagem="Analistas só leem os processos. Troque de papel para editar."
            acao={<Botao>Voltar ao dashboard</Botao>}
          />
        </div>
      </Secao>

      <Secao titulo="Gráficos em SVG (ui/graficos)">
        <CatalogoGraficos />
      </Secao>

      <Secao titulo="Visualizador de PDF">
        {urlPdf && (
          <VisualizadorPdf
            url={urlPdf}
            titulo="Relatório mensal de atividades (exemplo)"
            altura={360}
          />
        )}
      </Secao>
    </main>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={estilos.secao}>
      <h2 className={estilos.tituloSecao}>{titulo}</h2>
      {children}
    </section>
  )
}

/** PDF mínimo de uma página, como blob, só para o catálogo. */
function useUrlPdfExemplo() {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    const criada = URL.createObjectURL(new Blob([pdfMinimo()], { type: 'application/pdf' }))
    setUrl(criada)
    return () => URL.revokeObjectURL(criada)
  }, [])
  return url
}

function pdfMinimo() {
  const texto = 'BT /F1 24 Tf 72 760 Td (Judisys - PDF de exemplo) Tj ET'
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${texto.length} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let corpo = '%PDF-1.4\n'
  const posicoes: number[] = []
  objetos.forEach((objeto, i) => {
    posicoes.push(corpo.length)
    corpo += `${i + 1} 0 obj\n${objeto}\nendobj\n`
  })
  const inicioXref = corpo.length
  corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  for (const posicao of posicoes) corpo += `${String(posicao).padStart(10, '0')} 00000 n \n`
  corpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`
  return corpo
}
