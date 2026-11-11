// Caixa de valor do Campo Personalizado — componente COMPARTILHADO com a caixa real
// usada no painel da entidade (CardDetalhes, ContatoDetalhes, Fluxo...). Usado também
// como PRÉ-VISUALIZAÇÃO ao vivo no modal de criação/edição da /config: a mesma caixa
// que o usuário verá depois, conforme o tipo escolhido. Sem célula de máscara —
// Números formata CPF/CNPJ/telefone e Moeda formata R$ (intrínsecos ao tipo).
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  aplicarMascaraMoeda,
  aplicarMascaraNumero,
  tipoUsaMascara,
  type CampoPersonalizado,
} from '@/services/camposPersonalizados'
import { cn } from '@/lib/utils'

export interface CampoListaSelecao {
  id: string
  nome: string
  itens: string[] | null
}

interface Props {
  campo: Pick<
    CampoPersonalizado,
    'id' | 'tipo' | 'rotulo' | 'obrigatorio' | 'opcoes' | 'lista_selecao'
  >
  valor: unknown
  onChange: (valor: unknown) => void
  listas?: CampoListaSelecao[]
  /** true no preview do modal: caixa mais compacta, sem borda de erro */
  preview?: boolean
  /** id único para name do radio (evita colisão entre preview e painel) */
  idRadio?: string
  bordaErro?: boolean
  /** no preview o rótulo entra como placeholder fixo da caixa (campo ainda sem valor) */
  placeholderOverride?: string
}

function formatarHora(value: string): string {
  const d = (value || '').replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}:${d.slice(2)}`
}

export default function CampoValorBox({
  campo,
  valor,
  onChange,
  listas = [],
  preview = false,
  idRadio,
  bordaErro = false,
  placeholderOverride,
}: Props) {
  const classeErro = bordaErro ? 'border-red-400' : 'border-[#E5E1D8]'
  const texto = typeof valor === 'string' ? valor : ''
  const placeholder = placeholderOverride ?? campo.rotulo
  const idRadioEfetivo = idRadio || `campo_${campo.id}`

  switch (campo.tipo) {
    case 'texto_curto':
      return (
        <Input
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('text-xs', preview ? 'h-8' : '', classeErro)}
        />
      )

    case 'texto_longo':
      return (
        <Textarea
          rows={3}
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('text-xs', classeErro)}
        />
      )

    case 'numero':
      return (
        <Input
          value={texto}
          onChange={(e) => onChange(aplicarMascaraNumero(e.target.value))}
          placeholder={tipoUsaMascara(campo.tipo) ? '000.000.000-00' : placeholder}
          className={cn('text-xs', preview ? 'h-8' : '', classeErro)}
        />
      )

    case 'moeda':
      return (
        <Input
          value={texto}
          onChange={(e) => onChange(aplicarMascaraMoeda(e.target.value))}
          placeholder="R$ 0,00"
          className={cn('text-xs', preview ? 'h-8' : '', classeErro)}
        />
      )

    case 'select':
      return (
        <select
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full rounded-md border bg-white px-2 text-xs outline-none focus:border-[#0F766E]',
            preview ? 'h-8' : 'h-9',
            classeErro,
          )}
        >
          <option value="">{placeholder}</option>
          {(campo.opcoes || []).map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      )

    case 'radio':
      return (
        <div className="space-y-1.5">
          {(campo.opcoes || []).map((op) => (
            <label
              key={op}
              className="flex items-center gap-2 text-xs text-[#1A1D21] cursor-pointer"
            >
              <input
                type="radio"
                name={idRadioEfetivo}
                checked={valor === op}
                onChange={() => onChange(op)}
                className="accent-[#0F766E]"
              />
              {op}
            </label>
          ))}
        </div>
      )

    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-xs text-[#1A1D21] cursor-pointer">
          <Checkbox checked={valor === true} onCheckedChange={(v) => onChange(v === true)} />
          {campo.rotulo}
        </label>
      )

    case 'lista_checkbox': {
      const arr = Array.isArray(valor) ? (valor as string[]) : []
      return (
        <div className="space-y-1.5">
          {(campo.opcoes || []).map((op) => {
            const marcado = arr.includes(op)
            return (
              <label
                key={op}
                className="flex items-center gap-2 text-xs text-[#1A1D21] cursor-pointer"
              >
                <Checkbox
                  checked={marcado}
                  onCheckedChange={(v) => {
                    onChange(v === true ? [...arr, op] : arr.filter((x) => x !== op))
                  }}
                />
                {op}
              </label>
            )
          })}
        </div>
      )
    }

    case 'seletor_horario':
      return (
        <Input
          type="time"
          value={texto || (preview ? '' : formatarHora(''))}
          onChange={(e) => onChange(e.target.value)}
          placeholder="HH:MM"
          className={cn('text-xs', preview ? 'h-8' : '', classeErro)}
        />
      )

    case 'seletor_data':
      return (
        <Input
          type="date"
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          className={cn('text-xs', preview ? 'h-8' : '', classeErro)}
        />
      )

    case 'lista_selecao': {
      const itens = listas.find((l) => l.id === campo.lista_selecao)?.itens || []
      return (
        <select
          value={texto}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full rounded-md border bg-white px-2 text-xs outline-none focus:border-[#0F766E]',
            preview ? 'h-8' : 'h-9',
            classeErro,
          )}
        >
          <option value="">{placeholder}</option>
          {itens.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      )
    }

    default:
      return null
  }
}
