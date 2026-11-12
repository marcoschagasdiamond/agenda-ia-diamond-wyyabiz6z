import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eraser,
  Layers,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import {
  MODELOS_FLUXO_TEMPLATES,
  TEMPLATE_PADRAO_ID,
  type FaseTemplateItem,
} from '@/pages/fluxo/fluxoTemplates'

export type FaseFluxoDraft = FaseTemplateItem

export const CORES_FASES_SUGERIDAS = [
  '#0F766E',
  '#0EA5E9',
  '#2563EB',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#10B981',
  '#64748B',
]

interface EditorFasesFluxoProps {
  fases: FaseFluxoDraft[]
  onChange: (fases: FaseFluxoDraft[]) => void
}

/**
 * Editor de fases embutido no modal de CRIAÇÃO de fluxo novo.
 * Permite montar/editar as fases ali mesmo: adicionar, renomear, remover
 * e reordenar, com opção de começar vazio ou com as 5 fases padrão.
 */
export function EditorFasesFluxo({ fases, onChange }: EditorFasesFluxoProps) {
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaCor, setNovaCor] = useState('#0EA5E9')
  const [erro, setErro] = useState<string | null>(null)

  const handleMover = (idx: number, direcao: -1 | 1) => {
    const alvo = idx + direcao
    if (alvo < 0 || alvo >= fases.length) return
    const novas = [...fases]
    const temp = novas[alvo]
    novas[alvo] = novas[idx]
    novas[idx] = temp
    onChange(novas)
  }

  const handleAlterarTitulo = (idx: number, titulo: string) => {
    onChange(fases.map((f, i) => (i === idx ? { ...f, titulo } : f)))
  }

  const handleAlterarCor = (idx: number, cor: string) => {
    onChange(fases.map((f, i) => (i === idx ? { ...f, cor } : f)))
  }

  const handleToggleConclusao = (idx: number) => {
    onChange(
      fases.map((f, i) => {
        if (i === idx) return { ...f, is_conclusao: !f.is_conclusao }
        return f.is_conclusao ? { ...f, is_conclusao: false } : f
      }),
    )
  }

  const handleRemover = (idx: number) => {
    onChange(fases.filter((_, i) => i !== idx))
  }

  const handleAdicionar = () => {
    const tituloTrim = novoTitulo.trim()
    if (!tituloTrim) {
      setErro('Digite um nome para a fase.')
      return
    }
    if (fases.some((f) => f.titulo.trim().toLowerCase() === tituloTrim.toLowerCase())) {
      setErro('Já existe uma fase com este nome.')
      return
    }
    setErro(null)
    const ehConclusao =
      tituloTrim.toLowerCase().includes('finaliz') || tituloTrim.toLowerCase().includes('termin')
    onChange([...fases, { titulo: tituloTrim, cor: novaCor, is_conclusao: ehConclusao }])
    setNovoTitulo('')
    setNovaCor('#0F766E')
  }

  const aplicarTemplate = (templateId: string) => {
    const tmpl = MODELOS_FLUXO_TEMPLATES.find((t) => t.id === templateId)
    if (!tmpl) return
    setErro(null)
    setNovoTitulo('')
    onChange(tmpl.fases.map((f) => ({ ...f })))
  }

  const templatePadrao = MODELOS_FLUXO_TEMPLATES.find((t) => t.id === TEMPLATE_PADRAO_ID)

  return (
    <div className="space-y-2 p-3 rounded-xl bg-[#F4F2EE]/50 border border-[#E5E1D8]">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-[#1A1D21] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Fases do Board (monte aqui, antes de salvar)</span>
        </label>
        <Badge variant="outline" className="text-[10px] bg-white border-[#E5E1D8] text-[#5B6470]">
          {fases.length} {fases.length === 1 ? 'fase' : 'fases'}
        </Badge>
      </div>

      {/* Atalhos: começar com as 5 padrão ou vazio */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-[#5B6470] font-semibold uppercase tracking-wider">
          Começar:
        </span>
        <button
          type="button"
          onClick={() => aplicarTemplate(TEMPLATE_PADRAO_ID)}
          className="text-[10px] font-semibold px-2 py-1 rounded-md border border-[#E5E1D8] bg-white text-[#0F766E] hover:bg-[#0F766E] hover:text-white transition-colors"
          title={`Preencher com as ${templatePadrao?.fases.length ?? 5} fases padrão`}
        >
          5 fases padrão
        </button>
        <button
          type="button"
          onClick={() => {
            setErro(null)
            setNovoTitulo('')
            onChange([])
          }}
          className="text-[10px] font-semibold px-2 py-1 rounded-md border border-[#E5E1D8] bg-white text-[#5B6470] hover:bg-[#F4F2EE] transition-colors flex items-center gap-1"
          title="Limpar todas as fases e montar do zero"
        >
          <Eraser className="w-3 h-3" />
          Começar vazio
        </button>
        <span className="text-[10px] text-[#5B6470]/70">ou adicione uma a uma abaixo</span>
      </div>

      {/* Lista editável de fases */}
      <div className="space-y-1.5">
        {fases.map((fase, idx) => (
          <div
            key={`${fase.titulo}-${idx}`}
            className="p-2 rounded-lg border border-[#E5E1D8] bg-white flex items-center gap-2"
          >
            <span className="text-[11px] font-bold text-[#5B6470] w-4 text-center shrink-0">
              {idx + 1}º
            </span>

            <input
              type="color"
              value={fase.cor || '#0F766E'}
              onChange={(e) => handleAlterarCor(idx, e.target.value)}
              className="w-7 h-7 rounded border border-[#E5E1D8] cursor-pointer shrink-0"
              title="Cor da fase"
            />

            <Input
              value={fase.titulo}
              onChange={(e) => handleAlterarTitulo(idx, e.target.value)}
              placeholder="Nome da fase..."
              className="text-xs font-semibold h-8 border-[#E5E1D8]"
            />

            <button
              type="button"
              onClick={() => handleToggleConclusao(idx)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium border shrink-0 transition-colors flex items-center gap-1 ${
                fase.is_conclusao
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-[#5B6470] border-[#E5E1D8] hover:border-emerald-500 hover:text-emerald-700'
              }`}
              title="Marcar como fase de conclusão (bloco 'Quantidade de cards finalizados')"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span className="hidden sm:inline">{fase.is_conclusao ? 'Conclusão' : 'Marcar'}</span>
            </button>

            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={idx === 0}
                onClick={() => handleMover(idx, -1)}
                className="h-7 w-7 p-0 text-[#5B6470]"
                title="Mover para a esquerda / cima"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={idx === fases.length - 1}
                onClick={() => handleMover(idx, 1)}
                className="h-7 w-7 p-0 text-[#5B6470]"
                title="Mover para a direita / baixo"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemover(idx)}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Remover esta fase"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {fases.length === 0 && (
          <div className="p-4 text-center text-[11px] text-[#5B6470]/80 border border-dashed border-[#E5E1D8] rounded-lg bg-white/50">
            Nenhuma fase ainda. Comece com as 5 padrão, comece vazio ou adicione abaixo.
          </div>
        )}
      </div>

      {/* Formulário rápido para adicionar nova fase */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="color"
          value={novaCor}
          onChange={(e) => setNovaCor(e.target.value)}
          className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer shrink-0"
          title="Cor da nova fase"
        />
        <div className="flex flex-wrap gap-1 shrink-0">
          {CORES_FASES_SUGERIDAS.slice(0, 4).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNovaCor(c)}
              className="w-4 h-4 rounded-full border border-black/10 transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
              title={`Usar a cor ${c}`}
            />
          ))}
        </div>
        <Input
          value={novoTitulo}
          onChange={(e) => {
            setNovoTitulo(e.target.value)
            if (erro) setErro(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdicionar()
            }
          }}
          placeholder="Nova fase (ex: Homologação, Testes)..."
          className="text-xs h-8 border-[#E5E1D8] flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAdicionar}
          disabled={!novoTitulo.trim()}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3 gap-1 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar</span>
        </Button>
      </div>

      {erro && <p className="text-[11px] text-red-600 font-medium">{erro}</p>}

      <div className="flex items-center gap-1.5 text-[10px] text-[#5B6470]">
        <RotateCcw className="w-3 h-3 shrink-0" />
        <span>
          A ordem definida aqui vira a ordem das colunas do board quando você salvar o fluxo.
        </span>
      </div>
    </div>
  )
}
