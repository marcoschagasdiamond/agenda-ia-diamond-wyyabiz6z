// Barra de tags do CardDetalhes (modelo Ummense adaptado):
// - Tags atuais do card, cada uma removível pelo X
// - Modelos prontos clicáveis: Urgente (vermelho), Cliente (azul),
//   Financeiro (verde), Ideia (amarelo) — já aplicadas ficam ocultas
// - Criar tag nova com input de nome + paleta de 8 cores
import { useState } from 'react'
import { Plus, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Cores fixas dos modelos prontos
export const TAG_MODELOS = [
  { nome: 'Urgente', cor: '#EF4444' }, // vermelho
  { nome: 'Cliente', cor: '#3B82F6' }, // azul
  { nome: 'Financeiro', cor: '#10B981' }, // verde
  { nome: 'Ideia', cor: '#F59E0B' }, // amarelo
] as const

// Paleta de 8 cores para tags próprias
export const TAG_PALETA = [
  '#EF4444', // vermelho
  '#F97316', // laranja
  '#F59E0B', // amarelo
  '#10B981', // verde
  '#3B82F6', // azul
  '#8B5CF6', // violeta
  '#EC4899', // rosa
  '#64748B', // cinza
]

export function corTag(tag: string): string | null {
  const modelo = TAG_MODELOS.find((m) => m.nome.toLowerCase() === tag.toLowerCase())
  if (modelo) return modelo.cor
  // tag criada pela paleta: "Nome|#RRGGBB"
  const m = tag.match(/#([0-9A-Fa-f]{6})$/)
  return m ? `#${m[1]}` : null
}

interface BarraTagsCardProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function BarraTagsCard({ tags, onChange }: BarraTagsCardProps) {
  const [criando, setCriando] = useState(false)
  const [nomeTag, setNomeTag] = useState('')
  const [corTagNova, setCorTagNova] = useState<string>(TAG_PALETA[0])

  const existeTag = (nome: string) => tags.some((t) => t.toLowerCase() === nome.toLowerCase())

  const adicionarTag = (nome: string, cor?: string) => {
    const limpo = nome.trim()
    if (!limpo || existeTag(limpo)) return
    // Tags de modelo ficam com o nome puro; tags próprias guardam a cor no sufixo
    const valor = cor ? `${limpo}|${cor}` : limpo
    onChange([...tags, valor])
  }

  const removerTag = (valor: string) => {
    onChange(tags.filter((t) => t !== valor))
  }

  const modelosDisponiveis = TAG_MODELOS.filter((m) => !existeTag(m.nome))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Tags atuais do card */}
      {tags.map((t) => {
        const cor = corTag(t) || '#64748B'
        const rotulo = t.split('|')[0]
        return (
          <span
            key={t}
            className="group inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[11px] font-semibold text-white"
            style={{ backgroundColor: cor }}
          >
            {rotulo}
            <button
              type="button"
              onClick={() => removerTag(t)}
              title="Remover tag"
              className="opacity-70 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )
      })}

      {/* Modelos prontos */}
      {!criando &&
        modelosDisponiveis.map((m) => (
          <button
            key={m.nome}
            type="button"
            onClick={() => adicionarTag(m.nome)}
            title={`Adicionar tag ${m.nome}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-dashed transition-colors"
            style={{ color: m.cor, borderColor: `${m.cor}66` }}
          >
            <Plus className="w-3 h-3" />
            {m.nome}
          </button>
        ))}

      {/* Criar tag */}
      {!criando && (
        <button
          type="button"
          onClick={() => setCriando(true)}
          title="Criar tag nova"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-[#5B6470] border border-[#E5E1D8] hover:bg-[#F4F2EE]"
        >
          <Plus className="w-3 h-3" /> Criar tag
        </button>
      )}

      {criando && (
        <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E1D8] bg-white pl-3 pr-1.5 py-1">
          <Input
            autoFocus
            value={nomeTag}
            onChange={(e) => setNomeTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                adicionarTag(nomeTag, corTagNova)
                setNomeTag('')
                setCriando(false)
              }
              if (e.key === 'Escape') {
                setCriando(false)
                setNomeTag('')
              }
            }}
            placeholder="Nome da tag"
            className="h-6 text-[11px] w-28 border-0 p-0 shadow-none focus-visible:ring-0"
          />
          {/* Paleta de cores */}
          <span className="flex items-center gap-1">
            {TAG_PALETA.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCorTagNova(c)}
                title="Escolher cor"
                className={cn(
                  'w-3.5 h-3.5 rounded-full border transition-transform',
                  corTagNova === c ? 'border-[#1A1D21] scale-125' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
          <Button
            type="button"
            size="sm"
            className="h-6 px-2 text-[10px] bg-[#0F766E] hover:bg-[#0D5C56] text-white"
            disabled={!nomeTag.trim()}
            onClick={() => {
              adicionarTag(nomeTag, corTagNova)
              setNomeTag('')
              setCriando(false)
            }}
          >
            <Plus className="w-3 h-3 mr-0.5" /> Adicionar
          </Button>
          <button
            type="button"
            onClick={() => {
              setCriando(false)
              setNomeTag('')
            }}
            className="text-[#8A93A0] hover:text-[#1A1D21]"
            title="Cancelar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}
    </div>
  )
}

// Spinner utilitário reexportado para uso interno dos consumers
export function LoaderTags() {
  return <Loader2 className="w-3.5 h-3.5 animate-spin" />
}

export default BarraTagsCard
