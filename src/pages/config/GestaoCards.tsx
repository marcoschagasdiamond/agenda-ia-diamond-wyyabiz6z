import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type {
  Card as CardType,
  FluxoKanban,
  CategoriaFluxo,
  ColunaFluxo,
  Projeto,
  Contato,
  CardPrioridade,
} from '@/types'
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Check,
  Calendar,
  Layers,
  GitBranch,
  Building,
  User,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface GestaoCardsProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoCards({ onRecarregarGlobal }: GestaoCardsProps) {
  const { toast } = useToast()
  const [cards, setCards] = useState<CardType[]>([])
  const [fluxos, setFluxos] = useState<FluxoKanban[]>([])
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [carregando, setCarregando] = useState(false)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroFluxo, setFiltroFluxo] = useState<string>('todos')
  const [filtroFase, setFiltroFase] = useState<string>('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [cardSelecionado, setCardSelecionado] = useState<CardType | null>(null)

  // Formulário
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fluxoId, setFluxoId] = useState<string>('')
  const [status, setStatus] = useState<string>('novo')
  const [prioridade, setPrioridade] = useState<CardPrioridade>('media')
  const [projetoId, setProjetoId] = useState<string>('')
  const [contatoId, setContatoId] = useState<string>('')
  const [dataPrazo, setDataPrazo] = useState<string>('')
  const [tagsStr, setTagsStr] = useState<string>('')
  const [salvando, setSalvando] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [cList, fList, catList, colList, pList, contList] = await Promise.all([
        diamondApi.listCards(),
        diamondApi.listFluxosKanban(),
        diamondApi.listCategoriasFluxo(),
        diamondApi.listColunasFluxo(),
        diamondApi.listProjetos().catch(() => []),
        diamondApi.listContatos().catch(() => []),
      ])
      setCards(cList)
      setFluxos(fList)
      setCategorias(catList)
      setColunas(colList)
      setProjetos(pList)
      setContatos(contList)
    } catch {
      toast({ title: 'Erro ao carregar cards', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNovo = () => {
    setModo('criar')
    setCardSelecionado(null)
    setTitulo('')
    setDescricao('')
    setFluxoId(fluxos[0]?.id || '')
    setStatus('novo')
    setPrioridade('media')
    setProjetoId('')
    setContatoId('')
    setDataPrazo('')
    setTagsStr('')
    setModalOpen(true)
  }

  const abrirEditar = (c: CardType, apenasVer = false) => {
    setModo(apenasVer ? 'ver' : 'editar')
    setCardSelecionado(c)
    setTitulo(c.titulo)
    setDescricao(c.descricao || '')
    setFluxoId(c.fluxo_id || '')
    setStatus((c.status as string) || 'novo')
    setPrioridade(c.prioridade || 'media')
    setProjetoId(c.projeto || '')
    setContatoId(c.contato || '')
    setDataPrazo(c.data_prazo ? c.data_prazo.split('T')[0] : '')
    setTagsStr(Array.isArray(c.tags) ? c.tags.join(', ') : '')
    setModalOpen(true)
  }

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      toast({ title: 'Informe o título do card', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const tagsArray = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const payload: Partial<CardType> = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        fluxo_id: fluxoId || undefined,
        status,
        prioridade,
        projeto: projetoId || undefined,
        contato: contatoId || undefined,
        data_prazo: dataPrazo ? `${dataPrazo} 00:00:00.000Z` : undefined,
        tags: tagsArray,
      }

      if (modo === 'criar') {
        await diamondApi.createCard(payload)
        toast({ title: 'Card criado com sucesso!' })
      } else if (modo === 'editar' && cardSelecionado) {
        await diamondApi.updateCard(cardSelecionado.id, payload)
        toast({ title: 'Card atualizado!' })
      }
      setModalOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar card', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string, tituloCard: string) => {
    if (!confirm(`Deseja realmente excluir o card "${tituloCard}"?`)) return
    try {
      await diamondApi.deleteCard(id)
      toast({ title: 'Card excluído' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir card', variant: 'destructive' })
    }
  }

  const cardsFiltrados = cards.filter((c) => {
    const atendeBusca =
      c.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (c.descricao || '').toLowerCase().includes(busca.toLowerCase())
    const atendeFluxo = filtroFluxo === 'todos' || c.fluxo_id === filtroFluxo
    const atendeFase = filtroFase === 'todos' || c.status === filtroFase
    const atendePrioridade = filtroPrioridade === 'todos' || c.prioridade === filtroPrioridade
    return atendeBusca && atendeFluxo && atendeFase && atendePrioridade
  })

  return (
    <div className="space-y-4">
      {/* Topo / Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cards no sistema..."
              className="pl-9 text-xs border-[#E5E1D8]"
            />
          </div>

          <Select value={filtroFluxo} onValueChange={setFiltroFluxo}>
            <SelectTrigger className="w-36 text-xs border-[#E5E1D8]">
              <SelectValue placeholder="Fluxo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Fluxos</SelectItem>
              {fluxos.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroFase} onValueChange={setFiltroFase}>
            <SelectTrigger className="w-32 text-xs border-[#E5E1D8]">
              <SelectValue placeholder="Fase / Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Fases</SelectItem>
              {colunas.map((col) => (
                <SelectItem key={col.id} value={col.chave}>
                  {col.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
            <SelectTrigger className="w-32 text-xs border-[#E5E1D8]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Prioridades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={abrirNovo}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Card</span>
        </Button>
      </div>

      {/* Lista de Cards */}
      <div className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
        {cardsFiltrados.map((c) => {
          const flx = fluxos.find((f) => f.id === c.fluxo_id)
          const proj = projetos.find((p) => p.id === c.projeto)
          const cont = contatos.find((ct) => ct.id === c.contato)
          const col = colunas.find((cl) => cl.chave === c.status)

          return (
            <div
              key={c.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1A1D21]">{c.titulo}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] uppercase font-semibold ${
                      c.prioridade === 'urgente'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : c.prioridade === 'alta'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-100 text-[#5B6470]'
                    }`}
                  >
                    {c.prioridade || 'média'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-[#5B6470] border-[#E5E1D8]">
                    {col?.titulo || c.status || 'novo'}
                  </Badge>
                  {flx && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-[#0F766E] border-[#0F766E]/30 bg-[#0F766E]/5"
                    >
                      {flx.nome}
                    </Badge>
                  )}
                </div>

                {c.descricao && (
                  <p className="text-[11px] text-[#5B6470] line-clamp-1">{c.descricao}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5B6470]">
                  {proj && (
                    <span className="flex items-center gap-1 font-medium text-[#1A1D21]">
                      <Building className="w-3 h-3 text-[#0F766E]" />
                      <span>{proj.nome}</span>
                    </span>
                  )}
                  {cont && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[#5B6470]" />
                      <span>{cont.nome}</span>
                    </span>
                  )}
                  {c.data_prazo && (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <Calendar className="w-3 h-3" />
                      <span>Prazo: {c.data_prazo.split('T')[0]}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(c, true)}
                  className="text-xs h-7 px-2.5 text-[#5B6470] border-[#E5E1D8] gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(c, false)}
                  className="text-xs h-7 px-2.5 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#0F766E]/10 gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleExcluir(c.id, c.titulo)}
                  className="w-7 h-7 text-red-600 hover:bg-red-50"
                  title="Excluir Card"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
        {cardsFiltrados.length === 0 && !carregando && (
          <div className="p-8 text-center text-xs text-[#5B6470]">
            Nenhum card encontrado com os filtros aplicados.
          </div>
        )}
      </div>

      {/* Modal Criar / Editar / Ver */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0F766E]" />
              {modo === 'criar'
                ? 'Novo Card'
                : modo === 'editar'
                  ? 'Editar Card'
                  : 'Visualizar Card'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Título do Card
              </label>
              <Input
                disabled={modo === 'ver'}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Alinhar escopo de contrato..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Fluxo Kanban
                </label>
                <Select disabled={modo === 'ver'} value={fluxoId} onValueChange={setFluxoId}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Selecione o fluxo" />
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

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Fase / Coluna
                </label>
                <Select disabled={modo === 'ver'} value={status} onValueChange={setStatus}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colunas.map((col) => (
                      <SelectItem key={col.id} value={col.chave}>
                        {col.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Prioridade
                </label>
                <Select
                  disabled={modo === 'ver'}
                  value={prioridade}
                  onValueChange={(v) => setPrioridade(v as CardPrioridade)}
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

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Data Prazo
                </label>
                <Input
                  disabled={modo === 'ver'}
                  type="date"
                  value={dataPrazo}
                  onChange={(e) => setDataPrazo(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Projeto (Opcional)
                </label>
                <Select disabled={modo === 'ver'} value={projetoId} onValueChange={setProjetoId}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {projetos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Contato (Opcional)
                </label>
                <Select disabled={modo === 'ver'} value={contatoId} onValueChange={setContatoId}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {contatos.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Tags (separadas por vírgula)
              </label>
              <Input
                disabled={modo === 'ver'}
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="VIP, Estratégia, Urgente"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Descrição</label>
              <Textarea
                disabled={modo === 'ver'}
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes sobre a tarefa ou entrega..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              {modo === 'ver' ? 'Fechar' : 'Cancelar'}
            </Button>
            {modo !== 'ver' && (
              <Button
                size="sm"
                disabled={salvando}
                onClick={handleSalvar}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{salvando ? 'Salvando...' : 'Salvar Card'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
