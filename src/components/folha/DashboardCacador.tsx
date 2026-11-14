// Painel de resumo do cofre do "Caçador de Sementes" — Diamantina, funcionária de IA.
// Renderiza dentro do PainelCacadorSementes (aba Sementes da /folha), no mesmo
// estilo visual do PainelResumoDia. Calcula a partir do HISTÓRICO de caçadas:
//  - Cartões de resumo: germinadas no mês, taxa de conversão, urgentes, aparições;
//  - Visão por tese (agrupando sugestoes[].tese de todas as caçadas);
//  - Ranking de parceiros/negócios (sugestões com mais aparições/score);
//  - Idade do cofre: dias desde a caçada mais antiga do histórico.
import React, { useMemo } from 'react'
import { Sprout, Target, Trophy, Hourglass, TrendingUp, Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  parseSugestoesGerminacao,
  parseStatusRegistros,
  idadeDias,
  type SugestoesSementeDia,
} from '@/services/cacadorSementes'

interface Props {
  /** Histórico de caçadas (página atual do seletor de datas). */
  itens: SugestoesSementeDia[]
  /** Registro do dia (o mais recente) — usado nos contadores de germinadas. */
  registroHoje: SugestoesSementeDia | null
  /** Quantidade de sugestões da caçada exibida. */
  totalSugestoesDia: number
}

interface LinhaTese {
  tese: string
  total: number
  germinadas: number
  ignoradas: number
  urgentes: number
  melhorScore: number
}

interface LinhaRanking {
  titulo: string
  tese: string
  aparicoes: number
  melhorScore: number
  urgente: boolean
  status: string
}

export default function DashboardCacador({ itens, registroHoje, totalSugestoesDia }: Props) {
  /** Sugestões de todas as caçadas do histórico com o rastro de cada uma. */
  const caçadas = useMemo(
    () =>
      itens.map((r) => ({
        data: r.data_geracao,
        sugestoes: parseSugestoesGerminacao(r),
        status: parseStatusRegistros(r),
      })),
    [itens],
  )

  /** Cartões de resumo do cofre. */
  const resumo = useMemo(() => {
    const agora = new Date()
    const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

    let germinadasNoMes = 0
    let germinadasTotal = 0
    let ignoradasTotal = 0
    let urgentesAtuais = 0
    let aparicoes = 0
    let maisAntiga: string | null = null

    caçadas.forEach((c) => {
      if (c.data && (!maisAntiga || c.data < maisAntiga)) maisAntiga = c.data
      c.sugestoes.forEach((s) => {
        const st = (s.folha_id && c.status[s.folha_id]?.status) || 'madura'
        if (st === 'germinada') {
          germinadasTotal += 1
          const quando = c.status[s.folha_id as string]?.germinada_em || ''
          if (quando.slice(0, 7) === mesAtual) germinadasNoMes += 1
        }
        if (st === 'ignorada') ignoradasTotal += 1
      })
      if (c.data === registroHoje?.data_geracao) {
        urgentesAtuais = c.sugestoes.filter((s) => s.urgente).length
      }
    })

    // Aparições (recorrência): soma o total deduplicado por semente (folha_id).
    const porSemente: Record<string, number> = {}
    caçadas.forEach((c) =>
      c.sugestoes.forEach((s) => {
        if (!s.folha_id) return
        porSemente[s.folha_id] = (porSemente[s.folha_id] || 0) + 1
      }),
    )
    Object.values(porSemente).forEach((n) => {
      aparicoes += n
    })

    const decididas = germinadasTotal + ignoradasTotal
    const taxa = decididas > 0 ? Math.round((germinadasTotal / decididas) * 100) : 0
    const idadeCofre = maisAntiga ? idadeDias(maisAntiga) : 0

    return {
      germinadasNoMes,
      germinadasTotal,
      ignoradasTotal,
      urgentesAtuais,
      aparicoes,
      taxa,
      decididas,
      idadeCofre,
    }
  }, [caçadas, registroHoje?.data_geracao])

  /** Visão por tese: agrupa todas as sugestões do histórico. */
  const porTese = useMemo<LinhaTese[]>(() => {
    const mapa = new Map<string, LinhaTese>()
    caçadas.forEach((c) =>
      c.sugestoes.forEach((s) => {
        const chave = s.tese || 'Sem tese'
        const linha = mapa.get(chave) || {
          tese: chave,
          total: 0,
          germinadas: 0,
          ignoradas: 0,
          urgentes: 0,
          melhorScore: 0,
        }
        linha.total += 1
        const st = (s.folha_id && c.status[s.folha_id]?.status) || 'madura'
        if (st === 'germinada') linha.germinadas += 1
        if (st === 'ignorada') linha.ignoradas += 1
        if (s.urgente) linha.urgentes += 1
        linha.melhorScore = Math.max(linha.melhorScore, s.score || 0)
        mapa.set(chave, linha)
      }),
    )
    return Array.from(mapa.values()).sort(
      (a, b) => b.total - a.total || b.melhorScore - a.melhorScore,
    )
  }, [caçadas])

  /** Ranking de parceiros/negócios: as sementes que mais aparecem/pontuam. */
  const ranking = useMemo<LinhaRanking[]>(() => {
    const mapa = new Map<string, LinhaRanking>()
    caçadas.forEach((c) =>
      c.sugestoes.forEach((s) => {
        const chave = s.folha_id || s.titulo_card_sugerido || s.tese || ''
        if (!chave) return
        const st = (s.folha_id && c.status[s.folha_id]?.status) || 'madura'
        const linha = mapa.get(chave) || {
          titulo: s.titulo_card_sugerido || s.tese || 'Semente',
          tese: s.tese || '',
          aparicoes: 0,
          melhorScore: 0,
          urgente: false,
          status: 'madura',
        }
        linha.aparicoes += 1
        linha.melhorScore = Math.max(linha.melhorScore, s.score || 0)
        linha.urgente = linha.urgente || Boolean(s.urgente)
        if (st !== 'madura') linha.status = st
        mapa.set(chave, linha)
      }),
    )
    return Array.from(mapa.values())
      .sort((a, b) => b.aparicoes - a.aparicoes || b.melhorScore - a.melhorScore)
      .slice(0, 5)
  }, [caçadas])

  const cartao = (icone: React.ReactNode, rotulo: string, valor: React.ReactNode, cor: string) => (
    <div className={cn('p-2.5 rounded-lg border space-y-0.5', cor)}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
        {icone}
        <span>{rotulo}</span>
      </div>
      <p className="text-lg font-bold leading-none">{valor}</p>
    </div>
  )

  return (
    <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 via-white to-white p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>Dashboard do cofre</span>
        <span className="font-semibold normal-case text-[#5B6470]">
          · {totalSugestoesDia} sugestão(ões) na caçada exibida
        </span>
      </div>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {cartao(
          <Sprout className="w-3 h-3 text-emerald-600" />,
          'Germinadas no mês',
          resumo.germinadasNoMes,
          'bg-emerald-50/70 border-emerald-200 text-emerald-900',
        )}
        {cartao(
          <Target className="w-3 h-3 text-teal-600" />,
          'Taxa de conversão',
          resumo.decididas > 0 ? `${resumo.taxa}%` : '—',
          'bg-teal-50/70 border-teal-200 text-teal-900',
        )}
        {cartao(
          <Flame className="w-3 h-3 text-rose-600" />,
          'Urgentes hoje',
          resumo.urgentesAtuais,
          'bg-rose-50/70 border-rose-200 text-rose-900',
        )}
        {cartao(
          <Hourglass className="w-3 h-3 text-amber-600" />,
          'Idade do cofre',
          resumo.idadeCofre > 0 ? `${resumo.idadeCofre} d` : 'hoje',
          'bg-amber-50/70 border-amber-200 text-amber-900',
        )}
      </div>

      {/* Visão por tese */}
      {porTese.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B6470] flex items-center gap-1">
            <Target className="w-3 h-3" /> Visão por tese
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {porTese.slice(0, 6).map((t) => (
              <div
                key={t.tese}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-[#E5E1D8] text-[11px]"
              >
                <span className="font-semibold text-[#1A1D21] truncate" title={t.tese}>
                  🎯 {t.tese}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Badge className="bg-[#F4F2EE] text-[#1A1D21] hover:bg-[#F4F2EE] border-none text-[10px] px-1.5 py-0 font-bold">
                    {t.total} sugest{t.total === 1 ? 'ão' : 'ões'}
                  </Badge>
                  {t.germinadas > 0 && (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[10px] px-1.5 py-0 font-bold">
                      {t.germinadas} 🌱
                    </Badge>
                  )}
                  {t.urgentes > 0 && (
                    <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none text-[10px] px-1.5 py-0 font-bold">
                      {t.urgentes} urg.
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranking de parceiros/negócios */}
      {ranking.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B6470] flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-600" /> Ranking de parceiros/negócios
          </p>
          <div className="space-y-1">
            {ranking.map((r, i) => (
              <div
                key={r.titulo + i}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-[#E5E1D8] text-[11px]"
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0',
                    i === 0
                      ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                      : 'bg-stone-100 text-stone-600',
                  )}
                >
                  {i + 1}
                </span>
                <span className="font-semibold text-[#1A1D21] truncate min-w-0" title={r.titulo}>
                  {r.titulo}
                </span>
                {r.tese && (
                  <span className="text-[#5B6470] truncate hidden md:inline">· {r.tese}</span>
                )}
                <span className="ml-auto flex items-center gap-1.5 shrink-0">
                  {r.urgente && (
                    <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-none text-[9px] px-1 py-0 font-bold">
                      urgente
                    </Badge>
                  )}
                  {r.status === 'germinada' ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none text-[9px] px-1 py-0 font-bold">
                      🌱
                    </Badge>
                  ) : r.status === 'ignorada' ? (
                    <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-100 border-none text-[9px] px-1 py-0 font-bold">
                      ignorada
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-none text-[9px] px-1 py-0 font-bold">
                      madura
                    </Badge>
                  )}
                  <span className="text-[#5B6470] font-medium whitespace-nowrap">
                    {r.aparicoes} apariç{r.aparicoes === 1 ? 'ão' : 'ões'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {itens.length === 0 && (
        <p className="text-[11px] text-[#5B6470] italic">
          O dashboard se alimenta do histórico de caçadas — gere sugestões para começar.
        </p>
      )}
    </div>
  )
}
