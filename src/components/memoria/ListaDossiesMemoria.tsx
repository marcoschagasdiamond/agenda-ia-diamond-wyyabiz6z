import { useState, useEffect, useCallback } from 'react'
import {
  FolderOpen,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  listarDossies,
  regenerarDossie,
  type DossieMemoria,
  type TipoEntidadeDossie,
} from '@/services/dossiesMemoria'
import { cn } from '@/lib/utils'

const ROTULOS_TIPO: Record<string, string> = {
  contato: 'Contato',
  negocio: 'Negócio',
  projeto: 'Projeto',
}

const CORES_TIPO: Record<string, string> = {
  contato: 'bg-sky-50 text-sky-700 border-sky-200',
  negocio: 'bg-amber-50 text-amber-700 border-amber-200',
  projeto: 'bg-violet-50 text-violet-700 border-violet-200',
}

export function formatarDataCurta(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PER_PAGE = 10
const TIPOS: Array<TipoEntidadeDossie | ''> = ['', 'contato', 'negocio', 'projeto']

interface ListaDossiesMemoriaProps {
  /** Muda o valor toda vez que o painel Estado da Memória consolida — força recarregar */
  sinalRecarga?: number
}

export default function ListaDossiesMemoria({ sinalRecarga = 0 }: ListaDossiesMemoriaProps) {
  const [itens, setItens] = useState<DossieMemoria[]>([])
  const [page, setPage] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoEntidadeDossie | ''>('')
  const [regenerando, setRegenerando] = useState<string | null>(null)

  const carregar = useCallback(
    async (pagina: number, termo: string, tipo: TipoEntidadeDossie | '') => {
      setCarregando(true)
      try {
        const res = await listarDossies(pagina, PER_PAGE, {
          busca: termo,
          tipo_entidade: tipo,
        })
        setItens(res.itens)
      } catch {
        setItens([])
      } finally {
        setCarregando(false)
      }
    },
    [],
  )

  useEffect(() => {
    carregar(page, buscaAplicada, tipoSelecionado)
  }, [page, buscaAplicada, tipoSelecionado, carregar])

  // Recarrega quando o painel Estado da Memória consolidar dossiês novos
  useEffect(() => {
    if (sinalRecarga > 0) carregar(1, buscaAplicada, tipoSelecionado)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinalRecarga])

  const submeterBusca = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setBuscaAplicada(busca.trim())
  }

  const selecionarTipo = (tipo: TipoEntidadeDossie | '') => {
    setPage(1)
    setTipoSelecionado(tipo)
  }

  const handleRegenerar = async (d: DossieMemoria) => {
    setRegenerando(d.id)
    try {
      await regenerarDossie(d.tipo_entidade, d.entidade_id)
      await carregar(page, buscaAplicada, tipoSelecionado)
    } catch {
      // silencioso: dossiê atual permanece visível
    } finally {
      setRegenerando(null)
    }
  }

  const temPaginaAnterior = page > 1
  const temProximaPagina = itens.length === PER_PAGE

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1A1D21]">Dossiês de memória</h3>
            <p className="text-[11px] text-[#5B6470]">
              Consolidados por pessoa, negócio ou projeto — atualizados automaticamente
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => carregar(page, buscaAplicada, tipoSelecionado)}
          className="h-8 text-xs border-[#E5E1D8] text-[#5B6470] gap-1"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', carregando && 'animate-spin')} />
        </Button>
      </div>

      <form onSubmit={submeterBusca} className="relative mb-2">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5B6470]" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar dossiê por nome ou conteúdo…"
          className="h-8 text-xs pl-8 bg-[#FAFAF9] border-[#E5E1D8]"
        />
      </form>

      {/* Filtro por tipo de entidade — parâmetro REAL tipo_entidade do GET /dossies */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TIPOS.map((t) => (
          <button
            key={t || 'todos'}
            type="button"
            onClick={() => selecionarTipo(t)}
            className={cn(
              'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
              tipoSelecionado === t
                ? 'bg-[#0F766E] text-white border-transparent'
                : 'border-[#E5E1D8] bg-[#FAFAF9] text-[#5B6470] hover:bg-[#0F766E]/5 hover:border-[#0F766E]/40 hover:text-[#0F766E]',
            )}
          >
            {t === '' ? 'Todos' : ROTULOS_TIPO[t]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
        {carregando && itens.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#5B6470]">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando dossiês…
          </div>
        ) : itens.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#5B6470]">
            {tipoSelecionado || buscaAplicada
              ? 'Nenhum dossiê encontrado com esse filtro.'
              : 'Nenhum dossiê consolidado ainda. Eles são criados automaticamente à medida que você registra interações com contatos, negócios e projetos.'}
          </div>
        ) : (
          itens.map((d) => (
            <details
              key={d.id}
              className="group rounded-xl border border-[#E5E1D8] bg-white shadow-2xs overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-[#FAFAF9] transition-colors list-none">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-[#1A1D21] truncate">
                      {d.entidade_nome || d.nome}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('text-[9px] h-4.5', CORES_TIPO[d.tipo_entidade] || '')}
                    >
                      {ROTULOS_TIPO[d.tipo_entidade] || d.tipo_entidade}
                    </Badge>
                    {d.desatualizado && (d.mudancas_desde_ultima || 0) > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4.5 border-amber-300 text-amber-700 bg-amber-50 gap-0.5"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        desatualizado · {d.mudancas_desde_ultima} mudança(s)
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-[#5B6470] mt-0.5">
                    Atualizado em {formatarDataCurta(d.atualizado_em)}
                    {Array.isArray(d.demandas_abertas) && d.demandas_abertas.length > 0 && (
                      <> · {d.demandas_abertas.length} demanda(s) em aberto</>
                    )}
                  </p>
                </div>
                <RefreshCw
                  className={cn(
                    'w-3.5 h-3.5 text-[#5B6470] opacity-0 group-hover:opacity-100 transition-opacity',
                    regenerando === d.id && 'opacity-100 animate-spin',
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (regenerando !== d.id) handleRegenerar(d)
                  }}
                />
              </summary>
              <div className="px-3 pb-3 pt-1 border-t border-[#E5E1D8] bg-[#FAFAF9]/60">
                <p className="text-[11px] text-[#1A1D21] whitespace-pre-wrap leading-relaxed">
                  {d.resumo}
                </p>
                {d.conteudo && (
                  <p className="text-[10px] text-[#5B6470] whitespace-pre-wrap leading-relaxed mt-2">
                    {d.conteudo}
                  </p>
                )}
                {Array.isArray(d.demandas_abertas) && d.demandas_abertas.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {d.demandas_abertas.map((dem, i) => (
                      <div key={i} className="text-[10px] text-[#1A1D21] flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                        <span>
                          {dem.titulo}
                          {dem.prazo ? ` — prazo ${dem.prazo}` : ''}
                          {dem.prioridade ? ` (${dem.prioridade})` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))
        )}
      </div>

      {itens.length > 0 && (
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#E5E1D8]">
          <Button
            variant="ghost"
            size="sm"
            disabled={!temPaginaAnterior || carregando}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-7 text-[11px] gap-1 text-[#5B6470]"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Anterior
          </Button>
          <span className="text-[10px] text-[#5B6470]">
            Página {page}
            {buscaAplicada || tipoSelecionado ? ` · filtro ativo` : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!temProximaPagina || carregando}
            onClick={() => setPage((p) => p + 1)}
            className="h-7 text-[11px] gap-1 text-[#5B6470]"
          >
            Próxima <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
