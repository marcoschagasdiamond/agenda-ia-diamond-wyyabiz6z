import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { diamondApi } from '@/services/diamondApi'
import type {
  Card as CardType,
  Projeto,
  Negocio,
  Contato,
  CardStatus,
  CardPrioridade,
} from '@/types'
import {
  KanbanSquare,
  Plus,
  Filter,
  Sparkles,
  ArrowRight,
  Clock,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Folder,
  User,
  Tag,
  Search,
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
import { useToast } from '@/hooks/use-toast'

const STATUS_COLUMNS: { key: CardStatus; title: string; color: string }[] = [
  { key: 'novo', title: 'Novo / Triagem', color: '#5B6470' },
  { key: 'em_andamento', title: 'Em Andamento', color: '#0F766E' },
  { key: 'bloqueado', title: 'Bloqueado', color: '#DC2626' },
  { key: 'concluido', title: 'Concluído', color: '#16A34A' },
]

export default function Fluxo() {
  const [searchParams] = useSearchParams()
  const buscaParam = searchParams.get('busca') || ''
  const { toast } = useToast()

  const [cards, setCards] = useState<CardType[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [colunas, setColunas] =
    useState<{ key: string; title: string; color: string }[]>(STATUS_COLUMNS)

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState(buscaParam)
  const [filtroProjeto, setFiltroProjeto] = useState('all')
  const [filtroPrioridade, setFiltroPrioridade] = useState('all')

  // Modal Criar / Editar Card
  const [modalCardOpen, setModalCardOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CardType | null>(null)
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formProjeto, setFormProjeto] = useState('none')
  const [formNegocio, setFormNegocio] = useState('none')
  const [formContato, setFormContato] = useState('none')
  const [formPrioridade, setFormPrioridade] = useState<CardPrioridade>('media')
  const [formStatus, setFormStatus] = useState<string>('novo')
  const [formProximoPasso, setFormProximoPasso] = useState('')
  const [formTags, setFormTags] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Drag and drop state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)

  const carregarDados = async () => {
    try {
      const [c, p, n, ct, customCols] = await Promise.all([
        diamondApi.listCards(),
        diamondApi.listProjetos(),
        diamondApi.listNegocios(),
        diamondApi.listContatos(),
        diamondApi.listColunasFluxo().catch(() => []),
      ])
      setCards(c)
      setProjetos(p)
      setNegocios(n)
      setContatos(ct)

      if (customCols && customCols.length > 0) {
        setColunas(
          customCols.map((col) => ({
            key: col.chave,
            title: col.titulo,
            color: col.cor || '#0F766E',
          })),
        )
      }
    } catch (err) {
      console.error('Erro ao carregar dados do kanban:', err)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (buscaParam) setFiltroTexto(buscaParam)
  }, [buscaParam])

  const abrirModalCriar = () => {
    setEditingCard(null)
    setFormTitulo('')
    setFormDescricao('')
    setFormProjeto('none')
    setFormNegocio('none')
    setFormContato('none')
    setFormPrioridade('media')
    setFormStatus('novo')
    setFormProximoPasso('')
    setFormTags('')
    setModalCardOpen(true)
  }

  const abrirModalEditar = (card: CardType) => {
    setEditingCard(card)
    setFormTitulo(card.titulo)
    setFormDescricao(card.descricao || '')
    setFormProjeto(card.projeto || 'none')
    setFormNegocio(card.negocio || 'none')
    setFormContato(card.contato || 'none')
    setFormPrioridade(card.prioridade || 'media')
    setFormStatus(card.status)
    setFormProximoPasso(card.proximo_passo || '')
    setFormTags(Array.isArray(card.tags) ? card.tags.join(', ') : '')
    setModalCardOpen(true)
  }

  const handleSalvarCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) return
    setSalvando(true)

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
      setSalvando(false)
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

  // Drag and Drop simples
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCardId(id)
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const id = draggedCardId || e.dataTransfer.getData('text/plain')
    if (!id) return

    // Atualização otimista
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status: targetStatus } : c)))

    try {
      await diamondApi.updateCard(id, { status: targetStatus })
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
  const cardsFiltrados = cards.filter((card) => {
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
    return true
  })

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Fluxo Kanban de Demandas
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              {cardsFiltrados.length} Cards
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Arraste e solte para mudar o status. Cards bloqueados há mais de 7 dias são sinalizados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={abrirModalCriar}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-9 px-4 font-medium shadow-sm gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Card
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-lg border border-[#E5E1D8]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#5B6470]" />
          <Input
            placeholder="Filtrar por título, tag ou próximo passo..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="pl-9 text-xs h-8 border-[#E5E1D8]"
          />
        </div>

        <div className="w-[180px]">
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
      </div>

      {/* Colunas do Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {colunas.map((col) => {
          const colCards = cardsFiltrados.filter((c) => c.status === col.key)

          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              className="bg-[#FAFAF9] rounded-xl border border-[#E5E1D8] p-3 flex flex-col min-h-[550px] shadow-2xs"
            >
              {/* Header da Coluna */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E5E1D8]/80">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <h3 className="text-xs font-bold text-[#1A1D21] uppercase tracking-wider">
                    {col.title}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#5B6470] bg-[#E5E1D8]/60 px-2 py-0.5 rounded-full">
                  {colCards.length}
                </span>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onClick={() => abrirModalEditar(card)}
                    className={`p-3.5 rounded-lg bg-white border border-[#E5E1D8] shadow-2xs diamond-card-hover cursor-pointer transition-all ${getPriorityBorder(
                      card.prioridade,
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-semibold text-[#1A1D21] leading-tight line-clamp-2">
                        {card.titulo}
                      </h4>
                      {card.criado_por_ia && (
                        <span
                          title="Criado pela IA"
                          className="text-[10px] text-[#0F766E] shrink-0"
                        >
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {card.descricao && (
                      <p className="text-[11px] text-[#5B6470] line-clamp-2 mb-2">
                        {card.descricao}
                      </p>
                    )}

                    {card.proximo_passo && (
                      <div className="bg-[#F4F2EE]/60 p-2 rounded text-[11px] text-[#0F766E] font-medium flex items-center gap-1.5 mb-2 border border-[#E5E1D8]/40">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{card.proximo_passo}</span>
                      </div>
                    )}

                    {/* Tags e Vínculos */}
                    <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-[#E5E1D8]/60 text-[10px] text-[#5B6470]">
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
                          <span
                            key={i}
                            className="text-[#5B6470] bg-[#E5E1D8]/50 px-1 py-0.5 rounded"
                          >
                            #{t}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}

                {colCards.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-[#E5E1D8] rounded-lg flex items-center justify-center text-xs text-[#5B6470]/60">
                    Solte aqui
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Criar / Editar Card */}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B6470]">Status</label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v)}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colunas.map((col) => (
                      <SelectItem key={col.key} value={col.key}>
                        {col.title}
                      </SelectItem>
                    ))}
                    {!colunas.some((c) => c.key === 'novo') && (
                      <SelectItem value="novo">Novo / Triagem</SelectItem>
                    )}
                    {!colunas.some((c) => c.key === 'em_andamento') && (
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    )}
                    {!colunas.some((c) => c.key === 'bloqueado') && (
                      <SelectItem value="bloqueado">Bloqueado</SelectItem>
                    )}
                    {!colunas.some((c) => c.key === 'concluido') && (
                      <SelectItem value="concluido">Concluído</SelectItem>
                    )}
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
                  disabled={salvando}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs px-4"
                >
                  {salvando ? 'Salvando...' : 'Salvar Card'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
