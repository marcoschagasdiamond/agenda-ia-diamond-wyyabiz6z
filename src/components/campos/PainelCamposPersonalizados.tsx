// Painel que exibe e permite preencher os Campos Personalizados de um alvo
// (card ou contato), conforme a categoria (modelo Ummense adaptado).
// O estado (campos, valores, máscaras, validação e gravação) vive no hook
// useCamposPersonalizados; este arquivo é a apresentação.
import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Save, SlidersHorizontal } from 'lucide-react'
import {
  aplicarMascara,
  ROTULOS_CATEGORIA,
  type CampoPersonalizado,
} from '@/services/camposPersonalizados'
import { useCamposPersonalizados } from './useCamposPersonalizados'

interface Props {
  categoria: 'card' | 'pessoa' | 'empresa'
  alvo: { card?: string; contato?: string }
  titulo?: string
  // 'salvar' (padrão): botão grava sozinho, como já era nos contatos.
  // 'submit': botão dispara o submit do form pai, após validar obrigatórios.
  tipoBotaoSalvar?: 'salvar' | 'submit'
}

export interface PainelCamposPersonalizadosHandle {
  validarObrigatorios: () => boolean
}

function valorInicialTexto(valor: unknown): string {
  if (valor == null) return ''
  if (typeof valor === 'string') return valor
  return String(valor)
}

function campoVazio(val: unknown): boolean {
  if (val == null) return true
  if (typeof val === 'string') return val.trim() === ''
  if (Array.isArray(val)) return val.length === 0
  return false
}

const PainelCamposPersonalizados = forwardRef<PainelCamposPersonalizadosHandle, Props>(
  function PainelCamposPersonalizados(
    { categoria, alvo, titulo, tipoBotaoSalvar = 'salvar' },
    ref,
  ) {
    const { campos, valores, listas, carregando, salvando, erroObrigatorio, setValor, salvar } =
      useCamposPersonalizados(categoria, alvo)

    // Validação imperativa: usada pelo Fluxo.tsx antes de salvar o card quando
    // o painel está fora de um form, e exposta via ref.
    const validarObrigatorios = (): boolean =>
      campos.filter((c) => c.obrigatorio && campoVazio(valores[c.id])).length === 0

    useImperativeHandle(ref, () => ({ validarObrigatorios }))

    if (carregando) {
      return (
        <div className="flex items-center gap-2 text-xs text-[#5B6470] py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Carregando campos personalizados...
        </div>
      )
    }

    if (campos.length === 0) return null

    return (
      <div className="rounded-lg border border-[#E5E1D8] bg-white">
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#E5E1D8]/70 bg-[#FAFAF9] rounded-t-lg">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F766E]" />
          <span className="text-xs font-bold text-[#1A1D21]">
            {titulo || `Campos Personalizados — ${ROTULOS_CATEGORIA[categoria]}`}
          </span>
        </div>
        <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {campos.map((campo) => {
            const valor = valores[campo.id]
            const comErro = erroObrigatorio[campo.id]
            const classeErro = comErro ? 'border-red-400' : ''
            const label = (
              <label className="text-[11px] font-semibold text-[#1A1D21] flex items-center gap-1">
                {campo.rotulo}
                {campo.obrigatorio && <span className="text-red-500">*</span>}
              </label>
            )

            const inputEl = (() => {
              switch (campo.tipo) {
                case 'texto_longo':
                  return (
                    <Textarea
                      rows={2}
                      value={valorInicialTexto(valor)}
                      placeholder={campo.legenda || ''}
                      onChange={(e) => setValor(campo.id, e.target.value)}
                      className={`text-xs border-[#E5E1D8] ${classeErro}`}
                    />
                  )
                case 'numero':
                case 'moeda': {
                  const texto = valorInicialTexto(valor)
                  return (
                    <Input
                      inputMode={campo.tipo === 'numero' ? 'decimal' : 'text'}
                      value={texto}
                      placeholder={campo.legenda || ''}
                      onChange={(e) => {
                        const bruto = e.target.value
                        setValor(
                          campo.id,
                          campo.mascara && campo.mascara !== 'outros'
                            ? aplicarMascara(bruto, campo.mascara, campo.mascara_outros || '')
                            : bruto,
                        )
                      }}
                      className={`text-xs border-[#E5E1D8] ${classeErro}`}
                    />
                  )
                }
                case 'checkbox':
                  return (
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        id={`cp-${campo.id}`}
                        checked={valor === true}
                        onCheckedChange={(chk) => setValor(campo.id, chk === true)}
                      />
                      <label htmlFor={`cp-${campo.id}`} className="text-xs text-[#5B6470]">
                        {campo.legenda || campo.rotulo}
                      </label>
                    </div>
                  )
                case 'seletor_horario':
                  return (
                    <Input
                      type="time"
                      value={valorInicialTexto(valor)}
                      onChange={(e) => setValor(campo.id, e.target.value)}
                      className={`text-xs border-[#E5E1D8] ${classeErro}`}
                    />
                  )
                case 'seletor_data':
                  return (
                    <Input
                      type="date"
                      value={valorInicialTexto(valor)}
                      onChange={(e) => setValor(campo.id, e.target.value)}
                      className={`text-xs border-[#E5E1D8] ${classeErro}`}
                    />
                  )
                case 'upload': {
                  const texto = valorInicialTexto(valor)
                  return (
                    <Input
                      value={texto}
                      placeholder={campo.legenda || 'Cole o link do arquivo'}
                      onChange={(e) => setValor(campo.id, e.target.value)}
                      className={`text-xs border-[#E5E1D8] ${classeErro}`}
                    />
                  )
                }
                case 'lista_selecao': {
                  const listaVinculada = listas.find((l) => l.id === campo.lista_selecao)
                  const opcoes: string[] = Array.isArray(listaVinculada?.itens)
                    ? (listaVinculada.itens as string[])
                    : []
                  return (
                    <select
                      value={valorInicialTexto(valor)}
                      onChange={(e) => setValor(campo.id, e.target.value)}
                      className={`w-full h-8 rounded-md border border-[#E5E1D8] bg-white px-2 text-xs text-[#1A1D21] ${classeErro}`}
                    >
                      <option value="">{campo.legenda || 'Selecione...'}</option>
                      {opcoes.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  )
                }
                case 'select': {
                  const opcoes: string[] = Array.isArray(campo.opcoes) ? campo.opcoes : []
                  return (
                    <select
                      value={valorInicialTexto(valor)}
                      onChange={(e) => setValor(campo.id, e.target.value)}
                      className={`w-full h-8 rounded-md border border-[#E5E1D8] bg-white px-2 text-xs text-[#1A1D21] ${classeErro}`}
                    >
                      <option value="">{campo.legenda || 'Selecione...'}</option>
                      {opcoes.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  )
                }
                case 'radio': {
                  const opcoes: string[] = Array.isArray(campo.opcoes) ? campo.opcoes : []
                  return (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {opcoes.map((op) => (
                        <label
                          key={op}
                          className="flex items-center gap-1.5 text-xs text-[#1A1D21] cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`cp-radio-${campo.id}`}
                            checked={valor === op}
                            onChange={() => setValor(campo.id, op)}
                            className="accent-[#0F766E]"
                          />
                          {op}
                        </label>
                      ))}
                    </div>
                  )
                }
                case 'lista_checkbox': {
                  const opcoes: string[] = Array.isArray(campo.opcoes) ? campo.opcoes : []
                  const selecionados: string[] = Array.isArray(valor)
                    ? (valor as unknown[]).map(String)
                    : []
                  return (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {opcoes.map((op) => (
                        <label
                          key={op}
                          className="flex items-center gap-1.5 text-xs text-[#1A1D21] cursor-pointer"
                        >
                          <Checkbox
                            checked={selecionados.includes(op)}
                            onCheckedChange={(chk) => {
                              const nova = chk
                                ? [...selecionados, op]
                                : selecionados.filter((x) => x !== op)
                              setValor(campo.id, nova)
                            }}
                          />
                          {op}
                        </label>
                      ))}
                    </div>
                  )
                }
                default: {
                  // texto_curto (inclui máscara CPF/CNPJ/RG/Passaporte)
                  const texto = valorInicialTexto(valor)
                  return (
                    <Input
                      value={texto}
                      placeholder={campo.legenda || ''}
                      onChange={(e) => {
                        const bruto = e.target.value
                        setValor(
                          campo.id,
                          campo.mascara && campo.mascara !== 'outros'
                            ? aplicarMascara(bruto, campo.mascara, campo.mascara_outros || '')
                            : bruto,
                        )
                      }}
                      className={`text-xs border-[#E5E1D8] ${classeErro}`}
                    />
                  )
                }
              }
            })()

            return (
              <div key={campo.id} className="space-y-1">
                {label}
                {inputEl}
                {campo.mensagem_ajuda && (
                  <p className="text-[10px] text-[#5B6470]">{campo.mensagem_ajuda}</p>
                )}
                {comErro && (
                  <p className="text-[10px] text-red-600 font-medium">Campo obrigatório</p>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end px-3.5 pb-3.5">
          <Button
            size="sm"
            type={tipoBotaoSalvar === 'submit' ? 'submit' : 'button'}
            disabled={salvando}
            onClick={tipoBotaoSalvar === 'submit' ? undefined : salvar}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1.5"
          >
            {salvando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{salvando ? 'Salvando...' : 'Salvar campos'}</span>
          </Button>
        </div>
      </div>
    )
  },
)

export default PainelCamposPersonalizados
