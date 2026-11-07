// Cadastro e edição da AGC (RF-31): datas da 1ª e da 2ª convocação e pauta.
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type FieldPath, useForm } from 'react-hook-form'
import { useServico } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import { salvarAgc } from '../../dados/servicos/agc'
import { Botao } from '../../ui/Botao'
import { CampoAreaTexto, CampoTexto } from '../../ui/Campo'
import { Dialogo } from '../../ui/Dialogo'
import { mensagemDeErro } from '../credores/erros'
import { type Agc, type FormularioAgc, schemaFormularioAgc } from './agc'
import estilos from './agc.module.css'

export function DialogoAgc({
  aberto,
  aoFechar,
  processoId,
  agc,
  aoSalvar,
}: {
  aberto: boolean
  aoFechar: () => void
  processoId: string
  /** Sem AGC, cadastra uma nova. */
  agc?: Agc
  aoSalvar?: (agc: Agc) => void
}) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={agc ? 'Editar AGC' : 'Nova AGC'}
      fecharAoClicarFora={false}
    >
      <Formulario
        processoId={processoId}
        agc={agc}
        aoCancelar={aoFechar}
        aoSalvar={(salva) => {
          aoSalvar?.(salva)
          aoFechar()
        }}
      />
    </Dialogo>
  )
}

function Formulario({
  processoId,
  agc,
  aoCancelar,
  aoSalvar,
}: {
  processoId: string
  agc?: Agc
  aoCancelar: () => void
  aoSalvar: (agc: Agc) => void
}) {
  const salvar = useServico(salvarAgc)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormularioAgc>({
    resolver: zodResolver(schemaFormularioAgc),
    defaultValues: {
      dataPrimeira: agc?.dataPrimeira ?? '',
      dataSegunda: agc?.dataSegunda ?? '',
      pauta: agc?.pauta ?? '',
    },
  })

  async function enviar(dados: FormularioAgc) {
    setErroGeral(null)
    try {
      aoSalvar(await salvar({ id: agc?.id, dados: { processoId, ...dados } }))
    } catch (falha) {
      if (falha instanceof ErroValidacao) {
        for (const problema of falha.problemas) {
          setError(problema.campo as FieldPath<FormularioAgc>, { message: problema.mensagem })
        }
      }
      setErroGeral(mensagemDeErro(falha))
    }
  }

  return (
    <form className={estilos.formDialogo} noValidate onSubmit={handleSubmit(enviar)}>
      <div className={estilos.grade}>
        <CampoTexto
          rotulo="1ª convocação"
          type="date"
          obrigatorio
          colunas={3}
          erro={errors.dataPrimeira?.message}
          {...register('dataPrimeira')}
        />
        <CampoTexto
          rotulo="2ª convocação"
          type="date"
          obrigatorio
          colunas={3}
          erro={errors.dataSegunda?.message}
          {...register('dataSegunda')}
        />
        <CampoAreaTexto
          rotulo="Pauta"
          obrigatorio
          rows={3}
          erro={errors.pauta?.message}
          {...register('pauta')}
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
          {agc ? 'Salvar' : 'Cadastrar AGC'}
        </Botao>
      </div>
    </form>
  )
}
