import React, { useState, useEffect, useMemo } from 'react'
import type {
  FolhaDia,
  Projeto,
  Contato,
  FluxoKanban,
  CategoriaFluxo,
  MarcoTimeline,
  Demanda,
} from '@/types'
import { diamondApi } from '@/services/diamondApi'
import {
  FileEdit,
  Search,
  Filter,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Trash2,
  Share2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  FolderGit2,
  Users,
  BarChart3,
  Mic,
  Calendar,
  CheckSquare,
  ArrowUpDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  PainelBuscaFolha,
  FILTROS_PADRAO,
  type FolhaFiltrosState,
} from '@/components/folha/PainelBuscaFolha'

interface GestaoFolhaProps {
  onRecarregarGlobal?: () => void
}

export const GestaoFolha: React.FC<GestaoFolhaProps> = ({ onRecarregarGlobal }) => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [folhaItems, setFolhaItems] = useState<FolhaDia[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [fluxos, setFluxos] = useState<FluxoKanban[]>([])
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [marcosTimeline, setMarcosTimeline] = useState<MarcoTimeline[]>([])

  // Filtros avançados
  const [filtros, setFiltros] = useState<FolhaFiltrosState>(FILTROS_PADRAO)

  // Seleção múltipla para ações em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [processandoLote, setProcessandoLote] = useState(false)

  // Modais de confirmação em lote
  const [modalExcluirLoteOpen, setModalExcluirLoteOpen] = useState(false)
  const [modalReligarFluxoOpen, setModalReligarFluxoOpen] = useState(false)
  const [novoFluxoDestino, setNovoFluxoDestino] = useState('')

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 25

  const carregarTudo = async () => {
    setLoading(true)
    try {
      const [f, d, p, c, flxs, cats, marcos] = await Promise.all([
        diamondApi.listFolhaDia(),
        diamondApi.listDemandas().catch(() => []),
        diamondApi.listProjetos(),
        diamondApi.listContatos(),
        diamondApi.listFluxosKanban(),
        diamondApi.listCategoriasFluxo(),
        diamondApi.listMarcosTimeline(),
      ])
      setFolhaItems(f)
      setDemandas(d)
      setProjetos(p)
      setContatos(c)
      setFluxos(flxs)
      setCategorias(cats)
      setMarcosTimeline(marcos)
    } catch (err) {
      toast({
        title: 'Erro ao carregar dados da Folha',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarTudo()
  }, [])

  // Mapa de demandas para cálculo de quais assuntos viraram demanda
  const verificarTemDemanda = (item: FolhaDia) => {
    const txt = (item.registro || '').toLowerCase().trim()
    if (!txt) return false
    for (const d of demandas) {
      if (
        d.titulo &&
        (txt.includes(d.titulo.toLowerCase()) || d.titulo.toLowerCase().includes(txt.slice(0, 30)))
      ) {
        return true
      }
      if (d.descricao && d.descricao.toLowerCase().includes(txt.slice(0, 30))) {
        return true
      }
      if (
        d.projeto &&
        item.projeto &&
        d.projeto === item.projeto &&
        d.created?.slice(0, 10) === item.created?.slice(0, 10)
      ) {
        return true
      }
    }
    return false
  }

  // Estatísticas simples
  const estatisticas = useMemo(() => {
    const total = folhaItems.length
    const reunioes = folhaItems.filter((i) => Boolean(i.is_reuniao)).length
    const viraramDemanda = folhaItems.filter((i) => verificarTemDemanda(i)).length
    const semVinculo = folhaItems.filter(
      (i) => (!i.fluxo || i.fluxo === 'none') && !i.projeto && !i.contato && !i.timeline,
    ).length
    const semDemanda = folhaItems.filter((i) => !verificarTemDemanda(i)).length
    const arquivados = folhaItems.filter((i) => Boolean(i.arquivado)).length
    const fixados = folhaItems.filter((i) => Boolean(i.fixado) && !i.arquivado).length

    // Mês atual
    const mesAtualStr = new Date().toISOString().slice(0, 7)
    const assuntosEsteMes = folhaItems.filter((i) => {
      const data = i.data_hora?.slice(0, 7) || i.data?.slice(0, 7) || i.created?.slice(0, 7)
      return data === mesAtualStr
    }).length

    return {
      total,
      reunioes,
      viraramDemanda,
      semVinculo,
      semDemanda,
      arquivados,
      fixados,
      assuntosEsteMes,
    }
  }, [folhaItems, demandas])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return folhaItems
      .filter((item) => {
        const isArquivado = Boolean(item.arquivado)
        if (filtros.estadoArquivo === 'ativos' && isArquivado) return false
        if (filtros.estadoArquivo === 'arquivados' && !isArquivado) return false

        if (filtros.busca.trim()) {
          const termo = filtros.busca.toLowerCase().trim()
          const noRegistro = (item.registro || '').toLowerCase().includes(termo)
          const naOrigemRef = (item.origem_ref || '').toLowerCase().includes(termo)
          const naTimeline = (item.timeline || '').toLowerCase().includes(termo)
          let naAta = false
          if (item.ata_organizada) {
            naAta =
              typeof item.ata_organizada === 'string'
                ? item.ata_organizada.toLowerCase().includes(termo)
                : JSON.stringify(item.ata_organizada).toLowerCase().includes(termo)
          }
          if (!noRegistro && !naOrigemRef && !naTimeline && !naAta) return false
        }

        const dataItem =
          (item.data_hora
            ? item.data_hora.slice(0, 10)
            : item.data || item.created?.slice(0, 10)) || ''
        if (filtros.periodo !== 'todos' && dataItem) {
          const hojeStr = new Date().toISOString().slice(0, 10)
          if (filtros.periodo === 'hoje') {
            if (dataItem !== hojeStr) return false
          } else if (filtros.periodo === 'esta_semana') {
            const agora = new Date()
            const primeiroDiaSemana = new Date(agora)
            primeiroDiaSemana.setDate(agora.getDate() - agora.getDay())
            const primeiroDiaStr = primeiroDiaSemana.toISOString().slice(0, 10)
            if (dataItem < primeiroDiaStr || dataItem > hojeStr) return false
          } else if (filtros.periodo === 'este_mes') {
            const mesAtual = hojeStr.slice(0, 7)
            if (!dataItem.startsWith(mesAtual)) return false
          } else if (filtros.periodo === 'personalizado') {
            if (filtros.dataInicio && dataItem < filtros.dataInicio) return false
            if (filtros.dataFim && dataItem > filtros.dataFim) return false
          }
        }

        if (filtros.tipo === 'reuniao' && !item.is_reuniao) return false
        if (filtros.tipo === 'comum' && (item.is_reuniao || item.tipo_origem === 'whatsapp'))
          return false
        if (filtros.tipo === 'whatsapp' && item.tipo_origem !== 'whatsapp') return false

        if (filtros.fluxoId !== 'todos' && item.fluxo !== filtros.fluxoId) return false
        if (filtros.projetoId !== 'todos' && item.projeto !== filtros.projetoId) return false
        if (filtros.contatoId !== 'todos' && item.contato !== filtros.contatoId) return false
        if (filtros.timeline !== 'todos' && item.timeline !== filtros.timeline) return false

        if (filtros.estadoDemanda !== 'todos') {
          const temDemanda = verificarTemDemanda(item)
          if (filtros.estadoDemanda === 'com_demanda' && !temDemanda) return false
          if (filtros.estadoDemanda === 'sem_demanda' && temDemanda) return false
        }

        if (filtros.estadoFluxo !== 'todos') {
          const temFluxo = Boolean(item.fluxo && item.fluxo !== 'none')
          if (filtros.estadoFluxo === 'com_fluxo' && !temFluxo) return false
          if (filtros.estadoFluxo === 'sem_fluxo' && temFluxo) return false
        }

        return true
      })
      .sort((a, b) => {
        const aFix = a.fixado ? 1 : 0
        const bFix = b.fixado ? 1 : 0
        if (aFix !== bFix) return bFix - aFix

        if (filtros.ordenacao === 'antigos') {
          const dA = a.data_hora || a.data || a.created || ''
          const dB = b.data_hora || b.data || b.created || ''
          return dA.localeCompare(dB)
        } else {
          const dA = a.data_hora || a.data || a.created || ''
          const dB = b.data_hora || b.data || b.created || ''
          return dB.localeCompare(dA)
        }
      })
  }, [folhaItems, filtros, demandas])

  // Paginação
  const totalPaginas = Math.ceil(itensFiltrados.length / itensPorPagina) || 1
  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return itensFiltrados.slice(inicio, inicio + itensPorPagina)
  }, [itensFiltrados, paginaAtual, itensPorPagina])

  // Handlers de seleção
  const todosDaPaginaSelecionados =
    itensPaginados.length > 0 && itensPaginados.every((i) => selecionados.has(i.id))

  const handleToggleSelecionarTudo = () => {
    if (todosDaPaginaSelecionados) {
      setSelecionados(new Set())
    } else {
      const novo = new Set(selecionados)
      itensPaginados.forEach((i) => novo.add(i.id))
      setSelecionados(novo)
    }
  }

  const handleToggleItem = (id: string) => {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) {
        novo.delete(id)
      } else {
        novo.add(id)
      }
      return novo
    })
  }

  // Ações em lote
  const handleArquivarLote = async (arquivar = true) => {
    if (selecionados.size === 0) return
    setProcessandoLote(true)
    try {
      const ids = Array.from(selecionados)
      const alterados = await diamondApi.loteArquivarFolhaDia(ids, arquivar)
      setFolhaItems((prev) =>
        prev.map((i) => (selecionados.has(i.id) ? { ...i, arquivado: arquivar } : i)),
      )
      setSelecionados(new Set())
      toast({
        title: `${alterados} assunto(s) ${arquivar ? 'arquivados' : 'desarquivados'} com sucesso!`,
      })
      onRecarregarGlobal?.()
    } catch (err) {
      toast({
        title: 'Erro ao arquivar em lote',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setProcessandoLote(false)
    }
  }

  const handleConfirmarExcluirLote = async () => {
    if (selecionados.size === 0) return
    setProcessandoLote(true)
    try {
      const ids = Array.from(selecionados)
      const excluidos = await diamondApi.loteExcluirFolhaDia(ids)
      setFolhaItems((prev) => prev.filter((i) => !selecionados.has(i.id)))
      setSelecionados(new Set())
      setModalExcluirLoteOpen(false)
      toast({
        title: `${excluidos} assunto(s) excluído(s) permanentemente!`,
      })
      onRecarregarGlobal?.()
    } catch (err) {
      toast({
        title: 'Erro ao excluir em lote',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setProcessandoLote(false)
    }
  }

  const handleConfirmarReligarFluxo = async () => {
    if (selecionados.size === 0 || !novoFluxoDestino) return
    setProcessandoLote(true)
    try {
      const ids = Array.from(selecionados)
      const alterados = await diamondApi.loteReligarFluxoFolhaDia(ids, novoFluxoDestino)
      setFolhaItems((prev) =>
        prev.map((i) => (selecionados.has(i.id) ? { ...i, fluxo: novoFluxoDestino } : i)),
      )
      setSelecionados(new Set())
      setModalReligarFluxoOpen(false)
      toast({
        title: `${alterados} assunto(s) revinculados ao fluxo selecionado!`,
      })
      onRecarregarGlobal?.()
    } catch (err) {
      toast({
        title: 'Erro ao revincular fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setProcessandoLote(false)
    }
  }

  // Exportar CSV dos assuntos filtrados
  const handleExportarCSV = () => {
    if (itensFiltrados.length === 0) {
      toast({ title: 'Nenhum assunto para exportar', variant: 'destructive' })
      return
    }

    const headers = [
      'ID',
      'Data/Hora',
      'Ordem',
      'Assunto/Registro',
      'Tipo Origem',
      'Reuniao Gravada',
      'Fluxo ID',
      'Projeto',
      'Contato',
      'Timeline',
      'Demanda Criada',
      'Fixado',
      'Arquivado',
      'Criado Em',
    ]

    const linhas = itensFiltrados.map((i) => {
      const proj = projetos.find((p) => p.id === i.projeto)?.nome || ''
      const cont = contatos.find((c) => c.id === i.contato)?.nome || ''
      const temDem = verificarTemDemanda(i) ? 'Sim' : 'Nao'
      const dataHora = i.data_hora || i.data || i.created?.slice(0, 16) || ''
      const reg = (i.registro || '').replace(/"/g, '""')

      return [
        `"${i.id}"`,
        `"${dataHora}"`,
        i.ordem || '',
        `"${reg}"`,
        `"${i.tipo_origem || 'manual'}"`,
        i.is_reuniao ? 'Sim' : 'Nao',
        `"${i.fluxo || ''}"`,
        `"${proj.replace(/"/g, '""')}"`,
        `"${cont.replace(/"/g, '""')}"`,
        `"${(i.timeline || '').replace(/"/g, '""')}"`,
        temDem,
        i.fixado ? 'Sim' : 'Nao',
        i.arquivado ? 'Sim' : 'Nao',
        `"${i.created || ''}"`,
      ].join(';')
    })

    const csvContent = '\uFEFF' + [headers.join(';'), ...linhas].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `folha_assuntos_export_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Exportação concluída!',
      description: `${itensFiltrados.length} assuntos exportados para CSV com sucesso.`,
    })
  }

  // Atalhos de filtro dos painéis de higiene
  const aplicarFiltroSemVinculo = () => {
    setFiltros({
      ...FILTROS_PADRAO,
      estadoFluxo: 'sem_fluxo',
    })
  }

  const aplicarFiltroSemDemanda = () => {
    setFiltros({
      ...FILTROS_PADRAO,
      estadoDemanda: 'sem_demanda',
    })
  }

  return (
    <div className="space-y-6">
      {/* Topo com Estatísticas Simples e Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-[#E5E1D8] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5B6470]">Assuntos Este Mês</span>
            <FileEdit className="w-4 h-4 text-[#0F766E]" />
          </div>
          <p className="text-xl font-bold text-[#1A1D21] mt-1">{estatisticas.assuntosEsteMes}</p>
          <span className="text-[10px] text-[#5B6470]">Total geral: {estatisticas.total}</span>
        </Card>

        <Card className="border-[#E5E1D8] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5B6470]">Reuniões Gravadas</span>
            <Mic className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-xl font-bold text-[#1A1D21] mt-1">{estatisticas.reunioes}</p>
          <span className="text-[10px] text-red-700">Com áudio e ata gerada</span>
        </Card>

        <Card className="border-[#E5E1D8] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5B6470]">Viraram Demanda</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-[#1A1D21] mt-1">{estatisticas.viraramDemanda}</p>
          <span className="text-[10px] text-emerald-700">
            {estatisticas.total > 0
              ? `${Math.round((estatisticas.viraramDemanda / estatisticas.total) * 100)}% de conversão`
              : '0%'}
          </span>
        </Card>

        <Card className="border-[#E5E1D8] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5B6470]">Arquivados</span>
            <Archive className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-[#1A1D21] mt-1">{estatisticas.arquivados}</p>
          <span className="text-[10px] text-amber-700">{estatisticas.fixados} fixados no topo</span>
        </Card>
      </div>

      {/* Painéis de Higiene: Assuntos sem vínculo e Sem demanda criada */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-950 block">
                Painel de Higiene: Assuntos Sem Vínculo de Fluxo ({estatisticas.semVinculo})
              </span>
              <p className="text-[11px] text-amber-900/80">
                Assuntos soltos que não possuem fluxo Kanban atribuído para o time executar.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={aplicarFiltroSemVinculo}
            className="text-xs shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100 bg-white"
          >
            Filtrar estes
          </Button>
        </div>

        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-950 block">
                Painel de Higiene: Sem Demanda Criada ({estatisticas.semDemanda})
              </span>
              <p className="text-[11px] text-blue-900/80">
                Assuntos capturados que ainda não foram transformados em demanda ou card acionável.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={aplicarFiltroSemDemanda}
            className="text-xs shrink-0 border-blue-300 text-blue-900 hover:bg-blue-100 bg-white"
          >
            Filtrar estes
          </Button>
        </div>
      </div>

      {/* Painel de Busca Avançada da Folha */}
      <PainelBuscaFolha
        filtros={filtros}
        onFiltrosChange={(f) => {
          setFiltros(f)
          setPaginaAtual(1)
        }}
        totalFiltrados={itensFiltrados.length}
        totalGeral={folhaItems.length}
        totalFixados={estatisticas.fixados}
        totalArquivados={estatisticas.arquivados}
        projetos={projetos}
        contatos={contatos}
        fluxos={fluxos}
        categorias={categorias}
        marcosTimeline={marcosTimeline}
      />

      {/* Barra de Ações em Lote + Exportar CSV */}
      <div className="bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={todosDaPaginaSelecionados}
            onChange={handleToggleSelecionarTudo}
            className="w-4 h-4 rounded text-[#0F766E] border-gray-300 focus:ring-[#0F766E] cursor-pointer"
          />
          <span className="text-xs text-[#5B6470]">
            Selecionar página ({itensPaginados.length})
          </span>

          {selecionados.size > 0 && (
            <Badge className="bg-[#0F766E] text-white text-[11px] font-semibold px-2 py-0.5 ml-1">
              {selecionados.size} selecionado(s)
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selecionados.size > 0 ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={processandoLote}
                onClick={() => handleArquivarLote(true)}
                className="text-xs h-8 gap-1.5 border-[#E5E1D8] text-amber-800 hover:bg-amber-50"
              >
                <Archive className="w-3.5 h-3.5" />
                Arquivar em Lote
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={processandoLote}
                onClick={() => handleArquivarLote(false)}
                className="text-xs h-8 gap-1.5 border-[#E5E1D8] text-blue-700 hover:bg-blue-50"
              >
                <ArchiveRestore className="w-3.5 h-3.5" />
                Desarquivar em Lote
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={processandoLote}
                onClick={() => {
                  setNovoFluxoDestino(fluxos[0]?.id || '')
                  setModalReligarFluxoOpen(true)
                }}
                className="text-xs h-8 gap-1.5 border-[#E5E1D8] text-[#0F766E] hover:bg-[#0F766E]/10"
              >
                <Layers className="w-3.5 h-3.5" />
                Religar Fluxo em Lote
              </Button>

              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={processandoLote}
                onClick={() => setModalExcluirLoteOpen(true)}
                className="text-xs h-8 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir em Lote
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportarCSV}
            className="text-xs h-8 gap-1.5 border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE]"
          >
            <Download className="w-3.5 h-3.5 text-[#0F766E]" />
            Exportar CSV ({itensFiltrados.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={carregarTudo}
            className="text-xs h-8 px-2 text-[#5B6470] hover:text-[#1A1D21]"
            title="Recarregar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabela de Assuntos */}
      <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAFAF9] text-[#5B6470] border-b border-[#E5E1D8] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={todosDaPaginaSelecionados}
                    onChange={handleToggleSelecionarTudo}
                    className="w-4 h-4 rounded text-[#0F766E] border-gray-300 focus:ring-[#0F766E] cursor-pointer"
                  />
                </th>
                <th className="p-3 w-28">Data / Hora</th>
                <th className="p-3 w-16">Tipo</th>
                <th className="p-3">Assunto / Registro</th>
                <th className="p-3 w-40">Fluxo</th>
                <th className="p-3 w-36">Projeto / Contato</th>
                <th className="p-3 w-28">Demanda</th>
                <th className="p-3 w-24 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E1D8]">
              {itensPaginados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[#5B6470]">
                    Nenhum assunto encontrado nesta página.
                  </td>
                </tr>
              ) : (
                itensPaginados.map((item) => {
                  const isSel = selecionados.has(item.id)
                  const isFix = Boolean(item.fixado)
                  const isArq = Boolean(item.arquivado)
                  const temDem = verificarTemDemanda(item)
                  const flx = fluxos.find((f) => f.id === item.fluxo)

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FAFAF9]/80 transition-colors ${
                        isFix ? 'bg-amber-50/40' : isArq ? 'opacity-70 bg-gray-50/40' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 rounded text-[#0F766E] border-gray-300 focus:ring-[#0F766E] cursor-pointer"
                        />
                      </td>

                      <td className="p-3 text-[#5B6470] font-mono text-[11px] whitespace-nowrap">
                        {item.data_hora
                          ? item.data_hora.replace('T', ' ')
                          : item.data || item.created?.slice(0, 10)}
                      </td>

                      <td className="p-3">
                        {item.is_reuniao ? (
                          <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-200 text-[10px] font-bold px-1.5 py-0 flex items-center gap-1 w-max">
                            <Mic className="w-2.5 h-2.5" />
                            Reunião
                          </Badge>
                        ) : item.tipo_origem === 'whatsapp' ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-1.5 py-0 flex items-center gap-1 w-max">
                            <MessageSquare className="w-2.5 h-2.5 text-emerald-600" />
                            WhatsApp
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-[#5B6470] capitalize">
                            {item.tipo_origem || 'Manual'}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isFix && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0 rounded flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5 fill-amber-700" />
                              Fixado
                            </span>
                          )}
                          {isArq && (
                            <span className="bg-gray-200 text-gray-700 text-[10px] font-medium px-1.5 py-0 rounded flex items-center gap-0.5">
                              <Archive className="w-2.5 h-2.5" />
                              Arquivado
                            </span>
                          )}
                        </div>
                        <p className="text-[#1A1D21] font-medium leading-relaxed max-w-md line-clamp-2">
                          {item.registro}
                        </p>
                      </td>

                      <td className="p-3">
                        {flx ? (
                          <Badge
                            className="border-none text-[10px] font-medium text-white shadow-2xs"
                            style={{ backgroundColor: flx.cor || '#0F766E' }}
                          >
                            {flx.nome}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-[#5B6470] italic">Sem fluxo</span>
                        )}
                      </td>

                      <td className="p-3 text-[11px] text-[#5B6470] space-y-0.5">
                        {item.projeto && (
                          <div className="truncate max-w-[140px]">
                            📁 {projetos.find((p) => p.id === item.projeto)?.nome || 'Projeto'}
                          </div>
                        )}
                        {item.contato && (
                          <div className="truncate max-w-[140px]">
                            👤 {contatos.find((c) => c.id === item.contato)?.nome || 'Contato'}
                          </div>
                        )}
                        {!item.projeto && !item.contato && (
                          <span className="text-gray-400 italic">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        {temDem ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-semibold gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Sim
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-[#5B6470]">Não</span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const novoFix = !item.fixado
                              await diamondApi.fixarFolhaDia(item.id, novoFix)
                              setFolhaItems((prev) =>
                                prev.map((i) => (i.id === item.id ? { ...i, fixado: novoFix } : i)),
                              )
                            }}
                            className="h-7 w-7 p-0 text-[#5B6470] hover:text-amber-700"
                            title={isFix ? 'Desafixar' : 'Fixar'}
                          >
                            {isFix ? (
                              <PinOff className="w-3.5 h-3.5 fill-amber-600" />
                            ) : (
                              <Pin className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const novoArq = !item.arquivado
                              await diamondApi.arquivarFolhaDia(item.id, novoArq)
                              setFolhaItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, arquivado: novoArq } : i,
                                ),
                              )
                            }}
                            className="h-7 w-7 p-0 text-[#5B6470] hover:text-blue-700"
                            title={isArq ? 'Desarquivar' : 'Arquivar'}
                          >
                            {isArq ? (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const confirma = window.confirm(
                                'Deseja excluir este assunto permanentemente?',
                              )
                              if (!confirma) return
                              await diamondApi.deleteFolhaDia(item.id)
                              setFolhaItems((prev) => prev.filter((i) => i.id !== item.id))
                              toast({ title: 'Assunto excluído' })
                            }}
                            className="h-7 w-7 p-0 text-[#5B6470] hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da paginação */}
        <div className="p-3 bg-[#FAFAF9] border-t border-[#E5E1D8] flex items-center justify-between text-xs text-[#5B6470]">
          <span>
            Página <strong className="text-[#1A1D21]">{paginaAtual}</strong> de{' '}
            <strong className="text-[#1A1D21]">{totalPaginas}</strong> (Exibindo{' '}
            {itensPaginados.length} de {itensFiltrados.length} assuntos filtrados)
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={paginaAtual <= 1}
              onClick={() => setPaginaAtual((p) => Math.max(p - 1, 1))}
              className="h-7 px-2.5 text-xs border-[#E5E1D8] gap-1"
            >
              <ChevronLeft className="w-3 h-3" />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPaginaAtual((p) => Math.min(p + 1, totalPaginas))}
              className="h-7 px-2.5 text-xs border-[#E5E1D8] gap-1"
            >
              Próxima
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Confirmação: Excluir em Lote */}
      <Dialog open={modalExcluirLoteOpen} onOpenChange={setModalExcluirLoteOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Confirmar Exclusão em Lote
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Você selecionou <strong>{selecionados.size} assuntos</strong> para exclusão
              definitiva. Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalExcluirLoteOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={processandoLote}
              onClick={handleConfirmarExcluirLote}
              className="text-xs px-4"
            >
              {processandoLote ? 'Excluindo...' : `Excluir ${selecionados.size} itens`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Religar Vínculo de Fluxo em Lote */}
      <Dialog open={modalReligarFluxoOpen} onOpenChange={setModalReligarFluxoOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E]" />
              Religar Vínculo de Fluxo em Lote
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Selecione o fluxo de destino para vincular aos{' '}
              <strong>{selecionados.size} assuntos</strong> selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-[#1A1D21]">Fluxo de Destino</label>
            <Select value={novoFluxoDestino} onValueChange={setNovoFluxoDestino}>
              <SelectTrigger className="text-xs border-[#E5E1D8]">
                <SelectValue placeholder="Selecione um fluxo" />
              </SelectTrigger>
              <SelectContent>
                {fluxos.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-3 border-t border-[#E5E1D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalReligarFluxoOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={processandoLote || !novoFluxoDestino}
              onClick={handleConfirmarReligarFluxo}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
            >
              {processandoLote ? 'Aplicando...' : 'Aplicar Novo Fluxo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GestaoFolha
