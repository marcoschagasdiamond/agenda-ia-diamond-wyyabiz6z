import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import { ModalDesbloqueioPlano } from '@/components/comercial/ModalDesbloqueioPlano'
import type { LimitesConsumoConta } from '@/types'
import type {
  Projeto,
  ProjetoFase,
  ProjetoEquipeMembro,
  ProjetoInvestidor,
  ProjetoFinanceiroLancamento,
  Demanda,
  Arquivo,
  NivelAcesso,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  FolderKanban,
  Layers,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckSquare,
  FileText,
  Plus,
  Trash2,
  Mail,
  Send,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Edit,
  Upload,
  Download,
  AlertCircle,
} from 'lucide-react'

type AbaProjeto =
  | 'resumo'
  | 'fases'
  | 'equipe'
  | 'cronograma'
  | 'financeiro'
  | 'investidores'
  | 'demandas'
  | 'arquivos'

export default function ProjetoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { clientes, recarregarDadosGlobais } = useNavegacao()

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [fases, setFases] = useState<ProjetoFase[]>([])
  const [equipe, setEquipe] = useState<ProjetoEquipeMembro[]>([])
  const [investidores, setInvestidores] = useState<ProjetoInvestidor[]>([])
  const [financeiro, setFinanceiro] = useState<ProjetoFinanceiroLancamento[]>([])
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<AbaProjeto>('resumo')

  // Modais de Criação
  const [modalNovaFase, setModalNovaFase] = useState(false)
  const [modalNovoMembro, setModalNovoMembro] = useState(false)
  const [modalNovoInvestidor, setModalNovoInvestidor] = useState(false)
  const [modalNovoLancamento, setModalNovoLancamento] = useState(false)
  const [modalNovaDemanda, setModalNovaDemanda] = useState(false)
  const [limites, setLimites] = useState<LimitesConsumoConta | null>(null)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)

  // Formulário Nova Fase
  const [novaFaseNome, setNovaFaseNome] = useState('')
  const [novaFaseCor, setNovaFaseCor] = useState('#0F766E')
  const [novaFaseIni, setNovaFaseIni] = useState('')
  const [novaFaseFim, setNovaFaseFim] = useState('')
  const [novaFaseProgresso, setNovaFaseProgresso] = useState(0)

  // Formulário Novo Membro
  const [novoMemNome, setNovoMemNome] = useState('')
  const [novoMemEmail, setNovoMemEmail] = useState('')
  const [novoMemFuncao, setNovoMemFuncao] = useState('Técnico Responsável')
  const [novoMemAcesso, setNovoMemAcesso] = useState<NivelAcesso>('edicao')
  const [novoMemDispararConvite, setNovoMemDispararConvite] = useState(true)

  // Formulário Novo Investidor
  const [novoInvNome, setNovoInvNome] = useState('')
  const [novoInvEmail, setNovoInvEmail] = useState('')
  const [novoInvValor, setNovoInvValor] = useState(0)
  const [novoInvPerc, setNovoInvPerc] = useState(0)
  const [novoInvObs, setNovoInvObs] = useState('')

  // Formulário Novo Lançamento Financeiro
  const [novoLancTipo, setNovoLancTipo] = useState<'entrada' | 'desembolso'>('desembolso')
  const [novoLancValor, setNovoLancValor] = useState(0)
  const [novoLancData, setNovoLancData] = useState(() => new Date().toISOString().split('T')[0])
  const [novoLancDesc, setNovoLancDesc] = useState('')
  const [novoLancFaseId, setNovoLancFaseId] = useState('')
  const [novoLancCat, setNovoLancCat] = useState('equipe')

  // Formulário Nova Demanda
  const [novaDemTitulo, setNovaDemTitulo] = useState('')
  const [novaDemDesc, setNovaDemDesc] = useState('')
  const [novaDemPrioridade, setNovaDemPrioridade] = useState<
    'baixa' | 'media' | 'alta' | 'urgente'
  >('media')
  const [novaDemPrazo, setNovaDemPrazo] = useState('')

  // Carregar todos os dados do projeto
  const carregarDadosCompletos = async () => {
    if (!id) return
    setCarregando(true)
    try {
      const [proj, fas, eq, inv, fin, todasDem] = await Promise.all([
        diamondApi.getProjeto(id),
        diamondApi.listProjetoFases(id),
        diamondApi.listProjetoEquipe(id),
        diamondApi.listProjetoInvestidores(id),
        diamondApi.listProjetoFinanceiro(id),
        diamondApi.listDemandas(),
      ])

      const dem = todasDem.filter((d) => d.projeto === id)

      setProjeto(proj)
      setFases(fas)
      setEquipe(eq)
      setInvestidores(inv)
      setFinanceiro(fin)
      setDemandas(dem)

      // Carregar arquivos da pasta raiz do projeto se existir
      if (proj.pasta_raiz) {
        try {
          const arqs = await diamondApi.listArquivos(proj.pasta_raiz)
          setArquivos(arqs)
        } catch {
          setArquivos([])
        }
      }
    } catch (err) {
      toast({
        title: 'Erro ao carregar projeto',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDadosCompletos()
    diamondApi
      .getLimitesConsumoConta(user?.id, user?.email)
      .then(setLimites)
      .catch(() => {})
  }, [id, user?.id, user?.email])

  // Métricas calculadas
  const metricas = useMemo(() => {
    const totalFases = fases.length
    const fasesConcluidas = fases.filter(
      (f) => f.status === 'concluida' || (f.progresso || 0) === 100,
    ).length
    const progressoMedio =
      totalFases > 0
        ? Math.round(fases.reduce((acc, f) => acc + (f.progresso || 0), 0) / totalFases)
        : 0

    const totalEntradas = financeiro
      .filter((l) => l.tipo === 'entrada')
      .reduce((acc, l) => acc + (l.valor || 0), 0)

    const totalDesembolsos = financeiro
      .filter((l) => l.tipo === 'desembolso')
      .reduce((acc, l) => acc + (l.valor || 0), 0)

    const totalInvestido = investidores.reduce((acc, i) => acc + (i.valor_investido || 0), 0)
    const saldo = totalEntradas - totalDesembolsos

    const orcamentoTotal = projeto?.orcamento_total || 0
    const percOrcamentoGasto =
      orcamentoTotal > 0 ? Math.min(100, Math.round((totalDesembolsos / orcamentoTotal) * 100)) : 0

    const demandasAbertas = demandas.filter((d) => d.status !== 'concluido').length

    return {
      totalFases,
      fasesConcluidas,
      progressoMedio,
      totalEntradas,
      totalDesembolsos,
      totalInvestido,
      saldo,
      orcamentoTotal,
      percOrcamentoGasto,
      demandasAbertas,
      totalDemandas: demandas.length,
      totalEquipe: equipe.length,
      totalInvestidores: investidores.length,
      totalArquivos: arquivos.length,
    }
  }, [fases, financeiro, investidores, demandas, equipe, arquivos, projeto])

  // Ações de Fases
  const handleCriarFase = async () => {
    if (!id || !novaFaseNome.trim()) return
    try {
      const novaOrdem = fases.length + 1
      await diamondApi.createProjetoFase({
        projeto: id,
        nome: novaFaseNome.trim(),
        ordem: novaOrdem,
        cor: novaFaseCor,
        data_inicio: novaFaseIni ? `${novaFaseIni} 00:00:00.000Z` : undefined,
        data_fim: novaFaseFim ? `${novaFaseFim} 00:00:00.000Z` : undefined,
        progresso: novaFaseProgresso,
        status:
          novaFaseProgresso === 100
            ? 'concluida'
            : novaFaseProgresso > 0
              ? 'em_andamento'
              : 'nao_iniciada',
      })
      setModalNovaFase(false)
      setNovaFaseNome('')
      toast({ title: 'Fase adicionada com sucesso!' })
      carregarDadosCompletos()
    } catch (err) {
      toast({
        title: 'Erro ao criar fase',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleAtualizarProgressoFase = async (faseId: string, novoProg: number) => {
    try {
      await diamondApi.updateProjetoFase(faseId, {
        progresso: novoProg,
        status: novoProg === 100 ? 'concluida' : novoProg > 0 ? 'em_andamento' : 'nao_iniciada',
      })
      setFases((prev) =>
        prev.map((f) =>
          f.id === faseId
            ? {
                ...f,
                progresso: novoProg,
                status:
                  novoProg === 100 ? 'concluida' : novoProg > 0 ? 'em_andamento' : 'nao_iniciada',
              }
            : f,
        ),
      )
      toast({ title: 'Progresso da fase atualizado!' })
    } catch (err) {
      toast({
        title: 'Erro ao atualizar fase',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleExcluirFase = async (faseId: string) => {
    if (!confirm('Deseja realmente remover esta fase do projeto?')) return
    try {
      await diamondApi.deleteProjetoFase(faseId)
      setFases((prev) => prev.filter((f) => f.id !== faseId))
      toast({ title: 'Fase removida' })
    } catch (err) {
      toast({
        title: 'Erro ao excluir fase',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Ações de Equipe
  const handleAdicionarMembro = async () => {
    if (!id || (!novoMemNome.trim() && !novoMemEmail.trim())) return
    try {
      await diamondApi.createProjetoEquipeMembro({
        projeto: id,
        nome: novoMemNome.trim() || novoMemEmail.split('@')[0],
        email: novoMemEmail.trim().toLowerCase(),
        funcao: novoMemFuncao.trim() || 'Colaborador',
        nivel_acesso: novoMemAcesso,
        status: 'ativo',
      })

      if (novoMemDispararConvite && novoMemEmail.trim() && projeto) {
        await diamondApi.criarConvite({
          email: novoMemEmail.trim().toLowerCase(),
          escopo_tipo: 'projeto',
          escopo_id: projeto.id,
          escopo_nome: projeto.nome,
          nivel_acesso: novoMemAcesso,
          mensagem: `Você foi adicionado à equipe do projeto "${projeto.nome}" com a função de ${novoMemFuncao}.`,
          convidado_por: user?.id,
        })
      }

      setModalNovoMembro(false)
      setNovoMemNome('')
      setNovoMemEmail('')
      toast({ title: 'Membro incluído na equipe do projeto!' })
      carregarDadosCompletos()
    } catch (err) {
      toast({
        title: 'Erro ao adicionar membro',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleExcluirMembro = async (membroId: string) => {
    if (!confirm('Deseja remover este membro do projeto?')) return
    try {
      await diamondApi.deleteProjetoEquipeMembro(membroId)
      setEquipe((prev) => prev.filter((m) => m.id !== membroId))
      toast({ title: 'Membro removido da equipe' })
    } catch (err) {
      toast({
        title: 'Erro ao remover membro',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Ações de Investidores
  const handleAdicionarInvestidor = async () => {
    if (!id || !novoInvNome.trim()) return
    try {
      await diamondApi.createProjetoInvestidor({
        projeto: id,
        nome: novoInvNome.trim(),
        email: novoInvEmail.trim() || undefined,
        valor_investido: Number(novoInvValor) || 0,
        participacao_percentual: Number(novoInvPerc) || 0,
        observacoes: novoInvObs.trim() || undefined,
        data_aporte: new Date().toISOString(),
      })
      setModalNovoInvestidor(false)
      setNovoInvNome('')
      setNovoInvEmail('')
      setNovoInvValor(0)
      setNovoInvPerc(0)
      setNovoInvObs('')
      toast({ title: 'Investidor registrado com sucesso!' })
      carregarDadosCompletos()
    } catch (err) {
      toast({
        title: 'Erro ao salvar investidor',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleExcluirInvestidor = async (invId: string) => {
    if (!confirm('Deseja excluir este investidor?')) return
    try {
      await diamondApi.deleteProjetoInvestidor(invId)
      setInvestidores((prev) => prev.filter((i) => i.id !== invId))
      toast({ title: 'Investidor removido' })
    } catch (err) {
      toast({
        title: 'Erro ao remover investidor',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Ações Financeiras
  const handleAdicionarLancamento = async () => {
    if (!id || !novoLancDesc.trim() || novoLancValor <= 0) return
    try {
      await diamondApi.createProjetoFinanceiro({
        projeto: id,
        tipo: novoLancTipo,
        valor: Number(novoLancValor),
        data: novoLancData ? `${novoLancData} 00:00:00.000Z` : new Date().toISOString(),
        descricao: novoLancDesc.trim(),
        fase: novoLancFaseId || undefined,
        categoria_custo: novoLancCat,
        status: 'realizado',
      })
      setModalNovoLancamento(false)
      setNovoLancDesc('')
      setNovoLancValor(0)
      toast({ title: 'Lançamento financeiro registrado!' })
      carregarDadosCompletos()
    } catch (err) {
      toast({
        title: 'Erro ao registrar financeiro',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleExcluirLancamento = async (lancId: string) => {
    if (!confirm('Deseja excluir este lançamento financeiro?')) return
    try {
      await diamondApi.deleteProjetoFinanceiro(lancId)
      setFinanceiro((prev) => prev.filter((l) => l.id !== lancId))
      toast({ title: 'Lançamento removido' })
    } catch (err) {
      toast({
        title: 'Erro ao remover lançamento',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Ações de Demandas
  const handleCriarDemanda = async () => {
    if (!id || !novaDemTitulo.trim()) return
    try {
      await diamondApi.createDemanda({
        titulo: novaDemTitulo.trim(),
        descricao: novaDemDesc.trim() || undefined,
        prioridade: novaDemPrioridade,
        status: 'pendente',
        projeto: id,
        prazo: novaDemPrazo ? `${novaDemPrazo} 00:00:00.000Z` : undefined,
      })
      setModalNovaDemanda(false)
      setNovaDemTitulo('')
      setNovaDemDesc('')
      toast({ title: 'Demanda criada e vinculada ao projeto!' })
      carregarDadosCompletos()
    } catch (err) {
      toast({
        title: 'Erro ao criar demanda',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Upload simples de arquivo
  const handleUploadArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !projeto?.pasta_raiz) return

    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('nome', file.name)
      formData.append('pasta', projeto.pasta_raiz)
      if (id) formData.append('projeto', id)

      await diamondApi.uploadArquivo(formData)
      toast({ title: 'Arquivo anexado ao projeto com sucesso!' })
      const arqs = await diamondApi.listArquivos(projeto.pasta_raiz)
      setArquivos(arqs)
    } catch (err) {
      toast({
        title: 'Erro ao anexar arquivo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  if (carregando) {
    return (
      <div className="py-20 text-center text-xs text-[#5B6470]">
        Carregando detalhes do projeto...
      </div>
    )
  }

  if (!projeto) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-base font-bold text-[#1A1D21]">Projeto não encontrado</h3>
        <Button onClick={() => navigate('/projetos')} className="mt-4 text-xs">
          Voltar para Projetos
        </Button>
      </div>
    )
  }

  const abasDisponiveis: {
    id: AbaProjeto
    label: string
    icon: React.ComponentType<{ className?: string }>
    count?: number
  }[] = [
    { id: 'resumo', label: 'Resumo Geral', icon: Sparkles },
    { id: 'fases', label: 'Fases & Progresso', icon: Layers, count: metricas.totalFases },
    { id: 'equipe', label: 'Equipe & Funções', icon: Users, count: metricas.totalEquipe },
    { id: 'cronograma', label: 'Cronograma Físico', icon: Calendar },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, count: financeiro.length },
    {
      id: 'investidores',
      label: 'Investidores',
      icon: TrendingUp,
      count: metricas.totalInvestidores,
    },
    { id: 'demandas', label: 'Demandas', icon: CheckSquare, count: metricas.totalDemandas },
    { id: 'arquivos', label: 'Arquivos & Anexos', icon: FileText, count: metricas.totalArquivos },
  ]

  return (
    <div className="space-y-5">
      {/* Barra de Topo do Projeto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D8] pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projetos')}
            className="text-xs text-[#5B6470] h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
            style={{ backgroundColor: projeto.cor || '#0F766E' }}
          >
            <FolderKanban className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1A1D21] tracking-tight">{projeto.nome}</h1>
              <Badge
                variant="outline"
                className="text-[10px] uppercase font-bold border-[#E5E1D8] text-[#5B6470]"
              >
                {projeto.tipo || 'Geral'}
              </Badge>
              <Badge
                className={`text-[10px] border-none font-semibold ${
                  projeto.status === 'ativo'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {projeto.status || 'Ativo'}
              </Badge>
            </div>
            {projeto.expand?.cliente && (
              <span className="text-xs text-[#0F766E] font-medium flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5" />
                Cliente: {projeto.expand.cliente.nome}{' '}
                {projeto.expand.cliente.empresa ? `(${projeto.expand.cliente.empresa})` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/calendario')}
            variant="outline"
            size="sm"
            className="text-xs border-[#E5E1D8] gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
            Ver no Calendário
          </Button>

          <Button
            onClick={() => setModalNovaDemanda(true)}
            size="sm"
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* Navegação por Abas no Padrão DiamondGroup */}
      <div className="flex items-center gap-1 border-b border-[#E5E1D8] overflow-x-auto pb-1">
        {abasDisponiveis.map((aba) => {
          const Icone = aba.icon
          const isAtiva = abaAtiva === aba.id

          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                isAtiva
                  ? 'border-[#0F766E] text-[#0F766E] bg-[#0F766E]/5'
                  : 'border-transparent text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#FAFAF9]'
              }`}
            >
              <Icone className="w-3.5 h-3.5" />
              <span>{aba.label}</span>
              {typeof aba.count === 'number' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isAtiva ? 'bg-[#0F766E] text-white' : 'bg-[#E5E1D8] text-[#5B6470]'
                  }`}
                >
                  {aba.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ========================================================== */}
      {/* ABA 1: RESUMO GERAL                                        */}
      {/* ========================================================== */}
      {abaAtiva === 'resumo' && (
        <div className="space-y-5">
          {/* 4 Cards de Status Principal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium flex items-center justify-between">
                Progresso Físico
                <Layers className="w-4 h-4 text-[#0F766E]" />
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#1A1D21]">
                  {metricas.progressoMedio}%
                </span>
                <span className="text-xs text-[#5B6470]">
                  ({metricas.fasesConcluidas}/{metricas.totalFases} fases)
                </span>
              </div>
              <Progress value={metricas.progressoMedio} className="h-1.5 mt-2 bg-[#FAFAF9]" />
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium flex items-center justify-between">
                Orçamento & Desembolsos
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </span>
              <div className="mt-2">
                <span className="text-xl font-bold text-[#0F766E] block">
                  R$ {metricas.orcamentoTotal.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-rose-600 block mt-0.5">
                  Gasto: R$ {metricas.totalDesembolsos.toLocaleString('pt-BR')} (
                  {metricas.percOrcamentoGasto}%)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium flex items-center justify-between">
                Prazos do Projeto
                <Calendar className="w-4 h-4 text-sky-600" />
              </span>
              <div className="mt-2 text-xs text-[#1A1D21] space-y-1">
                <div>
                  <span className="text-[#5B6470] font-medium">Início: </span>
                  <span className="font-bold">
                    {projeto.data_inicio
                      ? new Date(projeto.data_inicio).toLocaleDateString('pt-BR')
                      : 'Não definido'}
                  </span>
                </div>
                <div>
                  <span className="text-[#5B6470] font-medium">Término: </span>
                  <span className="font-bold">
                    {projeto.data_fim
                      ? new Date(projeto.data_fim).toLocaleDateString('pt-BR')
                      : 'Não definido'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium flex items-center justify-between">
                Equipe Alocada
                <Users className="w-4 h-4 text-amber-600" />
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#1A1D21]">{metricas.totalEquipe}</span>
                <span className="text-xs text-[#5B6470]">membros com funções</span>
              </div>
            </div>
          </div>

          {/* Duas Colunas: Visão de Fases + Equipe / Financeiro */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Coluna Esquerda: Fases Físicas em Timeline */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0F766E]" />
                    Linha do Tempo das Fases (Cronograma Físico)
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAbaAtiva('fases')}
                    className="text-xs text-[#0F766E] h-7 gap-1"
                  >
                    Gerenciar Fases
                  </Button>
                </div>

                <div className="space-y-3 pt-1">
                  {fases.map((f, idx) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: f.cor || '#0F766E' }}
                        />
                        <div>
                          <span className="text-xs font-bold text-[#1A1D21]">
                            #{idx + 1} - {f.nome}
                          </span>
                          <span className="text-[11px] text-[#5B6470] block">
                            {f.data_inicio
                              ? new Date(f.data_inicio).toLocaleDateString('pt-BR')
                              : 'Sem data'}{' '}
                            até{' '}
                            {f.data_fim
                              ? new Date(f.data_fim).toLocaleDateString('pt-BR')
                              : 'Sem data'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <Progress value={f.progresso || 0} className="h-1.5" />
                        </div>
                        <span className="text-xs font-bold text-[#1A1D21] w-10 text-right">
                          {f.progresso || 0}%
                        </span>
                        <Badge
                          className={`text-[10px] border-none font-semibold ${
                            f.status === 'concluida'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.status === 'em_andamento'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {f.status === 'concluida'
                            ? 'Concluída'
                            : f.status === 'em_andamento'
                              ? 'Em Andamento'
                              : 'A Iniciar'}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {fases.length === 0 && (
                    <div className="text-center py-6 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-lg">
                      Nenhuma fase cadastrada. Clique em "Fases & Progresso" para configurar.
                    </div>
                  )}
                </div>
              </div>

              {/* Demandas Abertas do Projeto */}
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#0F766E]" />
                    Demandas Vinculadas ao Projeto ({demandas.length})
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setModalNovaDemanda(true)}
                    className="text-xs text-[#0F766E] h-7 gap-1"
                  >
                    + Adicionar Demanda
                  </Button>
                </div>

                <div className="space-y-2">
                  {demandas.slice(0, 5).map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 rounded-lg border border-[#E5E1D8] bg-white flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            d.status === 'concluido' ? 'text-emerald-600' : 'text-zinc-300'
                          }`}
                        />
                        <span className="text-xs font-medium text-[#1A1D21] truncate">
                          {d.titulo}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold border-[#E5E1D8] shrink-0"
                      >
                        {d.prioridade}
                      </Badge>
                    </div>
                  ))}

                  {demandas.length === 0 && (
                    <div className="text-center py-6 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-lg">
                      Nenhuma demanda criada para este projeto ainda.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Equipe e Resumo Financeiro */}
            <div className="space-y-4">
              {/* Card Equipe */}
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0F766E]" />
                    Equipe do Projeto
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAbaAtiva('equipe')}
                    className="text-xs text-[#0F766E] h-7"
                  >
                    Ver Todos
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {equipe.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#1A1D21] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {(m.nome || m.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="truncate flex-1">
                        <span className="text-xs font-bold text-[#1A1D21] block truncate">
                          {m.nome || m.email}
                        </span>
                        <span className="text-[10px] text-[#0F766E] font-medium block truncate">
                          {m.funcao || 'Colaborador'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {equipe.length === 0 && (
                    <div className="text-xs text-[#5B6470] py-4 text-center">
                      Nenhum membro alocado.
                    </div>
                  )}
                </div>
              </div>

              {/* Card Resumo Investidores */}
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#0F766E]" />
                    Investidores & Sócios
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAbaAtiva('investidores')}
                    className="text-xs text-[#0F766E] h-7"
                  >
                    Ver Todos
                  </Button>
                </div>

                <div className="space-y-2">
                  {investidores.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-2 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8]/60 flex items-center justify-between text-xs"
                    >
                      <div className="truncate">
                        <span className="font-bold text-[#1A1D21] block truncate">{inv.nome}</span>
                        {inv.participacao_percentual ? (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {inv.participacao_percentual}% de participação
                          </span>
                        ) : null}
                      </div>
                      <span className="font-bold text-[#0F766E] shrink-0">
                        R$ {(inv.valor_investido || 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  ))}

                  {investidores.length === 0 && (
                    <div className="text-xs text-[#5B6470] py-4 text-center">
                      Nenhum investidor registrado.
                    </div>
                  )}
                </div>
              </div>

              {/* Contexto Resumido / Memória */}
              {projeto.contexto_resumido && (
                <div className="bg-[#0F766E]/5 p-4 rounded-xl border border-[#0F766E]/20 space-y-1.5">
                  <span className="text-xs font-bold text-[#0F766E] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Memória do Projeto & Contexto
                  </span>
                  <p className="text-xs text-[#1A1D21]/80 whitespace-pre-line leading-relaxed">
                    {projeto.contexto_resumido}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 2: FASES & PROGRESSO                                   */}
      {/* ========================================================== */}
      {abaAtiva === 'fases' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1D21]">Fases do Projeto</h3>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Gerencie as etapas de execução, ordens, cores e percentual de conclusão.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setModalNovaFase(true)}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Fase
              </Button>
            </div>

            <div className="space-y-3 pt-2">
              {fases.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5"
                      style={{ backgroundColor: f.cor || '#0F766E' }}
                    >
                      #{idx + 1}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1A1D21]">{f.nome}</span>
                        {f.is_conclusao && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] border-none font-bold">
                            Fase de Conclusão
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-[#5B6470] block">
                        Período:{' '}
                        {f.data_inicio
                          ? new Date(f.data_inicio).toLocaleDateString('pt-BR')
                          : 'Sem data'}{' '}
                        até{' '}
                        {f.data_fim ? new Date(f.data_fim).toLocaleDateString('pt-BR') : 'Sem data'}
                      </span>
                    </div>
                  </div>

                  {/* Controle de Conclusão / Slider de % */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-[#1A1D21]">{f.progresso || 0}%</span>
                      <div className="flex items-center gap-1">
                        {[0, 25, 50, 75, 100].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleAtualizarProgressoFase(f.id, v)}
                            className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                              (f.progresso || 0) === v
                                ? 'bg-[#0F766E] text-white'
                                : 'bg-white border border-[#E5E1D8] text-[#5B6470] hover:bg-[#E5E1D8]'
                            }`}
                          >
                            {v}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluirFase(f.id)}
                      className="text-zinc-400 hover:text-red-600 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {fases.length === 0 && (
                <div className="text-center py-12 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
                  Nenhuma fase definida. Clique em "Nova Fase" acima para criar as etapas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 3: EQUIPE DO PROJETO                                   */}
      {/* ========================================================== */}
      {abaAtiva === 'equipe' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1D21]">Equipe do Projeto</h3>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Membros alocados com atribuição da FUNÇÃO específica no projeto e permissões.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setModalNovoMembro(true)}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Incluir Membro / Convidar
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {equipe.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-9 h-9 rounded-full bg-[#1A1D21] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {(m.nome || m.email || '?')[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-[#1A1D21] block truncate">
                          {m.nome || m.email}
                        </span>
                        <span className="text-[11px] text-[#5B6470] block truncate">
                          {m.email || 'Sem e-mail'}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluirMembro(m.id)}
                      className="text-zinc-400 hover:text-red-600 h-7 w-7 p-0 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#5B6470] uppercase font-bold block">
                        Função no Projeto
                      </span>
                      <span className="text-xs font-bold text-[#0F766E] block">
                        {m.funcao || 'Colaborador Geral'}
                      </span>
                    </div>

                    <Badge variant="outline" className="text-[10px] capitalize border-[#E5E1D8]">
                      {m.nivel_acesso || 'Edição'}
                    </Badge>
                  </div>
                </div>
              ))}

              {equipe.length === 0 && (
                <div className="col-span-full text-center py-12 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
                  Nenhum membro vinculado ao projeto. Clique em "Incluir Membro / Convidar".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 4: CRONOGRAMA FÍSICO                                   */}
      {/* ========================================================== */}
      {abaAtiva === 'cronograma' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1D21]">Cronograma Físico de Entrega</h3>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Datas de cada fase física integradas ao módulo de Calendário com ícone próprio
                  Diamond.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/calendario')}
                className="text-xs border-[#E5E1D8] gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[#0F766E]" />
                Abrir no Calendário Geral
              </Button>
            </div>

            {/* Linha de Tempo com Barra Visual */}
            <div className="space-y-3 pt-2">
              {fases.map((f, idx) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: f.cor || '#0F766E' }}
                      />
                      <span className="text-xs font-bold text-[#1A1D21]">
                        Fase #{idx + 1}: {f.nome}
                      </span>
                    </div>

                    <span className="text-xs text-[#5B6470]">
                      {f.data_inicio
                        ? new Date(f.data_inicio).toLocaleDateString('pt-BR')
                        : 'Sem data'}{' '}
                      ➔ {f.data_fim ? new Date(f.data_fim).toLocaleDateString('pt-BR') : 'Sem data'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#5B6470]">
                      <span>Conclusão física desta etapa</span>
                      <span className="font-bold text-[#1A1D21]">{f.progresso || 0}%</span>
                    </div>
                    <Progress value={f.progresso || 0} className="h-2 bg-white" />
                  </div>
                </div>
              ))}

              {fases.length === 0 && (
                <div className="text-center py-12 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
                  Nenhuma fase com datas cadastradas para o cronograma físico.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalDesbloqueioPlano
        open={modalUpgradeOpen}
        onOpenChange={setModalUpgradeOpen}
        recursoNome="Módulo Finanças & Contabilidade"
        motivo="O controle financeiro e orçamentário detalhado por projeto faz parte do plano Pro comercial (R$ 197/mês) ou licença com Módulo Finanças ativo."
        stripePaymentLink={limites?.stripePaymentLink}
        precoMensalTexto={limites?.precoMensalTexto}
        isContaTeste={limites?.isContaTeste}
      />

      {/* ========================================================== */}
      {/* ABA 5: FINANCEIRO                                          */}
      {/* ========================================================== */}
      {abaAtiva === 'financeiro' && (
        <div className="space-y-4">
          {/* Indicadores Financeiros do Projeto */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium block">Orçamento Previsto</span>
              <span className="text-xl font-bold text-[#1A1D21] mt-1 block">
                R$ {metricas.orcamentoTotal.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium block">Total de Entradas</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block">
                R$ {metricas.totalEntradas.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium block">Desembolsos / Custos</span>
              <span className="text-xl font-bold text-rose-700 mt-1 block">
                R$ {metricas.totalDesembolsos.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-[#E5E1D8] bg-white shadow-2xs">
              <span className="text-xs text-[#5B6470] font-medium block">Saldo do Projeto</span>
              <span
                className={`text-xl font-bold mt-1 block ${
                  metricas.saldo >= 0 ? 'text-[#0F766E]' : 'text-rose-700'
                }`}
              >
                R$ {metricas.saldo.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1D21]">
                  Cronograma Financeiro & Desembolsos
                </h3>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Registro de entradas (receitas) e desembolsos (custos) vinculados a cada fase do
                  projeto.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (limites && !limites.moduloFinancasAtivo) {
                    setModalUpgradeOpen(true)
                    return
                  }
                  setModalNovoLancamento(true)
                }}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Lançamento
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              {financeiro.map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Badge
                      className={`text-[10px] uppercase font-bold border-none shrink-0 ${
                        l.tipo === 'entrada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {l.tipo}
                    </Badge>

                    <div className="truncate">
                      <span className="text-xs font-bold text-[#1A1D21] block truncate">
                        {l.descricao}
                      </span>
                      <span className="text-[11px] text-[#5B6470] block">
                        Data: {new Date(l.data).toLocaleDateString('pt-BR')}{' '}
                        {l.expand?.fase ? `• Fase: ${l.expand.fase.nome}` : ''} • Categoria:{' '}
                        {l.categoria_custo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-sm font-extrabold ${
                        l.tipo === 'entrada' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toLocaleString('pt-BR')}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluirLancamento(l.id)}
                      className="text-zinc-400 hover:text-red-600 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {financeiro.length === 0 && (
                <div className="text-center py-12 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
                  Nenhum lançamento financeiro registrado. Clique em "Novo Lançamento".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 6: INVESTIDORES                                        */}
      {/* ========================================================== */}
      {abaAtiva === 'investidores' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1D21]">Investidores & Participações</h3>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Registro de quem investe no projeto, montante aportado e percentual de
                  participação (equity).
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setModalNovoInvestidor(true)}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Investidor
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {investidores.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-[#E5E1D8] bg-[#FAFAF9] flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1A1D21]">{inv.nome}</span>
                        {inv.participacao_percentual ? (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-none">
                            {inv.participacao_percentual}%
                          </Badge>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-[#5B6470] block mt-0.5">
                        {inv.email || 'Sem e-mail'}
                      </span>
                      {inv.observacoes && (
                        <p className="text-[11px] text-[#5B6470] mt-1.5 italic line-clamp-2">
                          "{inv.observacoes}"
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluirInvestidor(inv.id)}
                      className="text-zinc-400 hover:text-red-600 h-7 w-7 p-0 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-[#E5E1D8]/60 flex items-center justify-between">
                    <span className="text-[10px] text-[#5B6470] uppercase font-bold">
                      Valor Aportado
                    </span>
                    <span className="text-sm font-extrabold text-[#0F766E]">
                      R$ {(inv.valor_investido || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}

              {investidores.length === 0 && (
                <div className="col-span-full text-center py-12 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
                  Nenhum investidor cadastrado no projeto. Clique em "Registrar Investidor".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 7: DEMANDAS                                            */}
      {/* ========================================================== */}
      {abaAtiva === 'demandas' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1D21]">Demandas do Projeto</h3>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Tarefas e entregáveis que já nascem vinculados a este projeto específico.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setModalNovaDemanda(true)}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Demanda
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              {demandas.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        d.status === 'concluido' ? 'text-emerald-600' : 'text-zinc-300'
                      }`}
                    />
                    <div className="truncate">
                      <span className="text-xs font-bold text-[#1A1D21] block truncate">
                        {d.titulo}
                      </span>
                      <span className="text-[11px] text-[#5B6470] block">
                        Status: <span className="capitalize">{d.status}</span> • Prioridade:{' '}
                        <span className="capitalize">{d.prioridade}</span>
                        {d.prazo
                          ? ` • Prazo: ${new Date(d.prazo).toLocaleDateString('pt-BR')}`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold border-[#E5E1D8] ${
                      d.prioridade === 'urgente'
                        ? 'text-rose-600 border-rose-300'
                        : 'text-[#5B6470]'
                    }`}
                  >
                    {d.prioridade}
                  </Badge>
                </div>
              ))}

              {demandas.length === 0 && (
                <div className="text-center py-12 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
                  Nenhuma demanda vinculada a este projeto.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* ABA 8: ARQUIVOS & ANEXOS                                  */}
      {/* ========================================================== */}
      {abaAtiva === 'arquivos' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A1D21]">
                  Arquivos & Documentos do Projeto
                </h3>
                <p className="text-xs text-[#5B6470] mt-0.5">
                  Anexos, propostas, contratos e documentos associados à pasta do projeto.
                </p>
              </div>

              <label className="cursor-pointer">
                <input type="file" onChange={handleUploadArquivo} className="hidden" />
                <Button
                  asChild
                  size="sm"
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1 font-semibold"
                >
                  <span>
                    <Upload className="w-3.5 h-3.5" />
                    Anexar Arquivo
                  </span>
                </Button>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {arquivos.map((arq) => (
                <div
                  key={arq.id}
                  className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-[#0F766E] shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-bold text-[#1A1D21] block truncate">
                        {arq.nome}
                      </span>
                      <span className="text-[10px] text-[#5B6470] block">Documento</span>
                    </div>
                  </div>

                  <a
                    href={`/api/files/arquivos/${arq.id}/${arq.arquivo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0F766E] hover:text-[#0D5C56] p-1"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}

              {arquivos.length === 0 && (
                <div className="col-span-full text-center py-12 text-xs text-[#5B6470] border border-dashed border-[#E5E1D8] rounded-xl">
                  Nenhum arquivo anexado a este projeto ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAIS AUXILIARES                                          */}
      {/* ========================================================== */}

      {/* Modal Nova Fase */}
      <Dialog open={modalNovaFase} onOpenChange={setModalNovaFase}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21]">
              Adicionar Nova Fase ao Projeto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Nome da Fase *</label>
              <Input
                placeholder="Ex: Homologação e Testes"
                value={novaFaseNome}
                onChange={(e) => setNovaFaseNome(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Data de Início</label>
                <Input
                  type="date"
                  value={novaFaseIni}
                  onChange={(e) => setNovaFaseIni(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Data de Término</label>
                <Input
                  type="date"
                  value={novaFaseFim}
                  onChange={(e) => setNovaFaseFim(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalNovaFase(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCriarFase}
                className="bg-[#0F766E] text-white text-xs"
              >
                Salvar Fase
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Membro */}
      <Dialog open={modalNovoMembro} onOpenChange={setModalNovoMembro}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21]">
              Incluir Membro com Função
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Nome Completo</label>
              <Input
                placeholder="Ex: Carlos Eduardo"
                value={novoMemNome}
                onChange={(e) => setNovoMemNome(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                E-mail para Acesso/Convite
              </label>
              <Input
                type="email"
                placeholder="carlos@empresa.com"
                value={novoMemEmail}
                onChange={(e) => setNovoMemEmail(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F766E]">Função no Projeto *</label>
              <Input
                placeholder="Ex: Coordenador, Técnico, Financeiro..."
                value={novoMemFuncao}
                onChange={(e) => setNovoMemFuncao(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Nível de Permissão</label>
              <Select
                value={novoMemAcesso}
                onValueChange={(v) => setNovoMemAcesso(v as NivelAcesso)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leitura">Leitura</SelectItem>
                  <SelectItem value="edicao">Edição</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs text-[#5B6470]">
              <input
                type="checkbox"
                id="checkConviteDet"
                checked={novoMemDispararConvite}
                onChange={(e) => setNovoMemDispararConvite(e.target.checked)}
                className="rounded text-[#0F766E]"
              />
              <label htmlFor="checkConviteDet" className="cursor-pointer">
                Disparar e-mail de convite com link de aceite agora
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalNovoMembro(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAdicionarMembro}
                className="bg-[#0F766E] text-white text-xs"
              >
                Salvar Membro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Investidor */}
      <Dialog open={modalNovoInvestidor} onOpenChange={setModalNovoInvestidor}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21]">
              Registrar Investidor / Sócio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Nome do Investidor *</label>
              <Input
                placeholder="Ex: Fundo Alpha Ventures"
                value={novoInvNome}
                onChange={(e) => setNovoInvNome(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">E-mail de Contato</label>
              <Input
                type="email"
                placeholder="contato@fundo.com"
                value={novoInvEmail}
                onChange={(e) => setNovoInvEmail(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Valor Investido (R$)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={novoInvValor || ''}
                  onChange={(e) => setNovoInvValor(Number(e.target.value))}
                  className="text-xs text-[#0F766E] font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Participação (%)</label>
                <Input
                  type="number"
                  placeholder="Ex: 15"
                  value={novoInvPerc || ''}
                  onChange={(e) => setNovoInvPerc(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Observações</label>
              <Input
                placeholder="Ex: Aporte para ampliação..."
                value={novoInvObs}
                onChange={(e) => setNovoInvObs(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalNovoInvestidor(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAdicionarInvestidor}
                className="bg-[#0F766E] text-white text-xs"
              >
                Salvar Investidor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Lançamento Financeiro */}
      <Dialog open={modalNovoLancamento} onOpenChange={setModalNovoLancamento}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21]">
              Registrar Lançamento Financeiro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Tipo</label>
                <Select
                  value={novoLancTipo}
                  onValueChange={(v) => setNovoLancTipo(v as 'entrada' | 'desembolso')}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada / Receita</SelectItem>
                    <SelectItem value="desembolso">Desembolso / Custo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Valor (R$)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={novoLancValor || ''}
                  onChange={(e) => setNovoLancValor(Number(e.target.value))}
                  className="text-xs font-semibold text-[#0F766E]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição *</label>
              <Input
                placeholder="Ex: Pagamento licença, Parcela contrato..."
                value={novoLancDesc}
                onChange={(e) => setNovoLancDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Data</label>
                <Input
                  type="date"
                  value={novoLancData}
                  onChange={(e) => setNovoLancData(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Vincular a Fase</label>
                <Select
                  value={novoLancFaseId || 'nenhuma'}
                  onValueChange={(v) => setNovoLancFaseId(v === 'nenhuma' ? '' : v)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Geral do Projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Geral do Projeto</SelectItem>
                    {fases.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalNovoLancamento(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleAdicionarLancamento}
                className="bg-[#0F766E] text-white text-xs"
              >
                Salvar Lançamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Demanda */}
      <Dialog open={modalNovaDemanda} onOpenChange={setModalNovaDemanda}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21]">
              Criar Nova Demanda para o Projeto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Título da Demanda *</label>
              <Input
                placeholder="Ex: Entregar especificação do checkout"
                value={novaDemTitulo}
                onChange={(e) => setNovaDemTitulo(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Descrição Detalhada</label>
              <Textarea
                rows={2}
                placeholder="Detalhes ou checklist de entrega..."
                value={novaDemDesc}
                onChange={(e) => setNovaDemDesc(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prioridade</label>
                <Select
                  value={novaDemPrioridade}
                  onValueChange={(v) =>
                    setNovaDemPrioridade(v as 'baixa' | 'media' | 'alta' | 'urgente')
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prazo Final</label>
                <Input
                  type="date"
                  value={novaDemPrazo}
                  onChange={(e) => setNovaDemPrazo(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalNovaDemanda(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCriarDemanda}
                className="bg-[#0F766E] text-white text-xs"
              >
                Criar Demanda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
