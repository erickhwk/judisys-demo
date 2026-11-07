import { zodResolver } from '@hookform/resolvers/zod'
import { Link2, Link2Off } from 'lucide-react'
import { useRef, useState } from 'react'
import { type FieldPath, type Resolver, useForm } from 'react-hook-form'
import { useRepo, useServico } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { ErroRegra } from '../../dados/servicos/comum'
import {
  AVISO_DOCUMENTO_EXISTENTE,
  type NovoPedido,
  ROTULOS_TIPO_PEDIDO,
  registrarPedido,
  tiposDePedidoPermitidos,
} from '../../dados/servicos/pedidos'
import { somenteDigitos, validarCnpj, validarCpf } from '../../regras/documentos'
import type { TipoProcesso } from '../../regras/fases'
import { rotuloClasse } from '../../regras/qgc'
import { hoje } from '../../regras/relogio'
import { Botao } from '../../ui/Botao'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Dialogo } from '../../ui/Dialogo'
import estilos from './credores.module.css'
import { mensagemDeErro } from './erros'
import {
  classesDoTipo,
  type EntradaPedido,
  type SaidaPedido,
  schemaFormularioPedido,
} from './formularios'

type Credor = Tipos['credores']
type Pedido = Tipos['pedidosDeCredito']

/** Mapeia o caminho do erro do repositório para o campo do formulário. */
const CAMPO_DO_PROBLEMA: Record<string, FieldPath<EntradaPedido>> = {
  'requerente.nome': 'requerenteNome',
  'requerente.documento': 'requerenteDocumento',
  requerente: 'requerenteNome',
}

/**
 * Registrar pedido de crédito (RF-29). Com `credor`, o pedido é dele; sem, é de um requerente fora
 * da lista. O tipo oferecido segue a fase (CRD-10). Se o CPF/CNPJ do requerente já é de um credor
 * do processo, o formulário avisa e oferece vincular o pedido a ele (CRD-08).
 */
export function DialogoPedido({
  aberto,
  aoFechar,
  processo,
  credor,
  publicada,
}: {
  aberto: boolean
  aoFechar: () => void
  processo: { id: string; tipo: TipoProcesso }
  credor?: Credor
  publicada: boolean
}) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={credor ? `Pedido de crédito de ${credor.nome}` : 'Pedido de crédito'}
      largura="larga"
      fecharAoClicarFora={false}
    >
      <FormularioPedido
        processo={processo}
        credor={credor}
        publicada={publicada}
        aoTerminar={aoFechar}
      />
    </Dialogo>
  )
}

function FormularioPedido({
  processo,
  credor,
  publicada,
  aoTerminar,
}: {
  processo: { id: string; tipo: TipoProcesso }
  credor?: Credor
  publicada: boolean
  aoTerminar: () => void
}) {
  const registrar = useServico(registrarPedido)
  const repoCredores = useRepo('credores')
  const [vinculado, setVinculado] = useState<Credor | undefined>(credor)
  const [existente, setExistente] = useState<Credor | undefined>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const daLista = vinculado !== undefined
  const tipos = tiposDePedidoPermitidos(publicada, daLista)

  // O schema muda com o vínculo (requerente obrigatório ou não); o resolver lê o valor atual.
  const vinculadoAtual = useRef(daLista)
  vinculadoAtual.current = daLista
  const resolver: Resolver<EntradaPedido, unknown, SaidaPedido> = (valores, contexto, opcoes) => {
    const comCredor = vinculadoAtual.current
    const schema = schemaFormularioPedido(
      processo.tipo,
      tiposDePedidoPermitidos(publicada, comCredor),
      !comCredor,
    )
    return zodResolver(schema)(valores, contexto, opcoes)
  }

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EntradaPedido, unknown, SaidaPedido>({
    resolver,
    defaultValues: {
      tipo: tipos[0],
      valorPedido: '',
      classePedida: credor?.classe ?? ('' as EntradaPedido['classePedida']),
      data: hoje(),
      requerenteNome: '',
      requerenteDocumento: '',
    },
  })

  async function procurarExistente(documento: string): Promise<Credor | undefined> {
    if (!validarCpf(documento) && !validarCnpj(documento)) return undefined
    const [achado] = await repoCredores.todos({
      onde: { processoId: processo.id, documento: somenteDigitos(documento) },
    })
    setExistente(achado)
    return achado
  }

  function vincular(alvo: Credor) {
    setVinculado(alvo)
    setExistente(undefined)
    const [tipo] = tiposDePedidoPermitidos(publicada, true)
    if (tipo) setValue('tipo', tipo)
    if (!getValues('classePedida')) setValue('classePedida', alvo.classe)
  }

  function desvincular() {
    setVinculado(undefined)
    const [tipo] = tiposDePedidoPermitidos(publicada, false)
    if (tipo) setValue('tipo', tipo)
  }

  async function salvar(saida: SaidaPedido) {
    setErroGeral(null)
    if (!vinculado && (await procurarExistente(saida.requerenteDocumento))) return
    const dados: NovoPedido = {
      processoId: processo.id,
      tipo: saida.tipo,
      valorPedido: saida.valorPedido,
      classePedida: saida.classePedida,
      data: saida.data,
      ...(vinculado
        ? { credorId: vinculado.id }
        : { requerente: { nome: saida.requerenteNome, documento: saida.requerenteDocumento } }),
    }
    try {
      await registrar(dados)
      aoTerminar()
    } catch (falha) {
      if (falha instanceof ErroRegra && falha.message === AVISO_DOCUMENTO_EXISTENTE) {
        await procurarExistente(saida.requerenteDocumento)
        return
      }
      if (falha instanceof ErroValidacao) {
        for (const problema of falha.problemas) {
          const campo = CAMPO_DO_PROBLEMA[problema.campo] ?? problema.campo
          setError(campo as FieldPath<EntradaPedido>, { message: problema.mensagem })
        }
      }
      setErroGeral(mensagemDeErro(falha))
    }
  }

  const documento = register('requerenteDocumento', {
    onBlur: (evento: { target: { value: string } }) => procurarExistente(evento.target.value),
  })

  return (
    <form className={estilos.formDialogo} noValidate onSubmit={handleSubmit(salvar)}>
      {publicada && (
        <p className={estilos.notaFormulario}>
          A relação do AJ já foi publicada: o pedido é uma impugnação (art. 8º), decidida pelo juiz.
          Acolhida, muda o valor e a classe no QGC.
        </p>
      )}
      <div className={estilos.grade}>
        {vinculado ? (
          <div className={estilos.vinculo}>
            <span>
              Pedido de <strong>{vinculado.nome}</strong>, credor da lista.
            </span>
            {!credor && (
              <Botao variante="fantasma" icone={<Link2Off size={16} />} onClick={desvincular}>
                Desfazer vínculo
              </Botao>
            )}
          </div>
        ) : (
          <>
            <CampoTexto
              rotulo="Nome do requerente"
              obrigatorio
              colunas={4}
              erro={errors.requerenteNome?.message}
              {...register('requerenteNome')}
            />
            <CampoTexto
              rotulo="CPF ou CNPJ do requerente"
              obrigatorio
              colunas={2}
              inputMode="numeric"
              erro={errors.requerenteDocumento?.message}
              {...documento}
            />
            {existente && (
              <div className={estilos.aviso} role="alert">
                <p>
                  <strong>{AVISO_DOCUMENTO_EXISTENTE}</strong>: {existente.nome}.
                </p>
                <Botao
                  variante="secundario"
                  icone={<Link2 size={16} />}
                  onClick={() => vincular(existente)}
                >
                  Vincular o pedido a {existente.nome}
                </Botao>
              </div>
            )}
          </>
        )}
        <CampoSelecao
          rotulo="Tipo"
          obrigatorio
          colunas={3}
          erro={errors.tipo?.message}
          {...register('tipo')}
        >
          {tipos.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ROTULOS_TIPO_PEDIDO[tipo as Pedido['tipo']]}
            </option>
          ))}
        </CampoSelecao>
        <CampoSelecao
          rotulo="Classe pedida"
          obrigatorio
          colunas={3}
          erro={errors.classePedida?.message}
          {...register('classePedida')}
        >
          <option value="">Escolha a classe</option>
          {classesDoTipo(processo.tipo).map((classe) => (
            <option key={classe} value={classe}>
              {rotuloClasse(classe, processo.tipo)}
            </option>
          ))}
        </CampoSelecao>
        <CampoTexto
          rotulo="Valor pedido (R$)"
          obrigatorio
          colunas={3}
          inputMode="decimal"
          erro={errors.valorPedido?.message}
          {...register('valorPedido')}
        />
        <CampoTexto
          rotulo="Data"
          type="date"
          obrigatorio
          colunas={3}
          erro={errors.data?.message}
          {...register('data')}
        />
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
          Registrar pedido
        </Botao>
      </div>
    </form>
  )
}
