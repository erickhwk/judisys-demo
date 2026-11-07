// Formulário de processo em seções (RF-12), como `processo-novo.html`: informações principais,
// detalhes jurídicos, localização e contato, empresas e equipe e honorários. Novo processo nasce
// na fase inicial do tipo, com o marco na data informada (PRC-15).
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Controller, type FieldPath, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { useRegistro, useServico, useTodos } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { criarProcesso, editarProcesso } from '../../dados/servicos/processos'
import { hoje } from '../../regras/relogio'
import { Botao } from '../../ui/Botao'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Erro } from '../../ui/Erro'
import { Formulario, SecaoFormulario } from '../../ui/Formulario'
import { useSessao } from '../entrada/sessao'
import { Cabecalho } from './Cabecalho'
import {
  type EntradaFormulario,
  paraDadosProcesso,
  paraFormulario,
  type SaidaFormulario,
  schemaFormularioNovoProcesso,
  schemaFormularioProcesso,
} from './formulario'
import { mensagemDeErro } from './mensagens'
import { ProcessoNaoEncontrado } from './ProcessoNaoEncontrado'
import { ROTULOS_CONSOLIDACAO, ROTULOS_TIPO, UFS } from './rotulos'
import { SeletorEmpresas } from './SeletorEmpresas'

const ORDEM_USUARIOS = { ordem: { campo: 'nome', direcao: 'asc' } } as const

function ErroAoCarregar({ titulo }: { titulo: string }) {
  return (
    <>
      <Cabecalho titulo={titulo} />
      <Erro mensagem="Não foi possível carregar o formulário." />
    </>
  )
}

export function NovoProcesso() {
  const { sessao } = useSessao()
  const criar = useServico(criarProcesso)
  const navegar = useNavigate()
  // Mesma consulta (e cache) do FormularioProcesso.
  const usuarios = useTodos('usuarios', ORDEM_USUARIOS)
  const responsavelPadrao =
    sessao && usuarios.data?.some((u) => u.id === sessao.usuarioId) ? sessao.usuarioId : ''

  if (usuarios.isError) return <ErroAoCarregar titulo="Novo processo" />
  if (!usuarios.isSuccess) return <Cabecalho titulo="Novo processo" />
  return (
    <FormularioProcesso
      titulo="Novo processo"
      valoresIniciais={{
        apelido: '',
        numeroCnj: '',
        tipo: 'rj',
        comarca: '',
        uf: '',
        vara: '',
        email: '',
        consolidacao: 'nenhuma',
        responsavelId: responsavelPadrao,
        dataInicio: hoje(),
        passivoDeclarado: '',
        honorariosPercentual: '',
        honorariosValor: '',
        empresaIds: [],
      }}
      novo
      voltarPara="/processos"
      salvar={async (valores) => {
        const processo = await criar({
          processo: paraDadosProcesso(valores),
          empresaIds: valores.empresaIds,
          dataInicio: valores.dataInicio,
        })
        navegar(`/processos/${processo.id}/visao-geral`)
      }}
    />
  )
}

export function EditarProcesso() {
  const { id } = useParams()
  const processo = useRegistro('processos', id)
  const vinculos = useTodos('processoEmpresas', { onde: { processoId: id } })
  const editar = useServico(editarProcesso)
  const navegar = useNavigate()

  if (processo.isError || vinculos.isError) return <ErroAoCarregar titulo="Editar processo" />
  if (processo.data === null) return <ProcessoNaoEncontrado />
  if (!processo.data || !vinculos.isSuccess) return <Cabecalho titulo="Editar processo" />
  const atual = processo.data
  return (
    <FormularioProcesso
      // Remonta com os valores gravados se o processo mudar enquanto a tela está aberta.
      key={atual.atualizadoEm}
      titulo="Editar processo"
      subtitulo={atual.apelido}
      valoresIniciais={paraFormulario(
        atual,
        vinculos.data.map((v) => v.empresaId),
      )}
      voltarPara={`/processos/${atual.id}/visao-geral`}
      salvar={async (valores) => {
        await editar(atual.id, paraDadosProcesso(valores, atual), valores.empresaIds)
        navegar(`/processos/${atual.id}/visao-geral`)
      }}
    />
  )
}

interface PropsFormularioProcesso {
  titulo: string
  subtitulo?: string
  valoresIniciais: EntradaFormulario
  novo?: boolean
  voltarPara: string
  salvar: (valores: SaidaFormulario) => Promise<void>
}

const CAMPOS = new Set<string>(Object.keys(schemaFormularioProcesso.shape))

function FormularioProcesso({
  titulo,
  subtitulo,
  valoresIniciais,
  novo = false,
  voltarPara,
  salvar,
}: PropsFormularioProcesso) {
  const navegar = useNavigate()
  const usuarios = useTodos('usuarios', ORDEM_USUARIOS)
  const empresas = useTodos('empresas', { ordem: { campo: 'razaoSocial', direcao: 'asc' } })
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntradaFormulario, unknown, SaidaFormulario>({
    resolver: zodResolver(novo ? schemaFormularioNovoProcesso : schemaFormularioProcesso),
    defaultValues: valoresIniciais,
  })
  const tipo = watch('tipo')

  const enviar = handleSubmit(async (valores) => {
    setErroGeral(null)
    try {
      await salvar(valores)
    } catch (erro) {
      // Erro de validação do repositório vai para o campo, quando o formulário o tem.
      if (erro instanceof ErroValidacao) {
        const semCampo = erro.problemas.filter((problema) => {
          if (!CAMPOS.has(problema.campo)) return true
          setError(problema.campo as FieldPath<EntradaFormulario>, { message: problema.mensagem })
          return false
        })
        if (semCampo.length > 0) setErroGeral(semCampo.map((p) => p.mensagem).join(' '))
        return
      }
      setErroGeral(mensagemDeErro(erro))
    }
  })

  return (
    <>
      <Cabecalho
        titulo={titulo}
        subtitulo={subtitulo}
        trilha={[{ rotulo: 'Processos', para: '/processos' }, { rotulo: titulo }]}
        acoes={
          <Botao icone={<ArrowLeft size={18} />} onClick={() => navegar(voltarPara)}>
            Voltar
          </Botao>
        }
      />
      <Formulario
        aria-label={titulo}
        onSubmit={enviar}
        acoes={
          <>
            <Botao onClick={() => navegar(voltarPara)} disabled={isSubmitting}>
              {novo ? 'Voltar para os processos' : 'Cancelar'}
            </Botao>
            <Botao
              variante="primario"
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting || undefined}
            >
              Salvar
            </Botao>
          </>
        }
      >
        {erroGeral && <Erro titulo="Não foi possível salvar" mensagem={erroGeral} />}

        <SecaoFormulario
          titulo="Informações principais"
          descricao="Identificação do processo e o marco inicial."
        >
          <CampoTexto
            rotulo="Apelido"
            obrigatorio
            placeholder="Ex.: Grupo Horizonte"
            erro={errors.apelido?.message}
            {...register('apelido')}
          />
          <CampoTexto
            rotulo="Número do processo (CNJ)"
            obrigatorio
            colunas={3}
            inputMode="numeric"
            placeholder="0000000-00.0000.8.00.0000"
            erro={errors.numeroCnj?.message}
            {...register('numeroCnj')}
          />
          {novo ? (
            <CampoSelecao
              rotulo="Tipo"
              obrigatorio
              colunas={3}
              erro={errors.tipo?.message}
              {...register('tipo')}
            >
              {(['rj', 'falencia'] as const).map((t) => (
                <option key={t} value={t}>
                  {ROTULOS_TIPO[t]}
                </option>
              ))}
            </CampoSelecao>
          ) : (
            // Campo desabilitado sairia do envio; o tipo vai pelos valores iniciais.
            <CampoTexto
              rotulo="Tipo"
              colunas={3}
              readOnly
              value={ROTULOS_TIPO[tipo]}
              ajuda="O tipo não muda depois de criado."
            />
          )}
          {novo && (
            <CampoTexto
              type="date"
              rotulo={tipo === 'falencia' ? 'Data da decretação' : 'Data do pedido'}
              obrigatorio
              colunas={3}
              ajuda={
                tipo === 'falencia'
                  ? 'O processo começa em “Decretada”.'
                  : 'O processo começa em “Pedido”.'
              }
              erro={errors.dataInicio?.message}
              {...register('dataInicio')}
            />
          )}
        </SecaoFormulario>

        <SecaoFormulario
          titulo="Detalhes jurídicos"
          descricao="Vara responsável, consolidação e passivo declarado."
        >
          <CampoTexto
            rotulo="Vara"
            obrigatorio
            placeholder="Ex.: 1ª Vara Empresarial"
            erro={errors.vara?.message}
            {...register('vara')}
          />
          <CampoSelecao
            rotulo="Consolidação"
            obrigatorio
            colunas={3}
            erro={errors.consolidacao?.message}
            {...register('consolidacao')}
          >
            {(Object.keys(ROTULOS_CONSOLIDACAO) as (keyof typeof ROTULOS_CONSOLIDACAO)[]).map(
              (c) => (
                <option key={c} value={c}>
                  {ROTULOS_CONSOLIDACAO[c]}
                </option>
              ),
            )}
          </CampoSelecao>
          <CampoTexto
            rotulo="Passivo declarado (R$)"
            obrigatorio
            colunas={3}
            inputMode="decimal"
            placeholder="0,00"
            erro={errors.passivoDeclarado?.message}
            {...register('passivoDeclarado')}
          />
        </SecaoFormulario>

        <SecaoFormulario
          titulo="Localização e contato"
          descricao="Comarca do processo e e-mail de contato."
        >
          <CampoTexto
            rotulo="Comarca"
            obrigatorio
            colunas={4}
            erro={errors.comarca?.message}
            {...register('comarca')}
          />
          <CampoSelecao
            rotulo="UF"
            obrigatorio
            colunas={2}
            erro={errors.uf?.message}
            {...register('uf')}
          >
            <option value="">Selecione</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </CampoSelecao>
          <CampoTexto
            type="email"
            rotulo="E-mail"
            placeholder="email@exemplo.com"
            erro={errors.email?.message}
            {...register('email')}
          />
        </SecaoFormulario>

        <SecaoFormulario titulo="Empresas" descricao="As devedoras do processo.">
          <Controller
            control={control}
            name="empresaIds"
            render={({ field, fieldState }) => (
              <SeletorEmpresas
                empresas={empresas.data ?? []}
                selecionadas={field.value}
                aoMudar={field.onChange}
                erro={fieldState.error?.message}
              />
            )}
          />
        </SecaoFormulario>

        <SecaoFormulario
          titulo="Equipe e honorários"
          descricao="Quem responde pelo processo e os honorários do AJ."
        >
          <CampoSelecao
            rotulo="Responsável"
            obrigatorio
            erro={errors.responsavelId?.message}
            {...register('responsavelId')}
          >
            <option value="">Selecione</option>
            {(usuarios.data ?? []).map((usuario: Tipos['usuarios']) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </CampoSelecao>
          <CampoTexto
            rotulo="Honorários (%)"
            colunas={3}
            inputMode="decimal"
            placeholder="Ex.: 2,5"
            erro={errors.honorariosPercentual?.message}
            {...register('honorariosPercentual')}
          />
          <CampoTexto
            rotulo="Honorários (R$)"
            colunas={3}
            inputMode="decimal"
            placeholder="0,00"
            erro={errors.honorariosValor?.message}
            {...register('honorariosValor')}
          />
        </SecaoFormulario>
      </Formulario>
    </>
  )
}
