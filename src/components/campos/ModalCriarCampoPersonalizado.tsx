// Assistente de criação de Campo Personalizado, aberto direto da caixa de busca
// da entidade. Sem célula "máscara" — a máscara/moeda é intrínseca ao tipo Números
// e ao tipo Moeda. Categoria é multi-seleção (Card/Pessoa/Empresa) com atalho "Todas".
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  ROTULOS_CATEGORIA,
  ROTULOS_TIPO,
  criarCampoPersonalizado,
  tipoUsaListaSelecao,
  tipoUsaMascara,
  tipoUsaOpcoes,
  type CampoCategoria,
  type CampoMascara,
  type CampoPersonalizado,
  type CampoTipo,
  type ListaSelecao,
} from '@/services/camposPersonalizados'
import { cn } from '@/lib/utils'

const TODAS_CATEGORIAS: CampoCategoria[] = ['card', 'pessoa', 'empresa']

// Os 11 tipos do modelo (o tipo upload foi aposentado no formato)
const TIPOS: CampoTipo[] = [
  'texto_curto',
  'texto_longo',
  'numero',
  'select',
  'radio',
  'checkbox',
  'lista_checkbox',
  'seletor_horario',
  'seletor_data',
  'lista_selecao',
  'moeda',
]

function slugInterno(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoriasSugeridas: CampoCategoria[]
  listas: ListaSelecao[]
  onSalvo: (campos: CampoPersonalizado[]) => void
}

export default function ModalCriarCampoPersonalizado({
  open,
  onOpenChange,
  categoriasSugeridas,
  listas,
  onSalvo,
}: Props) {
  const { toast } = useToast()
  const [categorias, setCategorias] = useState<CampoCategoria[]>(categoriasSugeridas)
  const [tipo, setTipo] = useState<CampoTipo>('texto_curto')
  const [mascara, setMascara] = useState<CampoMascara>('')
  const [nomeInterno, setNomeInterno] = useState('')
  const [rotulo, setRotulo] = useState('')
  const [mensagemAjuda, setMensagemAjuda] = useState('')
  const [opcoes, setOpcoes] = useState('')
  const [listaSelecionada, setListaSelecionada] = useState('')
  const [obrigatorio, setObrigatorio] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const categoriasValidas = categorias.length > 0
  const opcoesNecessarias = tipoUsaOpcoes(tipo)

  const alternarCategoria = (cat: CampoCategoria) => {
    setCategorias((prev) => {
      const tem = prev.includes(cat)
      if (tem) {
        const restantes = prev.filter((c) => c !== cat)
        return restantes
      }
      return [...prev, cat]
    })
  }

  const marcarTodas = () => {
    const todasSelecionadas = TODAS_CATEGORIAS.every((c) => categorias.includes(c))
    setCategorias(todasSelecionadas ? [] : [...TODAS_CATEGORIAS])
  }

  const resetar = () => {
    setCategorias(categoriasSugeridas)
    setTipo('texto_curto')
    setMascara('')
    setNomeInterno('')
    setRotulo('')
    setMensagemAjuda('')
    setOpcoes('')
    setListaSelecionada('')
    setObrigatorio(false)
  }

  const handleSalvar = async () => {
    if (!categoriasValidas) {
      toast({
        title: 'Escolha ao menos uma categoria (Card, Pessoa ou Empresa).',
        variant: 'destructive',
      })
      return
    }
    if (!rotulo.trim()) {
      toast({ title: 'Informe o rótulo do campo.', variant: 'destructive' })
      return
    }
    if (
      opcoesNecessarias &&
      opcoes
        .trim()
        .split('\n')
        .filter((o) => o.trim()).length < 2
    ) {
      toast({ title: 'Informe ao menos 2 opções (uma por linha).', variant: 'destructive' })
      return
    }
    if (tipoUsaListaSelecao(tipo) && !listaSelecionada) {
      toast({ title: 'Escolha a lista de seleção em /config.', variant: 'destructive' })
      return
    }
    const interno = nomeInterno.trim() || slugInterno(rotulo) || `campo_${Date.now()}`
    setSalvando(true)
    try {
      const listaOpcoes = opcoesNecessarias
        ? opcoes
            .split('\n')
            .map((o) => o.trim())
            .filter(Boolean)
        : []
      const criados: CampoPersonalizado[] = []
      for (const cat of categorias) {
        const criado = await criarCampoPersonalizado({
          categoria: cat,
          tipo,
          nome_interno: interno,
          rotulo: rotulo.trim(),
          mensagem_ajuda: mensagemAjuda.trim(),
          opcoes: listaOpcoes,
          lista_selecao: tipoUsaListaSelecao(tipo) ? listaSelecionada : '',
          obrigatorio,
          ativo: true,
        })
        criados.push(criado)
      }
      toast({ title: `Campo "${rotulo.trim()}" criado e inserido.` })
      onSalvo(criados)
      resetar()
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao criar campo personalizado', err)
      toast({ title: 'Erro ao criar campo personalizado.', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white border border-[#E5E1D8] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#1A1D21]">
            Criar campo personalizado
          </DialogTitle>
          <DialogDescription className="text-xs text-[#5B6470]">
            O campo entra no catálogo e já fica disponível na caixa de busca da entidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Categorias — multi-seleção com atalho "Todas" */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1A1D21]">Categorias *</Label>
            <div className="flex flex-wrap items-center gap-3">
              {TODAS_CATEGORIAS.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-1.5 text-xs text-[#1A1D21] cursor-pointer"
                >
                  <Checkbox
                    checked={categorias.includes(cat)}
                    onCheckedChange={() => alternarCategoria(cat)}
                  />
                  {ROTULOS_CATEGORIA[cat]}
                </label>
              ))}
              <button
                type="button"
                onClick={marcarTodas}
                className={cn(
                  'text-xs font-medium underline-offset-2 hover:underline',
                  TODAS_CATEGORIAS.every((c) => categorias.includes(c))
                    ? 'text-[#0F766E]'
                    : 'text-[#5B6470]',
                )}
              >
                Todas
              </button>
            </div>
          </div>

          {/* Tipo — os 11 tipos */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1A1D21]">Tipo *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={cn(
                    'text-[11px] px-2 py-1.5 rounded border text-left transition-colors',
                    tipo === t
                      ? 'bg-[#0F766E] border-[#0F766E] text-white font-semibold'
                      : 'bg-white border-[#E5E1D8] text-[#1A1D21] hover:bg-[#0F766E]/5',
                  )}
                >
                  {ROTULOS_TIPO[t]}
                </button>
              ))}
            </div>
            {tipo === 'numero' && (
              <p className="text-[10px] text-[#5B6470]">
                Números reconhece CPF (11 dígitos), CNPJ (14) e telefone e formata sozinho — sem
                célula de máscara. Pode virar métrica do fluxo.
              </p>
            )}
            {tipo === 'moeda' && (
              <p className="text-[10px] text-[#5B6470]">Formata em R$ (reais) ao digitar.</p>
            )}
          </div>

          {/* Nome interno + rótulo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A1D21]">Nome interno</Label>
              <Input
                value={nomeInterno}
                onChange={(e) => setNomeInterno(e.target.value)}
                placeholder="uso interno (opcional)"
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A1D21]">Rótulo *</Label>
              <Input
                value={rotulo}
                onChange={(e) => setRotulo(e.target.value)}
                placeholder="ex: sobrenome"
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#1A1D21]">
              Mensagem de ajuda (opcional)
            </Label>
            <Input
              value={mensagemAjuda}
              onChange={(e) => setMensagemAjuda(e.target.value)}
              placeholder="texto de apoio exibido abaixo do campo"
              className="text-xs border-[#E5E1D8]"
            />
          </div>

          {/* Opções (Select, Radio, Lista de Checkbox) */}
          {opcoesNecessarias && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A1D21]">
                Opções * (uma por linha)
              </Label>
              <textarea
                value={opcoes}
                onChange={(e) => setOpcoes(e.target.value)}
                rows={4}
                placeholder={'opção 1\nopção 2\nopção 3'}
                className="w-full rounded-md border border-[#E5E1D8] bg-white px-3 py-2 text-xs outline-none focus:border-[#0F766E]"
              />
            </div>
          )}

          {/* Lista de Seleção */}
          {tipoUsaListaSelecao(tipo) && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#1A1D21]">Lista de seleção *</Label>
              <select
                value={listaSelecionada}
                onChange={(e) => setListaSelecionada(e.target.value)}
                className="w-full h-9 rounded-md border border-[#E5E1D8] bg-white px-2 text-xs outline-none focus:border-[#0F766E]"
              >
                <option value="">Escolher lista de /config...</option>
                {listas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Obrigatório */}
          <label className="flex items-center gap-1.5 text-xs text-[#1A1D21] cursor-pointer">
            <Checkbox checked={obrigatorio} onCheckedChange={(v) => setObrigatorio(v === true)} />
            Campo obrigatório
          </label>

          {/* Máscara — removida do formulário: intrínseca ao tipo Números. */}
          {/* @ts-expect-error variável reservada para exibição futura de máscara */}
          {mascara && tipoUsaMascara(tipo) ? null : null}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={salvando}
            onClick={handleSalvar}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs"
          >
            {salvando ? 'Salvando...' : 'Criar e inserir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
