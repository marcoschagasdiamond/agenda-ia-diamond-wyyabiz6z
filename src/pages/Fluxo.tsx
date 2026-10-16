import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import type {
  Card as CardType,
  Projeto,
  Negocio,
  Contato,
  CardPrioridade,
  CategoriaFluxo,
  FluxoKanban,
  ColunaFluxo,
  GrupoFamilia,
} from '@/types'
import {
  Plus,
  Sparkles,
  ArrowRight,
  Search,
  FolderTree,
  GitBranch,
  Layers,
  MoreVertical,
  Pencil,
  Edit2,
  Trash2,
  Columns,
  List as ListIcon,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Building,
  User,
  Calendar,
  Users,
  Lock,
  Bell,
  Table as TableIcon,
  BarChart3,
  ExternalLink,
  Copy,
  Download,
  MessageSquare,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FluxoTabelaView } from './fluxo/FluxoTabelaView'
import { FluxoGanttView } from './fluxo/FluxoGanttView'
import { FluxoIndicadoresView } from './fluxo/FluxoIndicadoresView'
import { ModalEditarFases } from './fluxo/ModalEditarFases'
import { ModalCardFluxo } from './fluxo/ModalCardFluxo'
import { ModalCardArquivos } from './fluxo/ModalCardArquivos'
import { ModalCardFamilia } from './fluxo/ModalCardFamilia'
import { MODELOS_FLUXO_TEMPLATES, TEMPLATE_PADRAO_ID, gerarSlugChave } from './fluxo/fluxoTemplates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import SinoNotificacoes from '@/components/SinoNotificacoes'

export default function Fluxo() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const buscaParam = searchParams.get('busca') || ''
  const { toast } = useToast()

  // Integração com o NavegacaoContext (Segunda coluna global do Layout)
  const navGlobal = useNavegacao()
  const {
    categoriaAtivaId: globalCatId,
    setCategoriaAtivaId: setGlobalCatId,
    fluxoAtivoId: globalFluxoId,
    setFluxoAtivoId: setGlobalFluxoId,
    fluxoAtivoChave: globalFluxoChave,
    setFluxoAtivoChave: setGlobalFluxoChave,
    recarregarFluxo: recarregarFluxoGlobal,
    colunaSecundariaAberta,
    modalNovaCategoriaOpen: globalModalNovaCat,
    setModalNovaCategoriaOpen: setGlobalModalNovaCat,
    modalNovoFluxoOpen: globalModalNovoFluxo,
    setModalNovoFluxoOpen: setGlobalModalNovoFluxo,
    modalNovoFluxoCatId: globalModalNovoFluxoCatId,
    modalNovoCardOpen: globalModalNovoCard,
    setModalNovoCardOpen: setGlobalModalNovoCard,
    modalNovoCardChave: globalModalNovoCardChave,
    modalNovaFamiliaOpen: globalModalNovaFamilia,
    setModalNovaFamiliaOpen: setGlobalModalNovaFamilia,
    modalNovaFamiliaColunaId: globalModalNovaFamiliaColId,
    setModalConvidarEquipeOpen,
    setModalConvidarEscopoPadrao,
  } = navGlobal

  // Dados principais
  const [cards, setCards] = useState<CardType[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])

  // Hierarquia: Categorias -> Fluxos -> Fases (Colunas) -> Grupos de Família
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [fluxos, setFluxos] = useState<FluxoKanban[]>([])
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  const [familias, setFamilias] = useState<GrupoFamilia[]>([])

  // Usamos as seleções ativas sincronizadas com o estado global
  const categoriaAtivaId = globalCatId
  const setCategoriaAtivaId = setGlobalCatId
  const fluxoAtivoId = globalFluxoId
  const setFluxoAtivoId = setGlobalFluxoId
  const fluxoAtivoChave = globalFluxoChave
  const setFluxoAtivoChave = setGlobalFluxoChave

  // Controle de expansão das categorias no painel lateral: { [catId]: boolean }
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({})

  // Painel lateral embutido: visível apenas se a segunda coluna global estiver fechada
  const [sidebarAberta, setSidebarAberta] = useState<boolean>(false)

  // Abas de visualização DiamondGroup: QUADRO | TABELA | GANTT | INDICADORES
  const [abaAtiva, setAbaAtiva] = useState<'QUADRO' | 'TABELA' | 'GANTT' | 'INDICADORES'>('QUADRO')

  // Alternância interna da aba QUADRO: 'colunas' (Kanban) ou 'lista' (Linhas empilhadas)
  const [modoVisualizacao, setModoVisualizacao] = useState<'colunas' | 'lista'>('colunas')

  // Controle de exibição dos cards concluídos por coluna de conclusão (chave da coluna -> boolean)
  const [colunasConclusaoExpandidas, setColunasConclusaoExpandidas] = useState<
    Record<string, boolean>
  >({})

  // Controle de busca e filtro no cabeçalho DiamondGroup
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState(buscaParam)
  const [filtroProjeto, setFiltroProjeto] = useState('all')
  const [filtroPrioridade, setFiltroPrioridade] = useState('all')
  const [filtroFamilia, setFiltroFamilia] = useState('all')

  // Agrupamento por família nas colunas
  const [agruparPorFamilia, setAgruparPorFamilia] = useState(true)

  // Modais de Criação e Edição
  // 1. Modal Card
  const [modalCardOpen, setModalCardOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CardType | null>(null)
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formProjeto, setFormProjeto] = useState('none')
  const [formNegocio, setFormNegocio] = useState('none')
  const [formContato, setFormContato] = useState('none')
  const [formFamilia, setFormFamilia] = useState('none')
  const [formPrioridade, setFormPrioridade] = useState<CardPrioridade>('media')
  const [formStatus, setFormStatus] = useState<string>('backlog')
  const [formProximoPasso, setFormProximoPasso] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formDataPrazo, setFormDataPrazo] = useState('')
  const [formLembreteModo, setFormLembreteModo] = useState<
    'padrao' | 'personalizado' | 'desativado'
  >('padrao')
  const [formLembreteAntecedencias, setFormLembreteAntecedencias] = useState<
    import('@/types').LembreteAntecedenciaCodigo[]
  >(['1h', '1d'])
  const [salvandoCard, setSalvandoCard] = useState(false)

  // 2. Modal Categoria
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaFluxo | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#0F766E')
  const [catDescricao, setCatDescricao] = useState('')
  const [catTituloFases, setCatTituloFases] = useState('')
  const [salvandoCat, setSalvandoCat] = useState(false)

  // 3. Modal Fluxo / Coluna
  const [modalFluxoOpen, setModalFluxoOpen] = useState(false)
  const [editingFluxo, setEditingFluxo] = useState<FluxoKanban | null>(null)
  const [fluxoTitulo, setFluxoTitulo] = useState('')
  const [fluxoCor, setFluxoCor] = useState('#0F766E')
  const [fluxoCategoriaId, setFluxoCategoriaId] = useState<string>('')
  const [fluxoTituloFases, setFluxoTituloFases] = useState('')
  const [fluxoTemplateSelecionado, setFluxoTemplateSelecionado] =
    useState<string>(TEMPLATE_PADRAO_ID)
  const [salvandoFluxo, setSalvandoFluxo] = useState(false)

  // Modais dedicados e focados para RENOMEAR Categoria e Fluxo
  const [modalRenomearCatOpen, setModalRenomearCatOpen] = useState(false)
  const [categoriaRenomeando, setCategoriaRenomeando] = useState<CategoriaFluxo | null>(null)
  const [novoNomeCategoria, setNovoNomeCategoria] = useState('')
  const [salvandoRenomearCat, setSalvandoRenomearCat] = useState(false)

  const [modalRenomearFluxoOpen, setModalRenomearFluxoOpen] = useState(false)
  const [fluxoRenomeando, setFluxoRenomeando] = useState<FluxoKanban | null>(null)
  const [novoNomeFluxo, setNovoNomeFluxo] = useState('')
  const [salvandoRenomearFluxo, setSalvandoRenomearFluxo] = useState(false)

  // Modal para criar/editar uma fase avulsa (coluna direta) se desejado
  const [modalFaseAvulsaOpen, setModalFaseAvulsaOpen] = useState(false)
  const [editingColuna, setEditingColuna] = useState<ColunaFluxo | null>(null)
  const [faseTitulo, setFaseTitulo] = useState('')
  const [faseChave, setFaseChave] = useState('')
  const [faseCor, setFaseCor] = useState('#0F766E')
  const [faseIsConclusao, setFaseIsConclusao] = useState(false)

  // Modal Centralizado de Edição das Fases
  const [modalEditarFasesOpen, setModalEditarFasesOpen] = useState(false)

  // Modais de Ações do Card solicitados (Fluxos, Arquivos, Família)
  const [modalCardFluxoOpen, setModalCardFluxoOpen] = useState(false)
  const [modalCardArquivosOpen, setModalCardArquivosOpen] = useState(false)
  const [modalCardFamiliaOpen, setModalCardFamiliaOpen] = useState(false)
  const [cardAcoesEmFoco, setCardAcoesEmFoco] = useState<CardType | null>(null)

  // Renomeação inline do título da coluna direto no board
  const [colunaEditandoId, setColunaEditandoId] = useState<string | null>(null)
  const [colunaEditandoTitulo, setColunaEditandoTitulo] = useState('')

  // Edição inline do "Nome das fases" no cabeçalho do board (independente do nome do fluxo)
  const [editandoTituloFases, setEditandoTituloFases] = useState(false)
  const [valorTituloFases, setValorTituloFases] = useState('')

  // 4. Modal Grupo de Família
  const [modalFamiliaOpen, setModalFamiliaOpen] = useState(false)
  const [editingFamilia, setEditingFamilia] = useState<GrupoFamilia | null>(null)
  const [familiaNome, setFamiliaNome] = useState('')
  const [familiaCor, setFamiliaCor] = useState('#3B82F6')
  const [familiaColunaId, setFamiliaColunaId] = useState<string>('none')
  const [familiaCategoriaId, setFamiliaCategoriaId] = useState<string>('none')
  const [salvandoFamilia, setSalvandoFamilia] = useState(false)

  // Drag and drop state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)

  const carregarDados = async () => {
    try {
      const [c, p, n, ct, cats, flxs, cols, fams] = await Promise.all([
        diamondApi.listCards(),
        diamondApi.listProjetos(),
        diamondApi.listNegocios(),
        diamondApi.listContatos(),
        diamondApi.listCategoriasFluxo(),
        diamondApi.listFluxosKanban(),
        diamondApi.listColunasFluxo(),
        diamondApi.listGruposFamilia(),
      ])

      setCards(c)
      setProjetos(p)
      setNegocios(n)
      setContatos(ct)
      setCategorias(cats)
      setFluxos(flxs)
      setColunas(cols)
      setFamilias(fams)
      recarregarFluxoGlobal().catch(() => {})

      // Inicializa expansão de todas as categorias como abertas
      setCategoriasExpandidas((prev) => {
        const nextState = { ...prev }
        for (const cat of cats) {
          if (nextState[cat.id] === undefined) {
            nextState[cat.id] = true
          }
        }
        return nextState
      })
    } catch (err) {
      console.error('Erro ao carregar dados do kanban:', err)
      toast({
        title: 'Erro ao carregar fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Sincroniza abertura de modais disparados a partir da segunda coluna global
  useEffect(() => {
    if (globalModalNovaCat) {
      abrirModalNovaCategoria()
      setGlobalModalNovaCat(false)
    }
  }, [globalModalNovaCat])

  useEffect(() => {
    if (globalModalNovoFluxo) {
      abrirModalNovoFluxo(globalModalNovoFluxoCatId)
      setGlobalModalNovoFluxo(false)
    }
  }, [globalModalNovoFluxo, globalModalNovoFluxoCatId])

  useEffect(() => {
    if (globalModalNovoCard) {
      abrirModalCriarCard(globalModalNovoCardChave)
      setGlobalModalNovoCard(false)
    }
  }, [globalModalNovoCard, globalModalNovoCardChave])

  useEffect(() => {
    if (globalModalNovaFamilia) {
      abrirModalNovaFamilia(globalModalNovaFamiliaColId)
      setGlobalModalNovaFamilia(false)
    }
  }, [globalModalNovaFamilia, globalModalNovaFamiliaColId])

  useEffect(() => {
    if (buscaParam) setFiltroTexto(buscaParam)
  }, [buscaParam])

  // Colunas disponíveis ordenadas
  const colunasOrdenadas = useMemo(() => {
    return [...colunas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  }, [colunas])

  // Mapeamento chave -> ColunaFluxo para lookup rápido
  const colunasPorChave = useMemo(() => {
    const map = new Map<string, ColunaFluxo>()
    for (const c of colunas) {
      map.set(c.chave, c)
    }
    return map
  }, [colunas])

  // Fluxo ativo focado (pelo ID do fluxo em fluxos_kanban)
  const fluxoAtivo = useMemo(() => {
    if (fluxoAtivoId === 'all') return null
    return fluxos.find((f) => f.id === fluxoAtivoId) || null
  }, [fluxos, fluxoAtivoId])

  // Categoria ativa selecionada
  const categoriaAtiva = useMemo(() => {
    if (categoriaAtivaId !== 'all') {
      return categorias.find((c) => c.id === categoriaAtivaId) || null
    }
    if (fluxoAtivo?.categoria) {
      return categorias.find((c) => c.id === fluxoAtivo.categoria) || null
    }
    return null
  }, [categorias, categoriaAtivaId, fluxoAtivo])

  // Colunas a exibir no Kanban com base no fluxo ativo ou categoria ativa
  // Regra clara: ao focar num fluxo, o board mostra as fases daquele fluxo.
  // Se o usuário selecionou uma categoria inteira sem especificar fluxo, mostra as fases do primeiro fluxo dela ou as fases daquela categoria.
  const colunasFiltradas = useMemo(() => {
    // 1. Se houver um fluxo específico ativo
    if (fluxoAtivoId !== 'all') {
      const fasesDoFluxo = colunasOrdenadas.filter((col) => col.fluxo_id === fluxoAtivoId)
      if (fasesDoFluxo.length > 0) return fasesDoFluxo
    }

    // 2. Se houver uma categoria ativa
    if (categoriaAtivaId !== 'all') {
      // Prioriza fases do primeiro fluxo da categoria se houver
      const primeiroFluxoDaCat = fluxos.find((f) => f.categoria === categoriaAtivaId)
      if (primeiroFluxoDaCat) {
        const fasesDoFluxo = colunasOrdenadas.filter(
          (col) => col.fluxo_id === primeiroFluxoDaCat.id,
        )
        if (fasesDoFluxo.length > 0) return fasesDoFluxo
      }
      const fasesDaCat = colunasOrdenadas.filter((col) => col.categoria === categoriaAtivaId)
      if (fasesDaCat.length > 0) return fasesDaCat
    }

    // 3. Fallback 'all': se houver fluxos, mostra as fases do primeiro fluxo existente
    if (fluxos.length > 0) {
      const fasesPrimeiro = colunasOrdenadas.filter((col) => col.fluxo_id === fluxos[0].id)
      if (fasesPrimeiro.length > 0) return fasesPrimeiro
    }

    return colunasOrdenadas
  }, [colunasOrdenadas, fluxoAtivoId, categoriaAtivaId, fluxos])

  // Categorias com contagens e lista dos seus fluxos reais (NUNCA as fases)
  const categoriasComFluxos = useMemo(() => {
    return navGlobal.categoriasComFluxos
  }, [navGlobal.categoriasComFluxos])

  // Famílias visíveis para filtros
  const familiasVisiveis = useMemo(() => {
    if (categoriaAtivaId === 'all') {
      return familias
    }
    return familias.filter((f) => !f.categoria || f.categoria === categoriaAtivaId)
  }, [familias, categoriaAtivaId])

  // Toggle de expansão de categoria no menu lateral
  const toggleCategoriaExpandida = (catId: string) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }))
  }

  // Filtragem de cards baseada no escopo ativo e filtros
  const cardsFiltrados = useMemo(() => {
    // Escopo de fluxo / categoria:
    // 1. Se um fluxo específico estiver ativo (fluxoAtivoId !== 'all'):
    // Mostra os cards vinculados a este fluxo (via card.fluxo_id ou pelas chaves de fases deste fluxo)
    let chavesPermitidas: string[] | null = null
    let fluxoIdFiltro: string | null = null

    if (fluxoAtivoId !== 'all') {
      fluxoIdFiltro = fluxoAtivoId
      const fasesDoFluxo = colunas.filter((c) => c.fluxo_id === fluxoAtivoId)
      if (fasesDoFluxo.length > 0) {
        chavesPermitidas = fasesDoFluxo.map((c) => c.chave)
      }
    } else if (categoriaAtivaId !== 'all') {
      // Se apenas uma categoria estiver ativa, pega todas as fases dos fluxos dessa categoria
      const fasesDaCat = colunas.filter((c) => c.categoria === categoriaAtivaId)
      if (fasesDaCat.length > 0) {
        chavesPermitidas = fasesDaCat.map((c) => c.chave)
      }
    }

    return cards.filter((card) => {
      // Escopo de fluxo: se card tiver fluxo_id e estivermos filtrando por fluxo específico
      if (fluxoIdFiltro && card.fluxo_id && card.fluxo_id !== fluxoIdFiltro) {
        return false
      }

      // Escopo por status/chave de coluna permitida
      if (chavesPermitidas && !chavesPermitidas.includes(card.status as string)) {
        return false
      }

      // Filtro de texto (título, descrição, próximo passo)
      if (filtroTexto) {
        const termo = filtroTexto.toLowerCase()
        const matchTitulo = card.titulo?.toLowerCase().includes(termo)
        const matchDesc = card.descricao?.toLowerCase().includes(termo)
        const matchProx = card.proximo_passo?.toLowerCase().includes(termo)
        if (!matchTitulo && !matchDesc && !matchProx) return false
      }

      // Filtro por projeto
      if (filtroProjeto !== 'all' && card.projeto !== filtroProjeto) {
        return false
      }

      // Filtro por prioridade
      if (filtroPrioridade !== 'all' && card.prioridade !== filtroPrioridade) {
        return false
      }

      // Filtro por família
      if (filtroFamilia !== 'all') {
        if (filtroFamilia === 'sem_familia' && card.grupo_familia) return false
        if (filtroFamilia !== 'sem_familia' && card.grupo_familia !== filtroFamilia) return false
      }

      return true
    })
  }, [
    cards,
    colunas,
    categoriaAtivaId,
    fluxoAtivoId,
    filtroTexto,
    filtroProjeto,
    filtroPrioridade,
    filtroFamilia,
  ])

  // ==========================================
  // HANDLERS DE CARDS
  // ==========================================
  const abrirModalCriarCard = (defaultStatus?: string, defaultFamiliaId?: string) => {
    setEditingCard(null)
    setFormTitulo('')
    setFormDescricao('')
    setFormProjeto('none')
    setFormNegocio('none')
    setFormContato('none')
    setFormFamilia(defaultFamiliaId || 'none')
    setFormPrioridade('media')
    setFormStatus(defaultStatus || (colunasFiltradas[0]?.chave ?? 'backlog'))
    setFormProximoPasso('')
    setFormTags('')
    setFormDataPrazo('')
    setFormLembreteModo('padrao')
    setFormLembreteAntecedencias(['1h', '1d'])
    setModalCardOpen(true)
  }

  const abrirModalEditarCard = (card: CardType) => {
    setEditingCard(card)
    setFormTitulo(card.titulo)
    setFormDescricao(card.descricao || '')
    setFormProjeto(card.projeto || 'none')
    setFormNegocio(card.negocio || 'none')
    setFormContato(card.contato || 'none')
    setFormFamilia(card.grupo_familia || 'none')
    setFormPrioridade(card.prioridade || 'media')
    setFormStatus(card.status)
    setFormProximoPasso(card.proximo_passo || '')
    setFormDataPrazo(card.data_prazo || '')
    setFormLembreteModo(card.lembrete_modo || 'padrao')
    setFormLembreteAntecedencias(
      Array.isArray(card.lembrete_antecedencias)
        ? (card.lembrete_antecedencias as any)
        : typeof card.lembrete_antecedencias === 'string'
          ? JSON.parse(card.lembrete_antecedencias || '[]')
          : ['1h', '1d'],
    )
    setFormTags(Array.isArray(card.tags) ? card.tags.join(', ') : '')
    setModalCardOpen(true)
  }

  const handleSalvarCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) return
    setSalvandoCard(true)

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    const payload: Partial<CardType> = {
      titulo: formTitulo.trim(),
      descricao: formDescricao.trim() || undefined,
      projeto: formProjeto !== 'none' ? formProjeto : undefined,
      negocio: formNegocio !== 'none' ? formNegocio : undefined,
      contato: formContato !== 'none' ? formContato : undefined,
      grupo_familia: formFamilia !== 'none' ? formFamilia : undefined,
      prioridade: formPrioridade,
      status: formStatus,
      proximo_passo: formProximoPasso.trim() || undefined,
      data_prazo: formDataPrazo || undefined,
      lembrete_modo: formLembreteModo,
      lembrete_antecedencias:
        formLembreteModo === 'personalizado' ? formLembreteAntecedencias : undefined,
      tags: tagsArray,
      fluxo_id: fluxoAtivo?.id || undefined,
    }

    try {
      if (editingCard) {
        await diamondApi.updateCard(editingCard.id, payload)
        toast({ title: 'Card atualizado com sucesso!' })
      } else {
        await diamondApi.createCard(payload)
        toast({ title: 'Card criado com sucesso!' })
      }
      setModalCardOpen(false)
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao salvar card',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoCard(false)
    }
  }

  const handleExcluirCard = async (id: string) => {
    try {
      await diamondApi.deleteCard(id)
      toast({ title: 'Card excluído com sucesso.' })
      setCards((prev) => prev.filter((c) => c.id !== id))
      setModalCardOpen(false)
    } catch (err) {
      toast({ title: 'Erro ao excluir card', variant: 'destructive' })
    }
  }

  const handleMudarStatusCard = async (cardId: string, novoStatus: string) => {
    // Atualização otimista
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: novoStatus } : c)))
    try {
      await diamondApi.updateCard(cardId, { status: novoStatus })
      const nomeColuna = colunasPorChave.get(novoStatus)?.titulo || novoStatus
      toast({ title: `Card movido para "${nomeColuna}"` })
    } catch (err) {
      toast({
        title: 'Erro ao atualizar status',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
      await carregarDados()
    }
  }

  const handleDuplicarCard = async (card: CardType) => {
    try {
      const payload: Partial<CardType> = {
        titulo: `${card.titulo} (Cópia)`,
        descricao: card.descricao,
        projeto: card.projeto,
        negocio: card.negocio,
        contato: card.contato,
        grupo_familia: card.grupo_familia,
        prioridade: card.prioridade,
        status: card.status,
        proximo_passo: card.proximo_passo,
        tags: card.tags,
      }
      await diamondApi.createCard(payload)
      toast({ title: 'Card duplicado com sucesso!' })
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao duplicar card',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleExportarCsv = () => {
    try {
      if (cardsFiltrados.length === 0) {
        toast({ title: 'Nenhum card para exportar.' })
        return
      }

      const headers = [
        'Título',
        'Coluna/Status',
        'Prioridade',
        'Contato',
        'Projeto',
        'Família',
        'Criado Em',
      ]
      const rows = cardsFiltrados.map((c) => {
        const col = colunasPorChave.get(c.status as string)?.titulo || c.status || ''
        const contato =
          c.expand?.contato?.nome || contatos.find((ct) => ct.id === c.contato)?.nome || ''
        const projeto =
          c.expand?.projeto?.nome || projetos.find((p) => p.id === c.projeto)?.nome || ''
        const familia =
          c.expand?.grupo_familia?.nome ||
          familias.find((f) => f.id === c.grupo_familia)?.nome ||
          ''
        const dataCriado = c.created ? new Date(c.created).toLocaleDateString('pt-BR') : ''

        return [
          `"${(c.titulo || '').replace(/"/g, '""')}"`,
          `"${col.replace(/"/g, '""')}"`,
          `"${(c.prioridade || 'media').replace(/"/g, '""')}"`,
          `"${contato.replace(/"/g, '""')}"`,
          `"${projeto.replace(/"/g, '""')}"`,
          `"${familia.replace(/"/g, '""')}"`,
          `"${dataCriado}"`,
        ].join(';')
      })

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `fluxo-cards-${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({ title: 'Cards exportados em CSV com sucesso!' })
    } catch (err) {
      toast({
        title: 'Erro ao exportar CSV',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // ==========================================
  // HANDLERS DE CATEGORIA
  // ==========================================
  const abrirModalNovaCategoria = () => {
    setEditingCategoria(null)
    setCatNome('')
    setCatCor('#0F766E')
    setCatDescricao('')
    setCatTituloFases('')
    setModalCategoriaOpen(true)
  }

  const abrirModalEditarCategoria = (cat: CategoriaFluxo) => {
    setEditingCategoria(cat)
    setCatNome(cat.nome)
    setCatDescricao(cat.descricao || '')
    setCatCor(cat.cor || '#0F766E')
    setCatTituloFases(cat.titulo_fases || '')
    setModalCategoriaOpen(true)
  }
  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catNome.trim()) return
    setSalvandoCat(true)

    // O nome da categoria é independente de titulo_fases.
    // Ao editar ou criar, preservamos ou atualizamos titulo_fases apenas se explicitamente fornecido.
    const payload: Partial<CategoriaFluxo> = {
      nome: catNome.trim(),
      descricao: catDescricao.trim() || undefined,
      cor: catCor,
      titulo_fases: catTituloFases.trim() || undefined,
      ordem: editingCategoria ? editingCategoria.ordem : categorias.length + 1,
    }
    try {
      if (editingCategoria) {
        await diamondApi.updateCategoriaFluxo(editingCategoria.id, payload)
        toast({ title: 'Categoria atualizada com sucesso!' })
      } else {
        const novaCat = await diamondApi.createCategoriaFluxo(payload)
        toast({ title: `Categoria "${novaCat.nome}" criada!` })
        setCategoriaAtivaId(novaCat.id)
        setFluxoCategoriaId(novaCat.id)
        setFluxoAtivoChave('all')
      }
      setModalCategoriaOpen(false)
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao salvar categoria',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoCat(false)
    }
  }

  const handleExcluirCategoria = async (cat: CategoriaFluxo) => {
    if (
      !confirm(
        `Deseja realmente excluir a categoria "${cat.nome}"? As colunas continuarão existindo.`,
      )
    ) {
      return
    }
    try {
      await diamondApi.deleteCategoriaFluxo(cat.id)
      toast({ title: 'Categoria removida.' })
      if (categoriaAtivaId === cat.id) {
        setCategoriaAtivaId('all')
        setFluxoAtivoChave('all')
      }
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao excluir categoria',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Abertura e salvamento do modal focado de RENOMEAR CATEGORIA
  const abrirModalRenomearCategoria = (cat: CategoriaFluxo) => {
    setCategoriaRenomeando(cat)
    setNovoNomeCategoria(cat.nome || '')
    setModalRenomearCatOpen(true)
  }

  const handleSalvarRenomearCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoriaRenomeando) return

    const nomeFormatado = novoNomeCategoria.trim()
    if (!nomeFormatado) {
      toast({
        title: 'Nome obrigatório',
        description: 'O nome da categoria não pode ficar vazio.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoRenomearCat(true)
    try {
      await diamondApi.updateCategoriaFluxo(categoriaRenomeando.id, {
        nome: nomeFormatado,
      })
      toast({ title: 'Categoria renomeada' })
      setModalRenomearCatOpen(false)
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao renomear categoria',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoRenomearCat(false)
    }
  }

  // ==========================================
  // HANDLERS DE FLUXO / COLUNA
  // ==========================================
  const abrirModalNovoFluxo = (catId?: string) => {
    setEditingFluxo(null)
    setFluxoTitulo('')
    setFluxoCor('#0F766E')
    setFluxoTituloFases('')
    setFluxoTemplateSelecionado(TEMPLATE_PADRAO_ID)
    const catDestino =
      catId && catId !== 'all'
        ? catId
        : categoriaAtivaId !== 'all'
          ? categoriaAtivaId
          : categorias[0]?.id || ''
    setFluxoCategoriaId(catDestino)
    setModalFluxoOpen(true)
  }

  const abrirModalEditarFluxo = (f: FluxoKanban) => {
    setEditingFluxo(f)
    setFluxoTitulo(f.nome || f.titulo)
    setFluxoCor(f.cor || '#0F766E')
    setFluxoCategoriaId(f.categoria || '')
    setFluxoTituloFases(f.titulo_fases || '')
    setModalFluxoOpen(true)
  }

  const handleAlternarStatusFluxo = async (f: FluxoKanban) => {
    const novoAtivo = f.ativo === false ? true : false
    const acaoTexto = novoAtivo ? 'reativar' : 'inativar'
    if (
      !confirm(
        `Deseja realmente ${acaoTexto} o fluxo "${f.nome || f.titulo}"? ${
          !novoAtivo
            ? 'Ele deixará de aparecer para novas vinculações, mantendo cards e fases intactos.'
            : 'Ele voltará a aparecer normalmente.'
        }`,
      )
    ) {
      return
    }

    try {
      await diamondApi.updateFluxoKanban(f.id, { ativo: novoAtivo })
      toast({
        title: novoAtivo ? 'Fluxo reativado com sucesso!' : 'Fluxo inativado com sucesso!',
      })
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao alterar status do fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  const handleAbrirCardFluxo = (c: CardType) => {
    setCardAcoesEmFoco(c)
    setModalCardFluxoOpen(true)
  }

  const handleAbrirCardArquivos = (c: CardType) => {
    setCardAcoesEmFoco(c)
    setModalCardArquivosOpen(true)
  }

  const handleAbrirCardFamilia = (c: CardType) => {
    setCardAcoesEmFoco(c)
    setModalCardFamiliaOpen(true)
  }

  const handleSalvarFluxo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fluxoTitulo.trim()) return
    setSalvandoFluxo(true)

    try {
      if (editingFluxo) {
        // Editando fluxo existente em fluxos_kanban
        const payload: Partial<FluxoKanban> = {
          nome: fluxoTitulo.trim(),
          titulo: fluxoTitulo.trim(),
          cor: fluxoCor,
          categoria: fluxoCategoriaId || undefined,
          titulo_fases: fluxoTituloFases.trim() || undefined,
        }

        await diamondApi.updateFluxoKanban(editingFluxo.id, payload)
        toast({ title: 'Fluxo atualizado com sucesso!' })
      } else {
        // Criando fluxo novo dentro da categoria selecionada
        const catDestinoId =
          fluxoCategoriaId || (categoriaAtivaId !== 'all' ? categoriaAtivaId : categorias[0]?.id)

        if (!catDestinoId) {
          throw new Error('Por favor, selecione ou crie uma categoria para o fluxo.')
        }

        // 1. Criar o fluxo na coleção `fluxos_kanban`
        const templateEscolhido =
          MODELOS_FLUXO_TEMPLATES.find((t) => t.id === fluxoTemplateSelecionado) ||
          MODELOS_FLUXO_TEMPLATES[0]

        const novoFluxo = await diamondApi.createFluxoKanban({
          nome: fluxoTitulo.trim(),
          titulo: fluxoTitulo.trim(),
          categoria: catDestinoId,
          cor: fluxoCor || '#0F766E',
          ordem: fluxos.length + 1,
          titulo_fases: fluxoTituloFases.trim() || undefined,
          template_origem: templateEscolhido.id,
        })

        // 2. Semear automaticamente as fases (colunas_fluxo) com base no modelo selecionado
        // Vinculadas diretamente a esse fluxo via fluxo_id e com a categoria associada
        const fasesCriar =
          templateEscolhido.fases.length > 0
            ? templateEscolhido.fases
            : MODELOS_FLUXO_TEMPLATES[0].fases

        for (let i = 0; i < fasesCriar.length; i++) {
          const f = fasesCriar[i]
          const chaveFase = gerarSlugChave(f.titulo, `${novoFluxo.id}_${Date.now()}_${i + 1}`)
          await diamondApi.createColunaFluxo({
            chave: chaveFase,
            titulo: f.titulo,
            cor: f.cor,
            ordem: i + 1,
            categoria: catDestinoId,
            fluxo_id: novoFluxo.id,
            is_conclusao: f.is_conclusao ?? false,
            template_origem: templateEscolhido.id,
          })
        }

        toast({
          title: `Fluxo "${fluxoTitulo}" criado com sucesso!`,
          description: `${fasesCriar.length} fases criadas no board (${templateEscolhido.nome}).`,
        })

        // Abre o board diretamente no fluxo recém-criado
        setCategoriaAtivaId(catDestinoId)
        setFluxoAtivoId(novoFluxo.id)
      }

      setModalFluxoOpen(false)
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao salvar fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoFluxo(false)
    }
  }

  // Renomeação inline da coluna direto no board — altera APENAS o título da coluna (fluxo), NUNCA o nome das fases
  const handleIniciarEdicaoColuna = (col: ColunaFluxo) => {
    setColunaEditandoId(col.id)
    setColunaEditandoTitulo(col.titulo)
  }

  const handleCancelarEdicaoColuna = () => {
    setColunaEditandoId(null)
    setColunaEditandoTitulo('')
  }

  const handleSalvarEdicaoColunaInline = async (col: ColunaFluxo) => {
    const novoTitulo = colunaEditandoTitulo.trim()
    setColunaEditandoId(null)
    setColunaEditandoTitulo('')

    if (!novoTitulo || novoTitulo === col.titulo) {
      return
    }

    // Atualização otimista local: altera APENAS col.titulo, mantendo intacto col.titulo_fases
    setColunas((prev) => prev.map((c) => (c.id === col.id ? { ...c, titulo: novoTitulo } : c)))

    try {
      await diamondApi.updateColunaFluxo(col.id, { titulo: novoTitulo })
      toast({ title: `Coluna renomeada para "${novoTitulo}"` })
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao renomear coluna',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
      await carregarDados()
    }
  }

  const handleExcluirFluxoKanban = async (f: FluxoKanban) => {
    const nomeFluxo = f.nome || f.titulo
    if (
      !confirm(
        `Deseja realmente excluir o fluxo "${nomeFluxo}"? As fases e cards vinculados a este fluxo serão removidos.`,
      )
    ) {
      return
    }
    try {
      // Remove fases associadas a este fluxo em colunas_fluxo
      const fasesDoFluxo = colunas.filter((c) => c.fluxo_id === f.id)
      for (const fase of fasesDoFluxo) {
        await diamondApi.deleteColunaFluxo(fase.id).catch(() => {})
      }

      await diamondApi.deleteFluxoKanban(f.id)
      toast({ title: `Fluxo "${nomeFluxo}" removido com sucesso.` })
      if (fluxoAtivoId === f.id) {
        setFluxoAtivoId('all')
      }
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao excluir fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // Abertura e salvamento do modal focado de RENOMEAR FLUXO
  const abrirModalRenomearFluxo = (f: FluxoKanban) => {
    setFluxoRenomeando(f)
    setNovoNomeFluxo(f.nome || f.titulo || '')
    setModalRenomearFluxoOpen(true)
  }

  const handleSalvarRenomearFluxo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fluxoRenomeando) return

    const nomeFormatado = novoNomeFluxo.trim()
    if (!nomeFormatado) {
      toast({
        title: 'Nome obrigatório',
        description: 'O nome do fluxo não pode ficar vazio.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoRenomearFluxo(true)
    try {
      await diamondApi.updateFluxoKanban(fluxoRenomeando.id, {
        nome: nomeFormatado,
        titulo: nomeFormatado,
      })
      toast({ title: 'Fluxo renomeado' })
      setModalRenomearFluxoOpen(false)
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao renomear fluxo',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoRenomearFluxo(false)
    }
  }

  const handleExcluirColunaBoard = async (col: ColunaFluxo) => {
    if (
      !confirm(
        `Deseja realmente excluir a coluna "${col.titulo}"? Os cards com esse status poderão ficar sem coluna.`,
      )
    ) {
      return
    }
    try {
      await diamondApi.deleteColunaFluxo(col.id)
      toast({ title: 'Coluna removida com sucesso.' })
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao excluir coluna',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // ==========================================
  // HANDLERS DE GRUPO DE FAMÍLIA
  // ==========================================
  const abrirModalNovaFamilia = (colunaId?: string) => {
    setEditingFamilia(null)
    setFamiliaNome('')
    setFamiliaCor('#3B82F6')
    setFamiliaColunaId(colunaId || 'none')
    setFamiliaCategoriaId(categoriaAtivaId !== 'all' ? categoriaAtivaId : 'none')
    setModalFamiliaOpen(true)
  }

  const abrirModalEditarFamilia = (fam: GrupoFamilia) => {
    setEditingFamilia(fam)
    setFamiliaNome(fam.nome)
    setFamiliaCor(fam.cor || '#3B82F6')
    setFamiliaColunaId(fam.coluna || 'none')
    setFamiliaCategoriaId(fam.categoria || 'none')
    setModalFamiliaOpen(true)
  }

  const handleSalvarFamilia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familiaNome.trim()) return
    setSalvandoFamilia(true)

    const payload: Partial<GrupoFamilia> = {
      nome: familiaNome.trim(),
      cor: familiaCor,
      coluna: familiaColunaId !== 'none' ? familiaColunaId : undefined,
      categoria: familiaCategoriaId !== 'none' ? familiaCategoriaId : undefined,
      ordem: editingFamilia ? editingFamilia.ordem : familias.length + 1,
    }

    try {
      if (editingFamilia) {
        await diamondApi.updateGrupoFamilia(editingFamilia.id, payload)
        toast({ title: 'Grupo de família atualizado!' })
      } else {
        await diamondApi.createGrupoFamilia(payload)
        toast({ title: `Família "${familiaNome}" criada com sucesso!` })
      }
      setModalFamiliaOpen(false)
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao salvar família',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoFamilia(false)
    }
  }

  const handleExcluirFamilia = async (fam: GrupoFamilia) => {
    if (!confirm(`Excluir o grupo de família "${fam.nome}"?`)) return
    try {
      await diamondApi.deleteGrupoFamilia(fam.id)
      toast({ title: 'Grupo de família excluído.' })
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao excluir família',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
    }
  }

  // ==========================================
  // DRAG AND DROP (VISÃO COLUNAS)
  // ==========================================
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id)
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string, targetFamiliaId?: string) => {
    e.preventDefault()
    const id = draggedCardId || e.dataTransfer.getData('text/plain')
    if (!id) return

    // Atualização otimista irrestrita: qualquer card pode ser solto em qualquer coluna visível
    setCards((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: targetStatus,
              grupo_familia: targetFamiliaId !== undefined ? targetFamiliaId : c.grupo_familia,
            }
          : c,
      ),
    )

    try {
      const updateData: Partial<CardType> = { status: targetStatus }
      if (targetFamiliaId !== undefined) {
        updateData.grupo_familia = targetFamiliaId || undefined
      }
      await diamondApi.updateCard(id, updateData)
      const nomeColuna = colunasPorChave.get(targetStatus)?.titulo || targetStatus
      toast({
        title: `Card movido para "${nomeColuna}"`,
      })
      // Sincroniza contagens no NavegacaoContext / painel lateral e recarrega dados locais
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch {
      toast({ title: 'Erro ao mover card', variant: 'destructive' })
      await carregarDados()
    } finally {
      setDraggedCardId(null)
    }
  }

  const getPriorityBadge = (p?: CardPrioridade) => {
    switch (p) {
      case 'urgente':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-semibold">
            Urgente
          </Badge>
        )
      case 'alta':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-semibold">
            Alta
          </Badge>
        )
      case 'media':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-medium">
            Média
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-medium">
            Baixa
          </Badge>
        )
    }
  }

  const getPriorityBorder = (p?: CardPrioridade) => {
    switch (p) {
      case 'urgente':
        return 'border-l-4 border-l-[#DC2626]'
      case 'alta':
        return 'border-l-4 border-l-[#F59E0B]'
      case 'media':
        return 'border-l-4 border-l-[#0EA5E9]'
      default:
        return 'border-l-4 border-l-[#64748B]'
    }
  }

  // Lista de pessoas (contatos distintos) envolvidas nos cards filtrados
  const contatosEnvolvidos = useMemo(() => {
    const ids = new Set<string>()
    cardsFiltrados.forEach((c) => {
      if (c.contato) ids.add(c.contato)
    })
    return contatos.filter((ct) => ids.has(ct.id))
  }, [cardsFiltrados, contatos])

  // Entidade ativa que é dona do "Nome das fases" exibido no cabeçalho:
  // Se houver um fluxo específico ativo, usa o fluxoKanban ativo.
  // Se uma categoria estiver selecionada (com todos os seus fluxos), usa a categoria.
  const entidadeFasesAtiva = useMemo(() => {
    if (fluxoAtivo) return { tipo: 'fluxo' as const, item: fluxoAtivo }
    if (categoriaAtiva) return { tipo: 'categoria' as const, item: categoriaAtiva }
    if (fluxos.length > 0) return { tipo: 'fluxo' as const, item: fluxos[0] }
    if (categorias.length > 0) return { tipo: 'categoria' as const, item: categorias[0] }
    return null
  }, [fluxoAtivo, categoriaAtiva, fluxos, categorias])

  // "Nome das fases" para o cabeçalho do board DiamondGroup:
  // Totalmente independente do nome do fluxo ou da categoria.
  // Quando o campo está vazio, exibe o placeholder neutro "Nome das fases" (clicável para editar) — nunca "Fluxo sem nome".
  const tituloFasesExibicao = useMemo(() => {
    const valor = entidadeFasesAtiva?.item?.titulo_fases?.trim()
    if (valor) return valor
    return 'Nome das fases'
  }, [entidadeFasesAtiva])

  const handleIniciarEdicaoTituloFases = () => {
    const atual = entidadeFasesAtiva?.item?.titulo_fases || ''
    setValorTituloFases(atual)
    setEditandoTituloFases(true)
  }

  const handleCancelarEdicaoTituloFases = () => {
    setEditandoTituloFases(false)
    setValorTituloFases('')
  }

  const handleSalvarTituloFasesInline = async () => {
    setEditandoTituloFases(false)
    const novoValor = valorTituloFases.trim()

    let entidadeAlvo = entidadeFasesAtiva

    // Se ainda não existir nenhuma categoria ou fluxo, cria uma categoria padrão para ancorar o nome das fases
    if (!entidadeAlvo) {
      try {
        const novaCat = await diamondApi.createCategoriaFluxo({
          nome: 'Geral',
          cor: '#0F766E',
          titulo_fases: novoValor,
        })
        setCategorias((prev) => [...prev, novaCat])
        setCategoriaAtivaId(novaCat.id)
        toast({
          title: 'Nome das fases salvo',
          description: novoValor ? `Definido como "${novoValor}"` : 'Nome das fases definido.',
        })
        await Promise.all([
          recarregarFluxoGlobal().catch(() => {}),
          carregarDados().catch(() => {}),
        ])
        return
      } catch (err) {
        toast({
          title: 'Erro ao salvar nome das fases',
          description: (err as Error)?.message,
          variant: 'destructive',
        })
        return
      }
    }

    const valorAnterior = entidadeAlvo.item.titulo_fases || ''
    if (novoValor === valorAnterior) {
      return
    }

    try {
      if (entidadeAlvo.tipo === 'fluxo') {
        const fId = entidadeAlvo.item.id
        setFluxos((prev) => prev.map((f) => (f.id === fId ? { ...f, titulo_fases: novoValor } : f)))
        await diamondApi.updateFluxoKanban(fId, { titulo_fases: novoValor })
        toast({
          title: 'Nome das fases atualizado',
          description: novoValor ? `Definido como "${novoValor}"` : 'Nome das fases limpo.',
        })
      } else {
        const catId = entidadeAlvo.item.id
        setCategorias((prev) =>
          prev.map((cat) => (cat.id === catId ? { ...cat, titulo_fases: novoValor } : cat)),
        )
        await diamondApi.updateCategoriaFluxo(catId, { titulo_fases: novoValor })
        toast({
          title: 'Nome das fases da categoria atualizado',
          description: novoValor ? `Definido como "${novoValor}"` : 'Nome das fases limpo.',
        })
      }
      await Promise.all([recarregarFluxoGlobal().catch(() => {}), carregarDados().catch(() => {})])
    } catch (err) {
      toast({
        title: 'Erro ao salvar nome das fases',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
      await carregarDados()
    }
  }

  const corFluxoDestaque = useMemo(() => {
    if (fluxoAtivo?.cor) return fluxoAtivo.cor
    if (categoriaAtiva?.cor) return categoriaAtiva.cor
    if (colunasOrdenadas.length > 0 && colunasOrdenadas[0].cor) {
      return colunasOrdenadas[0].cor
    }
    return '#0F766E'
  }, [fluxoAtivo, categoriaAtiva, colunasOrdenadas])

  // Retorna o contato associado ao card
  const getContatoDoCard = (card: CardType) => {
    if (card.expand?.contato) return card.expand.contato
    if (card.contato) {
      return contatos.find((ct) => ct.id === card.contato) || null
    }
    return null
  }

  // Gera avatar circular com foto ou iniciais
  const renderCardAvatar = (card: CardType) => {
    const contato = getContatoDoCard(card)
    const nome = contato?.nome || card.titulo || 'Card'
    const iniciais =
      nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('') || 'D'

    // Avatar circular no modelo DiamondGroup (foto ou fallback com tom azul corporativo)
    return (
      <Avatar className="w-8 h-8 rounded-full border-2 border-white shadow-2xs shrink-0 ring-1 ring-black/5">
        <AvatarImage
          src={`https://img.usecurling.com/ppl/128?seed=${encodeURIComponent(nome)}`}
          alt={nome}
        />
        <AvatarFallback className="bg-gradient-to-br from-[#1E40AF] to-[#0F766E] text-white text-[10px] font-bold">
          {iniciais}
        </AvatarFallback>
      </Avatar>
    )
  }

  // Card renderizado no modelo visual DiamondGroup
  function renderKanbanCard(card: CardType, onEdit: () => void) {
    const familiaDoCard = familias.find((f) => f.id === card.grupo_familia)
    const contato = getContatoDoCard(card)

    return (
      <div
        key={card.id}
        draggable
        onDragStart={(e) => handleDragStart(e, card.id)}
        onClick={onEdit}
        className="group relative bg-white rounded-xl border border-[#E5E1D8] p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer diamond-card-hover"
      >
        {/* Linha Superior: Avatar circular à esquerda, título em maiúsculas ao centro, botão abrir + 3 pontinhos à direita */}
        <div className="flex items-start justify-between gap-2.5">
          {/* Avatar circular */}
          {renderCardAvatar(card)}

          {/* Título do Card em MAIÚSCULAS no modelo DiamondGroup */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-xs font-bold text-[#1A1D21] uppercase tracking-tight leading-snug line-clamp-2">
              {card.titulo}
            </h4>
            {contato && (
              <p className="text-[10px] text-[#5B6470] truncate mt-0.5">
                {contato.nome} {contato.empresa ? `• ${contato.empresa}` : ''}
              </p>
            )}
          </div>

          {/* Ações do Canto Superior Direito: Botão azul de abrir na página própria + Menu "..." */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* 3 Ícones de Ação Rápida solicitados pelo usuário */}
            <button
              type="button"
              onClick={() => handleAbrirCardFluxo(card)}
              title="Fluxos: Ver fluxo vinculado, revincular ou inativar"
              className="w-6 h-6 rounded flex items-center justify-center text-[#5B6470] hover:text-[#0F766E] hover:bg-[#0F766E]/10 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => handleAbrirCardArquivos(card)}
              title="Arquivos: Ver anexos vinculados e enviar arquivos"
              className="w-6 h-6 rounded flex items-center justify-center text-[#5B6470] hover:text-[#0F766E] hover:bg-[#0F766E]/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5 rotate-180" />
            </button>

            <button
              type="button"
              onClick={() => handleAbrirCardFamilia(card)}
              title="Família: Duplicar com destino, criar filho, vincular pai, copiar url"
              className="w-6 h-6 rounded flex items-center justify-center text-[#5B6470] hover:text-[#0F766E] hover:bg-[#0F766E]/10 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
            </button>

            {/* Botão de abrir/página do card (quadrado azul com seta) */}
            <button
              type="button"
              onClick={() => navigate(`/card/${card.id}`)}
              title="Abrir página completa do card"
              className="w-6 h-6 rounded bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shadow-2xs transition-all"
            >
              <ExternalLink className="w-3 h-3" />
            </button>

            {/* Menu 3 pontinhos com ações completas */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Opções do card"
                  className="w-6 h-6 rounded flex items-center justify-center text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => navigate(`/card/${card.id}`)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-2 text-[#2563EB]" />
                  Abrir Página do Card
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                  Editar Modal Rápido
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAbrirCardFluxo(card)}>
                  <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                  Fluxos (Revincular / Status)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAbrirCardArquivos(card)}>
                  <Download className="w-3.5 h-3.5 mr-2 rotate-180 text-blue-600" />
                  Arquivos Anexados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAbrirCardFamilia(card)}>
                  <Users className="w-3.5 h-3.5 mr-2 text-purple-600" />
                  Família & Relações...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Mover de coluna */}
                {colunasOrdenadas.map((col) => {
                  if (col.chave === card.status) return null
                  return (
                    <DropdownMenuItem
                      key={col.id || col.chave}
                      onClick={() => handleMudarStatusCard(card.id, col.chave)}
                    >
                      <ArrowRight className="w-3.5 h-3.5 mr-2 text-[#5B6470]" />
                      Mover para {col.titulo}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const escopoNome = card.expand?.projeto?.nome || card.titulo
                    setModalConvidarEscopoPadrao({
                      tipo: card.projeto ? 'projeto' : card.fluxo_id ? 'fluxo' : 'geral',
                      id: card.projeto || card.fluxo_id || '',
                      nome: escopoNome,
                    })
                    setModalConvidarEquipeOpen(true)
                  }}
                  className="text-[#0F766E]"
                >
                  <Users className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                  Convidar Colaborador
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExcluirCard(card.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Excluir Card
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Detalhes extras preservados: próximo passo, família, projeto, badges */}
        {card.descricao && (
          <p className="text-[11px] text-[#5B6470] line-clamp-2 mt-2 leading-relaxed">
            {card.descricao}
          </p>
        )}

        {card.proximo_passo && (
          <div className="bg-[#F4F2EE]/70 px-2 py-1 rounded-md text-[10px] text-[#0F766E] font-medium flex items-center gap-1.5 mt-2 border border-[#E5E1D8]/50">
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{card.proximo_passo}</span>
          </div>
        )}

        {/* Rodapé do card: prioridade, família, projeto e tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-[#E5E1D8]/60 text-[10px] text-[#5B6470]">
          {getPriorityBadge(card.prioridade)}

          {familiaDoCard && (
            <span
              className="inline-flex items-center gap-1 font-medium px-1.5 py-0.5 rounded text-[10px]"
              style={{
                backgroundColor: `${familiaDoCard.cor || '#3B82F6'}15`,
                color: familiaDoCard.cor || '#3B82F6',
              }}
            >
              <Layers className="w-2.5 h-2.5" />
              {familiaDoCard.nome}
            </span>
          )}

          {card.expand?.projeto && (
            <span className="bg-[#F4F2EE] px-1.5 py-0.5 rounded truncate max-w-[110px]">
              📁 {card.expand.projeto.nome}
            </span>
          )}

          {card.criado_por_ia && (
            <span
              title="Criado via IA"
              className="inline-flex items-center gap-0.5 text-[#0F766E] bg-[#0F766E]/10 px-1 py-0.5 rounded ml-auto"
            >
              <Sparkles className="w-2.5 h-2.5" />
              IA
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DO BOARD MODELO DIAMONDGROUP: NOME + PONTINHO + ÍCONES       */}
      {/* ========================================================================= */}
      <div className="bg-white px-5 py-3.5 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Lado Esquerdo: Ponto de cor + Nome do fluxo em destaque + Toggle do painel de categorias */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSidebarAberta(!sidebarAberta)}
            className="text-xs h-8 px-2.5 border-[#E5E1D8] text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE] gap-1.5 shrink-0"
            title={
              sidebarAberta ? 'Recolher painel de categorias' : 'Expandir painel de categorias'
            }
          >
            {sidebarAberta ? (
              <>
                <PanelLeftClose className="w-4 h-4 text-[#0F766E]" />
                <span className="hidden sm:inline">Recolher</span>
              </>
            ) : (
              <>
                <PanelLeftOpen className="w-4 h-4 text-[#0F766E]" />
                <span className="hidden sm:inline">Categorias</span>
              </>
            )}
          </Button>

          {/* Nome do Fluxo em destaque + Título das Fases independente */}
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: corFluxoDestaque }}
            />

            {/* NOME DO FLUXO (ou da categoria / contexto geral) em destaque principal */}
            <div className="flex items-center gap-2 min-w-0">
              <h1
                className="text-base sm:text-lg md:text-xl font-bold text-[#1A1D21] truncate tracking-tight"
                title={
                  fluxoAtivo
                    ? `Fluxo: ${fluxoAtivo.nome || fluxoAtivo.titulo}`
                    : categoriaAtiva
                      ? `Categoria: ${categoriaAtiva.nome}`
                      : 'Todos os Fluxos'
                }
              >
                {fluxoAtivo
                  ? fluxoAtivo.nome || fluxoAtivo.titulo
                  : categoriaAtiva
                    ? categoriaAtiva.nome
                    : fluxos[0]?.nome || fluxos[0]?.titulo || 'Fluxo Kanban'}
              </h1>

              {/* Separador visual elegante */}
              <span className="text-[#CBD5E1] font-light hidden sm:inline">•</span>

              {/* Título das fases com edição inline mantida (nunca "Fluxo sem nome", padrão "Nome das fases") */}
              <div className="flex items-center gap-1 min-w-0">
                {editandoTituloFases ? (
                  <Input
                    autoFocus
                    value={valorTituloFases}
                    placeholder="Nome das fases"
                    onChange={(e) => setValorTituloFases(e.target.value)}
                    onBlur={handleSalvarTituloFasesInline}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSalvarTituloFasesInline()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        handleCancelarEdicaoTituloFases()
                      }
                    }}
                    className="h-7 text-xs sm:text-sm font-semibold tracking-tight px-2 py-0 bg-white border-[#0F766E] text-[#1A1D21] w-[160px] sm:w-[220px]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleIniciarEdicaoTituloFases}
                    title="Clique para editar o nome das fases"
                    className="text-xs sm:text-sm font-medium text-[#5B6470] hover:text-[#0F766E] truncate flex items-center gap-1 group/header transition-colors px-1.5 py-0.5 rounded hover:bg-[#F4F2EE]"
                  >
                    <span
                      className={`truncate ${
                        entidadeFasesAtiva?.item?.titulo_fases?.trim()
                          ? 'text-[#5B6470]'
                          : 'italic text-[#5B6470]/70'
                      }`}
                    >
                      {tituloFasesExibicao}
                    </span>
                    <Edit2 className="w-3 h-3 text-[#5B6470]/40 group-hover/header:text-[#0F766E] opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0" />
                  </button>
                )}
              </div>
            </div>

            <Badge
              variant="outline"
              className="hidden sm:inline-flex text-[10px] bg-[#F4F2EE] text-[#5B6470] border-[#E5E1D8] font-semibold px-2 py-0.5"
            >
              {cardsFiltrados.length} cards
            </Badge>
          </div>
        </div>

        {/* Lado Direito: Pessoas (avatar tracejado/contador), Cadeado, Lupa, Filtro, Menu "..." e Sino com badge */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Avatar com contorno tracejado e contador de pessoas envolvidas */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-dashed border-[#CBD5E1] bg-[#FAFAF9] text-xs text-[#5B6470]"
            title={`${contatosEnvolvidos.length} pessoas envolvidas neste fluxo`}
          >
            <div className="w-6 h-6 rounded-full border border-[#94A3B8] border-dashed flex items-center justify-center bg-white text-[#5B6470]">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-[#1A1D21] pr-1">
              {contatosEnvolvidos.length}
            </span>
          </div>

          {/* Cadeado (permissões / privacidade do fluxo) */}
          <button
            type="button"
            title="Permissões do fluxo: restrito à equipe DiamondGroup"
            onClick={() =>
              toast({
                title: 'Permissões do Fluxo',
                description: 'Acesso restrito aos administradores e equipe DiamondGroup.',
              })
            }
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Busca (Lupa) */}
          <button
            type="button"
            title="Buscar cards"
            onClick={() => setBuscaAberta(!buscaAberta)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              buscaAberta || filtroTexto
                ? 'bg-[#0F766E]/10 text-[#0F766E]'
                : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Botão de Filtro (destaque azul claro como no modelo de referência) */}
          <button
            type="button"
            title="Filtros avançados"
            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
              filtrosAbertos ||
              filtroPrioridade !== 'all' ||
              filtroFamilia !== 'all' ||
              filtroProjeto !== 'all'
                ? 'bg-[#DBEAFE] text-[#1D4ED8] shadow-2xs'
                : 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filtro</span>
          </button>

          {/* Menu "..." com ações do fluxo e visibilidade clara do nome do fluxo ativo */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Ações do fluxo"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              {/* Se houver fluxo ou categoria ativa, exibe o nome real do fluxo para consulta */}
              {fluxoAtivo && (
                <div className="px-2 py-1.5 border-b border-[#E5E1D8]/70 mb-1">
                  <span className="text-[10px] text-[#5B6470] block uppercase tracking-wider font-semibold">
                    Fluxo Ativo
                  </span>
                  <span className="text-xs font-bold text-[#1A1D21] block truncate">
                    {fluxoAtivo.titulo}
                  </span>
                </div>
              )}
              {categoriaAtiva && !fluxoAtivo && (
                <div className="px-2 py-1.5 border-b border-[#E5E1D8]/70 mb-1">
                  <span className="text-[10px] text-[#5B6470] block uppercase tracking-wider font-semibold">
                    Categoria Ativa
                  </span>
                  <span className="text-xs font-bold text-[#1A1D21] block truncate">
                    {categoriaAtiva.nome}
                  </span>
                </div>
              )}
              <DropdownMenuItem onClick={() => abrirModalCriarCard()}>
                <Plus className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Novo Card
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setModalEditarFasesOpen(true)}>
                <Layers className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Editar Fases do Fluxo
              </DropdownMenuItem>
              {fluxoAtivo && (
                <>
                  <DropdownMenuItem onClick={() => abrirModalEditarFluxo(fluxoAtivo)}>
                    <Edit2 className="w-3.5 h-3.5 mr-2 text-blue-600" />
                    Editar Fluxo: {fluxoAtivo.titulo}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAlternarStatusFluxo(fluxoAtivo)}
                    className={
                      fluxoAtivo.ativo === false ? 'text-emerald-700 font-medium' : 'text-amber-700'
                    }
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                    {fluxoAtivo.ativo === false ? 'Reativar este Fluxo' : 'Inativar este Fluxo'}
                  </DropdownMenuItem>
                </>
              )}
              {categoriaAtiva && (
                <DropdownMenuItem onClick={() => abrirModalEditarCategoria(categoriaAtiva)}>
                  <FolderTree className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                  Editar Categoria: {categoriaAtiva.nome}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExportarCsv}>
                <Download className="w-3.5 h-3.5 mr-2 text-[#5B6470]" />
                Exportar Lista em CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (fluxoAtivo) {
                    setModalConvidarEscopoPadrao({
                      tipo: 'fluxo',
                      id: fluxoAtivo.id,
                      nome: fluxoAtivo.nome || fluxoAtivo.titulo,
                    })
                  } else if (categoriaAtiva) {
                    setModalConvidarEscopoPadrao({
                      tipo: 'categoria',
                      id: categoriaAtiva.id,
                      nome: categoriaAtiva.nome,
                    })
                  } else {
                    setModalConvidarEscopoPadrao({
                      tipo: 'geral',
                      nome: 'Workspace Completo',
                    })
                  }
                  setModalConvidarEquipeOpen(true)
                }}
                className="text-[#0F766E] font-medium"
              >
                <Users className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                Convidar Equipe para este Fluxo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Sino de Notificações interativo com popover e alertas */}
          <SinoNotificacoes className="w-8 h-8 flex items-center justify-center" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ABAS DE VISUALIZAÇÃO DIAMONDGROUP: QUADRO / TABELA / GANTT / INDICADORES */}
      {/* ========================================================================= */}
      <div className="bg-white px-3 py-1.5 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Aba QUADRO */}
          <button
            type="button"
            onClick={() => setAbaAtiva('QUADRO')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              abaAtiva === 'QUADRO'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>QUADRO</span>
          </button>

          {/* Aba TABELA */}
          <button
            type="button"
            onClick={() => setAbaAtiva('TABELA')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              abaAtiva === 'TABELA'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>TABELA</span>
          </button>

          {/* Aba GANTT */}
          <button
            type="button"
            onClick={() => setAbaAtiva('GANTT')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              abaAtiva === 'GANTT'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>GANTT</span>
          </button>

          {/* Aba INDICADORES */}
          <button
            type="button"
            onClick={() => setAbaAtiva('INDICADORES')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              abaAtiva === 'INDICADORES'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>INDICADORES</span>
          </button>
        </div>

        {/* Lado direito das abas: no QUADRO, mantém o toggle Colunas/Lista e botão Novo Card */}
        <div className="flex items-center gap-2 shrink-0">
          {abaAtiva === 'QUADRO' && (
            <div className="inline-flex rounded-lg border border-[#E5E1D8] bg-[#F4F2EE] p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setModoVisualizacao('colunas')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  modoVisualizacao === 'colunas'
                    ? 'bg-white text-[#1A1D21] shadow-xs'
                    : 'text-[#5B6470] hover:text-[#1A1D21]'
                }`}
              >
                <Columns className="w-3 h-3 text-[#0F766E]" />
                <span className="hidden sm:inline">Colunas</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisualizacao('lista')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  modoVisualizacao === 'lista'
                    ? 'bg-white text-[#1A1D21] shadow-xs'
                    : 'text-[#5B6470] hover:text-[#1A1D21]'
                }`}
              >
                <ListIcon className="w-3 h-3 text-[#0F766E]" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>
          )}

          <Button
            onClick={() => abrirModalCriarCard()}
            size="sm"
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3 font-medium shadow-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Card</span>
          </Button>
        </div>
      </div>

      {/* ÁREA PRINCIPAL: PAINEL LATERAL (CATEGORIAS E FLUXOS) + BOARD */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* ======================================================== */}
        {/* PAINEL LATERAL DE SEGUNDO NÍVEL: CATEGORIAS & FLUXOS */}
        {/* Exibido se a sidebar interna estiver aberta OU se a coluna global estiver recolhida */}
        {/* ======================================================== */}
        {(sidebarAberta || !colunaSecundariaAberta) && (
          <aside className="w-full lg:w-[280px] shrink-0 bg-white rounded-xl border border-[#E5E1D8] p-3 shadow-xs space-y-3">
            {/* Topo do painel lateral com menu Adicionar */}
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8]">
              <div>
                <span className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wider block">
                  Categorias & Fluxos
                </span>
                <span className="text-[10px] text-[#5B6470]">
                  {categorias.length} categorias • {colunas.length} fluxos
                </span>
              </div>

              {/* Botão Adicionar rápido no topo do painel */}
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
                  <DropdownMenuItem onClick={abrirModalNovaCategoria}>
                    <FolderTree className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                    Nova Categoria
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => abrirModalNovoFluxo()}>
                    <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                    Novo Fluxo (Coluna)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => abrirModalNovaFamilia()}>
                    <Layers className="w-3.5 h-3.5 mr-2 text-blue-600" />
                    Novo Grupo de Família
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Opção "Todas as Categorias" */}
            <button
              type="button"
              onClick={() => {
                setCategoriaAtivaId('all')
                setFluxoAtivoId('all')
                setFluxoAtivoChave('all')
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoriaAtivaId === 'all' && fluxoAtivoId === 'all'
                  ? 'bg-[#1A1D21] text-white shadow-xs'
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

            {/* Árvore de Categorias e Fluxos (SOMENTE fluxos_kanban — FASES NUNCA aparecem aqui) */}
            <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
              {categoriasComFluxos.map((cat) => {
                const isCatAtiva = categoriaAtivaId === cat.id
                const isExpanded = categoriasExpandidas[cat.id] ?? true

                return (
                  <div
                    key={cat.id}
                    className="rounded-lg border border-[#E5E1D8]/60 bg-[#FAFAF9] overflow-hidden"
                  >
                    {/* Linha da Categoria */}
                    <div
                      className={`flex items-center justify-between p-2 transition-colors ${
                        isCatAtiva && fluxoAtivoId === 'all'
                          ? 'bg-[#0F766E] text-white'
                          : 'hover:bg-[#F4F2EE] text-[#1A1D21]'
                      }`}
                    >
                      {/* Seta de abrir/fechar */}
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
                        aria-label="Expandir ou recolher fluxos desta categoria"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Nome e seleção da categoria inteira */}
                      <button
                        type="button"
                        onClick={() => {
                          setCategoriaAtivaId(cat.id)
                          setFluxoAtivoId('all')
                          setFluxoAtivoChave('all')
                        }}
                        className="flex-1 flex items-center gap-2 text-left text-xs font-semibold truncate ml-1"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.cor || '#0F766E' }}
                        />
                        <span className="truncate">{cat.nome}</span>
                      </button>

                      {/* Contagem e Menu da Categoria */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                            isCatAtiva && fluxoAtivoId === 'all'
                              ? 'bg-white/20 text-white'
                              : 'bg-[#E5E1D8] text-[#5B6470]'
                          }`}
                        >
                          {cat.cardCount}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Opções da categoria"
                              className={`p-1 rounded transition-colors opacity-70 hover:opacity-100 ${
                                isCatAtiva && fluxoAtivoId === 'all'
                                  ? 'text-white hover:bg-white/10'
                                  : 'text-[#5B6470] hover:text-[#1A1D21]'
                              }`}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => abrirModalNovoFluxo(cat.id)}>
                              <Plus className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                              Adicionar fluxo aqui
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModalRenomearCategoria(cat)}>
                              <Pencil className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModalEditarCategoria(cat)}>
                              <Edit2 className="w-3.5 h-3.5 mr-2" />
                              Editar Categoria
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleExcluirCategoria(cat)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Excluir Categoria
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Subitens: SOMENTE Fluxos pertencentes a essa categoria (NUNCA fases) */}
                    {isExpanded && (
                      <div className="p-1 pl-4 space-y-0.5 border-t border-[#E5E1D8]/60 bg-white">
                        {cat.fluxos.map((fluxo) => {
                          const isFluxoAtivo = fluxoAtivoId === fluxo.id
                          const fasesDesteFluxo = colunas.filter((c) => c.fluxo_id === fluxo.id)
                          const chavesFases = fasesDesteFluxo.map((c) => c.chave)
                          const cardsDoFluxo = cards.filter(
                            (card) =>
                              card.fluxo_id === fluxo.id ||
                              chavesFases.includes(card.status as string),
                          ).length

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
                                  setCategoriaAtivaId(cat.id)
                                  setFluxoAtivoId(fluxo.id)
                                  setFluxoAtivoChave('all')
                                }}
                                className="flex-1 flex items-center gap-2 text-left truncate"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: fluxo.cor || '#0F766E' }}
                                />
                                <span className="truncate">{fluxo.nome || fluxo.titulo}</span>
                              </button>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] text-[#5B6470] bg-[#E5E1D8]/50 px-1.5 py-0.2 rounded">
                                  {cardsDoFluxo}
                                </span>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label="Opções do fluxo"
                                      className="p-0.5 text-[#5B6470] hover:text-[#1A1D21] opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="w-3 h-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setCategoriaAtivaId(cat.id)
                                        setFluxoAtivoId(fluxo.id)
                                        const primeiraFase = colunas.find(
                                          (c) => c.fluxo_id === fluxo.id,
                                        )?.chave
                                        abrirModalCriarCard(primeiraFase)
                                      }}
                                    >
                                      <Plus className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />+ Card
                                      neste fluxo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => abrirModalNovaFamilia(fluxo.id)}
                                    >
                                      <Layers className="w-3.5 h-3.5 mr-2 text-blue-600" />+ Família
                                      neste fluxo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => abrirModalRenomearFluxo(fluxo)}
                                    >
                                      <Pencil className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                                      Renomear
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => abrirModalEditarFluxo(fluxo)}>
                                      <Edit2 className="w-3.5 h-3.5 mr-2" />
                                      Editar Fluxo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleAlternarStatusFluxo(fluxo)}
                                      className={
                                        fluxo.ativo === false
                                          ? 'text-emerald-700 font-medium'
                                          : 'text-amber-700'
                                      }
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                      {fluxo.ativo === false ? 'Reativar Fluxo' : 'Inativar Fluxo'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleExcluirFluxoKanban(fluxo)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      Excluir Fluxo
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          )
                        })}

                        {cat.fluxos.length === 0 ? (
                          <div className="py-1 px-2 text-[11px] text-[#5B6470]/70 italic flex items-center justify-between">
                            <span>Sem fluxos</span>
                            <button
                              type="button"
                              onClick={() => abrirModalNovoFluxo(cat.id)}
                              className="text-[#0F766E] hover:underline text-[10px] font-semibold"
                            >
                              + Criar Fluxo
                            </button>
                          </div>
                        ) : (
                          <div className="pt-1 pb-0.5 px-2 flex justify-end border-t border-[#E5E1D8]/40">
                            <button
                              type="button"
                              onClick={() => abrirModalNovoFluxo(cat.id)}
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

              {categorias.length === 0 && (
                <div className="text-center py-6 text-xs text-[#5B6470]">
                  <p>Nenhuma categoria cadastrada.</p>
                  <Button
                    onClick={abrirModalNovaCategoria}
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                  >
                    + Criar Categoria
                  </Button>
                </div>
              )}
            </div>
          </aside>
        )}
        {/* ======================================================== */}
        {/* ÁREA PRINCIPAL DO BOARD: CONFORME ABA SELECIONADA         */}
        {/* ======================================================== */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* BARRA DE BUSCA E FILTROS EXPANSÍVEL */}
          {(buscaAberta ||
            filtrosAbertos ||
            filtroTexto ||
            filtroProjeto !== 'all' ||
            filtroPrioridade !== 'all' ||
            filtroFamilia !== 'all') && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-xs animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5B6470]" />
                  <Input
                    placeholder="Filtrar cards por título, tag, próximo passo..."
                    value={filtroTexto}
                    onChange={(e) => setFiltroTexto(e.target.value)}
                    className="pl-8 text-xs h-8 border-[#E5E1D8]"
                  />
                  {filtroTexto && (
                    <button
                      type="button"
                      onClick={() => setFiltroTexto('')}
                      className="absolute right-2.5 top-2 text-[11px] text-[#5B6470] hover:text-[#1A1D21]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="w-[150px]">
                  <Select value={filtroProjeto} onValueChange={setFiltroProjeto}>
                    <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                      <SelectValue placeholder="Projetos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Projetos</SelectItem>
                      {projetos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[130px]">
                  <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                    <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Prioridade: Todas</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[140px]">
                  <Select value={filtroFamilia} onValueChange={setFiltroFamilia}>
                    <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                      <SelectValue placeholder="Família" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Famílias</SelectItem>
                      <SelectItem value="sem_familia">Sem Família</SelectItem>
                      {familiasVisiveis.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botão limpar filtros se ativo */}
              {(filtroTexto ||
                filtroProjeto !== 'all' ||
                filtroPrioridade !== 'all' ||
                filtroFamilia !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroTexto('')
                    setFiltroProjeto('all')
                    setFiltroPrioridade('all')
                    setFiltroFamilia('all')
                  }}
                  className="text-xs text-[#0F766E] hover:underline font-semibold"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}

          {/* Breadcrumb / Indicador do foco atual se houver categoria ou fluxo ativo */}
          {(categoriaAtiva || fluxoAtivo) && (
            <div className="flex items-center justify-between bg-[#F4F2EE] px-3.5 py-2 rounded-lg border border-[#E5E1D8] text-xs">
              <div className="flex items-center gap-2 text-[#1A1D21]">
                <span className="font-semibold text-[#5B6470]">Visualizando:</span>
                {categoriaAtiva && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white rounded border border-[#E5E1D8] font-medium">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: categoriaAtiva.cor || '#0F766E' }}
                    />
                    {categoriaAtiva.nome}
                  </span>
                )}
                {fluxoAtivo && (
                  <>
                    <span className="text-[#5B6470]">/</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white rounded border border-[#E5E1D8] font-medium">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: fluxoAtivo.cor || '#0F766E' }}
                      />
                      {fluxoAtivo.nome || fluxoAtivo.titulo}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategoriaAtivaId('all')
                  setFluxoAtivoId('all')
                  setFluxoAtivoChave('all')
                }}
                className="text-[11px] text-[#0F766E] hover:underline font-medium"
              >
                Limpar foco (Ver tudo)
              </button>
            </div>
          )}
          {/* ======================================================== */}
          {/* ABA 1: QUADRO (KANBAN COM DRAG-AND-DROP E MODELO VISUAL) */}
          {/* ======================================================== */}
          {abaAtiva === 'QUADRO' && modoVisualizacao === 'colunas' && (
            <div className="flex gap-4 overflow-x-auto pb-4 items-start">
              {/* Botão "+" isolado na margem esquerda antes da primeira coluna como no modelo */}
              <div className="shrink-0 pt-7">
                <button
                  type="button"
                  onClick={() => abrirModalCriarCard()}
                  title="Criar novo card no fluxo"
                  className="w-10 h-10 rounded-xl bg-white border border-[#E5E1D8] text-[#5B6470] hover:text-[#0F766E] hover:border-[#0F766E] hover:shadow-xs flex items-center justify-center transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {colunasFiltradas.map((col, colIndex) => {
                const isUltimaColuna = colIndex === colunasFiltradas.length - 1
                const isColunaFinalizado =
                  col.is_conclusao === true ||
                  (isUltimaColuna &&
                    (col.titulo.toLowerCase().includes('finaliz') ||
                      col.titulo.toLowerCase().includes('termin') ||
                      col.chave.toLowerCase().includes('finaliz') ||
                      col.chave.toLowerCase().includes('termin')))

                const colCards = cardsFiltrados.filter((c) => c.status === col.chave)
                const familiasDaColuna = familias.filter(
                  (f) =>
                    f.coluna === col.id ||
                    (!f.coluna &&
                      (!col.categoria || !f.categoria || f.categoria === col.categoria)),
                )

                // Na coluna de finalizado, se o usuário não clicou em "Visualizar Todos", os cards individuais ficam recolhidos
                const mostrarCardsFinalizados = !!colunasConclusaoExpandidas[col.chave]

                return (
                  <div
                    key={col.id || col.chave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.chave)}
                    className="w-[310px] shrink-0 bg-[#F4F2EE]/50 rounded-2xl border border-[#E5E1D8]/80 p-3 flex flex-col min-h-[580px]"
                  >
                    {/* CABEÇALHO DA COLUNA MODELO DIAMONDGROUP: */}
                    {/* NOME EM MAIÚSCULAS + CONTAGEM + ÍCONES DE OBSERVAÇÃO / OPÇÕES */}
                    <div className="flex items-center justify-between pb-2 mb-2 px-1 gap-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: col.cor || '#0F766E' }}
                        />
                        {colunaEditandoId === col.id ? (
                          <Input
                            autoFocus
                            value={colunaEditandoTitulo}
                            onChange={(e) => setColunaEditandoTitulo(e.target.value)}
                            onBlur={() => handleSalvarEdicaoColunaInline(col)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSalvarEdicaoColunaInline(col)
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelarEdicaoColuna()
                              }
                            }}
                            className="h-6 text-xs font-bold uppercase tracking-wider px-1.5 py-0 bg-white border-[#0F766E] text-[#1A1D21]"
                          />
                        ) : (
                          <h3
                            onClick={() => handleIniciarEdicaoColuna(col)}
                            title="Clique para renomear coluna"
                            className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider truncate cursor-pointer hover:text-[#0F766E] hover:underline transition-colors flex items-center gap-1 group/title"
                          >
                            <span>{col.titulo}</span>
                            <span className="text-[#5B6470] font-normal group-hover/title:text-[#0F766E]">
                              {colCards.length}
                            </span>
                          </h3>
                        )}
                      </div>

                      {/* Ícone de comentário/observações + menu "..." */}
                      <div className="flex items-center gap-1 shrink-0 text-[#5B6470]">
                        <button
                          type="button"
                          title={`Comentários da coluna ${col.titulo}`}
                          onClick={() =>
                            toast({
                              title: `Coluna ${col.titulo}`,
                              description: `${colCards.length} demandas nesta etapa do fluxo.`,
                            })
                          }
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white hover:text-[#1A1D21] transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Opções da coluna"
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white hover:text-[#1A1D21] transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => abrirModalCriarCard(col.chave)}>
                              <Plus className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />+ Card nesta
                              coluna
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModalNovaFamilia(col.id)}>
                              <Layers className="w-3.5 h-3.5 mr-2 text-blue-600" />+ Grupo de
                              Família aqui
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleExcluirColunaBoard(col)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Excluir Coluna
                            </DropdownMenuItem>{' '}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* BOTÃO "+" PRÓPRIO NO TOPO: na coluna de conclusão o modelo da referência não mostra o botão '+' no topo */}
                    {!isColunaFinalizado ? (
                      <button
                        type="button"
                        onClick={() => abrirModalCriarCard(col.chave)}
                        title={`Adicionar novo card em ${col.titulo}`}
                        className="w-full h-9 rounded-xl bg-white hover:bg-white/90 border border-[#E5E1D8] shadow-2xs hover:shadow-xs flex items-center justify-center text-[#2563EB] hover:text-[#1D4ED8] mb-3 transition-all group"
                      >
                        <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </button>
                    ) : null}

                    {/* CARDS DA COLUNA */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {/* Se for coluna de conclusão e o usuário clicou em Visualizar Todos, exibe os cards acima do resumo */}
                      {isColunaFinalizado && mostrarCardsFinalizados && colCards.length > 0 && (
                        <div className="space-y-2.5 pb-2 border-b border-[#E5E1D8]/70 mb-2">
                          {colCards.map((card) =>
                            renderKanbanCard(card, () => abrirModalEditarCard(card)),
                          )}
                        </div>
                      )}

                      {/* Coluna normal: renderiza por família ou lista direta */}
                      {!isColunaFinalizado && agruparPorFamilia ? (
                        <>
                          {familiasDaColuna.map((fam) => {
                            const cardsDaFamilia = colCards.filter(
                              (c) => c.grupo_familia === fam.id,
                            )

                            return (
                              <div
                                key={fam.id}
                                onDragOver={handleDragOver}
                                onDrop={(e) => {
                                  e.stopPropagation()
                                  handleDrop(e, col.chave, fam.id)
                                }}
                                className="bg-white/60 rounded-xl p-2.5 border border-[#E5E1D8]/80 space-y-2"
                              >
                                <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E1D8]/60">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: fam.cor || '#3B82F6' }}
                                    />
                                    <span className="text-[11px] font-bold text-[#1A1D21] uppercase tracking-wide truncate">
                                      {fam.nome}
                                    </span>
                                    <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200 text-[10px] px-1 py-0 h-4">
                                      {cardsDaFamilia.length}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => abrirModalCriarCard(col.chave, fam.id)}
                                      title="Adicionar card nesta família"
                                      className="text-[#5B6470] hover:text-[#0F766E] p-0.5"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2.5">
                                  {cardsDaFamilia.map((card) =>
                                    renderKanbanCard(card, () => abrirModalEditarCard(card)),
                                  )}
                                  {cardsDaFamilia.length === 0 && (
                                    <div className="h-10 border border-dashed border-[#E5E1D8] rounded-lg flex items-center justify-center text-[10px] text-[#5B6470]/60">
                                      Arraste cards para esta família
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                          {/* Cards sem família nesta coluna */}
                          {(() => {
                            const cardsSemFamilia = colCards.filter((c) => !c.grupo_familia)
                            if (cardsSemFamilia.length === 0 && familiasDaColuna.length > 0)
                              return null

                            return (
                              <div
                                onDragOver={handleDragOver}
                                onDrop={(e) => {
                                  e.stopPropagation()
                                  handleDrop(e, col.chave, '')
                                }}
                                className="space-y-2.5 pt-1"
                              >
                                {familiasDaColuna.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#5B6470] uppercase px-1">
                                    <span>Outros / Sem Família ({cardsSemFamilia.length})</span>
                                  </div>
                                )}

                                {cardsSemFamilia.map((card) =>
                                  renderKanbanCard(card, () => abrirModalEditarCard(card)),
                                )}
                              </div>
                            )
                          })()}
                        </>
                      ) : !isColunaFinalizado ? (
                        colCards.map((card) =>
                          renderKanbanCard(card, () => abrirModalEditarCard(card)),
                        )
                      ) : null}

                      {colCards.length === 0 && !isColunaFinalizado && (
                        <div className="h-32 border-2 border-dashed border-[#E5E1D8] rounded-xl flex flex-col items-center justify-center text-xs text-[#5B6470]/60 gap-1 bg-white/40">
                          <span className="font-medium">Nenhum card</span>
                          <span className="text-[10px]">Arraste ou clique em "+"</span>
                        </div>
                      )}

                      {/* ESTADO ESPECIAL DA COLUNA DE CONCLUSÃO ("Finalizado") CONFORME MODELO DA IMAGEM DIAMONDGROUP */}
                      {isColunaFinalizado && (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center my-auto">
                          {/* Ícone de check sutil com traço limpo como no modelo */}
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#5B6470] mb-3">
                            <Check className="w-9 h-9 stroke-[1.75] text-[#5B6470]" />
                          </div>

                          {/* Texto exato: "Quantidade de cards finalizados" */}
                          <p className="text-xs text-[#5B6470] font-normal mb-2 leading-relaxed">
                            Quantidade de cards finalizados
                          </p>

                          {/* Número em destaque forte em tom azul #2563EB: "X cards" */}
                          <h4 className="text-[26px] font-black text-[#2563EB] tracking-tight mb-5 leading-none">
                            {colCards.length} {colCards.length === 1 ? 'card' : 'cards'}
                          </h4>

                          {/* Botão "Visualizar Todos" com fundo azul suave e texto azul */}
                          <button
                            type="button"
                            onClick={() => {
                              const novoEstado = !mostrarCardsFinalizados
                              setColunasConclusaoExpandidas((prev) => ({
                                ...prev,
                                [col.chave]: novoEstado,
                              }))
                              if (novoEstado && colCards.length === 0) {
                                toast({
                                  title: 'Fase de Conclusão',
                                  description:
                                    'Nenhum card finalizado até o momento. Conclua etapas arrastando cards para esta coluna.',
                                })
                              }
                            }}
                            className="px-6 py-2.5 rounded-lg bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] hover:text-[#0369A1] font-semibold text-xs transition-colors shadow-2xs active:scale-[0.98]"
                          >
                            {mostrarCardsFinalizados && colCards.length > 0
                              ? 'Ocultar Cards'
                              : 'Visualizar Todos'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {colunasFiltradas.length === 0 && (
                <div className="w-full bg-white p-8 rounded-xl border border-[#E5E1D8] text-center space-y-3">
                  <GitBranch className="w-10 h-10 text-[#5B6470]/40 mx-auto" />
                  <h3 className="text-sm font-semibold text-[#1A1D21]">
                    Nenhum fluxo cadastrado neste escopo
                  </h3>
                  <p className="text-xs text-[#5B6470] max-w-md mx-auto">
                    Crie fluxos de trabalho (ex: BACKLOG, ENCAMINHAR AO TECNICO, EM ANALISE, EM
                    DESENVOLVIMENTO, TERMINO) para organizar seus cards.
                  </p>
                  <Button
                    onClick={() =>
                      abrirModalNovoFluxo(categoriaAtivaId !== 'all' ? categoriaAtivaId : '')
                    }
                    className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Criar Fluxo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VISÃO LISTA DO QUADRO (quando QUADRO com toggle Lista)    */}
          {/* ======================================================== */}
          {abaAtiva === 'QUADRO' && modoVisualizacao === 'lista' && (
            <div className="bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
              <div className="p-3 border-b border-[#E5E1D8] bg-[#FAFAF9] flex items-center justify-between text-xs font-semibold text-[#5B6470]">
                <div className="flex items-center gap-2">
                  <ListIcon className="w-4 h-4 text-[#0F766E]" />
                  <span>Cards em Lista ({cardsFiltrados.length})</span>
                </div>
                <div className="text-[11px]">
                  Clique na linha para ver detalhes ou altere o fluxo pelo seletor
                </div>
              </div>

              <div className="divide-y divide-[#E5E1D8]/80">
                {cardsFiltrados.map((card) => {
                  const colunaAtual = colunasPorChave.get(card.status as string)
                  const familiaDoCard = familias.find((f) => f.id === card.grupo_familia)

                  return (
                    <div
                      key={card.id}
                      className="p-3 hover:bg-[#F4F2EE]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Lado Esquerdo: Título, Descrição, Família e Próximo Passo */}
                      <div
                        onClick={() => abrirModalEditarCard(card)}
                        className="flex-1 cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          {renderCardAvatar(card)}
                          {getPriorityBadge(card.prioridade)}

                          <h4 className="text-sm font-bold text-[#1A1D21] uppercase tracking-tight hover:text-[#0F766E] transition-colors">
                            {card.titulo}
                          </h4>

                          {card.criado_por_ia && (
                            <span
                              title="Criado pela IA"
                              className="text-[10px] text-[#0F766E] inline-flex items-center gap-0.5 bg-[#0F766E]/10 px-1.5 py-0.5 rounded"
                            >
                              <Sparkles className="w-3 h-3" />
                              IA
                            </span>
                          )}

                          {familiaDoCard && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: `${familiaDoCard.cor || '#3B82F6'}15`,
                                color: familiaDoCard.cor || '#3B82F6',
                                border: `1px solid ${familiaDoCard.cor || '#3B82F6'}30`,
                              }}
                            >
                              <Layers className="w-2.5 h-2.5" />
                              {familiaDoCard.nome}
                            </span>
                          )}
                        </div>

                        {card.descricao && (
                          <p className="text-xs text-[#5B6470] line-clamp-1">{card.descricao}</p>
                        )}

                        {card.proximo_passo && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-[#0F766E] font-medium">
                            <ArrowRight className="w-3 h-3 shrink-0" />
                            <span className="line-clamp-1">{card.proximo_passo}</span>
                          </div>
                        )}

                        {/* Metadados: Projeto, Contato, Tags */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5B6470] pt-0.5">
                          {card.expand?.projeto && (
                            <span className="inline-flex items-center gap-1 bg-[#F4F2EE] px-1.5 py-0.5 rounded">
                              <Building className="w-3 h-3" />
                              {card.expand.projeto.nome}
                            </span>
                          )}
                          {card.expand?.contato && (
                            <span className="inline-flex items-center gap-1 bg-[#F4F2EE] px-1.5 py-0.5 rounded">
                              <User className="w-3 h-3" />
                              {card.expand.contato.nome}
                            </span>
                          )}
                          {Array.isArray(card.tags) &&
                            card.tags.slice(0, 3).map((t, i) => (
                              <span
                                key={i}
                                className="bg-[#E5E1D8]/60 text-[#5B6470] px-1.5 py-0.2 rounded text-[10px]"
                              >
                                #{t}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Lado Direito: Seletor de Coluna/Fluxo direto da linha + Ações */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <div className="w-[180px]">
                          <Select
                            value={card.status}
                            onValueChange={(novoStatus) =>
                              handleMudarStatusCard(card.id, novoStatus)
                            }
                          >
                            <SelectTrigger className="text-xs h-8 border-[#E5E1D8] bg-white">
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: colunaAtual?.cor || '#0F766E',
                                  }}
                                />
                                <span className="truncate">
                                  {colunaAtual?.titulo || card.status}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {colunasOrdenadas.map((c) => (
                                <SelectItem key={c.chave} value={c.chave}>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: c.cor || '#0F766E' }}
                                    />
                                    <span>{c.titulo}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirCardFluxo(card)}
                          className="text-xs h-8 w-8 p-0 text-[#5B6470] hover:text-[#0F766E]"
                          title="Fluxos: Ver e revincular fluxo"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirCardArquivos(card)}
                          className="text-xs h-8 w-8 p-0 text-[#5B6470] hover:text-[#0F766E]"
                          title="Arquivos vinculados"
                        >
                          <Download className="w-3.5 h-3.5 rotate-180" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAbrirCardFamilia(card)}
                          className="text-xs h-8 w-8 p-0 text-[#5B6470] hover:text-[#0F766E]"
                          title="Família e relações"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/card/${card.id}`)}
                          className="text-xs h-8 px-2 text-[#2563EB] hover:text-[#1D4ED8]"
                          title="Abrir página completa do card"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8 px-2 text-[#5B6470] hover:text-[#1A1D21]"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => navigate(`/card/${card.id}`)}>
                              <ExternalLink className="w-3.5 h-3.5 mr-2 text-[#2563EB]" />
                              Abrir Página do Card
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModalEditarCard(card)}>
                              <Edit2 className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                              Editar Modal Rápido
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAbrirCardFluxo(card)}>
                              <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                              Fluxos (Revincular / Status)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAbrirCardArquivos(card)}>
                              <Download className="w-3.5 h-3.5 mr-2 rotate-180 text-blue-600" />
                              Arquivos Anexados
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAbrirCardFamilia(card)}>
                              <Users className="w-3.5 h-3.5 mr-2 text-purple-600" />
                              Família & Relações...
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleExcluirCard(card.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Excluir Card
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}

                {cardsFiltrados.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#5B6470] space-y-2">
                    <p>Nenhum card encontrado com os filtros aplicados.</p>
                    <Button
                      onClick={() => abrirModalCriarCard()}
                      size="sm"
                      className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Criar Novo Card
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 2: TABELA (VISÃO EM TABELA ESTRUTURADA DE CARDS)      */}
          {/* ======================================================== */}
          {abaAtiva === 'TABELA' && (
            <FluxoTabelaView
              cards={cardsFiltrados}
              colunasPorChave={colunasPorChave}
              familias={familias}
              projetos={projetos}
              contatos={contatos}
              onEditarCard={abrirModalEditarCard}
              onCriarCard={() => abrirModalCriarCard()}
            />
          )}

          {/* ======================================================== */}
          {/* ABA 3: GANTT (LINHA DO TEMPO DOS CARDS AO LONGO DOS DIAS) */}
          {/* ======================================================== */}
          {abaAtiva === 'GANTT' && (
            <FluxoGanttView
              cards={cardsFiltrados}
              colunasOrdenadas={colunasOrdenadas}
              onEditarCard={abrirModalEditarCard}
            />
          )}

          {/* ======================================================== */}
          {/* ABA 4: INDICADORES (PAINEL DE MÉTRICAS E DISTRIBUIÇÃO)   */}
          {/* ======================================================== */}
          {abaAtiva === 'INDICADORES' && (
            <FluxoIndicadoresView
              cards={cardsFiltrados}
              colunasOrdenadas={colunasOrdenadas}
              familias={familias}
              projetos={projetos}
              contatos={contatos}
            />
          )}
        </div>{' '}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CRIAR / EDITAR CARD */}
      {/* ======================================================== */}
      <Dialog open={modalCardOpen} onOpenChange={setModalCardOpen}>
        <DialogContent className="max-w-xl bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              {editingCard ? 'Editar Card de Demanda' : 'Criar Novo Card'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarCard} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Título da Demanda *</label>
              <Input
                required
                placeholder="Ex: Apresentar tabela de precificação para Helena"
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Descrição / Contexto</label>
              <Textarea
                rows={2}
                placeholder="Detalhamento da demanda, histórico ou requisitos..."
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0F766E]">Próximo Passo Imediato</label>
              <Input
                placeholder="Ex: Enviar planilha de custos até 15h"
                value={formProximoPasso}
                onChange={(e) => setFormProximoPasso(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Status / Fluxo</label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v)}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colunasOrdenadas.map((col) => (
                      <SelectItem key={col.chave} value={col.chave}>
                        {col.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Grupo de Família</label>
                <Select value={formFamilia} onValueChange={setFormFamilia}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Sem Família)</SelectItem>
                    {familias.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prioridade</label>
                <Select
                  value={formPrioridade}
                  onValueChange={(v) => setFormPrioridade(v as CardPrioridade)}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
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
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Projeto</label>
                <Select value={formProjeto} onValueChange={setFormProjeto}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Negócio</label>
                <Select value={formNegocio} onValueChange={setFormNegocio}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {negocios.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Contato</label>
                <Select value={formContato} onValueChange={setFormContato}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {contatos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Prazo Limite do Card</label>
                <Input
                  type="date"
                  value={formDataPrazo}
                  onChange={(e) => setFormDataPrazo(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">
                  Tags (separadas por vírgula)
                </label>
                <Input
                  placeholder="Ex: feedback, revisao, urgente"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            {/* Configuração de Lembrete do Card Kanban */}
            <div className="p-2.5 rounded-lg border border-[#0F766E]/30 bg-[#0F766E]/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F766E]">Lembrete de Vencimento</span>
                <div className="flex items-center gap-1">
                  {(['padrao', 'personalizado', 'desativado'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormLembreteModo(m)}
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors ${
                        formLembreteModo === m
                          ? 'bg-[#0F766E] text-white shadow-2xs'
                          : 'bg-white text-[#5B6470] border border-[#E5E1D8]'
                      }`}
                    >
                      {m === 'padrao'
                        ? 'Padrão'
                        : m === 'personalizado'
                          ? 'Personalizar'
                          : 'Desativar'}
                    </button>
                  ))}
                </div>
              </div>

              {formLembreteModo === 'personalizado' && (
                <div className="pt-1.5 border-t border-[#0F766E]/20 space-y-1">
                  <span className="text-[10px] text-[#5B6470] block">
                    Antecedências para avisar no sino e por e-mail:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { c: '1h', l: '1 hora' },
                      { c: '2h', l: '2 horas' },
                      { c: '1d', l: '1 dia' },
                      { c: '2d', l: '2 dias' },
                      { c: '1w', l: '1 sem' },
                    ].map((opt) => {
                      const optCode = opt.c as import('@/types').LembreteAntecedenciaCodigo
                      const ativo = formLembreteAntecedencias.includes(optCode)
                      return (
                        <button
                          key={opt.c}
                          type="button"
                          onClick={() => {
                            setFormLembreteAntecedencias((prev) =>
                              ativo ? prev.filter((x) => x !== optCode) : [...prev, optCode],
                            )
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            ativo
                              ? 'bg-[#0F766E] border-[#0F766E] text-white font-bold'
                              : 'bg-white border-[#E5E1D8] text-[#5B6470]'
                          }`}
                        >
                          {opt.l}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between items-center pt-4 border-t border-[#E5E1D8]">
              {editingCard ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExcluirCard(editingCard.id)}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                >
                  Excluir Card
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalCardOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoCard}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
                >
                  {salvandoCard ? 'Salvando...' : 'Salvar Card'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: CRIAR / EDITAR CATEGORIA */}
      {/* ======================================================== */}
      <Dialog open={modalCategoriaOpen} onOpenChange={setModalCategoriaOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarCategoria} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome da Categoria *</label>
              <Input
                required
                placeholder="Ex: Geral, Business, Remineração..."
                value={catNome}
                onChange={(e) => setCatNome(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Descrição (opcional)</label>
              <Input
                placeholder="Ex: Acompanhamento de propostas comerciais e demandas"
                value={catDescricao}
                onChange={(e) => setCatDescricao(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                Nome das Fases padrão da Categoria (opcional)
              </label>
              <Input
                placeholder="Ex: Etapas do Funil, Fases Gerais..."
                value={catTituloFases}
                onChange={(e) => setCatTituloFases(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
              <span className="text-[10px] text-[#5B6470]">
                Exibido no cabeçalho quando a categoria inteira estiver selecionada.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Cor de Identificação</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catCor}
                  onChange={(e) => setCatCor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                />
                <Input
                  value={catCor}
                  onChange={(e) => setCatCor(e.target.value)}
                  className="text-xs border-[#E5E1D8] font-mono w-28"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalCategoriaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoCat}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {salvandoCat ? 'Salvando...' : 'Salvar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: CRIAR / EDITAR FLUXO (COLUNA) */}
      {/* ======================================================== */}
      <Dialog open={modalFluxoOpen} onOpenChange={setModalFluxoOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              {editingFluxo ? 'Editar Fluxo / Coluna' : 'Novo Fluxo / Coluna'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarFluxo} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">
                {editingFluxo ? 'Nome do Fluxo *' : 'Nome do Fluxo / Negócio *'}
              </label>
              <Input
                required
                placeholder={
                  editingFluxo
                    ? 'Ex: Operação Comercial, Manutenção, Business Carros...'
                    : 'Ex: Business Carros, Vendas Imóveis, Suporte...'
                }
                value={fluxoTitulo}
                onChange={(e) => setFluxoTitulo(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
              <span className="text-[10px] text-[#5B6470]">
                {editingFluxo
                  ? 'Nome deste fluxo dentro da categoria.'
                  : 'Exemplo: "Business Carros" criará o fluxo com suas fases automaticamente.'}
              </span>
            </div>

            {/* SELEÇÃO DA CATEGORIA (disponível tanto na criação quanto na edição) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[#FAFAF9] border border-[#E5E1D8]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1A1D21] flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Categoria do Fluxo *</span>
                </label>
                <button
                  type="button"
                  onClick={() => abrirModalNovaCategoria()}
                  className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Nova Categoria
                </button>
              </div>

              <Select value={fluxoCategoriaId} onValueChange={setFluxoCategoriaId}>
                <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione a categoria para este fluxo" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.cor || '#0F766E' }}
                        />
                        <span>{c.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[10px] text-[#5B6470] block">
                O fluxo ficará organizado dentro desta categoria na árvore lateral.
              </span>
            </div>

            {/* SELEÇÃO DE MODELO PRONTO DE FASES (apenas ao criar novo fluxo) */}
            {!editingFluxo && (
              <div className="space-y-2 p-3 rounded-xl bg-[#F4F2EE]/50 border border-[#E5E1D8]">
                <label className="text-xs font-bold text-[#1A1D21] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Modelo de Fases (Template do Board)</span>
                </label>
                <Select
                  value={fluxoTemplateSelecionado}
                  onValueChange={setFluxoTemplateSelecionado}
                >
                  <SelectTrigger className="text-xs bg-white border-[#E5E1D8]">
                    <SelectValue placeholder="Selecione o modelo de fases" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELOS_FLUXO_TEMPLATES.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id} className="text-xs">
                        {tmpl.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(() => {
                  const tmplAtual = MODELOS_FLUXO_TEMPLATES.find(
                    (t) => t.id === fluxoTemplateSelecionado,
                  )
                  if (!tmplAtual) return null
                  return (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-[#5B6470]">{tmplAtual.descricao}</p>
                      {tmplAtual.fases.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {tmplAtual.fases.map((f, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-black/10 text-white shadow-2xs"
                              style={{ backgroundColor: f.cor }}
                            >
                              {f.titulo}
                              {f.is_conclusao && <CheckCircle2 className="w-2.5 h-2.5 ml-0.5" />}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                Nome das Fases (opcional — título exibido no cabeçalho)
              </label>
              <Input
                placeholder="Ex: Fases de Vendas, Etapas do Projeto..."
                value={fluxoTituloFases}
                onChange={(e) => setFluxoTituloFases(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
              <span className="text-[10px] text-[#5B6470]">
                Título exibido no cabeçalho do board, independente do nome do fluxo.
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <label className="text-xs font-semibold text-[#5B6470]">Cor do Fluxo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fluxoCor}
                    onChange={(e) => setFluxoCor(e.target.value)}
                    className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                  />
                  <Input
                    value={fluxoCor}
                    onChange={(e) => setFluxoCor(e.target.value)}
                    className="text-xs border-[#E5E1D8] font-mono w-28"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalFluxoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoFluxo}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {salvandoFluxo ? 'Salvando...' : 'Salvar Fluxo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 4: CRIAR / EDITAR GRUPO DE FAMÍLIA */}
      {/* ======================================================== */}
      <Dialog open={modalFamiliaOpen} onOpenChange={setModalFamiliaOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21]">
              {editingFamilia ? 'Editar Grupo de Família' : 'Novo Grupo de Família'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarFamilia} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">
                Nome do Grupo / Família *
              </label>
              <Input
                required
                placeholder="Ex: Família de Sensores, Linha Premium, Suporte..."
                value={familiaNome}
                onChange={(e) => setFamiliaNome(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">
                  Vincular a Fluxo (opcional)
                </label>
                <Select value={familiaColunaId} onValueChange={setFamiliaColunaId}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Todas as colunas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas / Global</SelectItem>
                    {colunasOrdenadas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Categoria (opcional)</label>
                <Select value={familiaCategoriaId} onValueChange={setFamiliaCategoriaId}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas</SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Cor da Família</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={familiaCor}
                  onChange={(e) => setFamiliaCor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                />
                <Input
                  value={familiaCor}
                  onChange={(e) => setFamiliaCor(e.target.value)}
                  className="text-xs border-[#E5E1D8] font-mono w-28"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalFamiliaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoFamilia}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {salvandoFamilia ? 'Salvando...' : 'Salvar Grupo de Família'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: RENOMEAR CATEGORIA (FOCADO)                       */}
      {/* ======================================================== */}
      <Dialog open={modalRenomearCatOpen} onOpenChange={setModalRenomearCatOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#0F766E]" />
              <span>Renomear Categoria</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarRenomearCategoria} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome da Categoria *</label>
              <Input
                autoFocus
                required
                placeholder="Ex: Geral, Propostas, Atendimento..."
                value={novoNomeCategoria}
                onChange={(e) => setNovoNomeCategoria(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalRenomearCatOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoRenomearCat}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {salvandoRenomearCat ? 'Salvando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: RENOMEAR FLUXO (FOCADO)                           */}
      {/* ======================================================== */}
      <Dialog open={modalRenomearFluxoOpen} onOpenChange={setModalRenomearFluxoOpen}>
        <DialogContent className="max-w-md bg-white border border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#1A1D21] flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#0F766E]" />
              <span>Renomear Fluxo</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarRenomearFluxo} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome do Fluxo *</label>
              <Input
                autoFocus
                required
                placeholder="Ex: Operação Comercial, Manutenção..."
                value={novoNomeFluxo}
                onChange={(e) => setNovoNomeFluxo(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4 border-t border-[#E5E1D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalRenomearFluxoOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoRenomearFluxo}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
              >
                {salvandoRenomearFluxo ? 'Salvando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 5: EDITAR FASES DO FLUXO (CENTRALIZADO)            */}
      {/* ======================================================== */}
      <ModalEditarFases
        open={modalEditarFasesOpen}
        onOpenChange={setModalEditarFasesOpen}
        categoriaAtiva={categoriaAtiva}
        fluxoAtivo={fluxoAtivo}
        colunas={colunas}
        onFasesAtualizadas={async () => {
          await Promise.all([
            recarregarFluxoGlobal().catch(() => {}),
            carregarDados().catch(() => {}),
          ])
          toast({
            title: 'Fases do fluxo atualizadas com sucesso!',
          })
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 6: FLUXOS DO CARD (REVINCULAR & STATUS INATIVAR)   */}
      {/* ======================================================== */}
      <ModalCardFluxo
        open={modalCardFluxoOpen}
        onOpenChange={setModalCardFluxoOpen}
        card={cardAcoesEmFoco}
        categorias={categorias}
        fluxos={fluxos}
        colunas={colunas}
        onAtualizado={async () => {
          await Promise.all([
            recarregarFluxoGlobal().catch(() => {}),
            carregarDados().catch(() => {}),
          ])
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 7: ARQUIVOS VINCULADOS AO CARD                     */}
      {/* ======================================================== */}
      <ModalCardArquivos
        open={modalCardArquivosOpen}
        onOpenChange={setModalCardArquivosOpen}
        card={cardAcoesEmFoco}
        onAtualizado={async () => {
          await carregarDados()
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 8: FAMÍLIA E RELAÇÕES DO CARD (PAI, FILHO, DUP...) */}
      {/* ======================================================== */}
      <ModalCardFamilia
        open={modalCardFamiliaOpen}
        onOpenChange={setModalCardFamiliaOpen}
        card={cardAcoesEmFoco}
        todosCards={cards}
        categorias={categorias}
        fluxos={fluxos}
        colunas={colunas}
        onAtualizado={async () => {
          await Promise.all([
            recarregarFluxoGlobal().catch(() => {}),
            carregarDados().catch(() => {}),
          ])
        }}
        onExcluirCard={async (c) => {
          await handleExcluirCard(c.id)
        }}
      />
    </div>
  )
}
