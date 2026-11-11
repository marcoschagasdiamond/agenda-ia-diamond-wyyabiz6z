// Caixa de busca dos Campos Personalizados — replica o formato da busca de contatos
// do CardDetalhes: quadrado com placeholder, ao clicar lista os campos já criados e,
// como último item, "criar campo personalizado" (abre o assistente ali mesmo).
import { useMemo, useRef, useState, type RefObject } from 'react'
import { ChevronDown, Plus, Search } from 'lucide-react'
import {
  ROTULOS_CATEGORIA,
  ROTULOS_TIPO,
  type CampoPersonalizado,
} from '@/services/camposPersonalizados'

interface Props {
  catalogo: CampoPersonalizado[]
  jaInseridos: string[]
  onInserir: (campo: CampoPersonalizado) => void
  onCriarNovo: () => void
  abrirCatalogo: boolean
  inputRef?: RefObject<HTMLInputElement | null>
}

export default function CaixaSelecaoCampo({
  catalogo,
  jaInseridos,
  onInserir,
  onCriarNovo,
  abrirCatalogo,
  inputRef,
}: Props) {
  const [aberta, setAberta] = useState(false)
  const [busca, setBusca] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const catalogoOrdenado = useMemo(
    () => [...catalogo].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')),
    [catalogo],
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return catalogoOrdenado
    return catalogoOrdenado.filter(
      (c) => c.rotulo.toLowerCase().includes(q) || c.nome_interno.toLowerCase().includes(q),
    )
  }, [busca, catalogoOrdenado])

  const naoInseridos = useMemo(
    () => filtrados.filter((c) => !jaInseridos.includes(c.id)),
    [filtrados, jaInseridos],
  )

  const termoSemResultado = busca.trim().length > 0 && naoInseridos.length === 0

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-[#E5E1D8] bg-white cursor-text"
        onClick={() => {
          setAberta(true)
          inputRef?.current?.focus()
        }}
      >
        <Search className="w-3.5 h-3.5 text-[#5B6470] shrink-0" />
        <input
          ref={inputRef}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onFocus={() => setAberta(true)}
          onBlur={() => window.setTimeout(() => setAberta(false), 180)}
          placeholder="campo personalizado"
          className="flex-1 bg-transparent outline-none text-xs text-[#1A1D21] placeholder:text-[#5B6470]"
        />
        <ChevronDown className="w-3.5 h-3.5 text-[#5B6470]" />
      </div>

      {aberta && abrirCatalogo && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-[#E5E1D8] bg-white shadow-lg max-h-64 overflow-auto">
          {naoInseridos.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onInserir(c)
                setBusca('')
                setAberta(false)
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#1A1D21] hover:bg-[#0F766E]/5 flex items-center justify-between gap-2"
            >
              <span className="truncate flex-1">{c.rotulo}</span>
              <span className="text-[10px] text-[#5B6470] shrink-0">{ROTULOS_TIPO[c.tipo]}</span>
              {/* Categoria é INFORMATIVA — não filtra o catálogo */}
              <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#F4F2EE] text-[#5B6470] border border-[#E5E1D8]">
                {ROTULOS_CATEGORIA[c.categoria]}
              </span>
            </button>
          ))}

          {catalogoOrdenado.length === 0 && !termoSemResultado && (
            <p className="px-3 py-2 text-[11px] text-[#5B6470]">Nenhum campo criado ainda.</p>
          )}

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setAberta(false)
              setBusca('')
              onCriarNovo()
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-[#0F766E] hover:bg-[#0F766E]/10 flex items-center gap-1.5 border-t border-[#E5E1D8]"
          >
            <Plus className="w-3.5 h-3.5" />
            criar campo personalizado
          </button>
        </div>
      )}
    </div>
  )
}
