import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { GrupoFamilia, CategoriaFluxo, ColunaFluxo, Card as CardType } from '@/types'
import { Layers, Plus, Pencil, Trash2, Eye, Search, Check, FolderTree } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface GestaoGruposTarefasProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoGruposTarefas({ onRecarregarGlobal }: GestaoGruposTarefasProps) {
  const { toast } = useToast()
  const [grupos, setGrupos] = useState<GrupoFamilia[]>([])
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [colunas, setColunas] = useState<ColunaFluxo[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoFamilia | null>(null)

  // Formulário
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#0F766E')
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [colunaId, setColunaId] = useState<string>('')
  const [ordem, setOrdem] = useState<number>(1)
  const [salvando, setSalvando] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [gList, cList, colList, cardList] = await Promise.all([
        diamondApi.listGruposFamilia(),
        diamondApi.listCategoriasFluxo(),
        diamondApi.listColunasFluxo(),
        diamondApi.listCards().catch(() => []),
      ])
      setGrupos(gList)
      setCategorias(cList)
      setColunas(colList)
      setCards(cardList)
    } catch {
      toast({ title: 'Erro ao carregar grupos de tarefas', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNovo = () => {
    setModo('criar')
    setGrupoSelecionado(null)
    setNome('')
    setCor('#0F766E')
    setCategoriaId(categorias[0]?.id || '')
    setColunaId(colunas[0]?.id || '')
    setOrdem(grupos.length + 1)
    setModalOpen(true)
  }

  const abrirEditar = (g: GrupoFamilia, apenasVer = false) => {
    setModo(apenasVer ? 'ver' : 'editar')
    setGrupoSelecionado(g)
    setNome(g.nome)
    setCor(g.cor || '#0F766E')
    setCategoriaId(g.categoria || '')
    setColunaId(g.coluna || '')
    setOrdem(g.ordem || 1)
    setModalOpen(true)
  }

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome do grupo', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const payload: Partial<GrupoFamilia> = {
        nome: nome.trim(),
        cor,
        categoria: categoriaId || undefined,
        coluna: colunaId || undefined,
        ordem: Number(ordem) || 1,
      }

      if (modo === 'criar') {
        await diamondApi.createGrupoFamilia(payload)
        toast({ title: 'Grupo de tarefas criado com sucesso!' })
      } else if (modo === 'editar' && grupoSelecionado) {
        await diamondApi.updateGrupoFamilia(grupoSelecionado.id, payload)
        toast({ title: 'Grupo atualizado!' })
      }
      setModalOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar grupo de tarefas', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string, nomeGrupo: string) => {
    if (!confirm(`Deseja realmente excluir o grupo "${nomeGrupo}"?`)) return
    try {
      await diamondApi.deleteGrupoFamilia(id)
      toast({ title: 'Grupo excluído' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir grupo', variant: 'destructive' })
    }
  }

  const gruposFiltrados = grupos.filter((g) => g.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="space-y-4">
      {/* Topo / Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar grupos de tarefas / famílias..."
            className="pl-9 text-xs border-[#E5E1D8]"
          />
        </div>

        <Button
          size="sm"
          onClick={abrirNovo}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Grupo / Família</span>
        </Button>
      </div>

      {/* Grid de Grupos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {gruposFiltrados.map((g) => {
          const cardsNesteGrupo = cards.filter((c) => c.grupo_familia === g.id)
          const cat = categorias.find((c) => c.id === g.categoria)
          const col = colunas.find((c) => c.id === g.coluna)

          return (
            <div
              key={g.id}
              className="p-4 rounded-xl border border-[#E5E1D8] bg-white hover:border-[#0F766E]/40 transition-colors shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: g.cor || '#0F766E' }}
                  />
                  <span className="text-xs font-bold text-[#1A1D21]">{g.nome}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-[#FAFAF9] text-[#5B6470] border-[#E5E1D8]"
                >
                  {cardsNesteGrupo.length} cards
                </Badge>
              </div>

              <div className="text-[11px] text-[#5B6470] space-y-1">
                {cat && (
                  <div className="flex items-center gap-1">
                    <FolderTree className="w-3 h-3 text-[#0F766E]" />
                    <span>Categoria: {cat.nome}</span>
                  </div>
                )}
                {col && (
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#5B6470]" />
                    <span>Fase / Coluna: {col.titulo}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#E5E1D8]/60">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(g, true)}
                  className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(g, false)}
                  className="text-xs h-7 px-2 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#0F766E]/10 gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleExcluir(g.id, g.nome)}
                  className="w-7 h-7 text-red-600 hover:bg-red-50"
                  title="Excluir Grupo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
        {gruposFiltrados.length === 0 && !carregando && (
          <div className="col-span-full p-8 text-center text-xs text-[#5B6470] bg-white border border-[#E5E1D8] rounded-xl">
            Nenhum grupo de tarefas cadastrado.
          </div>
        )}
      </div>

      {/* Modal Criar / Editar / Ver */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E]" />
              {modo === 'criar'
                ? 'Novo Grupo de Tarefas'
                : modo === 'editar'
                  ? 'Editar Grupo'
                  : 'Visualizar Grupo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Nome do Grupo / Família
              </label>
              <Input
                disabled={modo === 'ver'}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Módulo Financeiro, Campanhas de Tráfego..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Categoria Associada
              </label>
              <Select disabled={modo === 'ver'} value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione uma categoria" />
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

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Fase / Coluna de Vínculo (Opcional)
              </label>
              <Select disabled={modo === 'ver'} value={colunaId} onValueChange={setColunaId}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione uma fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma coluna específica</SelectItem>
                  {colunas.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.titulo} ({col.chave})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    disabled={modo === 'ver'}
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                  />
                  <Input
                    disabled={modo === 'ver'}
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Ordem</label>
                <Input
                  disabled={modo === 'ver'}
                  type="number"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
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
                <span>{salvando ? 'Salvando...' : 'Salvar Grupo'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
