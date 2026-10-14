import React, { useState } from 'react'
import { diamondApi } from '@/services/diamondApi'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import type { ProjetoTipo, ProjetoStatus, NivelAcesso } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  FolderKanban,
  Users,
  Layers,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Mail,
  UserCheck,
  Send,
  Building,
  Sparkles,
  AlertCircle,
  Clock,
  Shield,
  HelpCircle,
} from 'lucide-react'

export interface MembroConfigItem {
  id: string
  nome: string
  email: string
  funcao: string
  nivel_acesso: NivelAcesso
  enviarConvite: boolean
}

export interface FaseConfigItem {
  id: string
  nome: string
  ordem: number
  cor: string
  data_inicio: string
  data_fim: string
  progresso: number
  is_conclusao: boolean
}

export interface InvestidorConfigItem {
  id: string
  nome: string
  email: string
  telefone: string
  valor_investido: number
  participacao_percentual: number
  data_aporte: string
  observacoes: string
}

export interface LancamentoConfigItem {
  id: string
  tipo: 'entrada' | 'desembolso'
  valor: number
  data: string
  descricao: string
  faseTempId?: string
  faseNome?: string
  categoria_custo: string
  status: 'previsto' | 'realizado'
}

interface ModalNovoProjetoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjetoCriado?: (projetoId: string) => void
}

type EtapaWizard =
  | 'dados_basicos'
  | 'equipe'
  | 'fases'
  | 'cronograma'
  | 'financeiro'
  | 'investidores'
  | 'confirmacao'

const ETAPAS_CONFIG: {
  id: EtapaWizard
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'dados_basicos', label: '1. Dados Básicos', icon: FolderKanban },
  { id: 'equipe', label: '2. Equipe & Funções', icon: Users },
  { id: 'fases', label: '3. Fases & Modelos', icon: Layers },
  { id: 'cronograma', label: '4. Cronograma Físico', icon: Calendar },
  { id: 'financeiro', label: '5. Financeiro', icon: DollarSign },
  { id: 'investidores', label: '6. Investidores', icon: TrendingUp },
  { id: 'confirmacao', label: '7. Resumo & Criar', icon: CheckCircle2 },
]

// Modelos prontos de fases para projetos
const MODELOS_FASES_PROJETO = [
  {
    id: 'diamond_padrao',
    nome: 'DiamondGroup Padrão (5 Fases)',
    desc: 'Backlog → A Fazer → Fazendo → Conferir → Finalizado',
    fases: [
      {
        nome: 'Backlog & Alinhamento',
        cor: '#64748B',
        is_conclusao: false,
        diasOffset: 0,
        duracaoDias: 10,
      },
      {
        nome: 'A Fazer (Arquitetura & Especificação)',
        cor: '#0EA5E9',
        is_conclusao: false,
        diasOffset: 10,
        duracaoDias: 15,
      },
      {
        nome: 'Fazendo (Execução Técnica)',
        cor: '#F59E0B',
        is_conclusao: false,
        diasOffset: 25,
        duracaoDias: 25,
      },
      {
        nome: 'Conferir (Homologação & Qualidade)',
        cor: '#8B5CF6',
        is_conclusao: false,
        diasOffset: 50,
        duracaoDias: 15,
      },
      {
        nome: 'Finalizado (Entrega & Fechamento)',
        cor: '#10B981',
        is_conclusao: true,
        diasOffset: 65,
        duracaoDias: 10,
      },
    ],
  },
  {
    id: 'operacao_tecnica',
    nome: 'Operação Técnica Diamond',
    desc: 'BACKLOG → ENCAMINHAR AO TÉCNICO → EM ANÁLISE → EM DESENVOLVIMENTO → TÉRMINO',
    fases: [
      { nome: 'BACKLOG', cor: '#64748B', is_conclusao: false, diasOffset: 0, duracaoDias: 7 },
      {
        nome: 'ENCAMINHAR AO TÉCNICO',
        cor: '#0EA5E9',
        is_conclusao: false,
        diasOffset: 7,
        duracaoDias: 14,
      },
      { nome: 'EM ANÁLISE', cor: '#F59E0B', is_conclusao: false, diasOffset: 21, duracaoDias: 14 },
      {
        nome: 'EM DESENVOLVIMENTO',
        cor: '#8B5CF6',
        is_conclusao: false,
        diasOffset: 35,
        duracaoDias: 30,
      },
      {
        nome: 'TÉRMINO & ACEITE',
        cor: '#10B981',
        is_conclusao: true,
        diasOffset: 65,
        duracaoDias: 10,
      },
    ],
  },
  {
    id: 'fluxo_agil',
    nome: 'Fluxo Ágil Simples (3 Fases)',
    desc: 'Planejamento / A Fazer → Em Andamento → Entregue',
    fases: [
      {
        nome: 'Planejamento & A Fazer',
        cor: '#0EA5E9',
        is_conclusao: false,
        diasOffset: 0,
        duracaoDias: 14,
      },
      {
        nome: 'Em Andamento',
        cor: '#F59E0B',
        is_conclusao: false,
        diasOffset: 14,
        duracaoDias: 30,
      },
      {
        nome: 'Entregue & Concluído',
        cor: '#10B981',
        is_conclusao: true,
        diasOffset: 44,
        duracaoDias: 14,
      },
    ],
  },
  {
    id: 'personalizado',
    nome: 'Personalizado do Zero',
    desc: 'Defina suas próprias etapas, prazos e cores sob medida',
    fases: [
      { nome: 'Fase Inicial', cor: '#0F766E', is_conclusao: false, diasOffset: 0, duracaoDias: 30 },
    ],
  },
]

export default function ModalNovoProjeto({
  open,
  onOpenChange,
  onProjetoCriado,
}: ModalNovoProjetoProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { clientes, membrosEquipe, recarregarDadosGlobais } = useNavegacao()

  const [etapaAtual, setEtapaAtual] = useState<EtapaWizard>('dados_basicos')
  const [salvando, setSalvando] = useState(false)

  // 1. Dados Básicos
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<ProjetoTipo>('cliente')
  const [clienteId, setClienteId] = useState<string>('')
  const [cor, setCor] = useState('#0F766E')
  const [contextoResumido, setContextoResumido] = useState('')
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().split('T')[0])
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().split('T')[0]
  })
  const [orcamentoTotal, setOrcamentoTotal] = useState<number>(0)

  // 2. Equipe
  const [equipeLista, setEquipeLista] = useState<MembroConfigItem[]>([])
  const [novoMembroNome, setNovoMembroNome] = useState('')
  const [novoMembroEmail, setNovoMembroEmail] = useState('')
  const [novoMembroFuncao, setNovoMembroFuncao] = useState('Líder Técnico')
  const [novoMembroAcesso, setNovoMembroAcesso] = useState<NivelAcesso>('edicao')
  const [novoMembroConvidarEmail, setNovoMembroConvidarEmail] = useState(true)

  // 3. Fases
  const [modeloSelecionado, setModeloSelecionado] = useState('diamond_padrao')
  const [fasesLista, setFasesLista] = useState<FaseConfigItem[]>([])
  const [novaFaseNome, setNovaFaseNome] = useState('')
  const [novaFaseCor, setNovaFaseCor] = useState('#0F766E')

  // 5. Financeiro
  const [lancamentosLista, setLancamentosLista] = useState<LancamentoConfigItem[]>([])
  const [novoLancTipo, setNovoLancTipo] = useState<'entrada' | 'desembolso'>('entrada')
  const [novoLancValor, setNovoLancValor] = useState<number>(0)
  const [novoLancDesc, setNovoLancDesc] = useState('')
  const [novoLancData, setNovoLancData] = useState(() => new Date().toISOString().split('T')[0])
  const [novoLancFaseId, setNovoLancFaseId] = useState('')
  const [novoLancCat, setNovoLancCat] = useState('contrato')

  // 6. Investidores
  const [investidoresLista, setInvestidoresLista] = useState<InvestidorConfigItem[]>([])
  const [novoInvNome, setNovoInvNome] = useState('')
  const [novoInvEmail, setNovoInvEmail] = useState('')
  const [novoInvValor, setNovoInvValor] = useState<number>(0)
  const [novoInvPerc, setNovoInvPerc] = useState<number>(0)
  const [novoInvObs, setNovoInvObs] = useState('')

  // Ao abrir o modal, inicializar fases com modelo padrão caso vazio
  React.useEffect(() => {
    if (open) {
      setEtapaAtual('dados_basicos')
      aplicarModeloFases('diamond_padrao', dataInicio)
      // Adicionar usuário atual como Coordenador se a lista estiver vazia
      if (equipeLista.length === 0 && user) {
        setEquipeLista([
          {
            id: 'membro_admin',
            nome: user.name || 'Marcos Chagas Diamond',
            email: user.email,
            funcao: 'Coordenador do Projeto & Estrategista',
            nivel_acesso: 'admin',
            enviarConvite: false,
          },
        ])
      }
    }
  }, [open, user])

  // Aplicar modelo pronto de fases
  const aplicarModeloFases = (modeloId: string, dtIni: string) => {
    const mod = MODELOS_FASES_PROJETO.find((m) => m.id === modeloId)
    if (!mod) return

    const baseDate = dtIni ? new Date(dtIni + 'T00:00:00') : new Date()

    const novas = mod.fases.map((f, idx) => {
      const dtFaseIni = new Date(baseDate)
      dtFaseIni.setDate(baseDate.getDate() + (f.diasOffset || 0))
      const dtFaseFim = new Date(dtFaseIni)
      dtFaseFim.setDate(dtFaseIni.getDate() + (f.duracaoDias || 15))

      return {
        id: `fase_${idx + 1}_${Math.random().toString(36).slice(2, 6)}`,
        nome: f.nome,
        ordem: idx + 1,
        cor: f.cor,
        data_inicio: dtFaseIni.toISOString().split('T')[0],
        data_fim: dtFaseFim.toISOString().split('T')[0],
        progresso: 0,
        is_conclusao: f.is_conclusao,
      }
    })

    setFasesLista(novas)
    setModeloSelecionado(modeloId)
  }

  // Adicionar Membro
  const handleAdicionarMembro = () => {
    if (!novoMembroNome.trim() && !novoMembroEmail.trim()) {
      toast({ title: 'Informe o nome ou e-mail do membro', variant: 'destructive' })
      return
    }

    const item: MembroConfigItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      nome: novoMembroNome.trim() || novoMembroEmail.split('@')[0],
      email: novoMembroEmail.trim().toLowerCase(),
      funcao: novoMembroFuncao.trim() || 'Colaborador',
      nivel_acesso: novoMembroAcesso,
      enviarConvite: novoMembroConvidarEmail && !!novoMembroEmail.trim(),
    }

    setEquipeLista((prev) => [...prev, item])
    setNovoMembroNome('')
    setNovoMembroEmail('')
    setNovoMembroFuncao('Técnico Responsável')
    toast({ title: 'Membro incluído no projeto!' })
  }

  const handleRemoverMembro = (id: string) => {
    setEquipeLista((prev) => prev.filter((m) => m.id !== id))
  }

  // Adicionar Fase Personalizada
  const handleAdicionarFase = () => {
    if (!novaFaseNome.trim()) return
    const novaOrdem = fasesLista.length + 1
    const ultFase = fasesLista[fasesLista.length - 1]
    const dtIni = ultFase ? ultFase.data_fim : dataInicio
    const dIniObj = new Date(dtIni + 'T00:00:00')
    const dFimObj = new Date(dIniObj)
    dFimObj.setDate(dIniObj.getDate() + 15)

    const nova: FaseConfigItem = {
      id: `fase_${Date.now()}`,
      nome: novaFaseNome.trim(),
      ordem: novaOrdem,
      cor: novaFaseCor,
      data_inicio: dtIni,
      data_fim: dFimObj.toISOString().split('T')[0],
      progresso: 0,
      is_conclusao: false,
    }
    setFasesLista((prev) => [...prev, nova])
    setNovaFaseNome('')
  }

  const handleRemoverFase = (id: string) => {
    setFasesLista((prev) => prev.filter((f) => f.id !== id))
  }

  const handleAtualizarFase = (id: string, campo: keyof FaseConfigItem, valor: unknown) => {
    setFasesLista((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  }

  // Adicionar Lançamento Financeiro
  const handleAdicionarLancamento = () => {
    if (!novoLancDesc.trim() || novoLancValor <= 0) {
      toast({ title: 'Preencha a descrição e um valor maior que zero', variant: 'destructive' })
      return
    }

    const faseObj = fasesLista.find((f) => f.id === novoLancFaseId)

    const lanc: LancamentoConfigItem = {
      id: `lanc_${Date.now()}`,
      tipo: novoLancTipo,
      valor: novoLancValor,
      data: novoLancData,
      descricao: novoLancDesc.trim(),
      faseTempId: novoLancFaseId || undefined,
      faseNome: faseObj?.nome,
      categoria_custo: novoLancCat,
      status: 'realizado',
    }

    setLancamentosLista((prev) => [...prev, lanc])
    setNovoLancDesc('')
    setNovoLancValor(0)
    toast({ title: 'Lançamento registrado!' })
  }

  const handleRemoverLancamento = (id: string) => {
    setLancamentosLista((prev) => prev.filter((l) => l.id !== id))
  }

  // Adicionar Investidor
  const handleAdicionarInvestidor = () => {
    if (!novoInvNome.trim()) {
      toast({ title: 'Informe o nome do investidor', variant: 'destructive' })
      return
    }

    const inv: InvestidorConfigItem = {
      id: `inv_${Date.now()}`,
      nome: novoInvNome.trim(),
      email: novoInvEmail.trim(),
      telefone: '',
      valor_investido: novoInvValor,
      participacao_percentual: novoInvPerc,
      data_aporte: dataInicio,
      observacoes: novoInvObs.trim(),
    }

    setInvestidoresLista((prev) => [...prev, inv])
    setNovoInvNome('')
    setNovoInvEmail('')
    setNovoInvValor(0)
    setNovoInvPerc(0)
    setNovoInvObs('')
    toast({ title: 'Investidor adicionado ao projeto!' })
  }

  const handleRemoverInvestidor = (id: string) => {
    setInvestidoresLista((prev) => prev.filter((i) => i.id !== id))
  }

  // Validação ao avançar
  const handleAvancar = () => {
    if (etapaAtual === 'dados_basicos') {
      if (!nome.trim()) {
        toast({ title: 'Informe o nome do projeto', variant: 'destructive' })
        return
      }
      setEtapaAtual('equipe')
    } else if (etapaAtual === 'equipe') {
      setEtapaAtual('fases')
    } else if (etapaAtual === 'fases') {
      if (fasesLista.length === 0) {
        toast({ title: 'Defina ao menos uma fase para o projeto', variant: 'destructive' })
        return
      }
      setEtapaAtual('cronograma')
    } else if (etapaAtual === 'cronograma') {
      setEtapaAtual('financeiro')
    } else if (etapaAtual === 'financeiro') {
      setEtapaAtual('investidores')
    } else if (etapaAtual === 'investidores') {
      setEtapaAtual('confirmacao')
    }
  }

  const handleVoltar = () => {
    const idx = ETAPAS_CONFIG.findIndex((e) => e.id === etapaAtual)
    if (idx > 0) {
      setEtapaAtual(ETAPAS_CONFIG[idx - 1].id)
    }
  }

  // SUBMETER E CRIAR PROJETO COMPLETO NO BACKEND
  const handleCriarProjetoCompleto = async () => {
    if (!nome.trim()) return
    setSalvando(true)

    try {
      // 1. Criar pasta raiz de arquivos
      const pasta = await diamondApi.createPasta({ nome: `${nome.trim()} - Arquivos` })

      // 2. Criar Projeto
      const novoProj = await diamondApi.createProjeto({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        tipo,
        status: 'ativo' as ProjetoStatus,
        pasta_raiz: pasta.id,
        contexto_resumido: contextoResumido.trim() || undefined,
        cliente: clienteId || undefined,
        data_inicio: dataInicio ? `${dataInicio} 00:00:00.000Z` : undefined,
        data_fim: dataFim ? `${dataFim} 00:00:00.000Z` : undefined,
        orcamento_total: Number(orcamentoTotal) || 0,
        cor: cor || '#0F766E',
        responsavel: user?.id,
      })

      // 3. Criar Fases e manter mapa de IDs criados
      const mapaFasesId: Record<string, string> = {}
      for (const f of fasesLista) {
        try {
          const recFase = await diamondApi.createProjetoFase({
            projeto: novoProj.id,
            nome: f.nome,
            ordem: f.ordem,
            cor: f.cor,
            data_inicio: f.data_inicio ? `${f.data_inicio} 00:00:00.000Z` : undefined,
            data_fim: f.data_fim ? `${f.data_fim} 00:00:00.000Z` : undefined,
            progresso: Number(f.progresso) || 0,
            status:
              Number(f.progresso) === 100
                ? 'concluida'
                : Number(f.progresso) > 0
                  ? 'em_andamento'
                  : 'nao_iniciada',
            is_conclusao: f.is_conclusao,
          })
          mapaFasesId[f.id] = recFase.id
        } catch (errFase) {
          console.error('Erro ao criar fase:', errFase)
        }
      }

      // 4. Criar Equipe do Projeto + disparar convites por e-mail se solicitado
      for (const m of equipeLista) {
        try {
          await diamondApi.createProjetoEquipeMembro({
            projeto: novoProj.id,
            nome: m.nome,
            email: m.email,
            funcao: m.funcao,
            nivel_acesso: m.nivel_acesso,
            status: 'ativo',
            usuario: m.email === user?.email ? user?.id : undefined,
          })

          // Se marcou para convidar por e-mail
          if (m.enviarConvite && m.email && m.email !== user?.email) {
            await diamondApi.criarConvite({
              email: m.email,
              escopo_tipo: 'projeto',
              escopo_id: novoProj.id,
              escopo_nome: novoProj.nome,
              nivel_acesso: m.nivel_acesso,
              mensagem: `Você foi incluído na equipe do projeto "${novoProj.nome}" com a função de ${m.funcao}.`,
              convidado_por: user?.id,
            })
          }
        } catch (errEq) {
          console.error('Erro ao criar membro da equipe:', errEq)
        }
      }

      // 5. Criar Investidores
      for (const inv of investidoresLista) {
        try {
          await diamondApi.createProjetoInvestidor({
            projeto: novoProj.id,
            nome: inv.nome,
            email: inv.email || undefined,
            telefone: inv.telefone || undefined,
            valor_investido: Number(inv.valor_investido) || 0,
            participacao_percentual: Number(inv.participacao_percentual) || 0,
            data_aporte: inv.data_aporte ? `${inv.data_aporte} 00:00:00.000Z` : undefined,
            observacoes: inv.observacoes || undefined,
          })
        } catch (errInv) {
          console.error('Erro ao registrar investidor:', errInv)
        }
      }

      // 6. Criar Lançamentos Financeiros vinculados às fases
      for (const l of lancamentosLista) {
        try {
          const faseRealId = l.faseTempId ? mapaFasesId[l.faseTempId] : undefined
          await diamondApi.createProjetoFinanceiro({
            projeto: novoProj.id,
            tipo: l.tipo,
            valor: Number(l.valor) || 0,
            data: l.data ? `${l.data} 00:00:00.000Z` : undefined,
            descricao: l.descricao,
            fase: faseRealId,
            categoria_custo: l.categoria_custo || 'geral',
            status: l.status,
          })
        } catch (errFin) {
          console.error('Erro ao registrar financeiro:', errFin)
        }
      }

      await recarregarDadosGlobais()

      toast({
        title: 'Projeto configurado e criado com sucesso!',
        description: `O projeto "${novoProj.nome}" foi inicializado com todas as fases, equipe e controles.`,
      })

      onOpenChange(false)
      if (onProjetoCriado) {
        onProjetoCriado(novoProj.id)
      }
    } catch (err) {
      toast({
        title: 'Erro ao criar projeto',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Cálculos de resumo
  const totalEntradas = lancamentosLista
    .filter((l) => l.tipo === 'entrada')
    .reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
  const totalDesembolsos = lancamentosLista
    .filter((l) => l.tipo === 'desembolso')
    .reduce((acc, l) => acc + (Number(l.valor) || 0), 0)
  const totalInvestido = investidoresLista.reduce(
    (acc, i) => acc + (Number(i.valor_investido) || 0),
    0,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-white border border-[#E5E1D8] overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Header com Stepper */}
        <div className="bg-[#1A1D21] text-white p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-sm">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight">
                  Criar Novo Projeto & Negócio
                </DialogTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure equipe com funções, fases, cronograma físico e financeiro integrado.
                </p>
              </div>
            </div>
            <Badge className="bg-[#0F766E]/20 text-[#2DD4BF] border border-[#0F766E]/30 text-xs px-2.5 py-1">
              Wizard DiamondGroup
            </Badge>
          </div>

          {/* Stepper Horizontal */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1 text-xs">
            {ETAPAS_CONFIG.map((etp, idx) => {
              const Icone = etp.icon
              const isAtivo = etapaAtual === etp.id
              const indexAtual = ETAPAS_CONFIG.findIndex((e) => e.id === etapaAtual)
              const isPassado = idx < indexAtual

              return (
                <button
                  key={etp.id}
                  type="button"
                  onClick={() => {
                    // Permite navegar livremente para etapas já passadas ou ativas
                    if (idx <= indexAtual || (nome.trim() && idx <= indexAtual + 1)) {
                      setEtapaAtual(etp.id)
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 transition-all ${
                    isAtivo
                      ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                      : isPassado
                        ? 'bg-white/10 text-emerald-400 hover:bg-white/15'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" />
                  <span>{etp.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Corpo do Wizard com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#FAFAF9]/40">
          {/* ========================================================== */}
          {/* ETAPA 1: DADOS BÁSICOS                                     */}
          {/* ========================================================== */}
          {etapaAtual === 'dados_basicos' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-[#0F766E]" />
                  Informações Fundamentais
                </h3>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1A1D21]">Nome do Projeto *</label>
                  <Input
                    required
                    placeholder="Ex: Expansão E-commerce Loja Y"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="text-sm border-[#E5E1D8] bg-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5B6470]">Tipo de Projeto</label>
                    <Select value={tipo} onValueChange={(v) => setTipo(v as ProjetoTipo)}>
                      <SelectTrigger className="text-xs border-[#E5E1D8] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="negocio">Negócio Próprio</SelectItem>
                        <SelectItem value="posicionamento">Posicionamento</SelectItem>
                        <SelectItem value="precos">Preços & Tabelas</SelectItem>
                        <SelectItem value="devices">Projetos de Devices</SelectItem>
                        <SelectItem value="estudo">Estudos & Pesquisas</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5B6470]">Cliente Vinculado</label>
                    <Select
                      value={clienteId || 'nenhum'}
                      onValueChange={(v) => setClienteId(v === 'nenhum' ? '' : v)}
                    >
                      <SelectTrigger className="text-xs border-[#E5E1D8] bg-white">
                        <SelectValue placeholder="Selecione um cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Nenhum / Interno</SelectItem>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} {c.empresa ? `(${c.empresa})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5B6470]">Data de Início</label>
                    <Input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => {
                        setDataInicio(e.target.value)
                        aplicarModeloFases(modeloSelecionado, e.target.value)
                      }}
                      className="text-xs border-[#E5E1D8] bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5B6470]">Previsão de Término</label>
                    <Input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="text-xs border-[#E5E1D8] bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#5B6470]">Orçamento Total (R$)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={orcamentoTotal || ''}
                      onChange={(e) => setOrcamentoTotal(Number(e.target.value))}
                      className="text-xs border-[#E5E1D8] bg-white font-semibold text-[#0F766E]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#5B6470]">Cor de Identificação</label>
                  <div className="flex items-center gap-2">
                    {[
                      '#0F766E',
                      '#0EA5E9',
                      '#8B5CF6',
                      '#F59E0B',
                      '#10B981',
                      '#E11D48',
                      '#3B82F6',
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          cor === c ? 'scale-125 ring-2 ring-offset-2 ring-zinc-800' : ''
                        }`}
                      />
                    ))}
                    <span className="text-xs font-mono text-[#5B6470] ml-2">{cor}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#5B6470]">Descrição Geral</label>
                  <Textarea
                    rows={2}
                    placeholder="Objetivo, escopo principal e diretrizes do projeto..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="text-xs border-[#E5E1D8] bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0F766E] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Memória Inicial & Contexto Histórico
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Decisões prévias, acordos com stakeholders, diretrizes que a IA Diamond deve respeitar..."
                    value={contextoResumido}
                    onChange={(e) => setContextoResumido(e.target.value)}
                    className="text-xs border-[#E5E1D8] bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ETAPA 2: EQUIPE DO PROJETO COM FUNÇÕES                     */}
          {/* ========================================================== */}
          {etapaAtual === 'equipe' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#0F766E]" />
                      Equipe do Projeto & Funções Dedicadas
                    </h3>
                    <p className="text-xs text-[#5B6470] mt-0.5">
                      Defina quem atua no projeto e a FUNÇÃO exata de cada um (coordenador, técnico,
                      financeiro, etc.).
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs border-[#0F766E] text-[#0F766E]">
                    {equipeLista.length} Membro(s)
                  </Badge>
                </div>

                {/* Formulário de Adicionar Membro */}
                <div className="p-3.5 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] space-y-3">
                  <span className="text-xs font-bold text-[#1A1D21] block">
                    + Incluir Colaborador na Equipe
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#5B6470]">
                        Nome Completo
                      </label>
                      <Input
                        placeholder="Ex: Carlos Eduardo"
                        value={novoMembroNome}
                        onChange={(e) => setNovoMembroNome(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#5B6470]">
                        E-mail para Convite
                      </label>
                      <Input
                        type="email"
                        placeholder="carlos@empresa.com"
                        value={novoMembroEmail}
                        onChange={(e) => setNovoMembroEmail(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#0F766E] font-bold">
                        Função no Projeto *
                      </label>
                      <Input
                        placeholder="Ex: Coordenador, Técnico, Financeiro..."
                        value={novoMembroFuncao}
                        onChange={(e) => setNovoMembroFuncao(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8] font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#5B6470]">
                        Nível de Acesso
                      </label>
                      <Select
                        value={novoMembroAcesso}
                        onValueChange={(v) => setNovoMembroAcesso(v as NivelAcesso)}
                      >
                        <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="leitura">Somente Leitura</SelectItem>
                          <SelectItem value="edicao">Edição (Colaborador)</SelectItem>
                          <SelectItem value="admin">Administrador do Projeto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <Button
                        type="button"
                        onClick={handleAdicionarMembro}
                        className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 gap-1 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar à Lista
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs text-[#5B6470]">
                    <input
                      type="checkbox"
                      id="checkConvite"
                      checked={novoMembroConvidarEmail}
                      onChange={(e) => setNovoMembroConvidarEmail(e.target.checked)}
                      className="rounded text-[#0F766E] border-[#E5E1D8]"
                    />
                    <label htmlFor="checkConvite" className="cursor-pointer">
                      Disparar e-mail de convite com link de acesso dedicado ao salvar o projeto
                    </label>
                  </div>
                </div>

                {/* Lista de Membros Adicionados */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-[#5B6470] uppercase tracking-wider block">
                    Integrantes Selecionados ({equipeLista.length})
                  </span>

                  {equipeLista.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-white flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-full bg-[#1A1D21] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {mem.nome[0] || mem.email[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A1D21] truncate">
                              {mem.nome}
                            </span>
                            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[10px] font-semibold">
                              {mem.funcao}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-[#5B6470] block truncate">
                            {mem.email || 'Sem e-mail'} • Permissão:{' '}
                            <span className="capitalize">{mem.nivel_acesso}</span>
                            {mem.enviarConvite && (
                              <span className="text-[#0F766E] ml-2 font-medium">
                                • Enviará convite
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverMembro(mem.id)}
                        className="text-zinc-400 hover:text-red-600 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}

                  {equipeLista.length === 0 && (
                    <div className="text-center py-6 text-xs text-[#5B6470] bg-[#FAFAF9] rounded-lg border border-dashed border-[#E5E1D8]">
                      Nenhum membro adicionado ainda. Preencha os campos acima.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ETAPA 3: FASES DO PROJETO COM MODELOS PRONTOS              */}
          {/* ========================================================== */}
          {etapaAtual === 'fases' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#0F766E]" />
                      Fases do Projeto & Modelos Prontos
                    </h3>
                    <p className="text-xs text-[#5B6470] mt-0.5">
                      Escolha um modelo pronto ou personalize as etapas de entrega do seu projeto.
                    </p>
                  </div>
                </div>

                {/* Seleção de Modelos Prontos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MODELOS_FASES_PROJETO.map((mod) => {
                    const isSel = modeloSelecionado === mod.id
                    return (
                      <div
                        key={mod.id}
                        onClick={() => aplicarModeloFases(mod.id, dataInicio)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSel
                            ? 'border-[#0F766E] bg-[#0F766E]/5 ring-1 ring-[#0F766E]'
                            : 'border-[#E5E1D8] bg-white hover:bg-[#FAFAF9]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1A1D21]">{mod.nome}</span>
                          {isSel && (
                            <Badge className="bg-[#0F766E] text-white text-[10px] py-0">
                              Ativo
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5B6470] mt-1 line-clamp-2">{mod.desc}</p>
                      </div>
                    )
                  })}
                </div>

                {/* Fases Atuais Editáveis */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5B6470] uppercase tracking-wider">
                      Fases Definidas ({fasesLista.length})
                    </span>
                    <span className="text-[11px] text-[#5B6470]">
                      Você pode editar nomes e cores ou adicionar etapas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {fasesLista.map((fase, idx) => (
                      <div
                        key={fase.id}
                        className="p-2.5 rounded-lg border border-[#E5E1D8] bg-white flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-bold text-[#5B6470] w-5 text-center">
                            #{idx + 1}
                          </span>
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: fase.cor }}
                          />
                          <Input
                            value={fase.nome}
                            onChange={(e) => handleAtualizarFase(fase.id, 'nome', e.target.value)}
                            className="text-xs h-8 border-[#E5E1D8] flex-1 font-medium"
                          />
                          {fase.is_conclusao && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] shrink-0">
                              Fase de Conclusão
                            </Badge>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverFase(fase.id)}
                          className="text-zinc-400 hover:text-red-600 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar nova fase */}
                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      placeholder="Nome de nova fase personalizada..."
                      value={novaFaseNome}
                      onChange={(e) => setNovaFaseNome(e.target.value)}
                      className="text-xs border-[#E5E1D8] bg-white h-8 flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdicionarFase}
                      className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar Fase
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ETAPA 4: CRONOGRAMA FÍSICO COM DATAS                       */}
          {/* ========================================================== */}
          {etapaAtual === 'cronograma' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#0F766E]" />
                      Cronograma Físico por Fase
                    </h3>
                    <p className="text-xs text-[#5B6470] mt-0.5">
                      Datas de início e término de cada fase. Integradas diretamente ao Calendário
                      Diamond.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs border-[#0F766E] text-[#0F766E] gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Sincronizado
                  </Badge>
                </div>

                <div className="space-y-3">
                  {fasesLista.map((fase, idx) => (
                    <div
                      key={fase.id}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: fase.cor }}
                          />
                          <span className="text-xs font-bold text-[#1A1D21]">
                            #{idx + 1} - {fase.nome}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5B6470]">
                          Progresso Inicial: {fase.progresso}%
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#5B6470]">
                            Início da Fase
                          </label>
                          <Input
                            type="date"
                            value={fase.data_inicio}
                            onChange={(e) =>
                              handleAtualizarFase(fase.id, 'data_inicio', e.target.value)
                            }
                            className="text-xs bg-white border-[#E5E1D8] h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#5B6470]">
                            Término da Fase
                          </label>
                          <Input
                            type="date"
                            value={fase.data_fim}
                            onChange={(e) =>
                              handleAtualizarFase(fase.id, 'data_fim', e.target.value)
                            }
                            className="text-xs bg-white border-[#E5E1D8] h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#5B6470]">
                            % Conclusão
                          </label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={fase.progresso}
                            onChange={(e) =>
                              handleAtualizarFase(fase.id, 'progresso', Number(e.target.value))
                            }
                            className="text-xs bg-white border-[#E5E1D8] h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ETAPA 5: CRONOGRAMA FINANCEIRO                             */}
          {/* ========================================================== */}
          {etapaAtual === 'financeiro' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#0F766E]" />
                      Cronograma Financeiro & Desembolsos
                    </h3>
                    <p className="text-xs text-[#5B6470] mt-0.5">
                      Orçamento total, receitas previstas e desembolsos vinculados a cada fase.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#5B6470] block uppercase font-bold">
                      Orçamento Total
                    </span>
                    <span className="text-sm font-extrabold text-[#0F766E]">
                      R$ {orcamentoTotal ? orcamentoTotal.toLocaleString('pt-BR') : '0,00'}
                    </span>
                  </div>
                </div>

                {/* Formulário de Lançamento Financeiro */}
                <div className="p-3.5 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] space-y-3">
                  <span className="text-xs font-bold text-[#1A1D21] block">
                    + Registrar Lançamento Financeiro Inicial
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">Tipo</label>
                      <Select
                        value={novoLancTipo}
                        onValueChange={(v) => setNovoLancTipo(v as 'entrada' | 'desembolso')}
                      >
                        <SelectTrigger className="text-xs bg-white border-[#E5E1D8] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada / Receita</SelectItem>
                          <SelectItem value="desembolso">Desembolso / Custo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">Valor (R$)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={novoLancValor || ''}
                        onChange={(e) => setNovoLancValor(Number(e.target.value))}
                        className="text-xs bg-white border-[#E5E1D8] h-8 font-semibold"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-semibold text-[#5B6470]">Descrição</label>
                      <Input
                        placeholder="Ex: Parcela inicial de contrato, Licença de nuvem..."
                        value={novoLancDesc}
                        onChange={(e) => setNovoLancDesc(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8] h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">
                        Data Prevista/Real
                      </label>
                      <Input
                        type="date"
                        value={novoLancData}
                        onChange={(e) => setNovoLancData(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8] h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">
                        Vincular a Fase
                      </label>
                      <Select
                        value={novoLancFaseId || 'nenhuma'}
                        onValueChange={(v) => setNovoLancFaseId(v === 'nenhuma' ? '' : v)}
                      >
                        <SelectTrigger className="text-xs bg-white border-[#E5E1D8] h-8">
                          <SelectValue placeholder="Geral do Projeto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhuma">Geral do Projeto</SelectItem>
                          {fasesLista.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAdicionarLancamento}
                        className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Lançamento
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de Lançamentos */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#5B6470] uppercase tracking-wider">
                      Lançamentos Iniciais ({lancamentosLista.length})
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-emerald-700 font-semibold">
                        Entradas: R$ {totalEntradas.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-rose-700 font-semibold">
                        Desembolsos: R$ {totalDesembolsos.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {lancamentosLista.map((lanc) => (
                    <div
                      key={lanc.id}
                      className="p-2.5 rounded-lg border border-[#E5E1D8] bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Badge
                          className={`text-[10px] uppercase font-bold border-none shrink-0 ${
                            lanc.tipo === 'entrada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {lanc.tipo}
                        </Badge>
                        <div className="truncate">
                          <span className="text-xs font-bold text-[#1A1D21] block truncate">
                            {lanc.descricao}
                          </span>
                          <span className="text-[10px] text-[#5B6470] block">
                            Data: {lanc.data} {lanc.faseNome ? `• Fase: ${lanc.faseNome}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-extrabold ${
                            lanc.tipo === 'entrada' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {lanc.tipo === 'entrada' ? '+' : '-'} R${' '}
                          {lanc.valor.toLocaleString('pt-BR')}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverLancamento(lanc.id)}
                          className="text-zinc-400 hover:text-red-600 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {lancamentosLista.length === 0 && (
                    <div className="text-center py-6 text-xs text-[#5B6470] bg-[#FAFAF9] rounded-lg border border-dashed border-[#E5E1D8]">
                      Nenhum lançamento adicionado ainda. Você também poderá registrar depois dentro
                      do projeto.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ETAPA 6: INVESTIDORES & PARTICIPAÇÃO                      */}
          {/* ========================================================== */}
          {etapaAtual === 'investidores' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#0F766E]" />
                      Investidores & Participações
                    </h3>
                    <p className="text-xs text-[#5B6470] mt-0.5">
                      Registro de quem investe no projeto, valor aportado e % de participação.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#5B6470] block uppercase font-bold">
                      Total Aportado
                    </span>
                    <span className="text-sm font-extrabold text-[#0F766E]">
                      R$ {totalInvestido.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Formulário de Adicionar Investidor */}
                <div className="p-3.5 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] space-y-3">
                  <span className="text-xs font-bold text-[#1A1D21] block">
                    + Registrar Investidor / Sócio
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">
                        Nome do Investidor *
                      </label>
                      <Input
                        placeholder="Ex: Fundo Alpha Ventures / Marcos Diamond"
                        value={novoInvNome}
                        onChange={(e) => setNovoInvNome(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8] h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">
                        E-mail de Contato
                      </label>
                      <Input
                        type="email"
                        placeholder="investidor@fundo.com"
                        value={novoInvEmail}
                        onChange={(e) => setNovoInvEmail(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8] h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">
                        Valor Investido (R$)
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={novoInvValor || ''}
                        onChange={(e) => setNovoInvValor(Number(e.target.value))}
                        className="text-xs bg-white border-[#E5E1D8] h-8 font-semibold text-[#0F766E]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">
                        Participação (%)
                      </label>
                      <Input
                        type="number"
                        placeholder="Ex: 10"
                        value={novoInvPerc || ''}
                        onChange={(e) => setNovoInvPerc(Number(e.target.value))}
                        className="text-xs bg-white border-[#E5E1D8] h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5B6470]">
                        Notas / Acordo
                      </label>
                      <Input
                        placeholder="Ex: Aporte Seed, Conversível..."
                        value={novoInvObs}
                        onChange={(e) => setNovoInvObs(e.target.value)}
                        className="text-xs bg-white border-[#E5E1D8] h-8"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdicionarInvestidor}
                      className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Investidor
                    </Button>
                  </div>
                </div>

                {/* Lista de Investidores */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-[#5B6470] uppercase tracking-wider block">
                    Investidores Registrados ({investidoresLista.length})
                  </span>

                  {investidoresLista.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-lg border border-[#E5E1D8] bg-white flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#1A1D21]">{inv.nome}</span>
                          {inv.participacao_percentual > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                              {inv.participacao_percentual}% Equity
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-[#5B6470] block mt-0.5">
                          {inv.email || 'Sem e-mail'}{' '}
                          {inv.observacoes ? `• ${inv.observacoes}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#0F766E]">
                          R$ {inv.valor_investido.toLocaleString('pt-BR')}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverInvestidor(inv.id)}
                          className="text-zinc-400 hover:text-red-600 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {investidoresLista.length === 0 && (
                    <div className="text-center py-6 text-xs text-[#5B6470] bg-[#FAFAF9] rounded-lg border border-dashed border-[#E5E1D8]">
                      Nenhum investidor registrado. Você pode cadastrar agora ou a qualquer momento
                      depois.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* ETAPA 7: CONFIRMAÇÃO & RESUMO GERAL                        */}
          {/* ========================================================== */}
          {etapaAtual === 'confirmacao' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: cor }}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1A1D21]">{nome}</h3>
                      <p className="text-xs text-[#5B6470]">
                        Revise a estrutura completa antes da gravação no Agenda IA Diamond.
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize border-[#E5E1D8]">
                    {tipo}
                  </Badge>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
                    <span className="text-[10px] text-[#5B6470] block uppercase font-bold">
                      Equipe
                    </span>
                    <span className="text-sm font-extrabold text-[#1A1D21]">
                      {equipeLista.length} Integrantes
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
                    <span className="text-[10px] text-[#5B6470] block uppercase font-bold">
                      Fases Físicas
                    </span>
                    <span className="text-sm font-extrabold text-[#1A1D21]">
                      {fasesLista.length} Etapas
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
                    <span className="text-[10px] text-[#5B6470] block uppercase font-bold">
                      Orçamento
                    </span>
                    <span className="text-sm font-extrabold text-[#0F766E]">
                      R$ {orcamentoTotal ? orcamentoTotal.toLocaleString('pt-BR') : '0,00'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9]">
                    <span className="text-[10px] text-[#5B6470] block uppercase font-bold">
                      Investidores
                    </span>
                    <span className="text-sm font-extrabold text-[#1A1D21]">
                      {investidoresLista.length} Sócio(s)
                    </span>
                  </div>
                </div>

                {/* Linha do Tempo de Fases no Resumo */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-[#1A1D21] block">
                    Linha do Tempo das Fases (Cronograma Físico):
                  </span>
                  <div className="space-y-1">
                    {fasesLista.map((f, idx) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between text-xs p-2 rounded bg-[#FAFAF9] border border-[#E5E1D8]/60"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: f.cor }}
                          />
                          <span className="font-semibold text-[#1A1D21]">
                            #{idx + 1} {f.nome}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#5B6470]">
                          {f.data_inicio} até {f.data_fim}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aviso sobre convites */}
                {equipeLista.some((m) => m.enviarConvite) && (
                  <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-[#0F766E] flex items-center gap-2">
                    <Send className="w-4 h-4 shrink-0" />
                    <span>
                      {equipeLista.filter((m) => m.enviarConvite).length} e-mail(s) de convite serão
                      disparados automaticamente pelo sistema logo após a criação.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de Navegação do Wizard */}
        <div className="p-4 bg-white border-t border-[#E5E1D8] flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleVoltar}
            disabled={etapaAtual === 'dados_basicos'}
            className="text-xs text-[#5B6470] gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>

            {etapaAtual !== 'confirmacao' ? (
              <Button
                type="button"
                size="sm"
                onClick={handleAvancar}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1 font-semibold px-4"
              >
                <span>Avançar</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={salvando}
                onClick={handleCriarProjetoCompleto}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5 font-bold px-5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                {salvando ? 'Criando Projeto...' : 'Finalizar & Criar Projeto'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
