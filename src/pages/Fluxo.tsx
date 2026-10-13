import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
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
  Check,
  ChevronDown,
  LayoutGrid,
  Tag,
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
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

export default function Fluxo() {
  const [searchParams] = useSearchParams()
  const buscaParam = searchParams.get('busca') || ''
  const { toast } = useToast()

  // Dados principais
  const [cards, setCards] = useState<CardType[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])

  // Hierarquia: Categorias -> Fluxos (Colunas) -> Grupos de Família
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  const [familias, setFamilias] = useState<GrupoFamilia[]>([])

  // Categoria ativa (selecionada na barra de categorias ou abas)
  const [categoriaAtivaId, setCategoriaAtivaId] = useState<string>('all')

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState(buscaParam)
  const [filtroProjeto, setFiltroProjeto] = useState('all')
  const [filtroPrioridade, setFiltroPrioridade] = useState('all')
  const [filtroFamilia, setFiltroFamilia] = useState('all')

  // Visualização de agrupamento dentro da coluna
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
  const [formStatus, setFormStatus] = useState<string>('novo')
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

      // Se categoriaAtivaId for 'all' e houver categorias, mantém 'all' para visão ampla
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

  useEffect(() => {
    if (buscaParam) setFiltroTexto(buscaParam)
  }, [buscaParam])

  // Colunas a exibir no Kanban com base na categoria ativa
  const colunasFiltradas = useMemo(() => {
    if (categoriaAtivaId === 'all') {
      return colunas
    }
    return colunas.filter((col) => col.categoria === categoriaAtivaId)
  }, [colunas, categoriaAtivaId])

  // Categorias disponíveis com contagem de cards
  const categoriasComContagem = useMemo(() => {
    return categorias.map((cat) => {
      // Colunas pertencentes a essa categoria
      const colsDaCat = colunas.filter((c) => c.categoria === cat.id).map((c) => c.chave)
      const count = cards.filter((card) => colsDaCat.includes(card.status as string)).length
      return {
        ...cat,
        cardCount: count,
        colCount: colsDaCat.length,
      }
    })
  }, [categorias, colunas, cards])

  // Famílias visíveis para a categoria ou seleção
  const familiasVisiveis = useMemo(() => {
    if (categoriaAtivaId === 'all') {
      return familias
    }
    return familias.filter((f) => !f.categoria || f.categoria === categoriaAtivaId)
  }, [familias, categoriaAtivaId])

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
    setFormStatus(defaultStatus || (colunasFiltradas[0]?.chave ?? 'novo'))
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
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
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
        toast({ title: `Categoria "${novaCat.nome}" criada com sucesso!` })
        setCategoriaAtivaId(novaCat.id)
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
    // Atribui à categoria fornecida, ou à ativa, ou à primeira encontrada
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
        toast({ title: 'Fluxo/Coluna atualizado!' })
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
        `Deseja realmente excluir a coluna "${col.titulo}"? Os cards com esse status ficarão órfãos se não forem movidos.`,
      )
    ) {
      return
    }
    try {
      await diamondApi.deleteColunaFluxo(col.id)
      toast({ title: 'Fluxo removido com sucesso.' })
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
        title: 'Erro ao salvar grupo de família',
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
  // DRAG AND DROP
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
      toast({
        title: `Card movido para ${targetStatus.replace('_', ' ')}`,
      })
    } catch {
      toast({ title: 'Erro ao mover card', variant: 'destructive' })
      await carregarDados()
    } finally {
      setDraggedCardId(null)
    }
  }

  // Filtragem de cards
  const cardsFiltrados = useMemo(() => {
    return cards.filter((card) => {
      if (filtroTexto) {
        const termo = filtroTexto.toLowerCase()
        const matchTitulo = card.titulo?.toLowerCase().includes(termo)
        const matchDesc = card.descricao?.toLowerCase().includes(termo)
        const matchProx = card.proximo_passo?.toLowerCase().includes(termo)
        if (!matchTitulo && !matchDesc && !matchProx) return false
      }
      if (filtroProjeto !== 'all' && card.projeto !== filtroProjeto) {
        return false
      }
      if (filtroPrioridade !== 'all' && card.prioridade !== filtroPrioridade) {
        return false
      }
      if (filtroFamilia !== 'all') {
        if (filtroFamilia === 'sem_familia' && card.grupo_familia) return false
        if (filtroFamilia !== 'sem_familia' && card.grupo_familia !== filtroFamilia) return false
      }
      return true
    })
  }, [cards, filtroTexto, filtroProjeto, filtroPrioridade, filtroFamilia])

  const getPriorityBorder = (p?: CardPrioridade) => {
    switch (p) {
      case 'urgente':
        return 'border-l-4 border-l-[#7F1D1D]'
      case 'alta':
        return 'border-l-4 border-l-[#DC2626]'
      case 'media':
        return 'border-l-4 border-l-[#D97706]'
      default:
        return 'border-l-4 border-l-[#16A34A]'
    }
  }

  const categoriaAtiva = categorias.find((c) => c.id === categoriaAtivaId)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* NÍVEL 1: HEADER & GESTÃO DE CATEGORIAS */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#0F766E]" />
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
                Fluxo Kanban Diamond
              </h1>
              <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
                {cardsFiltrados.length} Cards
              </Badge>
            </div>
            <p className="text-xs text-[#5B6470] mt-1">
              Hierarquia de 3 níveis: Categorias → Fluxos por Categoria → Grupos de Família em cada
              fluxo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={abrirModalNovaCategoria}
              variant="outline"
              className="text-xs h-9 border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE] gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#0F766E]" />
              Nova Categoria
            </Button>

            <Button
              onClick={() => abrirModalNovoFluxo()}
              variant="outline"
              className="text-xs h-9 border-[#E5E1D8] text-[#1A1D21] hover:bg-[#F4F2EE] gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#0F766E]" />
              Novo Fluxo
            </Button>

            <Button
              onClick={() => abrirModalCriarCard()}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Novo Card
            </Button>
          </div>
        </div>

        {/* Abas de Navegação das Categorias */}
        <div className="pt-2 border-t border-[#E5E1D8]/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-[#5B6470] uppercase tracking-wider mr-1">
            Categorias:
          </span>

          <button
            type="button"
            onClick={() => setCategoriaAtivaId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              categoriaAtivaId === 'all'
                ? 'bg-[#1A1D21] text-white shadow-xs'
                : 'bg-[#F4F2EE] text-[#5B6470] hover:bg-[#E5E1D8]/70 hover:text-[#1A1D21]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Todas ({cards.length})
          </button>

          {categoriasComContagem.map((cat) => (
            <div key={cat.id} className="relative inline-flex items-center group">
              <button
                type="button"
                onClick={() => setCategoriaAtivaId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                  categoriaAtivaId === cat.id
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-[#F4F2EE] text-[#5B6470] hover:bg-[#E5E1D8]/70 hover:text-[#1A1D21]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.cor || '#0F766E' }}
                />
                <span>{cat.nome}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    categoriaAtivaId === cat.id
                      ? 'bg-white/20 text-white'
                      : 'bg-[#E5E1D8] text-[#5B6470]'
                  }`}
                >
                  {cat.cardCount}
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Opções da categoria"
                    className="p-1 text-[#5B6470] hover:text-[#1A1D21] ml-0.5 opacity-60 hover:opacity-100"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuItem onClick={() => abrirModalNovoFluxo(cat.id)}>
                    <GitBranch className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                    Novo fluxo nesta categoria
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
          ))}

          {categorias.length === 0 && (
            <span className="text-xs text-[#5B6470] italic">
              Nenhuma categoria cadastrada. Clique em "Nova Categoria" para organizar seus fluxos.
            </span>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Agrupamento */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#E5E1D8]">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#5B6470]" />
            <Input
              placeholder="Filtrar por título, tag ou próximo passo..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="pl-9 text-xs h-8 border-[#E5E1D8]"
            />
          </div>

          <div className="w-[170px]">
            <Select value={filtroProjeto} onValueChange={setFiltroProjeto}>
              <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                <SelectValue placeholder="Todos os Projetos" />
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

          <div className="w-[150px]">
            <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
              <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-[170px]">
            <Select value={filtroFamilia} onValueChange={setFiltroFamilia}>
              <SelectTrigger className="text-xs h-8 border-[#E5E1D8]">
                <SelectValue placeholder="Família" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Famílias</SelectItem>
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

        {/* Toggle de agrupamento por família */}
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
          >
            <Layers className="w-3.5 h-3.5" />
            {agruparPorFamilia ? 'Agrupado por Família' : 'Visão Contínua'}
          </Button>
        </div>
      </div>

      {/* Info da Categoria Ativa quando selecionada */}
      {categoriaAtiva && (
        <div className="flex items-center justify-between bg-[#F4F2EE]/80 px-4 py-2.5 rounded-lg border border-[#E5E1D8]">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: categoriaAtiva.cor || '#0F766E' }}
            />
            <span className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider">
              Categoria: {categoriaAtiva.nome}
            </span>
            {categoriaAtiva.descricao && (
              <span className="text-xs text-[#5B6470] border-l border-[#E5E1D8] pl-2 ml-1">
                {categoriaAtiva.descricao}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => abrirModalNovoFluxo(categoriaAtiva.id)}
              className="text-[11px] h-7 border-[#E5E1D8] hover:bg-white gap-1"
            >
              <Plus className="w-3 h-3 text-[#0F766E]" />
              Novo Fluxo nesta Categoria
            </Button>
          </div>
        </div>
      )}

      {/* NÍVEL 2: COLUNAS / FLUXOS DO KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {colunasFiltradas.map((col) => {
          const colCards = cardsFiltrados.filter((c) => c.status === col.chave)
          // Famílias associadas a este fluxo/coluna ou globais da categoria
          const familiasDaColuna = familias.filter(
            (f) =>
              f.coluna === col.id ||
              (!f.coluna && (!col.categoria || !f.categoria || f.categoria === col.categoria)),
          )

          return (
            <div
              key={col.id || col.chave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.chave)}
              className="bg-[#FAFAF9] rounded-xl border border-[#E5E1D8] p-3 flex flex-col min-h-[580px] shadow-2xs"
            >
              {/* Header da Coluna / Fluxo */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E5E1D8]/80">
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
                        aria-label="Opções do fluxo"
                        className="p-1 text-[#5B6470] hover:text-[#1A1D21] rounded"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem onClick={() => abrirModalNovaFamilia(col.id)}>
                        <Layers className="w-3.5 h-3.5 mr-2 text-blue-600" />+ Grupo de Família aqui
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => abrirModalCriarCard(col.chave)}>
                        <Plus className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />+ Card nesta etapa
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

              {/* Botão de Ação Rápida no Topo da Coluna: + Card ou + Família */}
              <div className="flex items-center gap-1 mb-2">
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

              {/* LISTAGEM DE CARDS: AGRUPADA POR FAMÍLIA OU CONTÍNUA */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {agruparPorFamilia ? (
                  // Visão Agrupada por Grupos de Família
                  <>
                    {/* Subseções para cada Família cadastrada */}
                    {familiasDaColuna.map((fam) => {
                      const cardsDaFamilia = colCards.filter((c) => c.grupo_familia === fam.id)

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
                          {/* Cabeçalho da Família */}
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
                                  <DropdownMenuItem onClick={() => abrirModalEditarFamilia(fam)}>
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

                          {/* Cards da Família */}
                          <div className="space-y-2">
                            {cardsDaFamilia.map((card) =>
                              renderCardItem(card, () => abrirModalEditarCard(card)),
                            )}
                            {cardsDaFamilia.length === 0 && (
                              <div className="h-10 border border-dashed border-[#E5E1D8] rounded flex items-center justify-center text-[10px] text-[#5B6470]/60">
                                Arraste cards aqui para esta família
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Cards sem família atribuída nesta coluna */}
                    {(() => {
                      const cardsSemFamilia = colCards.filter((c) => !c.grupo_familia)
                      if (cardsSemFamilia.length === 0 && familiasDaColuna.length > 0) return null

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
                            renderCardItem(card, () => abrirModalEditarCard(card)),
                          )}
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  // Visão Contínua (sem separadores de família, mas com tags de família nos cards)
                  colCards.map((card) => renderCardItem(card, () => abrirModalEditarCard(card)))
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
          <div className="col-span-full bg-white p-8 rounded-xl border border-[#E5E1D8] text-center space-y-3">
            <GitBranch className="w-10 h-10 text-[#5B6470]/40 mx-auto" />
            <h3 className="text-sm font-semibold text-[#1A1D21]">
              Nenhum fluxo cadastrado nesta categoria
            </h3>
            <p className="text-xs text-[#5B6470] max-w-md mx-auto">
              Crie etapas de fluxo (ex: Triagem, Em execução, Homologação, Finalizado) para começar
              a movimentar seus cards.
            </p>
            <Button
              onClick={() =>
                abrirModalNovoFluxo(categoriaAtivaId !== 'all' ? categoriaAtivaId : '')
              }
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Criar Primeiro Fluxo
            </Button>
          </div>
        )}
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
                    {colunas.map((col) => (
                      <SelectItem key={col.chave} value={col.chave}>
                        {col.titulo}
                      </SelectItem>
                    ))}
                    {!colunas.some((c) => c.chave === 'novo') && (
                      <SelectItem value="novo">Novo / Triagem</SelectItem>
                    )}
                    {!colunas.some((c) => c.chave === 'em_andamento') && (
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    )}
                    {!colunas.some((c) => c.chave === 'bloqueado') && (
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                    )}
                    {!colunas.some((c) => c.chave === 'concluido') && (
                      <SelectItem value="concluido">Concluído</SelectItem>
                    )}
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
              {editingCategoria ? 'Editar Categoria de Fluxo' : 'Nova Categoria de Fluxo'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarCategoria} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Nome da Categoria *</label>
              <Input
                required
                placeholder="Ex: Negócios, Projetos de Devices, Vendas..."
                value={catNome}
                onChange={(e) => setCatNome(e.target.value)}
                className="text-sm border-[#E5E1D8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#1A1D21]">Descrição (opcional)</label>
              <Input
                placeholder="Ex: Acompanhamento de propostas comerciais e leads"
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
                placeholder="Ex: Em Análise, Homologação, Produção..."
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
                placeholder="Ex: Família de Sensores, Linha Premium, Suporte Técnico..."
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
                    {colunas.map((c) => (
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

  // Sub-renderizador de card para reutilizar nas visualizações
  function renderCardItem(card: CardType, onEdit: () => void) {
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
