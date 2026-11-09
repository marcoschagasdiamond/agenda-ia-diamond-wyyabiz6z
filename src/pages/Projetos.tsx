import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { BannerConsumoPlano } from '@/components/comercial/BannerConsumoPlano'
import { ModalDesbloqueioPlano } from '@/components/comercial/ModalDesbloqueioPlano'
import type {
  Projeto,
  ProjetoTipo,
  ProjetoFase,
  ProjetoEquipeMembro,
  ProjetoFinanceiroLancamento,
  Demanda,
  LimitesConsumoConta,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Users,
  DollarSign,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  ArrowRight,
  ChevronRight,
  Layers,
  Sparkles,
  Building,
  AlertTriangle,
} from 'lucide-react'
import ModalNovoProjeto from '@/components/ModalNovoProjeto'

export default function Projetos() {
  const navigate = useNavigate()
  const { user, isMaster } = useAuth()
  const { projetos, recarregarDadosGlobais } = useNavegacao()

  const [limites, setLimites] = useState<LimitesConsumoConta | null>(null)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [modalNovoAberto, setModalNovoAberto] = useState(false)

  // Dados auxiliares para exibir métricas ricas nos cards
  const [todasFases, setTodasFases] = useState<ProjetoFase[]>([])
  const [todaEquipe, setTodaEquipe] = useState<ProjetoEquipeMembro[]>([])
  const [todoFinanceiro, setTodoFinanceiro] = useState<ProjetoFinanceiroLancamento[]>([])
  const [todasDemandas, setTodasDemandas] = useState<Demanda[]>([])
  const [carregandoDados, setCarregandoDados] = useState(false)

  // Carregar dados de fases, equipe e financeiro de todos os projetos
  const carregarMetricasProjetos = async () => {
    setCarregandoDados(true)
    try {
      const [fases, equipe, fin, dem] = await Promise.all([
        diamondApi.listProjetoFases(),
        diamondApi.listProjetoEquipe(),
        diamondApi.listProjetoFinanceiro(),
        diamondApi.listDemandas(),
      ])
      setTodasFases(fases)
      setTodaEquipe(equipe)
      setTodoFinanceiro(fin)
      setTodasDemandas(dem)
    } catch (err) {
      console.error('Erro ao carregar métricas de projetos:', err)
    } finally {
      setCarregandoDados(false)
    }
  }

  useEffect(() => {
    carregarMetricasProjetos()
    diamondApi
      .getLimitesConsumoConta(user?.id, user?.email)
      .then(setLimites)
      .catch(() => {})
  }, [projetos, user])

  const atingiuLimiteProjetos = Boolean(limites?.bloqueadoProjetos)

  const handleTentarCriarProjeto = () => {
    if (atingiuLimiteProjetos) {
      setModalUpgradeOpen(true)
      return
    }
    setModalNovoAberto(true)
  }

  // Projetos filtrados
  const projetosFiltrados = useMemo(() => {
    return projetos.filter((p) => {
      const matchBusca =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (p.descricao && p.descricao.toLowerCase().includes(busca.toLowerCase()))
      const matchTipo = tipoFiltro === 'todos' || p.tipo === tipoFiltro
      return matchBusca && matchTipo
    })
  }, [projetos, busca, tipoFiltro])

  // Métricas agregadas do topo
  const metricasGlobais = useMemo(() => {
    const totalProj = projetos.length
    const ativos = projetos.filter((p) => p.status === 'ativo').length
    const totalOrcamento = projetos.reduce((acc, p) => acc + (p.orcamento_total || 0), 0)

    const totalDesembolsos = todoFinanceiro
      .filter((l) => l.tipo === 'desembolso')
      .reduce((acc, l) => acc + (l.valor || 0), 0)

    const totalEntradas = todoFinanceiro
      .filter((l) => l.tipo === 'entrada')
      .reduce((acc, l) => acc + (l.valor || 0), 0)

    return {
      totalProj,
      ativos,
      totalOrcamento,
      totalDesembolsos,
      totalEntradas,
      totalMembros: todaEquipe.length,
    }
  }, [projetos, todoFinanceiro, todaEquipe])

  // Helper para calcular métricas por projeto específico
  const getMetricasProjeto = (projetoId: string, orcamentoTotal?: number) => {
    const fases = todasFases.filter((f) => f.projeto === projetoId)
    const equipe = todaEquipe.filter((e) => e.projeto === projetoId)
    const fin = todoFinanceiro.filter((l) => l.projeto === projetoId)
    const demandas = todasDemandas.filter((d) => d.projeto === projetoId)

    // % conclusão média das fases
    let progressoMedio = 0
    if (fases.length > 0) {
      const soma = fases.reduce((acc, f) => acc + (f.progresso || 0), 0)
      progressoMedio = Math.round(soma / fases.length)
    }

    const desembolsos = fin
      .filter((l) => l.tipo === 'desembolso')
      .reduce((acc, l) => acc + (l.valor || 0), 0)

    const entradas = fin
      .filter((l) => l.tipo === 'entrada')
      .reduce((acc, l) => acc + (l.valor || 0), 0)

    const fasesConcluidas = fases.filter(
      (f) => f.status === 'concluida' || f.progresso === 100,
    ).length

    return {
      totalFases: fases.length,
      fasesConcluidas,
      progressoMedio,
      totalEquipe: equipe.length,
      equipe,
      desembolsos,
      entradas,
      totalDemandas: demandas.length,
      saldo: entradas - desembolsos,
      percentualGasto:
        orcamentoTotal && orcamentoTotal > 0
          ? Math.min(100, Math.round((desembolsos / orcamentoTotal) * 100))
          : 0,
    }
  }

  const tiposDisponiveis: { label: string; valor: string }[] = [
    { label: 'Todos', valor: 'todos' },
    { label: 'Cliente', valor: 'cliente' },
    { label: 'Negócio Próprio', valor: 'negocio' },
    { label: 'Posicionamento', valor: 'posicionamento' },
    { label: 'Preços', valor: 'precos' },
    { label: 'Devices', valor: 'devices' },
    { label: 'Freelance', valor: 'freelance' },
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Módulo de Projetos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1D8] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1A1D21] tracking-tight">
              Projetos & Negócios
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-xs font-semibold">
              {projetos.length} Cadastrado(s)
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Gestão integrada: fases com modelos prontos, cronograma físico no calendário, orçamento
            financeiro, investidores e equipe.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleTentarCriarProjeto}
            className={`text-xs font-semibold h-9 gap-1.5 shadow-xs ${
              atingiuLimiteProjetos
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-[#0F766E] hover:bg-[#0D5C56] text-white'
            }`}
          >
            {atingiuLimiteProjetos ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-200" />
                Novo Projeto (Limite Atingido)
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Novo Projeto
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Banner de Consumo e Limite do Plano */}
      {limites && (
        <BannerConsumoPlano
          titulo="Projetos & Negócios"
          usado={limites.projetosUsados}
          max={limites.projetosMax}
          unidade="projetos"
          bloqueado={limites.bloqueadoProjetos}
          recursoNome="projetos"
          onDesbloquear={() => setModalUpgradeOpen(true)}
        />
      )}

      {/* Cards de Resumo Global / Indicadores Diamond */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-[#5B6470]">
            <span className="text-xs font-medium">Projetos Ativos</span>
            <FolderKanban className="w-4 h-4 text-[#0F766E]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1D21]">{metricasGlobais.ativos}</span>
            <span className="text-xs text-[#5B6470]">de {metricasGlobais.totalProj} totais</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-[#5B6470]">
            <span className="text-xs font-medium">Orçamento Total</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-700">
              R$ {metricasGlobais.totalOrcamento.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-[#5B6470]">
            <span className="text-xs font-medium">Desembolsos Realizados</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-rose-700">
              R$ {metricasGlobais.totalDesembolsos.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
          <div className="flex items-center justify-between text-[#5B6470]">
            <span className="text-xs font-medium">Equipe Alocada</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1A1D21]">
              {metricasGlobais.totalMembros}
            </span>
            <span className="text-xs text-[#5B6470]">alocações</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E1D8]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
          <Input
            placeholder="Buscar projeto por nome ou escopo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 text-xs border-[#E5E1D8] h-9 bg-[#FAFAF9]"
          />
        </div>

        {/* Abas de Tipos */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {tiposDisponiveis.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTipoFiltro(t.valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                tipoFiltro === t.valor
                  ? 'bg-[#1A1D21] text-white shadow-2xs'
                  : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#FAFAF9]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cards de Projetos */}
      {projetosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-[#E5E1D8] p-8">
          <FolderKanban className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#1A1D21]">Nenhum projeto encontrado</h3>
          <p className="text-xs text-[#5B6470] max-w-sm mx-auto mt-1 mb-4">
            {busca
              ? 'Nenhum resultado corresponde à sua pesquisa.'
              : 'Você ainda não possui projetos configurados. Comece criando o primeiro!'}
          </p>
          <Button
            onClick={handleTentarCriarProjeto}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-semibold h-8 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Primeiro Projeto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projetosFiltrados.map((p) => {
            const m = getMetricasProjeto(p.id, p.orcamento_total)
            const corProjeto = p.cor || '#0F766E'

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/projetos/${p.id}`)}
                className="group bg-white rounded-xl border border-[#E5E1D8] hover:border-[#0F766E]/50 hover:shadow-md transition-all cursor-pointer flex flex-col overflow-hidden"
              >
                {/* Faixa colorida do projeto */}
                <div className="h-1.5 w-full" style={{ backgroundColor: corProjeto }} />

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Topo do Card: Tipo + Status + Cliente */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold border-[#E5E1D8] text-[#5B6470]"
                      >
                        {p.tipo || 'Geral'}
                      </Badge>
                      <Badge
                        className={`text-[10px] border-none font-semibold ${
                          p.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {p.status || 'Ativo'}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-bold text-[#1A1D21] group-hover:text-[#0F766E] transition-colors line-clamp-1">
                      {p.nome}
                    </h3>

                    {p.descricao && (
                      <p className="text-xs text-[#5B6470] mt-1 line-clamp-2">{p.descricao}</p>
                    )}

                    {p.expand?.cliente && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#0F766E] font-medium mt-2">
                        <Building className="w-3 h-3" />
                        <span className="truncate">{p.expand.cliente.nome}</span>
                      </div>
                    )}
                  </div>

                  {/* Barra de Progresso Físico */}
                  <div className="space-y-1.5 pt-2 border-t border-[#E5E1D8]/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5B6470] font-medium flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
                        {m.fasesConcluidas}/{m.totalFases} fases concluídas
                      </span>
                      <span className="font-bold text-[#1A1D21]">{m.progressoMedio}%</span>
                    </div>
                    <Progress value={m.progressoMedio} className="h-1.5 bg-[#FAFAF9]" />
                  </div>

                  {/* Métricas de Finanças e Equipe */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]/50">
                      <span className="text-[10px] text-[#5B6470] block font-semibold uppercase">
                        Orçamento
                      </span>
                      <span className="text-xs font-bold text-[#0F766E]">
                        R$ {p.orcamento_total ? p.orcamento_total.toLocaleString('pt-BR') : '0,00'}
                      </span>
                      <span className="text-[10px] text-rose-600 block mt-0.5">
                        Gasto: R$ {m.desembolsos.toLocaleString('pt-BR')} ({m.percentualGasto}%)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]/50">
                      <span className="text-[10px] text-[#5B6470] block font-semibold uppercase">
                        Prazo & Equipe
                      </span>
                      <span className="text-xs font-bold text-[#1A1D21] flex items-center gap-1 truncate">
                        <Users className="w-3 h-3 text-[#5B6470]" />
                        {m.totalEquipe} integrante(s)
                      </span>
                      <span className="text-[10px] text-[#5B6470] block mt-0.5 truncate">
                        {p.data_fim
                          ? `Até ${new Date(p.data_fim).toLocaleDateString('pt-BR')}`
                          : 'Sem prazo fixo'}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé com botão de abrir */}
                  <div className="pt-2 flex items-center justify-between text-xs font-bold text-[#0F766E] group-hover:translate-x-0.5 transition-transform">
                    <span>Abrir painel completo do projeto</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Wizard Novo Projeto */}
      <ModalNovoProjeto
        open={modalNovoAberto}
        onOpenChange={(aberto) => {
          if (aberto && atingiuLimiteProjetos) {
            setModalUpgradeOpen(true)
            return
          }
          setModalNovoAberto(aberto)
        }}
        onProjetoCriado={(novoId) => {
          recarregarDadosGlobais()
          carregarMetricasProjetos()
          diamondApi
            .getLimitesConsumoConta(user?.id, user?.email)
            .then(setLimites)
            .catch(() => {})
          navigate(`/projetos/${novoId}`)
        }}
      />

      {/* Modal de Desbloqueio Comercial */}
      <ModalDesbloqueioPlano
        open={modalUpgradeOpen}
        onOpenChange={setModalUpgradeOpen}
        recursoNome="Projetos Ilimitados"
        motivo={`Você atingiu o limite de ${limites?.projetosMax ?? 2} projetos do plano gratuito (Prova Viva). Ative o plano pago para cadastrar projetos ilimitados com cronogramas e orçamentos.`}
        isMaster={isMaster}
      />
    </div>
  )
}
