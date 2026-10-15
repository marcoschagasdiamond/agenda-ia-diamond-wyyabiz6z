import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { CategoriaFluxo, FluxoKanban } from '@/types'
import {
  FolderTree,
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Check,
  FolderOpen,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

interface GestaoCategoriasFluxosProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoCategoriasFluxos({
  onRecarregarGlobal,
}: GestaoCategoriasFluxosProps) {
  const { toast } = useToast()
  const [categorias, setCategorias] = useState<CategoriaFluxo[]>([])
  const [fluxos, setFluxos] = useState<FluxoKanban[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos')

  // Modais de Categoria
  const [modalCatOpen, setModalCatOpen] = useState(false)
  const [modoCat, setModoCat] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [catSelecionada, setCatSelecionada] = useState<CategoriaFluxo | null>(null)
  const [catNome, setCatNome] = useState('')
  const [catCor, setCatCor] = useState('#0F766E')
  const [catDescricao, setCatDescricao] = useState('')
  const [salvandoCat, setSalvandoCat] = useState(false)

  // Modais de Fluxo
  const [modalFluxoOpen, setModalFluxoOpen] = useState(false)
  const [modoFluxo, setModoFluxo] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [fluxoSelecionado, setFluxoSelecionado] = useState<FluxoKanban | null>(null)
  const [fluxoNome, setFluxoNome] = useState('')
  const [fluxoCor, setFluxoCor] = useState('#0F766E')
  const [fluxoCatId, setFluxoCatId] = useState<string>('')
  const [fluxoTituloFases, setFluxoTituloFases] = useState('')
  const [salvandoFluxo, setSalvandoFluxo] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [cats, flxs] = await Promise.all([
        diamondApi.listCategoriasFluxo(),
        diamondApi.listFluxosKanban(),
      ])
      setCategorias(cats)
      setFluxos(flxs)
    } catch {
      toast({ title: 'Erro ao carregar categorias e fluxos', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Ações de Categoria
  const abrirNovaCategoria = () => {
    setModoCat('criar')
    setCatSelecionada(null)
    setCatNome('')
    setCatCor('#0F766E')
    setCatDescricao('')
    setModalCatOpen(true)
  }

  const abrirEditarCategoria = (c: CategoriaFluxo, apenasVer = false) => {
    setModoCat(apenasVer ? 'ver' : 'editar')
    setCatSelecionada(c)
    setCatNome(c.nome)
    setCatCor(c.cor || '#0F766E')
    setCatDescricao(c.descricao || '')
    setModalCatOpen(true)
  }

  const handleSalvarCategoria = async () => {
    if (!catNome.trim()) {
      toast({ title: 'Informe o nome da categoria', variant: 'destructive' })
      return
    }
    setSalvandoCat(true)
    try {
      if (modoCat === 'criar') {
        await diamondApi.createCategoriaFluxo({
          nome: catNome.trim(),
          cor: catCor,
          descricao: catDescricao.trim(),
          ordem: categorias.length + 1,
        })
        toast({ title: 'Categoria criada com sucesso!' })
      } else if (modoCat === 'editar' && catSelecionada) {
        await diamondApi.updateCategoriaFluxo(catSelecionada.id, {
          nome: catNome.trim(),
          cor: catCor,
          descricao: catDescricao.trim(),
        })
        toast({ title: 'Categoria atualizada!' })
      }
      setModalCatOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar categoria', variant: 'destructive' })
    } finally {
      setSalvandoCat(false)
    }
  }

  const handleExcluirCategoria = async (id: string, nome: string) => {
    if (
      !confirm(
        `Deseja realmente excluir a categoria "${nome}"? Os fluxos associados precisarão ser remanejados.`,
      )
    )
      return
    try {
      await diamondApi.deleteCategoriaFluxo(id)
      toast({ title: 'Categoria excluída' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir categoria', variant: 'destructive' })
    }
  }

  // Ações de Fluxo
  const abrirNovoFluxo = (preCatId?: string) => {
    setModoFluxo('criar')
    setFluxoSelecionado(null)
    setFluxoNome('')
    setFluxoCor('#0F766E')
    setFluxoCatId(preCatId || (categorias[0]?.id ?? ''))
    setFluxoTituloFases('Fases Padrão')
    setModalFluxoOpen(true)
  }

  const abrirEditarFluxo = (f: FluxoKanban, apenasVer = false) => {
    setModoFluxo(apenasVer ? 'ver' : 'editar')
    setFluxoSelecionado(f)
    setFluxoNome(f.nome)
    setFluxoCor(f.cor || '#0F766E')
    setFluxoCatId(f.categoria || '')
    setFluxoTituloFases(f.titulo_fases || '')
    setModalFluxoOpen(true)
  }

  const handleSalvarFluxo = async () => {
    if (!fluxoNome.trim()) {
      toast({ title: 'Informe o nome do fluxo', variant: 'destructive' })
      return
    }
    setSalvandoFluxo(true)
    try {
      if (modoFluxo === 'criar') {
        await diamondApi.createFluxoKanban({
          nome: fluxoNome.trim(),
          cor: fluxoCor,
          categoria: fluxoCatId || undefined,
          titulo_fases: fluxoTituloFases.trim() || 'Fases do Fluxo',
          ordem: fluxos.length + 1,
        })
        toast({ title: 'Fluxo criado com sucesso!' })
      } else if (modoFluxo === 'editar' && fluxoSelecionado) {
        await diamondApi.updateFluxoKanban(fluxoSelecionado.id, {
          nome: fluxoNome.trim(),
          cor: fluxoCor,
          categoria: fluxoCatId || undefined,
          titulo_fases: fluxoTituloFases.trim() || undefined,
        })
        toast({ title: 'Fluxo atualizado!' })
      }
      setModalFluxoOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar fluxo', variant: 'destructive' })
    } finally {
      setSalvandoFluxo(false)
    }
  }

  const handleExcluirFluxo = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o fluxo "${nome}"?`)) return
    try {
      await diamondApi.deleteFluxoKanban(id)
      toast({ title: 'Fluxo excluído' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir fluxo', variant: 'destructive' })
    }
  }

  const categoriasFiltradas = categorias.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.descricao || '').toLowerCase().includes(busca.toLowerCase()),
  )

  const fluxosFiltrados = fluxos.filter((f) => {
    const atendeBusca =
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (f.titulo_fases || '').toLowerCase().includes(busca.toLowerCase())
    const atendeCategoria = filtroCategoria === 'todos' || f.categoria === filtroCategoria
    return atendeBusca && atendeCategoria
  })

  return (
    <div className="space-y-6">
      {/* Barra de Ações & Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar categoria ou fluxo..."
              className="pl-9 text-xs border-[#E5E1D8]"
            />
          </div>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-40 text-xs border-[#E5E1D8]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={abrirNovaCategoria}
            variant="outline"
            className="text-xs border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/10 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Categoria</span>
          </Button>
          <Button
            size="sm"
            onClick={() => abrirNovoFluxo()}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Fluxo</span>
          </Button>
        </div>
      </div>

      {/* Grid de Categorias */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-[#0F766E]" />
            <span>Categorias Estruturais ({categoriasFiltradas.length})</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoriasFiltradas.map((cat) => {
            const fluxosDestaCat = fluxos.filter((f) => f.categoria === cat.id)
            return (
              <Card
                key={cat.id}
                className="border-[#E5E1D8] bg-white hover:border-[#0F766E]/40 transition-colors shadow-2xs"
              >
                <CardHeader className="p-3.5 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.cor || '#0F766E' }}
                      />
                      <CardTitle className="text-xs font-bold text-[#1A1D21] truncate">
                        {cat.nome}
                      </CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-[#5B6470] border-[#E5E1D8]"
                    >
                      {fluxosDestaCat.length} fluxos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-3">
                  <p className="text-[11px] text-[#5B6470] line-clamp-2 min-h-[30px]">
                    {cat.descricao || 'Sem descrição cadastrada.'}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E1D8]/60">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirNovoFluxo(cat.id)}
                      className="text-[10px] h-7 px-2 text-[#0F766E] hover:bg-[#0F766E]/10 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar Fluxo</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => abrirEditarCategoria(cat, true)}
                        className="w-7 h-7 text-[#5B6470] hover:text-[#1A1D21]"
                        title="Visualizar Categoria"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => abrirEditarCategoria(cat, false)}
                        className="w-7 h-7 text-[#0F766E] hover:bg-[#0F766E]/10"
                        title="Editar Categoria"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleExcluirCategoria(cat.id, cat.nome)}
                        className="w-7 h-7 text-red-600 hover:bg-red-50"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {categoriasFiltradas.length === 0 && !carregando && (
            <div className="col-span-full p-8 text-center text-xs text-[#5B6470] bg-white border border-[#E5E1D8] rounded-xl">
              Nenhuma categoria encontrada com os filtros atuais.
            </div>
          )}
        </div>
      </div>

      {/* Lista de Fluxos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#0F766E]" />
            <span>Fluxos de Trabalho ({fluxosFiltrados.length})</span>
          </h3>
        </div>

        <div className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
          {fluxosFiltrados.map((flx) => {
            const catRel = categorias.find((c) => c.id === flx.categoria)
            return (
              <div
                key={flx.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 font-bold text-xs"
                    style={{ backgroundColor: flx.cor || '#0F766E' }}
                  >
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A1D21]">{flx.nome}</span>
                      {catRel && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-[#F4F2EE] text-[#5B6470] border-[#E5E1D8]"
                        >
                          {catRel.nome}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-[#5B6470] block">
                      Fases: {flx.titulo_fases || 'Padrão Diamond'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirEditarFluxo(flx, true)}
                    className="text-xs h-7 px-2.5 text-[#5B6470] border-[#E5E1D8] gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => abrirEditarFluxo(flx, false)}
                    className="text-xs h-7 px-2.5 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#0F766E]/10 gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleExcluirFluxo(flx.id, flx.nome)}
                    className="w-7 h-7 text-red-600 hover:bg-red-50"
                    title="Excluir Fluxo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
          {fluxosFiltrados.length === 0 && !carregando && (
            <div className="p-8 text-center text-xs text-[#5B6470]">
              Nenhum fluxo encontrado. Crie um novo fluxo para começar.
            </div>
          )}
        </div>
      </div>

      {/* Modal Categoria */}
      <Dialog open={modalCatOpen} onOpenChange={setModalCatOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#0F766E]" />
              {modoCat === 'criar'
                ? 'Nova Categoria'
                : modoCat === 'editar'
                  ? 'Editar Categoria'
                  : 'Visualizar Categoria'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Nome da Categoria
              </label>
              <Input
                disabled={modoCat === 'ver'}
                value={catNome}
                onChange={(e) => setCatNome(e.target.value)}
                placeholder="Ex: Gestão Corporativa, Vendas VIP..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Cor Temática
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={modoCat === 'ver'}
                  value={catCor}
                  onChange={(e) => setCatCor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                />
                <Input
                  disabled={modoCat === 'ver'}
                  value={catCor}
                  onChange={(e) => setCatCor(e.target.value)}
                  className="text-xs border-[#E5E1D8] max-w-[120px]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Descrição</label>
              <Textarea
                disabled={modoCat === 'ver'}
                rows={3}
                value={catDescricao}
                onChange={(e) => setCatDescricao(e.target.value)}
                placeholder="Finalidade e escopo desta categoria..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalCatOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              {modoCat === 'ver' ? 'Fechar' : 'Cancelar'}
            </Button>
            {modoCat !== 'ver' && (
              <Button
                size="sm"
                disabled={salvandoCat}
                onClick={handleSalvarCategoria}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{salvandoCat ? 'Salvando...' : 'Salvar Categoria'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Fluxo */}
      <Dialog open={modalFluxoOpen} onOpenChange={setModalFluxoOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#0F766E]" />
              {modoFluxo === 'criar'
                ? 'Novo Fluxo de Trabalho'
                : modoFluxo === 'editar'
                  ? 'Editar Fluxo'
                  : 'Visualizar Fluxo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Nome do Fluxo
              </label>
              <Input
                disabled={modoFluxo === 'ver'}
                value={fluxoNome}
                onChange={(e) => setFluxoNome(e.target.value)}
                placeholder="Ex: Operação Alpha, Expansão Franquias..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Categoria Vinculada
              </label>
              <Select
                disabled={modoFluxo === 'ver'}
                value={fluxoCatId}
                onValueChange={setFluxoCatId}
              >
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
                Título do Conjunto de Fases
              </label>
              <Input
                disabled={modoFluxo === 'ver'}
                value={fluxoTituloFases}
                onChange={(e) => setFluxoTituloFases(e.target.value)}
                placeholder="Ex: Início > Execução > Entrega"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Cor</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={modoFluxo === 'ver'}
                  value={fluxoCor}
                  onChange={(e) => setFluxoCor(e.target.value)}
                  className="w-8 h-8 rounded border border-[#E5E1D8] cursor-pointer"
                />
                <Input
                  disabled={modoFluxo === 'ver'}
                  value={fluxoCor}
                  onChange={(e) => setFluxoCor(e.target.value)}
                  className="text-xs border-[#E5E1D8] max-w-[120px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalFluxoOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              {modoFluxo === 'ver' ? 'Fechar' : 'Cancelar'}
            </Button>
            {modoFluxo !== 'ver' && (
              <Button
                size="sm"
                disabled={salvandoFluxo}
                onClick={handleSalvarFluxo}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{salvandoFluxo ? 'Salvando...' : 'Salvar Fluxo'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
