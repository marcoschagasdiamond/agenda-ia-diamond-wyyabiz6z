import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  FolderTree,
  GitBranch,
  Layers,
  Search,
  FileEdit,
  Users,
  FolderOpen,
  UserCheck,
  ListTodo,
  Bot,
  Settings,
  FolderKanban,
  History,
  LayoutDashboard,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CalendarDays,
  CalendarCheck2,
  ChevronLeft,
  CalendarPlus,
  AlertCircle,
  Flag,
  Rocket,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavContextColumnProps {
  onCloseMobile?: () => void
}

export default function NavContextColumn({ onCloseMobile }: NavContextColumnProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const {
    categoriaAtivaId,
    setCategoriaAtivaId,
    fluxoAtivoId,
    setFluxoAtivoId,
    fluxoAtivoChave,
    setFluxoAtivoChave,
    categorias,
    fluxos,
    colunas,
    cards,
    categoriasComFluxos,
    categoriasExpandidas,
    toggleCategoriaExpandida,
    setModalNovaCategoriaOpen,
    setModalNovoFluxoOpen,
    setModalNovoFluxoCatId,
    setModalNovaFamiliaOpen,
    setModalNovoCardOpen,
    setModalNovoCardChave,
    projetos,
    contatos,
    pastas,
    arquivos,
    clientes,
    listas,
    demandas,
    folhaItems,
    marcosTimeline,
    eventosCalendario,
    dataSelecionadaCalendario,
    setDataSelecionadaCalendario,
    filtroTipoCalendario,
    setFiltroTipoCalendario,
    membrosEquipe,
    convitesEquipe,
    setModalConvidarEquipeOpen,
    setModalConvidarEscopoPadrao,
  } = useNavegacao()

  // Mini-calendário de navegação na segunda coluna
  const [miniCalMesOffset, setMiniCalMesOffset] = useState<number>(0)

  // Filtro de busca local dentro da segunda coluna
  const [buscaSecundaria, setBuscaSecundaria] = useState('')

  // Helper para navegar e fechar no mobile
  const irPara = (path: string) => {
    navigate(path)
    if (onCloseMobile) onCloseMobile()
  }

  // Identifica a seção ativa
  const secaoAtiva = (() => {
    if (pathname === '/') return 'dashboard'
    if (pathname.startsWith('/calendario')) return 'calendario'
    if (pathname.startsWith('/folha')) return 'folha'
    if (pathname.startsWith('/fluxo')) return 'fluxo'
    if (pathname.startsWith('/projetos')) return 'projetos'
    if (pathname.startsWith('/contatos')) return 'contatos'
    if (pathname.startsWith('/arquivos')) return 'arquivos'
    if (pathname.startsWith('/listas')) return 'listas'
    if (pathname.startsWith('/clientes')) return 'clientes'
    if (pathname.startsWith('/equipe')) return 'equipe'
    if (pathname.startsWith('/agente')) return 'agente'
    if (pathname.startsWith('/resumos')) return 'resumos'
    if (pathname.startsWith('/config')) return 'config'
    if (pathname.startsWith('/portal')) return 'portal'
    return 'dashboard'
  })()

  // =========================================================================
  // 0. SEGUNDA COLUNA: CALENDÁRIO (Mini-calendário, contadores e filtros)
  // =========================================================================
  const renderColunaCalendario = () => {
    // Cálculo do mini calendário
    const baseDate = new Date()
    baseDate.setMonth(baseDate.getMonth() + miniCalMesOffset)
    const anoAtual = baseDate.getFullYear()
    const mesAtual = baseDate.getMonth() // 0-11

    const nomeMes = baseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay() // 0 = dom
    const totalDiasMes = new Date(anoAtual, mesAtual + 1, 0).getDate()

    // Formatar hoje
    const hojeObj = new Date()
    const hojeStr = `${hojeObj.getFullYear()}-${String(hojeObj.getMonth() + 1).padStart(2, '0')}-${String(hojeObj.getDate()).padStart(2, '0')}`

    // Coleta dias que têm itens (eventos, demandas com prazo, folha com data, cards com prazo)
    const diasComItens = new Set<string>()

    eventosCalendario.forEach((ev) => {
      const d = ev.data_inicio ? ev.data_inicio.split('T')[0] : ''
      if (d) diasComItens.add(d)
    })

    demandas.forEach((dem) => {
      const d = dem.prazo ? dem.prazo.split('T')[0] : ''
      if (d) diasComItens.add(d)
    })

    folhaItems.forEach((f) => {
      const d = f.data ? f.data.split('T')[0] : f.data_hora ? f.data_hora.split('T')[0] : ''
      if (d) diasComItens.add(d)
    })

    cards.forEach((c) => {
      const d = c.data_prazo ? c.data_prazo.split('T')[0] : ''
      if (d) diasComItens.add(d)
    })

    marcosTimeline.forEach((m) => {
      const d = m.data_alvo ? m.data_alvo.split('T')[0] : ''
      if (d) diasComItens.add(d)
    })

    projetos.forEach((p) => {
      if (p.data_inicio) {
        const d = p.data_inicio.split('T')[0].split(' ')[0]
        if (d) diasComItens.add(d)
      }
      if (p.data_fim) {
        const d = p.data_fim.split('T')[0].split(' ')[0]
        if (d) diasComItens.add(d)
      }
    })

    // Contadores gerais (mês visualizado no mini-calendário ou total cadastrado)
    const prefixoMes = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`

    const totalEventos = eventosCalendario.length
    const totalDemandasComPrazo = demandas.filter((d) => d.prazo).length
    const totalFolhaComData = folhaItems.filter((f) => f.data || f.data_hora).length
    const totalCardsComPrazo = cards.filter((c) => c.data_prazo).length
    const totalMarcos = marcosTimeline.filter((m) => m.data_alvo).length

    // Contagem de Inícios e Fins de Projetos no mês atual/visualizado
    const totalProjetosInicioMes = projetos.filter(
      (p) => p.data_inicio && p.data_inicio.startsWith(prefixoMes),
    ).length
    const totalProjetosFimMes = projetos.filter(
      (p) => p.data_fim && p.data_fim.startsWith(prefixoMes),
    ).length

    // Prazos atrasados (demandas pendentes com prazo < hoje)
    const atrasadas = demandas.filter((d) => {
      if (d.status === 'concluido' || !d.prazo) return false
      return d.prazo.split('T')[0] < hojeStr
    }).length

    const hojeItensCount =
      eventosCalendario.filter((e) => e.data_inicio && e.data_inicio.startsWith(hojeStr)).length +
      demandas.filter((d) => d.prazo && d.prazo.startsWith(hojeStr)).length +
      folhaItems.filter(
        (f) =>
          (f.data && f.data.startsWith(hojeStr)) ||
          (f.data_hora && f.data_hora.startsWith(hojeStr)),
      ).length

    const diasGrid: (number | null)[] = []
    for (let i = 0; i < primeiroDiaSemana; i++) {
      diasGrid.push(null)
    }
    for (let d = 1; d <= totalDiasMes; d++) {
      diasGrid.push(d)
    }

    return (
      <div className="flex flex-col h-full">
        {/* Topo da coluna */}
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Calendário</h2>
            <p className="text-[10px] text-[#5B6470]">Prazos, etapas e atividades</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/calendario')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 gap-1 font-medium shadow-2xs"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Abrir</span>
          </Button>
        </div>

        {/* Mini Calendário */}
        <div className="p-3 border-b border-[#E5E1D8] bg-[#FAFAF9] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1A1D21] capitalize">{nomeMes}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMiniCalMesOffset((prev) => prev - 1)}
                className="p-1 rounded hover:bg-[#E5E1D8] text-[#5B6470] hover:text-[#1A1D21]"
                title="Mês anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMiniCalMesOffset(0)}
                className="text-[10px] font-semibold text-[#0F766E] hover:underline px-1"
                title="Voltar ao mês atual"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setMiniCalMesOffset((prev) => prev + 1)}
                className="p-1 rounded hover:bg-[#E5E1D8] text-[#5B6470] hover:text-[#1A1D21]"
                title="Próximo mês"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Cabeçalho dias da semana (D S T Q Q S S) */}
          <div className="grid grid-cols-7 text-center text-[10px] font-medium text-[#5B6470] mb-1">
            <span>D</span>
            <span>S</span>
            <span>T</span>
            <span>Q</span>
            <span>Q</span>
            <span>S</span>
            <span>S</span>
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {diasGrid.map((dia, idx) => {
              if (dia === null) {
                return <div key={`empty-${idx}`} className="h-6" />
              }
              const diaFormatado = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
              const isHoje = diaFormatado === hojeStr
              const isSelecionado = diaFormatado === dataSelecionadaCalendario
              const temAtividade = diasComItens.has(diaFormatado)

              return (
                <button
                  key={`day-${dia}`}
                  type="button"
                  onClick={() => {
                    setDataSelecionadaCalendario(diaFormatado)
                    if (pathname !== '/calendario') irPara('/calendario')
                  }}
                  className={`h-6 w-6 mx-auto rounded-full text-[11px] flex items-center justify-center relative transition-colors ${
                    isSelecionado
                      ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                      : isHoje
                        ? 'border border-[#0F766E] text-[#0F766E] font-bold bg-[#0F766E]/10'
                        : 'text-[#1A1D21] hover:bg-[#E5E1D8]/60 font-normal'
                  }`}
                >
                  <span>{dia}</span>
                  {temAtividade && !isSelecionado && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0F766E]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Atalhos Rápidos & Filtros */}
        <div className="p-2 border-b border-[#E5E1D8] bg-white shrink-0 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 pt-1">
            Filtros por Tipo
          </div>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('todos')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtroTipoCalendario === 'todos'
                ? 'bg-[#1A1D21] text-white'
                : 'text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Todos os Itens</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filtroTipoCalendario === 'todos'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E5E1D8] text-[#5B6470]'
              }`}
            >
              {totalEventos +
                totalDemandasComPrazo +
                totalFolhaComData +
                totalCardsComPrazo +
                totalMarcos +
                totalProjetosInicioMes +
                totalProjetosFimMes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('evento')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtroTipoCalendario === 'evento'
                ? 'bg-[#0F766E]/15 text-[#0F766E] font-semibold'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              <span>Eventos & Reuniões</span>
            </div>
            <span className="text-[10px] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded text-[#5B6470]">
              {totalEventos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('demanda')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtroTipoCalendario === 'demanda'
                ? 'bg-amber-100 text-amber-900 font-semibold'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Prazos de Demandas</span>
            </div>
            <span className="text-[10px] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded text-[#5B6470]">
              {totalDemandasComPrazo}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('folha')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtroTipoCalendario === 'folha'
                ? 'bg-blue-100 text-blue-900 font-semibold'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Folha do Dia</span>
            </div>
            <span className="text-[10px] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded text-[#5B6470]">
              {totalFolhaComData}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('card')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtroTipoCalendario === 'card'
                ? 'bg-purple-100 text-purple-900 font-semibold'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Cards do Fluxo</span>
            </div>
            <span className="text-[10px] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded text-[#5B6470]">
              {totalCardsComPrazo}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('marco')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtroTipoCalendario === 'marco'
                ? 'bg-emerald-100 text-emerald-900 font-semibold'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flag className="w-3 h-3 text-emerald-600" />
              <span>Marcos de Timeline</span>
            </div>
            <span className="text-[10px] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded text-[#5B6470]">
              {totalMarcos}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('projeto_inicio')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtroTipoCalendario === 'projeto_inicio'
                ? 'bg-blue-100 text-blue-900 font-semibold'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Rocket className="w-3 h-3 text-blue-600" />
              <span>Inícios de Projetos</span>
            </div>
            <span className="text-[10px] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded text-[#5B6470]">
              {totalProjetosInicioMes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFiltroTipoCalendario('projeto_fim')
              if (pathname !== '/calendario') irPara('/calendario')
            }}
            className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              filtroTipoCalendario === 'projeto_fim'
                ? 'bg-indigo-100 text-indigo-900 font-semibold'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-indigo-600" />
              <span>Fins de Projetos</span>
            </div>
            <span className="text-[10px] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded text-[#5B6470]">
              {totalProjetosFimMes}
            </span>
          </button>
        </div>

        {/* Resumo do Dia Selecionado */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-[#FAFAF9]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1D21]">
              {dataSelecionadaCalendario === hojeStr ? 'Hoje' : dataSelecionadaCalendario}
            </span>
            <span className="text-[10px] text-[#5B6470]">
              {dataSelecionadaCalendario === hojeStr
                ? `${hojeItensCount} itens`
                : 'Dia selecionado'}
            </span>
          </div>

          {atrasadas > 0 && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <div className="text-[11px] text-red-800 leading-tight">
                <span className="font-bold">{atrasadas} prazo(s)</span> atrasado(s) no sistema
              </div>
            </div>
          )}

          <div className="text-[11px] text-[#5B6470] bg-white p-2.5 rounded-lg border border-[#E5E1D8] space-y-1">
            <div className="font-semibold text-[#1A1D21] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Visão Integrada</span>
            </div>
            <p className="text-[10px] text-[#5B6470] leading-relaxed">
              Datas sincronizadas com Demandas, Cards do Kanban, Folha do Dia e Marcos de Projetos.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 1. SEGUNDA COLUNA: FLUXOS (KANBAN) — CONFORME MODELO DA IMAGEM
  // =========================================================================
  const renderColunaFluxos = () => {
    const catsFiltradas = categoriasComFluxos.filter((cat) => {
      if (!buscaSecundaria.trim()) return true
      const b = buscaSecundaria.toLowerCase()
      const matchCat = cat.nome.toLowerCase().includes(b)
      const matchFluxo = cat.fluxos.some((f) => f.nome.toLowerCase().includes(b))
      return matchCat || matchFluxo
    })

    return (
      <div className="flex flex-col h-full">
        {/* Topo: Título da coluna + botão Adicionar */}
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Fluxos</h2>
            <p className="text-[10px] text-[#5B6470]">
              {categorias.length} categorias • {fluxos.length} fluxos
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 gap-1 font-medium shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovaCategoriaOpen(true)
                }}
              >
                <FolderTree className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Nova Categoria
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovoFluxoCatId(undefined)
                  setModalNovoFluxoOpen(true)
                }}
              >
                <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Novo Fluxo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovoCardChave(undefined)
                  setModalNovoCardOpen(true)
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Novo Card no Fluxo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (pathname !== '/fluxo') navigate('/fluxo')
                  setModalNovaFamiliaOpen(true)
                }}
              >
                <Layers className="w-3.5 h-3.5 mr-2 text-blue-600" />
                Novo Grupo de Família
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Campo de Busca Rápida na árvore */}
        <div className="p-2 border-b border-[#E5E1D8] bg-[#FAFAF9] shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#5B6470]" />
            <Input
              value={buscaSecundaria}
              onChange={(e) => setBuscaSecundaria(e.target.value)}
              placeholder="Filtrar categorias ou fluxos..."
              className="pl-8 text-xs h-7.5 bg-white border-[#E5E1D8]"
            />
          </div>
        </div>

        {/* Opção Geral: Todas as Categorias */}
        <div className="p-2 border-b border-[#E5E1D8]/60 bg-white shrink-0">
          <button
            type="button"
            onClick={() => {
              if (pathname !== '/fluxo') irPara('/fluxo')
              setCategoriaAtivaId('all')
              setFluxoAtivoId('all')
              setFluxoAtivoChave('all')
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              categoriaAtivaId === 'all' && fluxoAtivoId === 'all'
                ? 'bg-[#1A1D21] text-white shadow-2xs'
                : 'text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Todas as Categorias</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 border-none ${
                categoriaAtivaId === 'all' && fluxoAtivoId === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E5E1D8] text-[#5B6470]'
              }`}
            >
              {cards.length}
            </Badge>
          </button>
        </div>

        {/* Lista de Categorias Expansíveis com seus Fluxos (apenas nomes de fluxos, NUNCA fases) */}
        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
          {catsFiltradas.map((cat) => {
            const isCatAtiva = categoriaAtivaId === cat.id
            const isExpanded = categoriasExpandidas[cat.id] ?? true

            return (
              <div
                key={cat.id}
                className="rounded-lg border border-[#E5E1D8]/70 bg-white overflow-hidden shadow-2xs"
              >
                {/* Linha da Categoria */}
                <div
                  className={`flex items-center justify-between p-1.5 transition-colors ${
                    isCatAtiva && fluxoAtivoId === 'all'
                      ? 'bg-[#0F766E] text-white'
                      : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
                  }`}
                >
                  {/* Seta de expansão */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCategoriaExpandida(cat.id)
                    }}
                    className={`p-1 rounded transition-colors ${
                      isCatAtiva && fluxoAtivoId === 'all'
                        ? 'text-white/80 hover:text-white hover:bg-white/10'
                        : 'text-[#5B6470] hover:text-[#1A1D21]'
                    }`}
                    aria-label="Expandir ou recolher fluxos"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Nome da categoria */}
                  <button
                    type="button"
                    onClick={() => {
                      if (pathname !== '/fluxo') irPara('/fluxo')
                      setCategoriaAtivaId(cat.id)
                      setFluxoAtivoId('all')
                      setFluxoAtivoChave('all')
                    }}
                    className="flex-1 flex items-center gap-1.5 text-left text-xs font-semibold truncate ml-1"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.cor || '#0F766E' }}
                    />
                    <span className="truncate">{cat.nome}</span>
                  </button>

                  {/* Contagem de cards da categoria */}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ${
                      isCatAtiva && fluxoAtivoId === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E5E1D8] text-[#5B6470]'
                    }`}
                  >
                    {cat.cardCount}
                  </span>
                </div>

                {/* Subitens: Fluxos da categoria (nomes reais dos fluxos, NÃO as fases) */}
                {isExpanded && (
                  <div className="p-1 pl-3 space-y-0.5 border-t border-[#E5E1D8]/60 bg-[#FAFAF9]">
                    {cat.fluxos.map((fluxo) => {
                      const isFluxoAtivo = isCatAtiva && fluxoAtivoId === fluxo.id

                      return (
                        <div
                          key={fluxo.id}
                          className={`group flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
                            isFluxoAtivo
                              ? 'bg-[#0F766E]/15 text-[#0F766E] font-semibold'
                              : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (pathname !== '/fluxo') irPara('/fluxo')
                              setCategoriaAtivaId(cat.id)
                              setFluxoAtivoId(fluxo.id)
                              setFluxoAtivoChave('all')
                            }}
                            className="flex-1 flex items-center gap-1.5 text-left truncate"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: fluxo.cor || '#0F766E' }}
                            />
                            <span className="truncate">{fluxo.nome}</span>
                          </button>

                          <span className="text-[10px] text-[#5B6470] bg-[#E5E1D8]/60 px-1.5 py-0.2 rounded shrink-0">
                            {fluxo.cardCount}
                          </span>
                        </div>
                      )
                    })}

                    {cat.fluxos.length === 0 ? (
                      <div className="py-1 px-2 text-[11px] text-[#5B6470]/70 italic flex items-center justify-between">
                        <span>Sem fluxos</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (pathname !== '/fluxo') irPara('/fluxo')
                            setModalNovoFluxoCatId(cat.id)
                            setModalNovoFluxoOpen(true)
                          }}
                          className="text-[#0F766E] hover:underline text-[10px] font-semibold"
                        >
                          + Criar Fluxo
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 pb-0.5 px-2 flex justify-end border-t border-[#E5E1D8]/40">
                        <button
                          type="button"
                          onClick={() => {
                            if (pathname !== '/fluxo') irPara('/fluxo')
                            setModalNovoFluxoCatId(cat.id)
                            setModalNovoFluxoOpen(true)
                          }}
                          className="text-[11px] text-[#0F766E] hover:text-[#0D5C56] font-semibold hover:underline flex items-center gap-1 py-0.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Criar Fluxo</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {catsFiltradas.length === 0 && (
            <div className="text-center py-6 text-xs text-[#5B6470]">
              <p>Nenhuma categoria encontrada.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 2. SEGUNDA COLUNA: FOLHA DO DIA (Sessão atual, assuntos, histórico)
  // =========================================================================
  const renderColunaFolha = () => {
    const pendentes = folhaItems.filter((f) => f.status === 'pendente')
    const processados = folhaItems.filter((f) => f.status === 'processado')

    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Folha do Dia</h2>
            <p className="text-[10px] text-[#5B6470]">Captura e Segundo Cérebro</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/folha')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova Nota
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-3 overflow-y-auto">
          {/* Seção Pendentes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider">
                Assuntos Pendentes
              </span>
              <Badge className="bg-amber-100 text-amber-800 border-none text-[10px]">
                {pendentes.length}
              </Badge>
            </div>

            {pendentes.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => irPara('/folha')}
                className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] hover:shadow-2xs transition-all space-y-1 block"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#0F766E]">
                    #{idx + 1} • {item.tipo_origem || 'manual'}
                  </span>
                  <span className="text-[9px] text-[#5B6470]">
                    {item.data_hora ? item.data_hora.slice(11, 16) : item.created?.slice(11, 16)}
                  </span>
                </div>
                <p className="text-xs text-[#1A1D21] line-clamp-2 leading-tight">
                  {item.registro || 'Sem anotação'}
                </p>
              </button>
            ))}

            {pendentes.length === 0 && (
              <div className="p-3 bg-white rounded-lg border border-[#E5E1D8] text-center text-xs text-[#5B6470]">
                Folha limpa. Nenhum assunto pendente de processamento.
              </div>
            )}
          </div>

          {/* Links e Histórico */}
          <div className="pt-2 border-t border-[#E5E1D8] space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-2 block">
              Atalhos & Histórico
            </span>
            <button
              onClick={() => irPara('/resumos')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Resumos das Sessões</span>
              </div>
              <ArrowRight className="w-3 h-3 text-[#5B6470]" />
            </button>
            <div className="px-2.5 py-1 text-[11px] text-[#5B6470]">
              {processados.length} anotações já consolidadas na memória.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 3. SEGUNDA COLUNA: CONTATOS
  // =========================================================================
  const renderColunaContatos = () => {
    const contatosFiltrados = contatos.filter((c) => {
      if (!buscaSecundaria.trim()) return true
      const b = buscaSecundaria.toLowerCase()
      return (
        c.nome?.toLowerCase().includes(b) ||
        c.empresa?.toLowerCase().includes(b) ||
        c.email?.toLowerCase().includes(b)
      )
    })

    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Contatos</h2>
            <p className="text-[10px] text-[#5B6470]">{contatos.length} pessoas e parceiros</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/contatos')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo
          </Button>
        </div>

        <div className="p-2 border-b border-[#E5E1D8] bg-[#FAFAF9] shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#5B6470]" />
            <Input
              value={buscaSecundaria}
              onChange={(e) => setBuscaSecundaria(e.target.value)}
              placeholder="Buscar por nome ou empresa..."
              className="pl-8 text-xs h-7.5 bg-white border-[#E5E1D8]"
            />
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/contatos')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold mb-1 transition-colors ${
              pathname === '/contatos'
                ? 'bg-[#1A1D21] text-white'
                : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
            }`}
          >
            <span>Todos os Contatos</span>
            <Badge
              variant="outline"
              className="text-[10px] h-4 border-none bg-[#E5E1D8] text-[#5B6470]"
            >
              {contatos.length}
            </Badge>
          </button>

          {contatosFiltrados.map((c) => (
            <button
              key={c.id}
              onClick={() => irPara(`/contatos/${c.id}`)}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8]/80 hover:border-[#0F766E] hover:bg-[#FAFAF9] transition-all block group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1A1D21] truncate">{c.nome}</span>
                <span className="text-[9px] uppercase font-semibold text-[#0F766E] bg-[#0F766E]/10 px-1 py-0.2 rounded">
                  {c.origem || 'manual'}
                </span>
              </div>
              <p className="text-[11px] text-[#5B6470] truncate mt-0.5">
                {c.cargo || 'Contato'} {c.empresa ? `• ${c.empresa}` : ''}
              </p>
            </button>
          ))}

          {contatosFiltrados.length === 0 && (
            <div className="text-center py-6 text-xs text-[#5B6470]">
              Nenhum contato encontrado.
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 4. SEGUNDA COLUNA: PROJETOS (Padrão DiamondGroup)
  // =========================================================================
  const renderColunaProjetos = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Projetos & Negócios</h2>
            <p className="text-[10px] text-[#5B6470]">{projetos.length} frentes cadastradas</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/projetos')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => irPara('/projetos')}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              pathname === '/projetos'
                ? 'bg-[#1A1D21] text-white'
                : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Painel de Todos os Projetos</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] h-4 border-none ${
                pathname === '/projetos' ? 'bg-white/20 text-white' : 'bg-[#E5E1D8] text-[#5B6470]'
              }`}
            >
              {projetos.length}
            </Badge>
          </button>

          <div className="pt-1 space-y-1">
            <span className="text-[10px] font-bold text-[#5B6470] uppercase tracking-wider px-2 block">
              Lista de Projetos
            </span>

            {projetos.map((p) => {
              const isAtivo = pathname === `/projetos/${p.id}`
              const cor = p.cor || '#0F766E'

              return (
                <button
                  key={p.id}
                  onClick={() => irPara(`/projetos/${p.id}`)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all block ${
                    isAtivo
                      ? 'bg-[#0F766E]/10 border-[#0F766E] text-[#0F766E] shadow-2xs'
                      : 'bg-white border-[#E5E1D8]/80 hover:bg-[#FAFAF9] text-[#1A1D21]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cor }}
                    />
                    <span className="text-xs font-bold truncate flex-1">{p.nome}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] capitalize border-none bg-[#E5E1D8]/60 text-[#5B6470] px-1 py-0 shrink-0"
                    >
                      {p.tipo || 'geral'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#5B6470] mt-1 pl-4.5">
                    <span>
                      {p.orcamento_total
                        ? `R$ ${p.orcamento_total.toLocaleString('pt-BR')}`
                        : 'Sem orçamento'}
                    </span>
                    <span className="capitalize">{p.status || 'ativo'}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {projetos.length === 0 && (
            <div className="text-center py-8 text-xs text-[#5B6470]">
              Nenhum projeto cadastrado.
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 5. SEGUNDA COLUNA: ARQUIVOS & PASTAS
  // =========================================================================
  const renderColunaArquivos = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Arquivos</h2>
            <p className="text-[10px] text-[#5B6470]">
              {pastas.length} pastas • {arquivos.length} docs
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/arquivos')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Upload
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/arquivos')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold mb-1 bg-[#1A1D21] text-white"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Todos os Arquivos</span>
            </div>
            <span className="text-[10px]">{arquivos.length}</span>
          </button>

          <div className="pt-1 space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-2 block">
              Pastas
            </span>
            {pastas.map((pasta) => {
              const count = arquivos.filter((a) => a.pasta === pasta.id).length
              return (
                <button
                  key={pasta.id}
                  onClick={() => irPara('/arquivos')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderTree className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                    <span className="truncate">{pasta.nome}</span>
                  </div>
                  <span className="text-[10px] text-[#5B6470] shrink-0 bg-[#E5E1D8] px-1.5 rounded">
                    {count}
                  </span>
                </button>
              )
            })}

            {pastas.length === 0 && (
              <div className="text-center py-4 text-xs text-[#5B6470]">Nenhuma pasta criada.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 6. SEGUNDA COLUNA: LISTAS & DEMANDAS
  // =========================================================================
  const renderColunaListas = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Listas & Demandas</h2>
            <p className="text-[10px] text-[#5B6470]">{demandas.length} tarefas delegáveis</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/listas')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nova
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          <button
            onClick={() => irPara('/listas')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1A1D21] text-white"
          >
            <span>Demandas Pendentes</span>
            <Badge variant="outline" className="text-[10px] border-none bg-white/20 text-white">
              {demandas.filter((d) => d.status === 'pendente').length}
            </Badge>
          </button>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-2 block">
              Listas Criadas ({listas.length})
            </span>
            {listas.map((l) => (
              <button
                key={l.id}
                onClick={() => irPara('/listas')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
              >
                <span className="truncate">{l.nome}</span>
                <Badge variant="outline" className="text-[9px] capitalize shrink-0">
                  {l.compartilhada_com}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 7. SEGUNDA COLUNA: CLIENTES & PORTAL
  // =========================================================================
  const renderColunaClientes = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Clientes</h2>
            <p className="text-[10px] text-[#5B6470]">{clientes.length} cadastrados</p>
          </div>
          <Button
            size="sm"
            onClick={() => irPara('/clientes')}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Cadastrar
          </Button>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/clientes')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1A1D21] text-white mb-1"
          >
            <span>Painel de Clientes</span>
            <span className="text-[10px]">{clientes.length}</span>
          </button>

          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => irPara('/clientes')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8]/80 hover:bg-[#FAFAF9] transition-all block"
            >
              <div className="font-bold text-xs text-[#1A1D21] truncate">{c.nome}</div>
              <div className="text-[10px] text-[#5B6470] truncate">{c.empresa || c.email}</div>
            </button>
          ))}

          {clientes.length === 0 && (
            <div className="text-center py-6 text-xs text-[#5B6470]">
              Nenhum cliente cadastrado.
            </div>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // 8. SEGUNDA COLUNA: AGENTE IA DIAMOND
  // =========================================================================
  const renderColunaAgente = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Agente IA</h2>
            <p className="text-[10px] text-[#5B6470]">Segundo Cérebro Diamond</p>
          </div>
          <Badge
            className="bg-emerald-50 text-emerald-700 text-[10px] border-emerald-200"
            variant="outline"
          >
            Ativo
          </Badge>
        </div>

        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          <div className="p-3 rounded-lg bg-[#0F766E]/5 border border-[#0F766E]/20 text-xs text-[#0D5C56] space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Memória Conectada</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              O copiloto tem acesso instantâneo a todas as demandas, histórico de clientes, projetos
              e resumos do dia.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#5B6470] uppercase tracking-wider px-1 block">
              Perguntas Frequentes
            </span>
            <button
              onClick={() => irPara('/agente')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] text-xs text-[#1A1D21] transition-all block"
            >
              "Quais são minhas prioridades críticas de hoje?"
            </button>
            <button
              onClick={() => irPara('/agente')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] text-xs text-[#1A1D21] transition-all block"
            >
              "Resuma o histórico do cliente Helena / Loja Y"
            </button>
            <button
              onClick={() => irPara('/agente')}
              className="w-full text-left p-2 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#0F766E] text-xs text-[#1A1D21] transition-all block"
            >
              "Estruture uma proposta para os projetos de devices"
            </button>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 9. SEGUNDA COLUNA: CONFIGURAÇÕES
  // =========================================================================
  const renderColunaConfig = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Configurações</h2>
            <p className="text-[10px] text-[#5B6470]">Diretrizes e Sistema</p>
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/config')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold bg-[#1A1D21] text-white"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferências & Preços</span>
          </button>
          <button
            onClick={() => irPara('/config')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Status das Integrações</span>
          </button>
          <button
            onClick={() => irPara('/resumos')}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <History className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Consolidações Semanais</span>
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 10. SEGUNDA COLUNA: DASHBOARD / GERAL
  // =========================================================================
  const renderColunaDashboard = () => {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Visão Geral</h2>
            <p className="text-[10px] text-[#5B6470]">Agenda IA Diamond</p>
          </div>
        </div>

        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          <button
            onClick={() => irPara('/')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              pathname === '/' ? 'bg-[#1A1D21] text-white' : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Painel Executivo</span>
            </div>
          </button>

          <button
            onClick={() => irPara('/folha')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileEdit className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Folha do Dia</span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50 text-amber-800 border-amber-200"
            >
              {folhaItems.filter((f) => f.status === 'pendente').length}
            </Badge>
          </button>

          <button
            onClick={() => irPara('/fluxo')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Kanban Diamond</span>
            </div>
            <span className="text-[10px] text-[#5B6470]">{cards.length} cards</span>
          </button>

          <button
            onClick={() => irPara('/agente')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Agente IA Diamond</span>
            </div>
            <Sparkles className="w-3 h-3 text-[#0F766E]" />
          </button>

          <button
            onClick={() => irPara('/resumos')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Resumos e Histórico</span>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // 9. SEGUNDA COLUNA: EQUIPE (Membros, convites pendentes e atalho convidar)
  // =========================================================================
  const renderColunaEquipe = () => {
    const pendentes = convitesEquipe.filter((c) => c.status === 'pendente')
    const ativos = membrosEquipe.filter((m) => m.status === 'ativo')

    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-[#E5E1D8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold text-[#1A1D21] tracking-tight">Equipe Diamond</h2>
            <p className="text-[10px] text-[#5B6470]">Colaboradores e convites</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setModalConvidarEscopoPadrao({ tipo: 'geral', nome: 'Workspace Completo' })
              setModalConvidarEquipeOpen(true)
            }}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-7 px-2.5 gap-1 font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Convidar</span>
          </Button>
        </div>

        <div className="p-2 border-b border-[#E5E1D8] bg-[#FAFAF9] shrink-0 space-y-1">
          <button
            type="button"
            onClick={() => irPara('/equipe')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1A1D21] text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              <span>Painel da Equipe</span>
            </div>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full text-white">
              {membrosEquipe.length}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Convites Pendentes */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 mb-1.5 flex items-center justify-between">
              <span>Convites Aguardando ({pendentes.length})</span>
            </div>
            <div className="space-y-1">
              {pendentes.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => irPara('/equipe')}
                  className="p-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#FAFAF9] transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1A1D21] truncate max-w-[150px]">
                      {conv.email}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Pendente
                    </Badge>
                  </div>
                  <div className="text-[10px] text-[#5B6470] mt-1 flex items-center gap-1">
                    <span className="capitalize">{conv.escopo_tipo}:</span>
                    <span className="text-[#0F766E] truncate max-w-[130px] font-medium">
                      {conv.escopo_nome || 'Workspace'}
                    </span>
                  </div>
                </div>
              ))}
              {pendentes.length === 0 && (
                <div className="text-[11px] text-[#5B6470] italic px-2 py-1">
                  Nenhum convite pendente.
                </div>
              )}
            </div>
          </div>

          {/* Membros Ativos */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 mb-1.5 flex items-center justify-between">
              <span>Membros Ativos ({ativos.length})</span>
            </div>
            <div className="space-y-1">
              {ativos.map((m) => (
                <div
                  key={m.id}
                  onClick={() => irPara('/equipe')}
                  className="p-2 rounded-lg border border-[#E5E1D8] bg-white hover:bg-[#FAFAF9] transition-colors cursor-pointer text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-[#1A1D21] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      {m.nome?.[0] || m.email[0].toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-[#1A1D21] block truncate">
                        {m.nome || m.email.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-[#5B6470] block truncate">{m.email}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] capitalize shrink-0 ml-1">
                    {m.nivel_acesso || 'Edição'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Renderiza a coluna com base na seção ativa
  switch (secaoAtiva) {
    case 'calendario':
      return renderColunaCalendario()
    case 'fluxo':
      return renderColunaFluxos()
    case 'folha':
      return renderColunaFolha()
    case 'contatos':
      return renderColunaContatos()
    case 'projetos':
      return renderColunaProjetos()
    case 'arquivos':
      return renderColunaArquivos()
    case 'listas':
      return renderColunaListas()
    case 'clientes':
      return renderColunaClientes()
    case 'equipe':
      return renderColunaEquipe()
    case 'agente':
      return renderColunaAgente()
    case 'config':
      return renderColunaConfig()
    case 'dashboard':
    default:
      return renderColunaDashboard()
  }
}
