import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import type {
  Card as CardType,
  Projeto,
  Negocio,
  Contato,
  CardPrioridade,
  CategoriaFluxo,
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
  Edit2,
  Trash2,
  Columns,
  List as ListIcon,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Building,
  User,
  Calendar,
} from 'lucide-react'
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

export default function Fluxo() {
  const [searchParams] = useSearchParams()
  const buscaParam = searchParams.get('busca') || ''
  const { toast } = useToast()

  // Integração com o NavegacaoContext (Segunda coluna global do Layout)
  const navGlobal = useNavegacao()
  const {
    categoriaAtivaId: globalCatId,
    setCategoriaAtivaId: setGlobalCatId,
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
  } = navGlobal

  // Dados principais
  const [cards, setCards] = useState<CardType[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])

  // Hierarquia: Categorias -> Fluxos (Colunas) -> Grupos de Família
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  const [familias, setFamilias] = useState<GrupoFamilia[]>([])

  // Usamos as seleções ativas sincronizadas com o estado global
  const categoriaAtivaId = globalCatId
  const setCategoriaAtivaId = setGlobalCatId
  const fluxoAtivoChave = globalFluxoChave
  const setFluxoAtivoChave = setGlobalFluxoChave

  // Controle de expansão das categorias no painel lateral: { [catId]: boolean }
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Record<string, boolean>>({})

  // Painel lateral embutido: visível apenas se a segunda coluna global estiver fechada
  const [sidebarAberta, setSidebarAberta] = useState<boolean>(false)

  // Alternância de visualização: 'colunas' (Kanban) ou 'lista' (Linhas empilhadas)
  const [modoVisualizacao, setModoVisualizacao] = useState<'colunas' | 'lista'>('colunas')

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
  const [salvandoCard, setSalvandoCard] = useState(false)

  // 2. Modal Categoria
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaFluxo | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#0F766E')
  const [catDescricao, setCatDescricao] = useState('')
  const [salvandoCat, setSalvandoCat] = useState(false)

  // 3. Modal Fluxo / Coluna
  const [modalFluxoOpen, setModalFluxoOpen] = useState(false)
  const [editingFluxo, setEditingFluxo] = useState<ColunaFluxo | null>(null)
  const [fluxoTitulo, setFluxoTitulo] = useState('')
  const [fluxoChave, setFluxoChave] = useState('')
  const [fluxoCor, setFluxoCor] = useState('#0F766E')
  const [fluxoCategoriaId, setFluxoCategoriaId] = useState<string>('')
  const [salvandoFluxo, setSalvandoFluxo] = useState(false)

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
      const [c, p, n, ct, cats, cols, fams] = await Promise.all([
        diamondApi.listCards(),
        diamondApi.listProjetos(),
        diamondApi.listNegocios(),
        diamondApi.listContatos(),
        diamondApi.listCategoriasFluxo(),
        diamondApi.listColunasFluxo(),
        diamondApi.listGruposFamilia(),
      ])

      setCards(c)
      setProjetos(p)
      setNegocios(n)
      setContatos(ct)
      setCategorias(cats)
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

  // Colunas a exibir no Kanban com base na categoria ativa e no foco de fluxo
  const colunasFiltradas = useMemo(() => {
    let filtradas = colunasOrdenadas

    if (categoriaAtivaId !== 'all') {
      filtradas = filtradas.filter((col) => col.categoria === categoriaAtivaId)
    }

    if (fluxoAtivoChave !== 'all') {
      filtradas = filtradas.filter((col) => col.chave === fluxoAtivoChave)
    }

    return filtradas
  }, [colunasOrdenadas, categoriaAtivaId, fluxoAtivoChave])

  // Categorias com contagens e lista dos seus fluxos
  const categoriasComFluxos = useMemo(() => {
    return categorias.map((cat) => {
      const fluxosDaCat = colunasOrdenadas.filter((c) => c.categoria === cat.id)
      const chavesDaCat = fluxosDaCat.map((c) => c.chave)
      const cardCount = cards.filter((card) => chavesDaCat.includes(card.status as string)).length
      return {
        ...cat,
        fluxos: fluxosDaCat,
        cardCount,
      }
    })
  }, [categorias, colunasOrdenadas, cards])

  // Categoria ativa selecionada
  const categoriaAtiva = useMemo(() => {
    if (categoriaAtivaId === 'all') return null
    return categorias.find((c) => c.id === categoriaAtivaId) || null
  }, [categorias, categoriaAtivaId])

  // Fluxo ativo focado
  const fluxoAtivo = useMemo(() => {
    if (fluxoAtivoChave === 'all') return null
    return colunas.find((c) => c.chave === fluxoAtivoChave) || null
  }, [colunas, fluxoAtivoChave])

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
    // Escopo de categoria/fluxo
    const chavesPermitidas =
      fluxoAtivoChave !== 'all'
        ? [fluxoAtivoChave]
        : categoriaAtivaId !== 'all'
          ? colunas.filter((c) => c.categoria === categoriaAtivaId).map((c) => c.chave)
          : null // 'all' permite todos os cards

    return cards.filter((card) => {
      // Escopo de categoria/fluxo
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
    fluxoAtivoChave,
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
      tags: tagsArray,
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

  // ==========================================
  // HANDLERS DE CATEGORIA
  // ==========================================
  const abrirModalNovaCategoria = () => {
    setEditingCategoria(null)
    setCatNome('')
    setCatCor('#0F766E')
    setCatDescricao('')
    setModalCategoriaOpen(true)
  }

  const abrirModalEditarCategoria = (cat: CategoriaFluxo) => {
    setEditingCategoria(cat)
    setCatNome(cat.nome)
    setCatCor(cat.cor || '#0F766E')
    setCatDescricao(cat.descricao || '')
    setModalCategoriaOpen(true)
  }

  const handleSalvarCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catNome.trim()) return
    setSalvandoCat(true)

    const payload: Partial<CategoriaFluxo> = {
      nome: catNome.trim(),
      cor: catCor,
      descricao: catDescricao.trim() || undefined,
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
        setFluxoAtivoChave('all')
      }
      setModalCategoriaOpen(false)
      await carregarDados()
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

  // ==========================================
  // HANDLERS DE FLUXO / COLUNA
  // ==========================================
  const abrirModalNovoFluxo = (catId?: string) => {
    setEditingFluxo(null)
    setFluxoTitulo('')
    setFluxoChave('')
    setFluxoCor('#0F766E')
    const catDestino =
      catId && catId !== 'all'
        ? catId
        : categoriaAtivaId !== 'all'
          ? categoriaAtivaId
          : categorias[0]?.id || ''
    setFluxoCategoriaId(catDestino)
    setModalFluxoOpen(true)
  }

  const abrirModalEditarFluxo = (col: ColunaFluxo) => {
    setEditingFluxo(col)
    setFluxoTitulo(col.titulo)
    setFluxoChave(col.chave)
    setFluxoCor(col.cor || '#0F766E')
    setFluxoCategoriaId(col.categoria || '')
    setModalFluxoOpen(true)
  }

  const handleSalvarFluxo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fluxoTitulo.trim()) return
    setSalvandoFluxo(true)

    const chaveGerada =
      fluxoChave.trim() ||
      fluxoTitulo
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      `fluxo_${Date.now()}`

    const payload: Partial<ColunaFluxo> = {
      titulo: fluxoTitulo.trim(),
      chave: chaveGerada,
      cor: fluxoCor,
      categoria: fluxoCategoriaId || undefined,
      ordem: editingFluxo ? editingFluxo.ordem : colunas.length + 1,
    }

    try {
      if (editingFluxo) {
        await diamondApi.updateColunaFluxo(editingFluxo.id, payload)
        toast({ title: 'Fluxo atualizado com sucesso!' })
      } else {
        await diamondApi.createColunaFluxo(payload)
        toast({ title: `Fluxo "${fluxoTitulo}" criado com sucesso!` })
      }
      setModalFluxoOpen(false)
      await carregarDados()
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

  const handleExcluirFluxo = async (col: ColunaFluxo) => {
    if (
      !confirm(
        `Deseja realmente excluir o fluxo "${col.titulo}"? Os cards com esse status ficarão órfãos se não forem movidos.`,
      )
    ) {
      return
    }
    try {
      await diamondApi.deleteColunaFluxo(col.id)
      toast({ title: 'Fluxo removido com sucesso.' })
      if (fluxoAtivoChave === col.chave) {
        setFluxoAtivoChave('all')
      }
      await carregarDados()
    } catch (err) {
      toast({
        title: 'Erro ao excluir fluxo',
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

    // Atualização otimista
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

  return (
    <div className="flex flex-col gap-4">
      {/* CABEÇALHO PRINCIPAL COM CONTROLES */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSidebarAberta(!sidebarAberta)}
            className="text-xs h-8 px-2.5 border-[#E5E1D8] text-[#5B6470] hover:text-[#1A1D21] hover:bg-[#F4F2EE] gap-1.5"
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

          <div>
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#0F766E]" />
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#1A1D21]">
                Fluxo Kanban Diamond
              </h1>
              <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
                {cardsFiltrados.length} Cards
              </Badge>
            </div>
            <p className="text-[11px] text-[#5B6470]">
              {categoriaAtiva
                ? `Categoria: ${categoriaAtiva.nome}${fluxoAtivo ? ` • Fluxo: ${fluxoAtivo.titulo}` : ''}`
                : 'Todas as categorias e fluxos'}
            </p>
          </div>
        </div>

        {/* Ações do cabeçalho: Alternância Coluna / Lista e Novo Card */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Alternância Coluna (Kanban) / Lista */}
          <div className="inline-flex rounded-lg border border-[#E5E1D8] bg-[#F4F2EE] p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setModoVisualizacao('colunas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                modoVisualizacao === 'colunas'
                  ? 'bg-white text-[#1A1D21] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Colunas</span>
            </button>
            <button
              type="button"
              onClick={() => setModoVisualizacao('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                modoVisualizacao === 'lista'
                  ? 'bg-white text-[#1A1D21] shadow-xs'
                  : 'text-[#5B6470] hover:text-[#1A1D21]'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Lista</span>
            </button>
          </div>

          <Button
            onClick={() => abrirModalCriarCard()}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 px-3.5 font-medium shadow-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Card
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
                setFluxoAtivoChave('all')
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoriaAtivaId === 'all' && fluxoAtivoChave === 'all'
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
                  categoriaAtivaId === 'all' && fluxoAtivoChave === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#E5E1D8] text-[#5B6470]'
                }`}
              >
                {cards.length}
              </Badge>
            </button>

            {/* Árvore de Categorias e Fluxos */}
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
                        isCatAtiva && fluxoAtivoChave === 'all'
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
                          isCatAtiva && fluxoAtivoChave === 'all'
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
                            isCatAtiva && fluxoAtivoChave === 'all'
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
                                isCatAtiva && fluxoAtivoChave === 'all'
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

                    {/* Subitens: Fluxos pertencentes a essa categoria */}
                    {isExpanded && (
                      <div className="p-1 pl-4 space-y-0.5 border-t border-[#E5E1D8]/60 bg-white">
                        {cat.fluxos.map((fluxo) => {
                          const isFluxoAtivo = isCatAtiva && fluxoAtivoChave === fluxo.chave
                          const cardsDoFluxo = cards.filter(
                            (card) => card.status === fluxo.chave,
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
                                  setFluxoAtivoChave(fluxo.chave)
                                }}
                                className="flex-1 flex items-center gap-2 text-left truncate"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: fluxo.cor || '#0F766E' }}
                                />
                                <span className="truncate">{fluxo.titulo}</span>
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
                                      onClick={() => abrirModalCriarCard(fluxo.chave)}
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
                                    <DropdownMenuItem onClick={() => abrirModalEditarFluxo(fluxo)}>
                                      <Edit2 className="w-3.5 h-3.5 mr-2" />
                                      Editar Fluxo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleExcluirFluxo(fluxo)}
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

                        {cat.fluxos.length === 0 && (
                          <div className="py-1 px-2 text-[11px] text-[#5B6470]/70 italic flex items-center justify-between">
                            <span>Sem fluxos</span>
                            <button
                              type="button"
                              onClick={() => abrirModalNovoFluxo(cat.id)}
                              className="text-[#0F766E] hover:underline text-[10px]"
                            >
                              + Adicionar
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
        {/* ÁREA PRINCIPAL DO BOARD: FILTROS + VISÃO COLUNAS OU LISTA */}
        {/* ======================================================== */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* BARRA DE FILTROS & VISÕES */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E1D8] shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#5B6470]" />
                <Input
                  placeholder="Filtrar cards por título, tag, próximo passo..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="pl-8 text-xs h-8 border-[#E5E1D8]"
                />
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

            {/* Toggle de agrupamento por família (relevante na visão colunas) */}
            {modoVisualizacao === 'colunas' && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={agruparPorFamilia ? 'default' : 'outline'}
                  onClick={() => setAgruparPorFamilia(!agruparPorFamilia)}
                  className={`text-xs h-8 gap-1.5 ${
                    agruparPorFamilia
                      ? 'bg-[#0F766E] hover:bg-[#0D5C56] text-white'
                      : 'border-[#E5E1D8] text-[#5B6470]'
                  }`}
                  title="Agrupar cards em subseções por Grupo de Família"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {agruparPorFamilia ? 'Famílias Ativas' : 'Visão Contínua'}
                </Button>
              </div>
            )}
          </div>

          {/* Breadcrumb / Indicador do foco atual se houver filtro selecionado */}
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
                      {fluxoAtivo.titulo}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCategoriaAtivaId('all')
                  setFluxoAtivoChave('all')
                }}
                className="text-[11px] text-[#0F766E] hover:underline font-medium"
              >
                Limpar foco (Ver tudo)
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* VISÃO 1: EM COLUNAS (KANBAN COM DRAG-AND-DROP) */}
          {/* ======================================================== */}
          {modoVisualizacao === 'colunas' && (
            <div className="flex gap-4 overflow-x-auto pb-4 items-start">
              {colunasFiltradas.map((col) => {
                const colCards = cardsFiltrados.filter((c) => c.status === col.chave)
                const familiasDaColuna = familias.filter(
                  (f) =>
                    f.coluna === col.id ||
                    (!f.coluna &&
                      (!col.categoria || !f.categoria || f.categoria === col.categoria)),
                )

                return (
                  <div
                    key={col.id || col.chave}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col.chave)}
                    className="w-[300px] shrink-0 bg-[#FAFAF9] rounded-xl border border-[#E5E1D8] p-3 flex flex-col min-h-[580px] shadow-2xs"
                  >
                    {/* Header da Coluna */}
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#E5E1D8]/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: col.cor || '#0F766E' }}
                        />
                        <h3 className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider truncate">
                          {col.titulo}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-semibold text-[#5B6470] bg-[#E5E1D8]/60 px-2 py-0.5 rounded-full">
                          {colCards.length}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Opções da coluna"
                              className="p-1 text-[#5B6470] hover:text-[#1A1D21] rounded"
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
                            <DropdownMenuItem onClick={() => abrirModalEditarFluxo(col)}>
                              <Edit2 className="w-3.5 h-3.5 mr-2" />
                              Editar Fluxo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleExcluirFluxo(col)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Excluir Fluxo
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Botão rápido para criar card ou família na coluna */}
                    <div className="flex items-center gap-1 mb-2.5">
                      <button
                        type="button"
                        onClick={() => abrirModalCriarCard(col.chave)}
                        className="flex-1 py-1 px-2 rounded border border-dashed border-[#E5E1D8] text-[11px] text-[#5B6470] hover:text-[#0F766E] hover:border-[#0F766E]/40 hover:bg-white flex items-center justify-center gap-1 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        Card
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirModalNovaFamilia(col.id)}
                        title="Criar novo grupo de família neste fluxo"
                        className="py-1 px-2 rounded border border-dashed border-[#E5E1D8] text-[11px] text-[#5B6470] hover:text-blue-600 hover:border-blue-300 hover:bg-white flex items-center justify-center gap-1 transition-all"
                      >
                        <Layers className="w-3 h-3" />
                        Família
                      </button>
                    </div>

                    {/* Cards: Agrupados por família ou contínuos */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {agruparPorFamilia ? (
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
                                className="bg-white/70 rounded-lg p-2 border border-[#E5E1D8]/80 space-y-2"
                              >
                                <div className="flex items-center justify-between pb-1 border-b border-[#E5E1D8]/60">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: fam.cor || '#3B82F6' }}
                                    />
                                    <span className="text-[11px] font-semibold text-[#1A1D21] truncate">
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
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          aria-label="Opções da família"
                                          className="text-[#5B6470] hover:text-[#1A1D21] p-0.5"
                                        >
                                          <MoreVertical className="w-3 h-3" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="text-xs">
                                        <DropdownMenuItem
                                          onClick={() => abrirModalEditarFamilia(fam)}
                                        >
                                          <Edit2 className="w-3 h-3 mr-2" />
                                          Editar Família
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleExcluirFamilia(fam)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="w-3 h-3 mr-2" />
                                          Excluir Família
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {cardsDaFamilia.map((card) =>
                                    renderKanbanCard(card, () => abrirModalEditarCard(card)),
                                  )}
                                  {cardsDaFamilia.length === 0 && (
                                    <div className="h-10 border border-dashed border-[#E5E1D8] rounded flex items-center justify-center text-[10px] text-[#5B6470]/60">
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
                                className="space-y-2 pt-1"
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
                      ) : (
                        colCards.map((card) =>
                          renderKanbanCard(card, () => abrirModalEditarCard(card)),
                        )
                      )}

                      {colCards.length === 0 && (
                        <div className="h-32 border-2 border-dashed border-[#E5E1D8] rounded-lg flex flex-col items-center justify-center text-xs text-[#5B6470]/60 gap-1">
                          <span>Nenhum card</span>
                          <span className="text-[10px]">Solte cards aqui</span>
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
          {/* VISÃO 2: EM LISTA (LINHAS EMPILHADAS COM AÇÕES RÁPIDAS) */}
          {/* ======================================================== */}
          {modoVisualizacao === 'lista' && (
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
                          {getPriorityBadge(card.prioridade)}

                          <h4 className="text-sm font-semibold text-[#1A1D21] hover:text-[#0F766E] transition-colors">
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
                          onClick={() => abrirModalEditarCard(card)}
                          className="text-xs h-8 px-2 text-[#5B6470] hover:text-[#1A1D21]"
                          title="Editar Card"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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
                            <DropdownMenuItem onClick={() => abrirModalEditarCard(card)}>
                              <Edit2 className="w-3.5 h-3.5 mr-2" />
                              Ver / Editar Card
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
        </div>
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                Tags (separadas por vírgula)
              </label>
              <Input
                placeholder="Ex: feedback, revisao, pagamento, urgente"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
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
              <label className="text-xs font-semibold text-[#1A1D21]">Título do Fluxo *</label>
              <Input
                required
                placeholder="Ex: BACKLOG, ENCAMINHAR AO TECNICO, EM ANALISE..."
                value={fluxoTitulo}
                onChange={(e) => setFluxoTitulo(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">
                Categoria Pertencente *
              </label>
              <Select value={fluxoCategoriaId} onValueChange={setFluxoCategoriaId}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione a Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#5B6470]">Cor da Etapa</label>
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
    </div>
  )

  // Card renderizado na visão em Colunas (Kanban)
  function renderKanbanCard(card: CardType, onEdit: () => void) {
    const familiaDoCard = familias.find((f) => f.id === card.grupo_familia)

    return (
      <div
        key={card.id}
        draggable
        onDragStart={(e) => handleDragStart(e, card.id)}
        onClick={onEdit}
        className={`p-3 rounded-lg bg-white border border-[#E5E1D8] shadow-2xs diamond-card-hover cursor-pointer transition-all ${getPriorityBorder(
          card.prioridade,
        )}`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-xs font-semibold text-[#1A1D21] leading-tight line-clamp-2">
            {card.titulo}
          </h4>
          {card.criado_por_ia && (
            <span title="Criado pela IA" className="text-[10px] text-[#0F766E] shrink-0">
              <Sparkles className="w-3 h-3" />
            </span>
          )}
        </div>

        {card.descricao && (
          <p className="text-[11px] text-[#5B6470] line-clamp-2 mb-2">{card.descricao}</p>
        )}

        {card.proximo_passo && (
          <div className="bg-[#F4F2EE]/60 p-1.5 rounded text-[11px] text-[#0F766E] font-medium flex items-center gap-1.5 mb-2 border border-[#E5E1D8]/40">
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span className="line-clamp-1">{card.proximo_passo}</span>
          </div>
        )}

        {/* Tag de Grupo de Família */}
        {familiaDoCard && (
          <div className="mb-2">
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
          </div>
        )}

        {/* Tags e Vínculos */}
        <div className="flex flex-wrap items-center gap-1 mt-1 pt-1.5 border-t border-[#E5E1D8]/60 text-[10px] text-[#5B6470]">
          {card.expand?.projeto && (
            <span className="bg-[#F4F2EE] px-1.5 py-0.5 rounded truncate max-w-[120px]">
              📁 {card.expand.projeto.nome}
            </span>
          )}
          {card.expand?.contato && (
            <span className="bg-[#F4F2EE] px-1.5 py-0.5 rounded truncate max-w-[100px]">
              👤 {card.expand.contato.nome}
            </span>
          )}
          {Array.isArray(card.tags) &&
            card.tags.slice(0, 2).map((t, i) => (
              <span key={i} className="text-[#5B6470] bg-[#E5E1D8]/50 px-1 py-0.5 rounded">
                #{t}
              </span>
            ))}
        </div>
      </div>
    )
  }
}
