import { useMemo } from 'react'
import type { Card as CardType, ColunaFluxo } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Sparkles } from 'lucide-react'

interface FluxoGanttViewProps {
  cards: CardType[]
  colunasOrdenadas: ColunaFluxo[]
  onEditarCard: (card: CardType) => void
}

export function FluxoGanttView({ cards, colunasOrdenadas, onEditarCard }: FluxoGanttViewProps) {
  // Converte data para timestamp numérico
  const parseDate = (d?: string) => {
    if (!d) return Date.now()
    const t = new Date(d).getTime()
    return isNaN(t) ? Date.now() : t
  }

  // Janela de tempo calculada a partir dos cards existentes (mínimo 14 dias)
  const { minTime, maxTime, diasTotais, labelsDias } = useMemo(() => {
    if (cards.length === 0) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime()
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14).getTime()
      return { minTime: start, maxTime: end, diasTotais: 21, labelsDias: [] }
    }

    let min = Infinity
    let max = -Infinity

    for (const c of cards) {
      const tCreated = parseDate(c.created)
      const tUpdated = parseDate(c.updated || c.created)
      if (tCreated < min) min = tCreated
      if (tCreated > max) max = tCreated
      if (tUpdated > max) max = tUpdated
    }

    // Se tudo for no mesmo instante ou janela muito estreita, alarga
    const oneDay = 24 * 60 * 60 * 1000
    const startWindow = new Date(min)
    startWindow.setHours(0, 0, 0, 0)
    let minT = startWindow.getTime() - oneDay // 1 dia de margem antes

    let maxT = max + oneDay * 5 // 5 dias de margem à frente
    if (maxT - minT < oneDay * 14) {
      maxT = minT + oneDay * 14
    }

    const totalDays = Math.max(7, Math.ceil((maxT - minT) / oneDay))

    // Gera lista de dias para o header
    const dias: { label: string; sub: string; isToday: boolean }[] = []
    const hojeStr = new Date().toDateString()
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(minT + i * oneDay)
      dias.push({
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        sub: d.toLocaleDateString('pt-BR', { weekday: 'narrow' }),
        isToday: d.toDateString() === hojeStr,
      })
    }

    return { minTime: minT, maxTime: maxT, diasTotais: totalDays, labelsDias: dias }
  }, [cards])

  // Agrupamento dos cards por coluna para melhor leitura visual
  const cardsPorColuna = useMemo(() => {
    const mapa = new Map<string, { coluna: ColunaFluxo; items: CardType[] }>()

    for (const col of colunasOrdenadas) {
      mapa.set(col.chave, { coluna: col, items: [] })
    }

    const semColuna: CardType[] = []
    for (const card of cards) {
      const chave = (card.status as string) || 'backlog'
      const grupo = mapa.get(chave)
      if (grupo) {
        grupo.items.push(card)
      } else {
        semColuna.push(card)
      }
    }

    return {
      grupos: Array.from(mapa.values()).filter((g) => g.items.length > 0),
      semColuna,
    }
  }, [cards, colunasOrdenadas])

  const formatarData = (d?: string) => {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } catch {
      return d
    }
  }

  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E1D8] p-12 text-center shadow-xs">
        <Clock className="w-10 h-10 text-[#5B6470]/40 mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#1A1D21]">
          Nenhum card disponível para a linha do tempo
        </p>
        <p className="text-xs text-[#5B6470] mt-1">
          Crie cards para visualizar o cronograma do fluxo.
        </p>
      </div>
    )
  }

  const spanTotal = Math.max(1, maxTime - minTime)

  return (
    <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
      {/* Legenda e topo */}
      <div className="p-3 bg-[#FAFAF9] border-b border-[#E5E1D8] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#0F766E]" />
          <span className="font-bold text-[#1A1D21] uppercase tracking-wider text-[11px]">
            Linha do Tempo dos Cards (Gantt)
          </span>
          <Badge variant="outline" className="text-[10px] bg-white border-[#E5E1D8] text-[#5B6470]">
            {cards.length} cards no período
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#5B6470]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#0F766E]" />
            Duração do Card (Criação → Atualização)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-100" />
            Hoje
          </span>
        </div>
      </div>

      {/* Grid horizontal com scroll */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header de dias */}
          <div className="grid grid-cols-[260px_1fr] border-b border-[#E5E1D8] bg-[#F4F2EE]/60 text-[10px] font-semibold text-[#5B6470]">
            <div className="p-2.5 border-r border-[#E5E1D8] uppercase tracking-wider">
              Card / Coluna
            </div>
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${diasTotais}, minmax(40px, 1fr))` }}
            >
              {labelsDias.map((d, i) => (
                <div
                  key={i}
                  className={`py-2 px-1 text-center border-r border-[#E5E1D8]/40 last:border-r-0 ${
                    d.isToday ? 'bg-blue-50 font-bold text-blue-700' : ''
                  }`}
                >
                  <div>{d.label}</div>
                  <div className="text-[9px] text-[#5B6470]/70 uppercase">{d.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas agrupadas por coluna */}
          <div className="divide-y divide-[#E5E1D8]">
            {cardsPorColuna.grupos.map((grupo) => (
              <div key={grupo.coluna.id || grupo.coluna.chave} className="bg-white">
                {/* Cabeçalho da coluna */}
                <div className="grid grid-cols-[260px_1fr] bg-[#FAFAF9] border-b border-[#E5E1D8]/60">
                  <div className="p-2 border-r border-[#E5E1D8] flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: grupo.coluna.cor || '#0F766E' }}
                    />
                    <span className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider truncate">
                      {grupo.coluna.titulo}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-none bg-[#E5E1D8] text-[#5B6470]"
                    >
                      {grupo.items.length}
                    </Badge>
                  </div>
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: `repeat(${diasTotais}, minmax(40px, 1fr))` }}
                  >
                    {labelsDias.map((d, i) => (
                      <div
                        key={i}
                        className={`h-7 border-r border-[#E5E1D8]/30 last:border-r-0 ${
                          d.isToday ? 'bg-blue-50/40' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Cards da coluna */}
                {grupo.items.map((card) => {
                  const tStart = parseDate(card.created)
                  const tEnd = Math.max(
                    tStart + 1000 * 60 * 60 * 12,
                    parseDate(card.updated || card.created),
                  )

                  const leftPct = Math.max(0, Math.min(95, ((tStart - minTime) / spanTotal) * 100))
                  const rightPct = Math.max(
                    leftPct + 3,
                    Math.min(100, ((tEnd - minTime) / spanTotal) * 100),
                  )
                  const widthPct = Math.max(3, rightPct - leftPct)

                  return (
                    <div
                      key={card.id}
                      onClick={() => onEditarCard(card)}
                      className="grid grid-cols-[260px_1fr] hover:bg-[#F4F2EE]/40 cursor-pointer transition-colors border-b border-[#E5E1D8]/40 last:border-b-0"
                    >
                      {/* Lado esquerdo: info do card */}
                      <div className="p-2.5 border-r border-[#E5E1D8] flex items-center justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#1A1D21] uppercase tracking-tight truncate">
                            {card.titulo}
                          </p>
                          <p className="text-[10px] text-[#5B6470]">
                            {formatarData(card.created)}
                            {card.updated && card.updated !== card.created
                              ? ` → ${formatarData(card.updated)}`
                              : ''}
                          </p>
                        </div>
                        {card.criado_por_ia && (
                          <Sparkles className="w-3 h-3 text-[#0F766E] shrink-0" />
                        )}
                      </div>

                      {/* Lado direito: timeline bar */}
                      <div className="relative py-2 px-1 flex items-center">
                        {/* Linhas verticais de grade */}
                        <div
                          className="absolute inset-0 grid pointer-events-none"
                          style={{
                            gridTemplateColumns: `repeat(${diasTotais}, minmax(40px, 1fr))`,
                          }}
                        >
                          {labelsDias.map((d, i) => (
                            <div
                              key={i}
                              className={`h-full border-r border-[#E5E1D8]/30 last:border-r-0 ${
                                d.isToday ? 'bg-blue-50/40 border-r-blue-200' : ''
                              }`}
                            />
                          ))}
                        </div>

                        {/* Barra Gantt do card */}
                        <div
                          className="relative h-6 rounded-md shadow-2xs flex items-center px-2 text-[10px] font-semibold text-white truncate transition-transform hover:scale-[1.01]"
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: grupo.coluna.cor || '#0F766E',
                          }}
                          title={`${card.titulo} (${formatarData(card.created)} - ${formatarData(card.updated)})`}
                        >
                          <span className="truncate uppercase">{card.titulo}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
