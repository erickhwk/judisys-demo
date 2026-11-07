// Formulário de empresa (RF-16): campos do PRD §6, CNPJ validado pelo dígito verificador (schema
// zod, T-04). Na edição, os processos em que a empresa aparece (RF-17, por `processoEmpresas`) e
// a exclusão (T-23). Quem só lê (analista) vê os campos desabilitados e nenhum botão de gravar.
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { useRegistro, useRepo, useTodos } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import { camposEmpresa } from '../../dados/schemas'
import { formatarCnj, formatarCnpj } from '../../regras/documentos'
import { type Fase, ROTULOS_FASE } from '../../regras/fases'
import { pode } from '../../regras/permissoes'
import { Botao } from '../../ui/Botao'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Erro } from '../../ui/Erro'
import { Formulario, SecaoFormulario } from '../../ui/Formulario'
import { Selo } from '../../ui/Selo'
import { useSessao } from '../entrada/sessao'
import { Cabecalho } from './Cabecalho'
import estilos from './Empresas.module.css'
import { useExclusaoEmpresa } from './ExclusaoEmpresa'
import {
  type DadosEmpresa,
  EMPRESA_EM_BRANCO,
  type Empresa,
  PORTES,
  ROTULOS_PORTE,
  UFS,
  type ValoresEmpresa,
  valoresDaEmpresa,
} from './empresas'

/** `#/empresas/novo`. */
export function NovaEmpresa() {
  return (
    <div className={estilos.tela}>
      <Cabecalho titulo="Nova empresa" caminho="Nova empresa" acoes={<Voltar />} />
      <CamposEmpresa />
    </div>
  )
}

/** `#/empresas/:id`: edição (ou consulta, para quem só lê). */
export function TelaEmpresa() {
  const { id } = useParams()
  const consulta = useRegistro('empresas', id)

  if (consulta.isPending) return null
  if (consulta.isError || !consulta.data) {
    return (
      <div className={estilos.tela}>
        <Cabecalho titulo="Empresa" caminho="Empresa" acoes={<Voltar />} />
        <Erro
          titulo="Registro não existe mais"
          mensagem="A empresa pode ter sido excluída."
          acao={<Link to="/empresas">Voltar para as empresas</Link>}
        />
      </div>
    )
  }
  const empresa = consulta.data
  return (
    <div className={estilos.tela}>
      <Cabecalho titulo={empresa.razaoSocial} caminho="Empresa" acoes={<Voltar />} />
      {/* `key`: outra empresa (ou a mesma regravada) recomeça o formulário com os valores dela. */}
      <CamposEmpresa key={`${empresa.id}-${empresa.atualizadoEm}`} empresa={empresa} />
    </div>
  )
}

function Voltar() {
  const navegar = useNavigate()
  return (
    <Botao icone={<ArrowLeft size={18} />} onClick={() => navegar('/empresas')}>
      Voltar
    </Botao>
  )
}

function CamposEmpresa({ empresa }: { empresa?: Empresa }) {
  const { sessao } = useSessao()
  const podeEditar = sessao ? pode(sessao.papel, 'editar', 'empresas') : false
  const navegar = useNavigate()
  const repo = useRepo('empresas')
  const exclusao = useExclusaoEmpresa(() => navegar('/empresas'))
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ValoresEmpresa, unknown, DadosEmpresa>({
    resolver: zodResolver(camposEmpresa),
    defaultValues: empresa ? valoresDaEmpresa(empresa) : EMPRESA_EM_BRANCO,
  })

  const salvar = handleSubmit(async (dados) => {
    setErroGeral(null)
    try {
      if (empresa) await repo.atualizar(empresa.id, dados)
      else await repo.criar(dados)
      navegar('/empresas')
    } catch (erro) {
      if (erro instanceof ErroValidacao) {
        for (const problema of erro.problemas) {
          if (problema.campo in EMPRESA_EM_BRANCO) {
            setError(problema.campo as keyof ValoresEmpresa, { message: problema.mensagem })
          } else setErroGeral(problema.mensagem)
        }
      } else setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível salvar.')
    }
  })

  const somenteLeitura = !podeEditar
  return (
    <>
      <Formulario
        aria-label={empresa ? 'Empresa' : 'Nova empresa'}
        onSubmit={salvar}
        acoes={
          <>
            <Botao onClick={() => navegar('/empresas')}>Voltar para as empresas</Botao>
            {podeEditar && empresa && (
              <Botao
                variante="perigo"
                icone={<Trash2 size={18} />}
                onClick={() => exclusao.pedir(empresa)}
              >
                Excluir
              </Botao>
            )}
            {podeEditar && (
              <Botao variante="primario" type="submit" disabled={isSubmitting}>
                Salvar
              </Botao>
            )}
          </>
        }
      >
        {erroGeral && <Erro titulo="Não foi possível salvar" mensagem={erroGeral} />}
        <SecaoFormulario titulo="Identificação" descricao="Razão social, nome fantasia e CNPJ.">
          <CampoTexto
            rotulo="Razão social"
            colunas={6}
            obrigatorio
            disabled={somenteLeitura}
            erro={errors.razaoSocial?.message}
            {...register('razaoSocial')}
          />
          <CampoTexto
            rotulo="Nome fantasia"
            colunas={3}
            disabled={somenteLeitura}
            erro={errors.nomeFantasia?.message}
            {...register('nomeFantasia')}
          />
          <CampoTexto
            rotulo="CNPJ"
            colunas={3}
            obrigatorio
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            disabled={somenteLeitura}
            erro={errors.cnpj?.message}
            {...register('cnpj', {
              onBlur: (evento) => setValue('cnpj', formatarCnpj(evento.target.value)),
            })}
          />
        </SecaoFormulario>
        <SecaoFormulario
          titulo="Atividade e localização"
          descricao="Porte, atividade econômica e sede."
        >
          <CampoSelecao
            rotulo="Porte"
            colunas={2}
            obrigatorio
            disabled={somenteLeitura}
            erro={errors.porte?.message}
            {...register('porte')}
          >
            {PORTES.map((porte) => (
              <option key={porte} value={porte}>
                {ROTULOS_PORTE[porte]}
              </option>
            ))}
          </CampoSelecao>
          <CampoTexto
            rotulo="CNAE"
            colunas={4}
            placeholder="0000-0/00"
            disabled={somenteLeitura}
            erro={errors.cnae?.message}
            {...register('cnae')}
          />
          <CampoTexto
            rotulo="Cidade"
            colunas={4}
            obrigatorio
            disabled={somenteLeitura}
            erro={errors.cidade?.message}
            {...register('cidade')}
          />
          <CampoSelecao
            rotulo="UF"
            colunas={2}
            obrigatorio
            disabled={somenteLeitura}
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
        </SecaoFormulario>
        {empresa && <ProcessosDaEmpresa empresaId={empresa.id} />}
      </Formulario>
      {exclusao.elemento}
    </>
  )
}

/** Processos em que a empresa aparece (RF-17), com link para a visão geral de cada um. */
function ProcessosDaEmpresa({ empresaId }: { empresaId: string }) {
  const vinculos = useTodos('processoEmpresas', { onde: { empresaId } })
  const processos = useTodos('processos', { ordem: { campo: 'apelido', direcao: 'asc' } })
  const ids = new Set(vinculos.data?.map((vinculo) => vinculo.processoId))
  const daEmpresa = processos.data?.filter((processo) => ids.has(processo.id)) ?? []
  const carregando = vinculos.isPending || processos.isPending

  return (
    <SecaoFormulario
      titulo="Processos da empresa"
      descricao="Processos em que a empresa aparece como devedora."
    >
      {carregando ? null : daEmpresa.length === 0 ? (
        <p className={estilos.semProcessos}>A empresa não aparece em nenhum processo.</p>
      ) : (
        <ul className={estilos.processos} aria-label="Processos da empresa">
          {daEmpresa.map((processo) => (
            <li key={processo.id} className={estilos.processo}>
              <span className={estilos.identificacao}>
                <Link to={`/processos/${processo.id}/visao-geral`}>{processo.apelido}</Link>
                <span className={estilos.numero}>{formatarCnj(processo.numeroCnj)}</span>
              </span>
              <span className={estilos.detalhes}>
                <Selo forma="pilula" tom={processo.tipo === 'rj' ? 'dourado' : 'azul'}>
                  {processo.tipo === 'rj' ? 'Recuperação Judicial' : 'Falência'}
                </Selo>
                <Selo>{ROTULOS_FASE[processo.faseAtual as Fase]}</Selo>
              </span>
            </li>
          ))}
        </ul>
      )}
    </SecaoFormulario>
  )
}
