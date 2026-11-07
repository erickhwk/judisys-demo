// Formulário de informe (RF-18 a RF-21): categorias do `mcaa-app`, "Data da AGC" só em Atas de AGC,
// fase preenchida com a do processo (editável), "publicado no site" e anexos de até 10 MB. Grava
// pelo serviço `salvarInforme`, numa transação; cota cheia mostra a mensagem do CAR-11.
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, FileText, Upload, X } from 'lucide-react'
import { type ChangeEvent, useEffect, useId, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { ehErroDeCota, MENSAGEM_COTA } from '../../dados/carga'
import { useServico, useTodos } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import { type Anexo, CATEGORIAS_INFORME, type Tipos } from '../../dados/schemas'
import { salvarInforme } from '../../dados/servicos/informes'
import { fasesDoTipo, ROTULOS_FASE } from '../../regras/fases'
import { hoje } from '../../regras/relogio'
import { Botao, BotaoIcone } from '../../ui/Botao'
import { Campo, CampoMarcacao, CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Erro } from '../../ui/Erro'
import { Formulario, SecaoFormulario } from '../../ui/Formulario'
import { CabecalhoPagina } from '../credores/CabecalhoPagina'
import {
  CAMPOS_FORMULARIO,
  CATEGORIAS,
  chaveDoAnexo,
  dadosDoFormulario,
  erroDoArquivo,
  formatarTamanho,
  type Informe,
  schemaFormularioInforme,
  type ValoresInforme,
  valoresDoInforme,
  valoresIniciais,
} from './informes'
import estilos from './informes.module.css'

type Processo = Tipos['processos']

/** `#/informes/novo`, com `?processo=<id>` vindo da aba do processo. */
export function NovoInforme() {
  const [parametros] = useSearchParams()
  const processoId = parametros.get('processo') ?? undefined
  return (
    <div className={estilos.tela}>
      <CabecalhoPagina
        migalhas={[{ rotulo: 'Informes', para: '/informes' }, { rotulo: 'Novo informe' }]}
        titulo="Novo informe"
        acoes={<Voltar para={processoId ? `/processos/${processoId}/informes` : '/informes'} />}
      />
      <CamposInforme processoId={processoId} />
    </div>
  )
}

export function Voltar({ para }: { para: string }) {
  const navegar = useNavigate()
  return (
    <Botao icone={<ArrowLeft size={18} />} onClick={() => navegar(para)}>
      Voltar
    </Botao>
  )
}

export function CamposInforme({
  informe,
  processoId,
  aoCancelar,
}: {
  /** Na edição. */
  informe?: Informe
  /** Na criação: processo já escolhido (aba do processo). */
  processoId?: string
  aoCancelar?: () => void
}) {
  const consulta = useTodos('processos', { ordem: { campo: 'apelido', direcao: 'asc' } })
  if (consulta.isPending) return null
  if (consulta.isError) return <Erro mensagem="Não foi possível carregar os processos." />
  return (
    <Campos
      processos={consulta.data}
      informe={informe}
      processoId={informe?.processoId ?? processoId}
      aoCancelar={aoCancelar}
    />
  )
}

function Campos({
  processos,
  informe,
  processoId,
  aoCancelar,
}: {
  processos: Processo[]
  informe?: Informe
  processoId?: string
  aoCancelar?: () => void
}) {
  const navegar = useNavigate()
  const salvar = useServico(salvarInforme)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [mantidos, setMantidos] = useState<Anexo[]>(informe?.anexos ?? [])
  const [novos, setNovos] = useState<File[]>([])
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)
  const entradaArquivo = useRef<HTMLInputElement>(null)
  const idAnexos = useId()

  const porId = new Map(processos.map((processo) => [processo.id, processo]))
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ValoresInforme>({
    resolver: zodResolver(schemaFormularioInforme),
    defaultValues: informe
      ? valoresDoInforme(informe)
      : valoresIniciais(processoId ? porId.get(processoId) : undefined, hoje()),
  })
  const [categoria, idProcesso] = useWatch({ control, name: ['categoria', 'processoId'] })
  const processo = porId.get(idProcesso)
  // "Data da AGC" só em Atas de AGC (RF-18, INF-02).
  const ehAta = categoria === 'atas-agc'

  // A fase acompanha o processo escolhido (RF-19) e continua editável. Depois do render, para o
  // select já ter as fases do tipo do processo novo; a fase gravada na edição fica como está.
  const processoAnterior = useRef(idProcesso)
  useEffect(() => {
    if (processoAnterior.current === idProcesso) return
    processoAnterior.current = idProcesso
    const escolhido = processos.find((item) => item.id === idProcesso)
    setValue('fase', escolhido?.faseAtual ?? '')
  }, [idProcesso, processos, setValue])

  function escolherArquivos(evento: ChangeEvent<HTMLInputElement>) {
    const escolhidos = [...(evento.target.files ?? [])]
    const grande = escolhidos.find((arquivo) => erroDoArquivo(arquivo))
    setErroArquivo(grande ? erroDoArquivo(grande) : null)
    setNovos((atuais) => [...atuais, ...escolhidos.filter((arquivo) => !erroDoArquivo(arquivo))])
    // Permite escolher o mesmo arquivo de novo depois de removê-lo.
    evento.target.value = ''
  }

  const enviar = handleSubmit(async (valores) => {
    setErroGeral(null)
    try {
      const salvo = await salvar({
        id: informe?.id,
        dados: dadosDoFormulario(valores),
        anexos: mantidos,
        novos: novos.map((arquivo) => ({
          nome: arquivo.name,
          tipo: arquivo.type,
          conteudo: arquivo,
        })),
      })
      if (informe && aoCancelar) aoCancelar()
      else navegar(`/informes/${salvo.id}`)
    } catch (erro) {
      if (ehErroDeCota(erro)) setErroGeral(MENSAGEM_COTA)
      else if (erro instanceof ErroValidacao) {
        for (const problema of erro.problemas) {
          const campo = problema.campo as keyof ValoresInforme
          if (CAMPOS_FORMULARIO.includes(campo)) setError(campo, { message: problema.mensagem })
          else setErroGeral(problema.mensagem)
        }
      } else setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível salvar.')
    }
  })

  const voltar =
    aoCancelar ?? (() => navegar(processoId ? `/processos/${processoId}/informes` : '/informes'))

  return (
    <Formulario
      aria-label={informe ? 'Editar informe' : 'Novo informe'}
      onSubmit={enviar}
      acoes={
        <>
          <Botao onClick={voltar}>Cancelar</Botao>
          <Botao variante="primario" type="submit" disabled={isSubmitting}>
            Salvar
          </Botao>
        </>
      }
    >
      {erroGeral && <Erro titulo="Não foi possível salvar" mensagem={erroGeral} />}
      <SecaoFormulario
        titulo="Informe"
        descricao="Processo, título, categoria e data. A fase vem preenchida com a fase atual do processo."
      >
        <CampoSelecao
          rotulo="Processo"
          colunas={3}
          obrigatorio
          erro={errors.processoId?.message}
          {...register('processoId')}
        >
          <option value="">Selecione</option>
          {processos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.apelido}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao
          rotulo="Categoria"
          colunas={3}
          obrigatorio
          erro={errors.categoria?.message}
          {...register('categoria')}
        >
          <option value="">Selecione</option>
          {CATEGORIAS.map((valor) => (
            <option key={valor} value={valor}>
              {CATEGORIAS_INFORME[valor]}
            </option>
          ))}
        </CampoSelecao>
        <CampoTexto
          rotulo="Título"
          colunas={6}
          obrigatorio
          erro={errors.titulo?.message}
          {...register('titulo')}
        />
        <CampoSelecao
          rotulo="Fase"
          colunas={ehAta ? 2 : 3}
          erro={errors.fase?.message}
          {...register('fase')}
        >
          <option value="">Sem fase</option>
          {(processo ? fasesDoTipo(processo.tipo) : []).map((fase) => (
            <option key={fase} value={fase}>
              {ROTULOS_FASE[fase]}
            </option>
          ))}
        </CampoSelecao>
        <CampoTexto
          rotulo="Data"
          type="date"
          colunas={ehAta ? 2 : 3}
          obrigatorio
          erro={errors.data?.message}
          {...register('data')}
        />
        {ehAta && (
          <CampoTexto
            rotulo="Data da AGC"
            type="date"
            colunas={2}
            erro={errors.dataAgc?.message}
            {...register('dataAgc')}
          />
        )}
        <CampoTexto
          rotulo="Folha inicial"
          colunas={3}
          inputMode="numeric"
          erro={errors.folhaInicial?.message}
          {...register('folhaInicial')}
        />
        <CampoTexto
          rotulo="Folha final"
          colunas={3}
          inputMode="numeric"
          erro={errors.folhaFinal?.message}
          {...register('folhaFinal')}
        />
        <CampoMarcacao rotulo="Publicado no site" {...register('publicadoNoSite')} />
      </SecaoFormulario>
      <SecaoFormulario
        titulo="Anexos"
        descricao="Até 10 MB por arquivo. PDFs abrem no visualizador; os outros tipos são baixados."
      >
        <Campo rotulo="Anexar arquivos" id={idAnexos} erro={erroArquivo ?? undefined}>
          {({ className: _classe, ...controle }) => (
            <div className={estilos.escolherArquivo}>
              <input
                ref={entradaArquivo}
                type="file"
                multiple
                tabIndex={-1}
                className="somente-leitor"
                onChange={escolherArquivos}
                {...controle}
              />
              <Botao icone={<Upload size={18} />} onClick={() => entradaArquivo.current?.click()}>
                Escolher arquivos
              </Botao>
            </div>
          )}
        </Campo>
        {mantidos.length + novos.length > 0 && (
          <ul className={estilos.anexosFormulario} aria-label="Anexos do informe">
            {mantidos.map((anexo) => (
              <ItemAnexo
                key={chaveDoAnexo(anexo)}
                nome={anexo.nome}
                tamanho={anexo.origem === 'local' ? anexo.tamanho : undefined}
                aoRemover={() => setMantidos((atuais) => atuais.filter((a) => a !== anexo))}
              />
            ))}
            {novos.map((arquivo) => (
              <ItemAnexo
                key={`novo-${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`}
                nome={arquivo.name}
                tamanho={arquivo.size}
                aoRemover={() => setNovos((atuais) => atuais.filter((a) => a !== arquivo))}
              />
            ))}
          </ul>
        )}
      </SecaoFormulario>
    </Formulario>
  )
}

function ItemAnexo({
  nome,
  tamanho,
  aoRemover,
}: {
  nome: string
  tamanho?: number
  aoRemover: () => void
}) {
  return (
    <li className={estilos.itemAnexo}>
      <span className={estilos.nomeAnexo}>
        <FileText size={18} aria-hidden="true" />
        <span>{nome}</span>
        {tamanho !== undefined && (
          <span className={estilos.tamanho}>{formatarTamanho(tamanho)}</span>
        )}
      </span>
      <BotaoIcone aria-label={`Remover ${nome}`} icone={<X size={18} />} onClick={aoRemover} />
    </li>
  )
}
