import { useMemo } from 'react'
import type { Card as CardType, ColunaFluxo, Projeto, GrupoFamilia, Contato } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Layers,
  Users,
  Briefcase,
  Sparkles,
} from 'lucide-react'

interface FluxoIndicadoresViewProps {
  cards: CardType[]
  colunasOrdenadas: ColunaFluxo[]
  familias: GrupoFamilia[]
  projetos: Projeto[]
  contatos: Contato[]
}

export function FluxoIndicadoresView({
  cards,
  colunasOrdenadas,
  familias,
  projetos,
  contatos,
}: FluxoIndicadoresViewProps) {
  // 1. Estatísticas por Coluna
  const porColuna = useMemo(() => {
    return colunasOrdenadas.map((col) => {
      const total = cards.filter((c) => c.status === col.chave).length
      const pct = cards.length > 0 ? Math.round((total / cards.length) * 100) : 0
      return {
        coluna: col,
        total,
        pct,
      }
    })
  }, [cards, colunasOrdenadas])

  // 2. Estatísticas por Prioridade
  const porPrioridade = useMemo(() => {
    const counts = { urgente: 0, alta: 0, media: 0, baixa: 0 }
    for (const c of cards) {
      const p = (c.prioridade || 'media') as keyof typeof counts
      if (counts[p] !== undefined) counts[p]++
      else counts.media++
    }
    return [
      {
        key: 'urgente',
        label: 'Urgente',
        total: counts.urgente,
        cor: '#DC2626',
        bg: 'bg-red-50 text-red-700',
      },
      {
        key: 'alta',
        label: 'Alta',
        total: counts.alta,
        cor: '#F59E0B',
        bg: 'bg-amber-50 text-amber-700',
      },
      {
        key: 'media',
        label: 'Média',
        total: counts.media,
        cor: '#0EA5E9',
        bg: 'bg-blue-50 text-blue-700',
      },
      {
        key: 'baixa',
        label: 'Baixa',
        total: counts.baixa,
        cor: '#64748B',
        bg: 'bg-slate-50 text-slate-700',
      },
    ]
  }, [cards])

  // 3. Estatísticas por Grupo de Família
  const porFamilia = useMemo(() => {
    const list = familias.map((fam) => {
      const total = cards.filter((c) => c.grupo_familia === fam.id).length
      return { fam, total }
    })
    const semFamilia = cards.filter((c) => !c.grupo_familia).length
    return { list, semFamilia }
  }, [cards, familias])

  // 4. Estatísticas por Projeto
  const porProjeto = useMemo(() => {
    const list = projetos
      .map((proj) => {
        const total = cards.filter((c) => c.projeto === proj.id).length
        return { proj, total }
      })
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)
    const semProjeto = cards.filter((c) => !c.projeto).length
    return { list, semProjeto }
  }, [cards, projetos])

  // 5. Total de Pessoas e IA
  const totalContatosVinculados = useMemo(() => {
    const set = new Set(cards.map((c) => c.contato).filter(Boolean))
    return set.size
  }, [cards])

  const totalCardsIA = useMemo(() => {
    return cards.filter((c) => c.criado_por_ia).length
  }, [cards])

  return (
    <div className="space-y-4">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                Total de Cards
              </span>
              <BarChart3 className="w-4 h-4 text-[#0F766E]" />
            </div>
            <div className="text-2xl font-extrabold text-[#1A1D21]">{cards.length}</div>
            <p className="text-[10px] text-[#5B6470] mt-1">Distribuídos no fluxo ativo</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                Pessoas Envolvidas
              </span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#1A1D21]">{totalContatosVinculados}</div>
            <p className="text-[10px] text-[#5B6470] mt-1">
              De {contatos.length} contatos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                Prioridade Crítica
              </span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-extrabold text-[#DC2626]">
              {cards.filter((c) => c.prioridade === 'urgente' || c.prioridade === 'alta').length}
            </div>
            <p className="text-[10px] text-[#5B6470] mt-1">Cards urgentes ou de alta prioridade</p>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                Criados via IA
              </span>
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
            </div>
            <div className="text-2xl font-extrabold text-[#0F766E]">{totalCardsIA}</div>
            <p className="text-[10px] text-[#5B6470] mt-1">Gerados a partir de resumos/áudio</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Distribuições em Painel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribuição por Coluna / Etapa */}
        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardHeader className="pb-2 border-b border-[#E5E1D8]/70">
            <CardTitle className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider flex items-center justify-between">
              <span>Distribuição por Coluna / Etapa</span>
              <Badge variant="outline" className="text-[10px] border-[#E5E1D8] text-[#5B6470]">
                {colunasOrdenadas.length} colunas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {porColuna.map(({ coluna, total, pct }) => (
              <div key={coluna.id || coluna.chave} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: coluna.cor || '#0F766E' }}
                    />
                    <span className="font-semibold text-[#1A1D21] truncate uppercase">
                      {coluna.titulo}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#5B6470] font-medium shrink-0">
                    {total} cards ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#E5E1D8]/60 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: coluna.cor || '#0F766E',
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Distribuição por Prioridade */}
        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardHeader className="pb-2 border-b border-[#E5E1D8]/70">
            <CardTitle className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider flex items-center justify-between">
              <span>Distribuição por Prioridade</span>
              <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {porPrioridade.map((p) => {
              const pct = cards.length > 0 ? Math.round((p.total / cards.length) * 100) : 0
              return (
                <div key={p.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.cor }}
                      />
                      <span className="font-semibold text-[#1A1D21]">{p.label}</span>
                    </div>
                    <span className="text-[11px] text-[#5B6470] font-medium">
                      {p.total} cards ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E5E1D8]/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: p.cor,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Distribuição por Grupo de Família */}
        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardHeader className="pb-2 border-b border-[#E5E1D8]/70">
            <CardTitle className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Grupos de Família
              </span>
              <Badge variant="outline" className="text-[10px] border-[#E5E1D8] text-[#5B6470]">
                {familias.length} famílias
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {porFamilia.list.map(({ fam, total }) => (
              <div
                key={fam.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: fam.cor || '#3B82F6' }}
                  />
                  <span className="font-semibold text-[#1A1D21]">{fam.nome}</span>
                </div>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                  {total} cards
                </Badge>
              </div>
            ))}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAF9] border border-dashed border-[#E5E1D8] text-xs">
              <span className="text-[#5B6470]">Sem Grupo de Família</span>
              <Badge variant="outline" className="text-[10px] text-[#5B6470] border-[#E5E1D8]">
                {porFamilia.semFamilia} cards
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Projetos Ativos */}
        <Card className="border-[#E5E1D8] shadow-xs bg-white">
          <CardHeader className="pb-2 border-b border-[#E5E1D8]/70">
            <CardTitle className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#0F766E]" />
                Cards por Projeto
              </span>
              <Badge variant="outline" className="text-[10px] border-[#E5E1D8] text-[#5B6470]">
                {porProjeto.list.length} vinculados
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {porProjeto.list.slice(0, 6).map(({ proj, total }) => (
              <div
                key={proj.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]/60 text-xs"
              >
                <span className="font-semibold text-[#1A1D21] truncate max-w-[220px]">
                  {proj.nome}
                </span>
                <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[10px]">
                  {total} cards
                </Badge>
              </div>
            ))}
            {porProjeto.list.length === 0 && (
              <p className="text-xs text-[#5B6470] italic text-center py-4">
                Nenhum card associado a projetos ainda.
              </p>
            )}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAFAF9] border border-dashed border-[#E5E1D8] text-xs">
              <span className="text-[#5B6470]">Sem Projeto Vinculado</span>
              <Badge variant="outline" className="text-[10px] text-[#5B6470] border-[#E5E1D8]">
                {porProjeto.semProjeto} cards
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
