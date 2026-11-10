// Gestão de Listas de Seleção (itens reutilizáveis para campos do tipo lista_selecao).
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Ban, RotateCcw, Trash2, Loader2, ListPlus } from 'lucide-react'
import type { ListaSelecao } from '@/services/camposPersonalizados'

export function GestaoListasSelecao({
  listas: listasProp,
  onRecarregar,
}: {
  listas?: ListaSelecao[]
  onRecarregar?: () => Promise<void>
}) {
  const { user } = useAuth()
  const { toast } = useToast()

  // Quando usado em pé (aba própria em /config), carrega as listas por conta própria.
  const [listasInternas, setListasInternas] = useState<ListaSelecao[]>([])
  const listas = listasProp ?? listasInternas
  const recarregar =
    onRecarregar ??
    (async () => {
      const r = await pb.collection('listas_selecao').getFullList<ListaSelecao>({
        sort: '-created',
      })
      setListasInternas(r)
    })
  useEffect(() => {
    if (listasProp === undefined) recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [open, setOpen] = useState(false)
  const [listaEditando, setListaEditando] = useState<ListaSelecao | null>(null)
  const [nomeLista, setNomeLista] = useState('')
  const [itensLista, setItensLista] = useState<string[]>([])
  const [novoItemLista, setNovoItemLista] = useState('')
  const [salvando, setSalvando] = useState(false)

  const abrirNova = () => {
    setListaEditando(null)
    setNomeLista('')
    setItensLista([])
    setNovoItemLista('')
    setOpen(true)
  }

  const abrirEditar = (l: ListaSelecao) => {
    setListaEditando(l)
    setNomeLista(l.nome)
    setItensLista(Array.isArray(l.itens) ? [...l.itens] : [])
    setNovoItemLista('')
    setOpen(true)
  }

  const adicionarItem = () => {
    const v = novoItemLista.trim()
    if (v && !itensLista.includes(v)) {
      setItensLista((p) => [...p, v])
      setNovoItemLista('')
    }
  }

  const salvar = async () => {
    if (!nomeLista.trim()) {
      toast({ title: 'Informe o nome da lista', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const payload = {
        nome: nomeLista.trim(),
        itens: itensLista,
        ativo: listaEditando ? listaEditando.ativo : true,
      }
      if (listaEditando) {
        await pb.collection('listas_selecao').update(listaEditando.id, payload)
        toast({ title: 'Lista atualizada!' })
      } else {
        await pb.collection('listas_selecao').create({ ...payload, criado_por: user?.id || '' })
        toast({ title: 'Lista criada!' })
      }
      setOpen(false)
      await onRecarregar()
    } catch {
      toast({ title: 'Erro ao salvar lista', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const alternarAtivo = async (l: ListaSelecao) => {
    try {
      await pb.collection('listas_selecao').update(l.id, { ativo: !l.ativo })
      toast({ title: l.ativo ? 'Lista inativada.' : 'Lista reativada!' })
      await onRecarregar()
    } catch {
      toast({ title: 'Erro ao alterar a lista', variant: 'destructive' })
    }
  }

  const excluir = async (l: ListaSelecao) => {
    if (!confirm(`Excluir definitivamente a lista "${l.nome}"?`)) return
    try {
      await pb.collection('listas_selecao').delete(l.id)
      toast({ title: 'Lista excluída.' })
      await onRecarregar()
    } catch {
      toast({
        title: 'Erro ao excluir lista (verifique se há campos que a usam)',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="rounded-xl border border-[#E5E1D8] bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-[#E5E1D8]/70 bg-[#FAFAF9]">
        <div>
          <h4 className="text-xs font-bold text-[#1A1D21] flex items-center gap-1.5">
            <ListPlus className="w-3.5 h-3.5 text-[#0F766E]" />
            Listas de Seleção
          </h4>
          <p className="text-[10px] text-[#5B6470]">
            Listas reutilizáveis de itens (ex.: Redes Sociais: LinkedIn, Instagram, Facebook) para
            campos do tipo "Lista de Seleção".
          </p>
        </div>
        <Button
          size="sm"
          onClick={abrirNova}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova lista</span>
        </Button>
      </div>

      {listas.length === 0 ? (
        <p className="text-xs text-[#5B6470] text-center py-4">Nenhuma lista criada ainda.</p>
      ) : (
        <div className="divide-y divide-[#E5E1D8]/70">
          {listas.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1A1D21]">{l.nome}</span>
                  {!l.ativo && (
                    <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-200">
                      Inativa
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-[#5B6470] truncate">
                  {(l.itens || []).join(', ') || 'sem itens'}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  title="Editar lista"
                  onClick={() => abrirEditar(l)}
                >
                  <Pencil className="w-3.5 h-3.5 text-[#5B6470]" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  title={l.ativo ? 'Inativar lista' : 'Reativar lista'}
                  onClick={() => alternarAtivo(l)}
                >
                  {l.ativo ? (
                    <Ban className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  title="Excluir lista"
                  onClick={() => excluir(l)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog nova/editar lista */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">
              {listaEditando ? 'Editar lista de seleção' : 'Nova lista de seleção'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5B6470]">
              Nomeie a lista e adicione seus itens (Enter para adicionar).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#1A1D21]">Nome da lista</label>
              <Input
                value={nomeLista}
                onChange={(e) => setNomeLista(e.target.value)}
                placeholder="ex.: Redes Sociais"
                className="text-xs h-8 border-[#E5E1D8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#1A1D21]">Itens</label>
              <div className="flex gap-2">
                <Input
                  value={novoItemLista}
                  onChange={(e) => setNovoItemLista(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      adicionarItem()
                    }
                  }}
                  placeholder="Digite e pressione Enter"
                  className="text-xs h-8 border-[#E5E1D8]"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={adicionarItem}
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {itensLista.map((item, idx) => (
                  <Badge key={`${item}-${idx}`} variant="secondary" className="text-[10px] gap-1">
                    {item}
                    <button
                      type="button"
                      className="text-[#5B6470] hover:text-red-600"
                      onClick={() => setItensLista((p) => p.filter((_, i) => i !== idx))}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                {itensLista.length === 0 && (
                  <span className="text-[10px] text-[#5B6470]">Nenhum item ainda.</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E1D8]">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={salvar}
                disabled={salvando}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs h-8 gap-1.5"
              >
                {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Salvar lista</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
