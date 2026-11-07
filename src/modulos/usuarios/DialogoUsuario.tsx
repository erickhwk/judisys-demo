// Criar ou editar usuário (RF-39), só para quem edita usuários (o AJ). O escritório, o id e os
// carimbos vêm do repositório; o log sai junto com a gravação (RF-41).
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type FieldPath, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { useRepo } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import { camposUsuario, type Usuario } from '../../dados/schemas'
import { PAPEIS } from '../../regras/permissoes'
import { Botao } from '../../ui/Botao'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Dialogo } from '../../ui/Dialogo'
import { mensagemDeErro } from '../credores/erros'
import { NOMES_PAPEIS } from '../entrada/papeis'
import estilos from './usuarios.module.css'

type EntradaUsuario = z.input<typeof camposUsuario>
type SaidaUsuario = z.output<typeof camposUsuario>

export function DialogoUsuario({
  aberto,
  aoFechar,
  usuario,
  proprio,
}: {
  aberto: boolean
  aoFechar: () => void
  /** Sem usuário, cria um novo. */
  usuario?: Usuario
  /** É o usuário da sessão: o papel fica como está (troca-se pelo "Trocar de papel"). */
  proprio?: boolean
}) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={usuario ? 'Editar usuário' : 'Novo usuário'}
      largura="larga"
      fecharAoClicarFora={false}
    >
      {aberto && (
        <FormularioUsuario
          // Um formulário novo a cada usuário: os valores iniciais são do usuário aberto.
          key={usuario?.id ?? 'novo'}
          usuario={usuario}
          proprio={proprio ?? false}
          aoTerminar={aoFechar}
        />
      )}
    </Dialogo>
  )
}

function FormularioUsuario({
  usuario,
  proprio,
  aoTerminar,
}: {
  usuario?: Usuario
  proprio: boolean
  aoTerminar: () => void
}) {
  const repo = useRepo('usuarios')
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EntradaUsuario, unknown, SaidaUsuario>({
    resolver: zodResolver(camposUsuario),
    defaultValues: {
      nome: usuario?.nome ?? '',
      email: usuario?.email ?? '',
      papel: usuario?.papel ?? ('' as EntradaUsuario['papel']),
    },
  })

  async function salvar(dados: SaidaUsuario) {
    setErroGeral(null)
    try {
      if (usuario) await repo.atualizar(usuario.id, dados)
      else await repo.criar(dados)
      aoTerminar()
    } catch (falha) {
      if (falha instanceof ErroValidacao) {
        for (const problema of falha.problemas) {
          setError(problema.campo as FieldPath<EntradaUsuario>, { message: problema.mensagem })
        }
      }
      setErroGeral(mensagemDeErro(falha))
    }
  }

  return (
    <form className={estilos.formulario} noValidate onSubmit={handleSubmit(salvar)}>
      <div className={estilos.grade}>
        <CampoTexto
          rotulo="Nome"
          obrigatorio
          colunas={6}
          autoComplete="off"
          erro={errors.nome?.message}
          {...register('nome')}
        />
        <CampoTexto
          rotulo="E-mail"
          obrigatorio
          colunas={4}
          type="email"
          autoComplete="off"
          erro={errors.email?.message}
          {...register('email')}
        />
        {proprio ? (
          // O papel da sessão não muda por aqui; o valor gravado continua o do formulário.
          <CampoTexto
            rotulo="Papel"
            colunas={2}
            readOnly
            value={usuario ? NOMES_PAPEIS[usuario.papel] : ''}
            ajuda="Para usar outro papel, use “Trocar de papel”."
          />
        ) : (
          <CampoSelecao
            rotulo="Papel"
            obrigatorio
            colunas={2}
            erro={errors.papel?.message}
            {...register('papel')}
          >
            <option value="">Escolha o papel</option>
            {PAPEIS.map((papel) => (
              <option key={papel} value={papel}>
                {NOMES_PAPEIS[papel]}
              </option>
            ))}
          </CampoSelecao>
        )}
      </div>
      {erroGeral && (
        <p className={estilos.erroTexto} role="alert">
          {erroGeral}
        </p>
      )}
      <div className={estilos.acoesDialogo}>
        <Botao variante="secundario" onClick={aoTerminar} disabled={isSubmitting}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" disabled={isSubmitting}>
          {usuario ? 'Salvar' : 'Cadastrar usuário'}
        </Botao>
      </div>
    </form>
  )
}
