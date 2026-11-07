import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type FieldPath, useForm } from 'react-hook-form'
import { useRepo } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { formatarDocumento } from '../../regras/documentos'
import type { TipoProcesso } from '../../regras/fases'
import { rotuloClasse } from '../../regras/qgc'
import { Botao } from '../../ui/Botao'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Dialogo } from '../../ui/Dialogo'
import estilos from './credores.module.css'
import { mensagemDeErro } from './erros'
import {
  classesDoTipo,
  credorDoFormulario,
  type EntradaCredor,
  type SaidaCredor,
  schemaFormularioCredor,
} from './formularios'
import { moedaParaCampo } from './moeda'

type Credor = Tipos['credores']

/** Criar ou editar credor (RF-26 a RF-28): CPF/CNPJ validado no campo (CRD-16). */
export function DialogoCredor({
  aberto,
  aoFechar,
  processo,
  credor,
  aoSalvar,
}: {
  aberto: boolean
  aoFechar: () => void
  processo: { id: string; tipo: TipoProcesso }
  /** Sem credor, cria um novo. */
  credor?: Credor
  aoSalvar?: (credor: Credor) => void
}) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={credor ? 'Editar credor' : 'Novo credor'}
      largura="larga"
      fecharAoClicarFora={false}
    >
      <FormularioCredor
        processo={processo}
        credor={credor}
        aoCancelar={aoFechar}
        aoSalvar={(salvo) => {
          aoSalvar?.(salvo)
          aoFechar()
        }}
      />
    </Dialogo>
  )
}

function FormularioCredor({
  processo,
  credor,
  aoCancelar,
  aoSalvar,
}: {
  processo: { id: string; tipo: TipoProcesso }
  credor?: Credor
  aoCancelar: () => void
  aoSalvar: (credor: Credor) => void
}) {
  const repo = useRepo('credores')
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntradaCredor, unknown, SaidaCredor>({
    resolver: zodResolver(schemaFormularioCredor(processo.tipo)),
    defaultValues: {
      nome: credor?.nome ?? '',
      documento: credor ? formatarDocumento(credor.documento) : '',
      classe: credor?.classe ?? ('' as EntradaCredor['classe']),
      natureza: credor?.natureza ?? '',
      valorDevedor: moedaParaCampo(credor?.valorDevedor ?? 0),
      valorAj: moedaParaCampo(credor?.valorAj),
      valorQgc: moedaParaCampo(credor?.valorQgc),
    },
  })

  async function salvar(saida: SaidaCredor) {
    setErroGeral(null)
    try {
      const dados = credorDoFormulario(processo.id, saida)
      aoSalvar(credor ? await repo.atualizar(credor.id, dados) : await repo.criar(dados))
    } catch (falha) {
      if (falha instanceof ErroValidacao) {
        for (const problema of falha.problemas) {
          setError(problema.campo as FieldPath<EntradaCredor>, { message: problema.mensagem })
        }
      }
      setErroGeral(mensagemDeErro(falha))
    }
  }

  return (
    <form className={estilos.formDialogo} noValidate onSubmit={handleSubmit(salvar)}>
      <div className={estilos.grade}>
        <CampoTexto
          rotulo="Nome"
          obrigatorio
          colunas={4}
          erro={errors.nome?.message}
          {...register('nome')}
        />
        <CampoTexto
          rotulo="CPF ou CNPJ"
          obrigatorio
          colunas={2}
          inputMode="numeric"
          erro={errors.documento?.message}
          {...register('documento')}
        />
        <CampoSelecao
          rotulo="Classe"
          obrigatorio
          colunas={3}
          erro={errors.classe?.message}
          {...register('classe')}
        >
          <option value="">Escolha a classe</option>
          {classesDoTipo(processo.tipo).map((classe) => (
            <option key={classe} value={classe}>
              {rotuloClasse(classe, processo.tipo)}
            </option>
          ))}
        </CampoSelecao>
        <CampoTexto
          rotulo="Natureza"
          colunas={3}
          erro={errors.natureza?.message}
          {...register('natureza')}
        />
        <CampoTexto
          rotulo="Relação do devedor (R$)"
          obrigatorio
          colunas={2}
          inputMode="decimal"
          erro={errors.valorDevedor?.message}
          {...register('valorDevedor')}
        />
        <CampoTexto
          rotulo="Relação do AJ (R$)"
          colunas={2}
          inputMode="decimal"
          ajuda="Vazio: ainda não publicada"
          erro={errors.valorAj?.message}
          {...register('valorAj')}
        />
        <CampoTexto
          rotulo="QGC (R$)"
          colunas={2}
          inputMode="decimal"
          ajuda="Vazio: ainda sem QGC"
          erro={errors.valorQgc?.message}
          {...register('valorQgc')}
        />
      </div>
      {erroGeral && (
        <p className={estilos.erroTexto} role="alert">
          {erroGeral}
        </p>
      )}
      <div className={estilos.acoesDialogo}>
        <Botao variante="secundario" onClick={aoCancelar} disabled={isSubmitting}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={isSubmitting}>
          {credor ? 'Salvar' : 'Cadastrar credor'}
        </Botao>
      </div>
    </form>
  )
}
