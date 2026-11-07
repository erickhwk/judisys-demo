// "Avançar fase" (RF-15, T-27, PRC-08): escolhe uma fase posterior à atual e a data do marco, que
// não pode ser anterior à do último. Os prazos automáticos da fase são criados pelo serviço.
import { ChevronsRight } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { useServico } from '../../dados/contexto'
import { ErroValidacao } from '../../dados/repositorio'
import type { Tipos } from '../../dados/schemas'
import { avancarFase } from '../../dados/servicos/marcos'
import { ehDataIso } from '../../regras/datas'
import { type Fase, fasesSeguintes, ROTULOS_FASE, validarDataDoMarco } from '../../regras/fases'
import { hoje } from '../../regras/relogio'
import { Botao } from '../../ui/Botao'
import { CampoSelecao, CampoTexto } from '../../ui/Campo'
import { Dialogo } from '../../ui/Dialogo'
import { mensagemDeErro } from './mensagens'
import estilos from './processos.module.css'

interface Erros {
  fase?: string
  data?: string
  geral?: string
}

export function AvancarFase({
  processo,
  marcos,
}: {
  processo: Tipos['processos']
  marcos: Tipos['marcosDeFase'][]
}) {
  const avancar = useServico(avancarFase)
  const idFormulario = useId()
  const opcoes = fasesSeguintes(processo.tipo, processo.faseAtual as Fase)
  const [aberto, setAberto] = useState(false)
  const [fase, setFase] = useState<Fase | ''>('')
  const [data, setData] = useState('')
  const [erros, setErros] = useState<Erros>({})
  const [ocupado, setOcupado] = useState(false)

  function abrir() {
    setFase(opcoes[0] ?? '')
    setData(hoje())
    setErros({})
    setAberto(true)
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const novos: Erros = {}
    if (!fase) novos.fase = 'Escolha a próxima fase'
    if (!ehDataIso(data)) novos.data = 'Informe uma data válida'
    else {
      const erroData = validarDataDoMarco(data, marcos)
      if (erroData) novos.data = erroData
    }
    setErros(novos)
    if (Object.keys(novos).length > 0 || !fase) return

    setOcupado(true)
    try {
      await avancar(processo.id, { fase, data })
      setAberto(false)
    } catch (erro) {
      if (erro instanceof ErroValidacao) {
        const porCampo: Erros = {}
        for (const problema of erro.problemas) {
          const campo =
            problema.campo === 'fase' || problema.campo === 'data' ? problema.campo : 'geral'
          porCampo[campo] = [porCampo[campo], problema.mensagem].filter(Boolean).join(' ')
        }
        setErros(porCampo)
      } else {
        setErros({ geral: mensagemDeErro(erro) })
      }
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <Botao variante="primario" icone={<ChevronsRight size={18} />} onClick={abrir}>
        Avançar fase
      </Botao>
      <Dialogo
        aberto={aberto}
        aoFechar={() => {
          if (!ocupado) setAberto(false)
        }}
        titulo="Avançar fase"
        acoes={
          <>
            <Botao onClick={() => setAberto(false)} disabled={ocupado}>
              Cancelar
            </Botao>
            <Botao
              variante="primario"
              type="submit"
              form={idFormulario}
              disabled={ocupado}
              aria-busy={ocupado || undefined}
            >
              Avançar
            </Botao>
          </>
        }
      >
        <form id={idFormulario} className={estilos.formularioDialogo} onSubmit={enviar} noValidate>
          <p>
            Fase atual: <strong>{ROTULOS_FASE[processo.faseAtual]}</strong>. Os prazos automáticos
            da nova fase são criados a partir da data do marco.
          </p>
          <CampoSelecao
            rotulo="Próxima fase"
            obrigatorio
            value={fase}
            erro={erros.fase}
            onChange={(evento) => setFase(evento.target.value as Fase)}
          >
            {opcoes.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULOS_FASE[opcao]}
              </option>
            ))}
          </CampoSelecao>
          <CampoTexto
            type="date"
            rotulo="Data do marco"
            obrigatorio
            value={data}
            erro={erros.data}
            onChange={(evento) => setData(evento.target.value)}
          />
          {erros.geral && (
            <p role="alert" className={estilos.erroDialogo}>
              {erros.geral}
            </p>
          )}
        </form>
      </Dialogo>
    </>
  )
}
