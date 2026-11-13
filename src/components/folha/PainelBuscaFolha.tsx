import React, { useState } from 'react'
import type { FolhaDia, Projeto, Contato, FluxoKanban, CategoriaFluxo } from '@/types'
import {
  Search,
  Filter,
  X,
  Calendar,
  Pin,
  Archive,
  RotateCcw,
  Clock as ClockIcon,
  Sparkles,
  Layers,
  FolderGit2,
  Users,
  CheckCircle2,
  AlertCircle,
  Mic,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TeseSemente } from '@/types'
import { AbaCofreTeses } from './AbaCofreTeses'

export type PeriodoFiltro = 'todos' | 'hoje' | 'esta_semana' | 'este_mes' | 'personalizado'
export type TipoFiltro = 'todos' | 'comum' | 'reuniao' | 'whatsapp'
export type EstadoDemandaFiltro = 'todos' | 'com_demanda' | 'sem_demanda'
export type EstadoFluxoFiltro = 'todos' | 'com_fluxo' | 'sem_fluxo'
export type EstadoArquivoFiltro = 'ativos' | 'arquivados' | 'sementes' | 'todos'
export type OrdenacaoFiltro = 'recentes' | 'antigos'

export interface FolhaFiltrosState {
  busca: string
  periodo: PeriodoFiltro
  dataInicio: string
  dataFim: string
  tipo: TipoFiltro
  fluxoId: string
  projetoId: string
  contatoId: string
  timeline: string
  estadoDemanda: EstadoDemandaFiltro
  estadoFluxo: EstadoFluxoFiltro
  estadoArquivo: EstadoArquivoFiltro
  ordenacao: OrdenacaoFiltro
}

export const FILTROS_PADRAO: FolhaFiltrosState = {
  busca: '',
  periodo: 'todos',
  dataInicio: '',
  dataFim: '',
  tipo: 'todos',
  fluxoId: 'todos',
  projetoId: 'todos',
  contatoId: 'todos',
  timeline: 'todos',
  estadoDemanda: 'todos',
  estadoFluxo: 'todos',
  estadoArquivo: 'ativos',
  ordenacao: 'recentes',
}

interface PainelBuscaFolhaProps {
  filtros: FolhaFiltrosState
  onFiltrosChange: (novos: FolhaFiltrosState) => void
  totalFiltrados: number
  totalGeral: number
  totalFixados: number
  totalArquivados: number
  totalSementes?: number
  tesesSementes?: TeseSemente[]
  teseFiltroId?: string
  contagemPorTese?: Record<string, number>
  onTeseFiltroChange?: (teseId: string) => void
  onCriarTeseRapida?: (nome: string, descricao?: string) => Promise<void>
  projetos: Projeto[]
  contatos: Contato[]
  fluxos: FluxoKanban[]
  categorias: CategoriaFluxo[]
  marcosTimeline: Array<{ nome: string }>
  /** Cofre: filtro por parceiro (valor salvo em semente_parceiro). */
  parceiroFiltro?: string
  onParceiroFiltroChange?: (valor: string) => void
  /** Cofre: filtro por negócio (valor salvo em semente_negocio). */
  negocioFiltro?: string
  onNegocioFiltroChange?: (valor: string) => void
  /** Opções distintas existentes nas sementes (para os selects do cofre). */
  parceirosDisponiveis?: string[]
  negociosDisponiveis?: string[]
}

export const PainelBuscaFolha: React.FC<PainelBuscaFolhaProps> = ({
  filtros,
  onFiltrosChange,
  totalFiltrados,
  totalGeral,
  totalFixados,
  totalArquivados,
  totalSementes = 0,
  tesesSementes = [],
  teseFiltroId = 'todas',
  contagemPorTese,
  onTeseFiltroChange,
  onCriarTeseRapida,
  projetos,
  contatos,
  fluxos,
  categorias,
  marcosTimeline,
  parceiroFiltro = 'todos',
  onParceiroFiltroChange,
  negocioFiltro = 'todos',
  onNegocioFiltroChange,
  parceirosDisponiveis = [],
  negociosDisponiveis = [],
}) => {
  const [expandido, setExpandido] = useState(false)

  const atualizar = <K extends keyof FolhaFiltrosState>(chave: K, valor: FolhaFiltrosState[K]) => {
    onFiltrosChange({
      ...filtros,
      [chave]: valor,
    })
  }

  const limparFiltros = () => {
    onFiltrosChange({
      ...FILTROS_PADRAO,
      estadoArquivo: filtros.estadoArquivo,
    })
  }

  const filtrosAtivosCount = [
    filtros.busca.trim().length > 0,
    filtros.periodo !== 'todos',
    filtros.tipo !== 'todos',
    filtros.fluxoId !== 'todos',
    filtros.projetoId !== 'todos',
    filtros.contatoId !== 'todos',
    filtros.timeline !== 'todos',
    filtros.estadoDemanda !== 'todos',
    filtros.estadoFluxo !== 'todos',
    filtros.estadoArquivo !== 'ativos',
    filtros.ordenacao !== 'recentes',
    parceiroFiltro !== 'todos',
    negocioFiltro !== 'todos',
  ].filter(Boolean).length

  const contagensPorTeseCalculada = React.useMemo(() => {
    if (contagemPorTese) return contagemPorTese
    const counts: Record<string, number> = { sem_tese: 0 }
    tesesSementes.forEach((t) => {
      counts[t.id] = 0
    })
    return counts
  }, [tesesSementes, contagemPorTese])

  return (
    <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-xs p-4 space-y-3">
      {/* Bloco do Cofre por Tese quando na aba Sementes */}
      {filtros.estadoArquivo === 'sementes' && (
        <AbaCofreTeses
          teses={tesesSementes}
          teseSelecionadaId={teseFiltroId}
          onSelecionarTese={(id) => onTeseFiltroChange && onTeseFiltroChange(id)}
          onCriarTeseRapida={async (nome, desc) => {
            if (onCriarTeseRapida) await onCriarTeseRapida(nome, desc)
          }}
          contagemPorTese={contagensPorTeseCalculada}
          totalSementes={totalSementes}
        />
      )}

      {/* Linha principal: Busca por texto em tempo real + Botão de Filtros + Ordenação */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#5B6470]" />
          <Input
            placeholder="Buscar por texto em tempo real (título, notas, transcrição da reunião)..."
            value={filtros.busca}
            onChange={(e) => atualizar('busca', e.target.value)}
            className="pl-9 pr-8 text-xs bg-white border-[#E5E1D8] h-9 focus-visible:ring-1 focus-visible:ring-[#0F766E]"
          />
          {filtros.busca && (
            <button
              type="button"
              onClick={() => atualizar('busca', '')}
              className="absolute right-2.5 top-2.5 text-[#5B6470] hover:text-[#1A1D21]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpandido(!expandido)}
            className={`text-xs h-9 border-[#E5E1D8] gap-1.5 ${
              filtrosAtivosCount > 0
                ? 'bg-[#0F766E]/10 text-[#0F766E] font-semibold border-[#0F766E]/30'
                : 'text-[#5B6470]'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Filtros avançados</span>
            {filtrosAtivosCount > 0 && (
              <Badge className="bg-[#0F766E] text-white text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full">
                {filtrosAtivosCount}
              </Badge>
            )}
            {expandido ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>

          {/* Seletor rápido de Arquivo (Ativos / Arquivados / Sementes / Todos) */}
          <div className="flex items-center bg-[#F4F2EE] p-0.5 rounded-lg border border-[#E5E1D8]">
            <button
              type="button"
              onClick={() => atualizar('estadoArquivo', 'ativos')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filtros.estadoArquivo === 'ativos'
                  ? 'bg-white text-[#0F766E] shadow-2xs font-semibold'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              Ativos
            </button>
            <button
              type="button"
              onClick={() => atualizar('estadoArquivo', 'sementes')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1 transition-colors ${
                filtros.estadoArquivo === 'sementes'
                  ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              <span className="text-xs">🌱</span>
              <span>Sementes</span>
              {totalSementes > 0 && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded-full font-bold">
                  {totalSementes}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => atualizar('estadoArquivo', 'arquivados')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1 transition-colors ${
                filtros.estadoArquivo === 'arquivados'
                  ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              <Archive className="w-3 h-3" />
              <span>Arquivados</span>
              {totalArquivados > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded-full font-bold">
                  {totalArquivados}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => atualizar('estadoArquivo', 'todos')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filtros.estadoArquivo === 'todos'
                  ? 'bg-white text-[#1A1D21] shadow-2xs font-semibold'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              Todos
            </button>
          </div>
        </div>
      </div>

      {/* Painel expansível com filtros combináveis */}
      {expandido && (
        <div className="pt-3 border-t border-[#E5E1D8] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Período */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">Período</label>
              <Select
                value={filtros.periodo}
                onValueChange={(v) => atualizar('periodo', v as PeriodoFiltro)}
              >
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer período</SelectItem>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="esta_semana">Esta semana</SelectItem>
                  <SelectItem value="este_mes">Este mês</SelectItem>
                  <SelectItem value="personalizado">Intervalo personalizado...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Tipo do Assunto
              </label>
              <Select
                value={filtros.tipo}
                onValueChange={(v) => atualizar('tipo', v as TipoFiltro)}
              >
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="comum">Assunto comum / Anotação</SelectItem>
                  <SelectItem value="whatsapp">Origem WhatsApp</SelectItem>
                  <SelectItem value="reuniao">Reunião gravada (áudio/ata)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vínculo: Categoria › Fluxo */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Vínculo: Categoria › Fluxo
              </label>
              <Select value={filtros.fluxoId} onValueChange={(v) => atualizar('fluxoId', v)}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Todos os fluxos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os fluxos</SelectItem>
                  {fluxos.map((flx) => {
                    const cat = categorias.find((c) => c.id === flx.categoria)
                    const label = cat ? `${cat.nome} › ${flx.nome}` : flx.nome
                    return (
                      <SelectItem key={flx.id} value={flx.id}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: flx.cor || '#0F766E' }}
                          />
                          {label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Vínculo: Projeto */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Vínculo: Projeto
              </label>
              <Select value={filtros.projetoId} onValueChange={(v) => atualizar('projetoId', v)}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os projetos</SelectItem>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vínculo: Contato */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Vínculo: Contato
              </label>
              <Select value={filtros.contatoId} onValueChange={(v) => atualizar('contatoId', v)}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Todos os contatos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os contatos</SelectItem>
                  {contatos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.empresa ? `(${c.empresa})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vínculo: Timeline */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Vínculo: Timeline
              </label>
              <Select value={filtros.timeline} onValueChange={(v) => atualizar('timeline', v)}>
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Todas as timelines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as timelines</SelectItem>
                  {marcosTimeline.map((m, idx) => (
                    <SelectItem key={`${m.nome}_${idx}`} value={m.nome}>
                      ⏳ {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado: Demanda criada */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Estado: Demanda
              </label>
              <Select
                value={filtros.estadoDemanda}
                onValueChange={(v) => atualizar('estadoDemanda', v as EstadoDemandaFiltro)}
              >
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer estado</SelectItem>
                  <SelectItem value="com_demanda">Com demanda criada</SelectItem>
                  <SelectItem value="sem_demanda">Sem demanda criada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado: Vínculo de Fluxo */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Estado: Vínculo de Fluxo
              </label>
              <Select
                value={filtros.estadoFluxo}
                onValueChange={(v) => atualizar('estadoFluxo', v as EstadoFluxoFiltro)}
              >
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer estado</SelectItem>
                  <SelectItem value="com_fluxo">Com fluxo vinculado</SelectItem>
                  <SelectItem value="sem_fluxo">Sem fluxo vinculado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cofre: filtro por Parceiro da semente */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Cofre: Parceiro da Semente
              </label>
              <Select
                value={parceiroFiltro}
                onValueChange={(v) => onParceiroFiltroChange && onParceiroFiltroChange(v)}
                disabled={parceirosDisponiveis.length === 0}
              >
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Todos os parceiros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os parceiros</SelectItem>
                  {parceirosDisponiveis.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cofre: filtro por Negócio da semente */}
            <div>
              <label className="text-[11px] font-semibold text-[#5B6470] block mb-1">
                Cofre: Negócio da Semente
              </label>
              <Select
                value={negocioFiltro}
                onValueChange={(v) => onNegocioFiltroChange && onNegocioFiltroChange(v)}
                disabled={negociosDisponiveis.length === 0}
              >
                <SelectTrigger className="text-xs h-8 bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Todos os negócios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os negócios</SelectItem>
                  {negociosDisponiveis.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Se período personalizado foi escolhido, mostra inputs de data */}
          {filtros.periodo === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 bg-[#FAFAF9] p-2.5 rounded-lg border border-[#E5E1D8]">
              <span className="text-[11px] font-semibold text-[#1A1D21]">Intervalo de datas:</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#5B6470]">De</span>
                <Input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => atualizar('dataInicio', e.target.value)}
                  className="h-8 text-xs bg-white border-[#E5E1D8] w-36"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#5B6470]">Até</span>
                <Input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => atualizar('dataFim', e.target.value)}
                  className="h-8 text-xs bg-white border-[#E5E1D8] w-36"
                />
              </div>
            </div>
          )}

          {/* Rodapé de ações do painel: Ordenação e Limpar filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#E5E1D8]/60">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5B6470]">Ordenação:</span>
              <Select
                value={filtros.ordenacao}
                onValueChange={(v) => atualizar('ordenacao', v as OrdenacaoFiltro)}
              >
                <SelectTrigger className="text-xs h-7 w-36 bg-white border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recentes">Mais recentes</SelectItem>
                  <SelectItem value="antigos">Mais antigos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filtrosAtivosCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={limparFiltros}
                className="text-xs h-7 text-[#5B6470] hover:text-red-600 gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Barra de status e contador de resultados */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-[#5B6470] border-t border-[#E5E1D8]/60">
        <div className="flex items-center gap-2">
          <span>
            Exibindo <strong className="text-[#1A1D21]">{totalFiltrados}</strong> de{' '}
            <strong className="text-[#1A1D21]">{totalGeral}</strong> assuntos
          </span>
          {totalFixados > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-semibold gap-1">
              <Pin className="w-2.5 h-2.5 fill-amber-700" />
              {totalFixados} {totalFixados === 1 ? 'fixado' : 'fixados'}
            </Badge>
          )}
          {filtros.estadoArquivo === 'arquivados' && (
            <Badge className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium">
              Visualizando arquivados
            </Badge>
          )}
        </div>

        {filtrosAtivosCount > 0 && (
          <span className="text-[11px] text-[#0F766E]">
            {filtrosAtivosCount} {filtrosAtivosCount === 1 ? 'filtro ativo' : 'filtros ativos'}
          </span>
        )}
      </div>
    </div>
  )
}

export default PainelBuscaFolha
