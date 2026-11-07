// Formulário de prazo num diálogo (RF-23, PRZ-10, PRZ-11): novo prazo manual, com base legal
// opcional, e edição. No prazo automático, título e base legal ficam travados e só o vencimento
// muda (C-05, T-37).
import { type FormEvent, useId, useState } from 'react'
import { useRepo } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { Botao } from '../../ui/Botao'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Dialogo } from '../../ui/Dialogo'
import estilos from './prazos.module.css'
import {
  type ErrosPrazo,
  mudancasDaEdicao,
  novoPrazoManual,
  soVencimentoEditavel,
  type ValoresPrazo,
  validarPrazo,
  valoresIniciais,
} from './regras'

type Prazo = Tipos['prazos']

export interface OpcaoProcesso {
  id: string
  rotulo: string
}

export type PropsFormularioPrazo = {
  /** Sem prazo: novo prazo manual. */
  prazo?: Prazo
  /** Processo já escolhido (aba Prazos do processo); sem ele, o formulário pede o processo. */
  processoId?: string
  /** Opções do campo Processo, quando ele aparece (agenda). */
  processos?: readonly OpcaoProcesso[]
  aoFechar: () => void
  aoSalvar: (prazo: Prazo) => void
}

/**
 * Erros do schema do repositório (T-04) nos campos que estão na tela; o resto (inclusive o do
 * processo, quando ele vem fixo) vai para a mensagem geral, para nenhum erro sumir sem aviso.
 */
function errosDoRepositorio(
  erro: ErroValidacao,
  visiveis: readonly (keyof ValoresPrazo)[],
): { campos: ErrosPrazo; geral?: string } {
  const campos: ErrosPrazo = {}
  const outros: string[] = []
  for (const problema of erro.problemas) {
    const campo = visiveis.find((c) => c === problema.campo)
    if (campo) campos[campo] ??= problema.mensagem
    else outros.push(problema.mensagem)
  }
  return outros.length > 0 ? { campos, geral: outros.join('; ') } : { campos }
}

/** Monte só com o diálogo aberto (e desmonte ao fechar), para recomeçar do zero a cada abertura. */
export function FormularioPrazo({
  prazo,
  processoId = '',
  processos,
  aoFechar,
  aoSalvar,
}: PropsFormularioPrazo) {
  const repo = useRepo('prazos')
  const idFormulario = useId()
  const [valores, setValores] = useState(() => valoresIniciais(prazo, processoId))
  const [erros, setErros] = useState<ErrosPrazo>({})
  const [erroGeral, setErroGeral] = useState<string>()
  const [salvando, setSalvando] = useState(false)
  const travado = soVencimentoEditavel(prazo)
  const pedeProcesso = !prazo && processoId === ''

  const mudar = (campo: keyof ValoresPrazo) => (valor: string) => {
    setValores((atual) => ({ ...atual, [campo]: valor }))
    setErros((atual) => ({ ...atual, [campo]: undefined }))
  }

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    const encontrados = validarPrazo(valores, prazo)
    setErros(encontrados)
    setErroGeral(undefined)
    if (Object.keys(encontrados).length > 0) return
    setSalvando(true)
    try {
      const gravado = prazo
        ? await repo.atualizar(prazo.id, mudancasDaEdicao(prazo, valores))
        : await repo.criar(novoPrazoManual(valores))
      aoSalvar(gravado)
    } catch (erro) {
      if (erro instanceof ErroValidacao) {
        const { campos, geral } = errosDoRepositorio(
          erro,
          pedeProcesso
            ? ['processoId', 'titulo', 'vencimento', 'baseLegal']
            : ['titulo', 'vencimento', 'baseLegal'],
        )
        setErros(campos)
        setErroGeral(geral)
      } else {
        setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível salvar.')
      }
      setSalvando(false)
    }
  }

  return (
    <Dialogo
      aberto
      aoFechar={() => {
        if (!salvando) aoFechar()
      }}
      titulo={prazo ? 'Editar prazo' : 'Novo prazo'}
      fecharAoClicarFora={false}
      acoes={
        <>
          <Botao variante="secundario" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            type="submit"
            form={idFormulario}
            disabled={salvando}
            aria-busy={salvando || undefined}
          >
            Salvar
          </Botao>
        </>
      }
    >
      <form id={idFormulario} className={estilos.formulario} noValidate onSubmit={salvar}>
        {travado && (
          <p className={estilos.nota}>
            Prazo automático: o título e a base legal vêm da lei e não mudam. Altere o vencimento
            para prorrogar o prazo.
          </p>
        )}
        {pedeProcesso && (
          <CampoSelecao
            rotulo="Processo"
            obrigatorio
            value={valores.processoId}
            onChange={(e) => mudar('processoId')(e.target.value)}
            erro={erros.processoId}
            data-foco-inicial
          >
            <option value="">Selecione o processo</option>
            {processos?.map((opcao) => (
              <option key={opcao.id} value={opcao.id}>
                {opcao.rotulo}
              </option>
            ))}
          </CampoSelecao>
        )}
        <CampoTexto
          rotulo="Título"
          obrigatorio={!travado}
          value={valores.titulo}
          onChange={(e) => mudar('titulo')(e.target.value)}
          erro={erros.titulo}
          readOnly={travado}
          aria-readonly={travado || undefined}
          {...(!pedeProcesso && !travado ? { 'data-foco-inicial': true } : {})}
        />
        <CampoTexto
          rotulo="Vencimento"
          type="date"
          obrigatorio
          value={valores.vencimento}
          onChange={(e) => mudar('vencimento')(e.target.value)}
          erro={erros.vencimento}
          {...(travado ? { 'data-foco-inicial': true } : {})}
        />
        <CampoTexto
          rotulo="Base legal"
          value={valores.baseLegal}
          onChange={(e) => mudar('baseLegal')(e.target.value)}
          erro={erros.baseLegal}
          readOnly={travado}
          aria-readonly={travado || undefined}
          ajuda={travado ? undefined : 'Opcional. Ex.: art. 7º, §1º'}
        />
        {erroGeral && (
          <p className={estilos.erroGeral} role="alert">
            {erroGeral}
          </p>
        )}
      </form>
    </Dialogo>
  )
}
