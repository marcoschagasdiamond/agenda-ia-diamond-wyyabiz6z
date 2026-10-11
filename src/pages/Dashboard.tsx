import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import type { Card as CardType, FolhaDia, ResumoDia, Projeto } from '@/types'
import {
  FileEdit,
  KanbanSquare,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Flame,
  UserCheck,
  FolderKanban,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Dashboard() {
  const { user, profile, isClientPortal } = useAuth()
  const navigate = useNavigate()

  const [cards, setCards] = useState<CardType[]>([])
  const [folhaPendentes, setFolhaPendentes] = useState<FolhaDia[]>([])
  const [latestResumo, setLatestResumo] = useState<ResumoDia | null>(null)
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(true)

  // Redirecionamento condicional de onboarding
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!isClientPortal && (!profile || !profile.respostas_onboarding?.quem_e_voce)) {
      navigate('/onboarding')
      return
    }
  }, [user, profile, isClientPortal, navigate])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [c, f, r, p] = await Promise.all([
          diamondApi.listCards(),
          diamondApi.listFolhaDia(),
          diamondApi.getLatestResumo(),
          diamondApi.listProjetos(),
        ])
        setCards(c)
        setFolhaPendentes(f.filter((item) => item.status === 'pendente'))
        setLatestResumo(r)
        setProjetos(p)
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const cardsEmAndamento = cards.filter((c) => c.status === 'em_andamento')
  const cardsUrgentes = cards.filter((c) => c.prioridade === 'urgente' || c.prioridade === 'alta')
  const cardsBloqueados = cards.filter((c) => c.status === 'bloqueado')

  const getPriorityBadge = (p?: string) => {
    switch (p) {
      case 'urgente':
        return (
          <Badge className="bg-[#7F1D1D] text-white hover:bg-[#7F1D1D] text-[10px]">Urgente</Badge>
        )
      case 'alta':
        return (
          <Badge className="bg-[#DC2626] text-white hover:bg-[#DC2626] text-[10px]">Alta</Badge>
        )
      case 'media':
        return (
          <Badge className="bg-[#D97706] text-white hover:bg-[#D97706] text-[10px]">Média</Badge>
        )
      default:
        return (
          <Badge className="bg-[#16A34A] text-white hover:bg-[#16A34A] text-[10px]">Baixa</Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner de Boas-Vindas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Olá, {user?.name || 'Estrategista'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#0F766E]/10 text-[#0F766E] font-semibold">
              Segundo Cérebro Ativo
            </span>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Aqui está a consolidação das suas demandas, contexto histórico e fluxo operacional de
            hoje.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/folha')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 gap-1.5 shadow-sm font-medium"
          >
            <FileEdit className="w-4 h-4" />
            Folha do Dia ({folhaPendentes.length} pendentes)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/agente')}
            className="text-xs h-9 px-3 border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE] gap-1.5"
          >
            <Bot className="w-4 h-4 text-[#0F766E]" />
            Abrir Agente
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais (3 Colunas no Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6470] font-medium">Em Andamento</p>
              <h3 className="text-2xl font-bold text-[#1A1D21] mt-0.5">
                {cardsEmAndamento.length}
              </h3>
              <p className="text-[10px] text-[#5B6470] mt-1">Cards ativos no Kanban</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center">
              <KanbanSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6470] font-medium">Prioridade Alta/Urgente</p>
              <h3 className="text-2xl font-bold text-[#DC2626] mt-0.5">{cardsUrgentes.length}</h3>
              <p className="text-[10px] text-[#5B6470] mt-1">Exigem ação imediata</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6470] font-medium">Folha em Branco</p>
              <h3 className="text-2xl font-bold text-[#D97706] mt-0.5">{folhaPendentes.length}</h3>
              <p className="text-[10px] text-[#5B6470] mt-1">Anotações a organizar</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#D97706] flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#5B6470] font-medium">Projetos & Negócios</p>
              <h3 className="text-2xl font-bold text-[#1A1D21] mt-0.5">{projetos.length}</h3>
              <p className="text-[10px] text-[#5B6470] mt-1">Com histórico preservado</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Bloqueio (se houver cards bloqueados) */}
      {cardsBloqueados.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <span className="text-xs text-amber-900 font-medium">
              Atenção: Você tem {cardsBloqueados.length} card(s) bloqueado(s). Verifique
              impedimentos com clientes ou fornecedores.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/fluxo?status=bloqueado')}
            className="text-xs h-7 border-amber-300 text-amber-900 hover:bg-amber-100"
          >
            Ver Bloqueados
          </Button>
        </div>
      )}

      {/* Grade de 3 Painéis do Dashboard (Hoje, Prioridades, Resumo) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel 1: Próximos Passos Imediatos */}
        <Card className="border-[#E5E1D8] bg-white shadow-xs flex flex-col">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#0F766E]" />
                Próximos Passos
              </CardTitle>
              <CardDescription className="text-[11px] text-[#5B6470]">
                Ações imediatas sugeridas pela IA e cadastradas
              </CardDescription>
            </div>
            <Link to="/fluxo" className="text-xs text-[#0F766E] hover:underline font-medium">
              Ver Kanban
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
            {cards
              .filter((c) => c.proximo_passo)
              .slice(0, 5)
              .map((card) => (
                <div
                  key={card.id}
                  onClick={() => navigate(`/fluxo`)}
                  className="p-3 rounded-lg border border-[#E5E1D8] bg-[#F4F2EE]/40 hover:bg-[#F4F2EE] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-[#1A1D21] truncate">
                      {card.titulo}
                    </span>
                    {getPriorityBadge(card.prioridade)}
                  </div>
                  <p className="text-[11px] text-[#0F766E] font-medium flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 shrink-0" />
                    {card.proximo_passo}
                  </p>
                  {card.expand?.projeto && (
                    <span className="text-[10px] text-[#5B6470] mt-1.5 block">
                      Projeto: {card.expand.projeto.nome}
                    </span>
                  )}
                </div>
              ))}
            {cards.filter((c) => c.proximo_passo).length === 0 && (
              <div className="text-center py-8 text-xs text-[#5B6470]">
                Nenhum próximo passo pendente registrado.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Painel 2: Cards com Prioridade Alta e Urgente */}
        <Card className="border-[#E5E1D8] bg-white shadow-xs flex flex-col">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#DC2626]" />
                Prioridades Críticas
              </CardTitle>
              <CardDescription className="text-[11px] text-[#5B6470]">
                Foco primordial do dia
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] border-[#DC2626]/30 text-[#DC2626]">
              {cardsUrgentes.length} itens
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[380px]">
            {cardsUrgentes.slice(0, 5).map((card) => (
              <div
                key={card.id}
                onClick={() => navigate('/fluxo')}
                className="p-3 rounded-lg border-l-4 border-l-[#DC2626] border border-[#E5E1D8] bg-white hover:bg-[#F4F2EE]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[#1A1D21] truncate">{card.titulo}</h4>
                  {getPriorityBadge(card.prioridade)}
                </div>
                {card.descricao && (
                  <p className="text-[11px] text-[#5B6470] mt-1 line-clamp-2">{card.descricao}</p>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E5E1D8]/60 text-[10px] text-[#5B6470]">
                  <span>Status: {card.status.replace('_', ' ')}</span>
                  {card.expand?.contato && <span>Contato: {card.expand.contato.nome}</span>}
                </div>
              </div>
            ))}
            {cardsUrgentes.length === 0 && (
              <div className="text-center py-8 text-xs text-[#5B6470]">
                Nenhuma prioridade urgente em aberto hoje. Bom trabalho!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Painel 3: Último Resumo do Dia Consolidado */}
        <Card className="border-[#E5E1D8] bg-white shadow-xs flex flex-col">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#0F766E]" />
                Síntese do Segundo Cérebro
              </CardTitle>
              <CardDescription className="text-[11px] text-[#5B6470]">
                {latestResumo ? `Data: ${latestResumo.data}` : 'Nenhum resumo gerado ainda'}
              </CardDescription>
            </div>
            <Link to="/resumos" className="text-xs text-[#0F766E] hover:underline font-medium">
              Histórico
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 flex-1 overflow-y-auto max-h-[380px] text-xs">
            {latestResumo ? (
              <>
                {latestResumo.prioridades && (
                  <div className="space-y-1">
                    <span className="font-semibold text-[#1A1D21] block text-[11px] uppercase tracking-wider">
                      🎯 Prioridades Registradas:
                    </span>
                    <p className="text-[#5B6470] whitespace-pre-line leading-relaxed bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      {latestResumo.prioridades}
                    </p>
                  </div>
                )}
                {latestResumo.decisoes && (
                  <div className="space-y-1">
                    <span className="font-semibold text-[#1A1D21] block text-[11px] uppercase tracking-wider">
                      💡 Decisões Tomadas:
                    </span>
                    <p className="text-[#5B6470] whitespace-pre-line leading-relaxed bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      {latestResumo.decisoes}
                    </p>
                  </div>
                )}
                {latestResumo.proximos_passos && (
                  <div className="space-y-1">
                    <span className="font-semibold text-[#1A1D21] block text-[11px] uppercase tracking-wider">
                      🚀 Próximos Passos:
                    </span>
                    <p className="text-[#5B6470] whitespace-pre-line leading-relaxed bg-[#F4F2EE]/50 p-2.5 rounded border border-[#E5E1D8]">
                      {latestResumo.proximos_passos}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-xs text-[#5B6470] space-y-2">
                <p>Nenhum resumo diário gerado recentemente.</p>
                <Button
                  size="sm"
                  onClick={() => navigate('/folha')}
                  className="bg-[#0F766E] text-white text-xs h-7"
                >
                  Lançar na Folha e Organizar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
