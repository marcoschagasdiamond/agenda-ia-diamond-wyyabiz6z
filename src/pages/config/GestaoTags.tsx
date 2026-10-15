import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { TagSistema, Card as CardType, Contato, Cliente } from '@/types'
import { Tag, Plus, Pencil, Trash2, Eye, Search, Check, Layers } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'

interface GestaoTagsProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoTags({ onRecarregarGlobal }: GestaoTagsProps) {
  const { toast } = useToast()
  const [tags, setTags] = useState<TagSistema[]>([])
  const [cards, setCards] = useState<CardType[]>([])
  const [contatos, setContatos] = useState<Contato[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [tagSelecionada, setTagSelecionada] = useState<TagSistema | null>(null)

  // Formulário
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#0F766E')
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [tList, cList, contList, cliList] = await Promise.all([
        diamondApi.listTagsSistema(),
        diamondApi.listCards().catch(() => []),
        diamondApi.listContatos().catch(() => []),
        diamondApi.listClientes().catch(() => []),
      ])
      setTags(tList)
      setCards(cList)
      setContatos(contList)
      setClientes(cliList)
    } catch {
      toast({ title: 'Erro ao carregar tags', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNova = () => {
    setModo('criar')
    setTagSelecionada(null)
    setNome('')
    setCor('#0F766E')
    setDescricao('')
    setModalOpen(true)
  }

  const abrirEditar = (t: TagSistema, apenasVer = false) => {
    setModo(apenasVer ? 'ver' : 'editar')
    setTagSelecionada(t)
    setNome(t.nome)
    setCor(t.cor || '#0F766E')
    setDescricao(t.descricao || '')
    setModalOpen(true)
  }

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome da tag', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      if (modo === 'criar') {
        await diamondApi.createTagSistema({
          nome: nome.trim(),
          cor,
          descricao: descricao.trim(),
        })
        toast({ title: 'Tag criada com sucesso!' })
      } else if (modo === 'editar' && tagSelecionada) {
        await diamondApi.updateTagSistema(tagSelecionada.id, {
          nome: nome.trim(),
          cor,
          descricao: descricao.trim(),
        })
        toast({ title: 'Tag atualizada!' })
      }
      setModalOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar tag', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string, nomeTag: string) => {
    if (!confirm(`Deseja realmente excluir a tag "${nomeTag}"?`)) return
    try {
      await diamondApi.deleteTagSistema(id)
      toast({ title: 'Tag excluída' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir tag', variant: 'destructive' })
    }
  }

  const tagsFiltradas = tags.filter(
    (t) =>
      t.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (t.descricao || '').toLowerCase().includes(busca.toLowerCase()),
  )

  // Onde a tag está em uso
  const contarUsoTag = (tagNome: string) => {
    const nomeNorm = tagNome.toLowerCase().trim()
    let usoCards = 0
    let usoContatos = 0
    let usoClientes = 0

    cards.forEach((c) => {
      if (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase() === nomeNorm)) {
        usoCards++
      }
    })

    contatos.forEach((ct) => {
      if (Array.isArray(ct.tags) && ct.tags.some((t) => t.toLowerCase() === nomeNorm)) {
        usoContatos++
      }
    })

    clientes.forEach((cli) => {
      if (Array.isArray(cli.tags) && cli.tags.some((t) => t.toLowerCase() === nomeNorm)) {
        usoClientes++
      }
    })

    return {
      total: usoCards + usoContatos + usoClientes,
      usoCards,
      usoContatos,
      usoClientes,
    }
  }

  return (
    <div className="space-y-4">
      {/* Topo / Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tags do sistema..."
            className="pl-9 text-xs border-[#E5E1D8]"
          />
        </div>

        <Button
          size="sm"
          onClick={abrirNova}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Tag</span>
        </Button>
      </div>

      {/* Grid de Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tagsFiltradas.map((t) => {
          const uso = contarUsoTag(t.nome)
          return (
            <div
              key={t.id}
              className="p-4 rounded-xl border border-[#E5E1D8] bg-white hover:border-[#0F766E]/40 transition-colors shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.cor || '#0F766E' }}
                  />
                  <span className="text-xs font-bold text-[#1A1D21]">#{t.nome}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-[#FAFAF9] text-[#5B6470] border-[#E5E1D8]"
                >
                  {uso.total} em uso
                </Badge>
              </div>

              {t.descricao && (
                <p className="text-[11px] text-[#5B6470] line-clamp-2">{t.descricao}</p>
              )}

              <div className="text-[10px] text-[#5B6470] flex flex-wrap gap-2 pt-1 border-t border-[#E5E1D8]/60">
                <span>
                  Cards: <b>{uso.usoCards}</b>
                </span>
                <span>·</span>
                <span>
                  Contatos: <b>{uso.usoContatos}</b>
                </span>
                <span>·</span>
                <span>
                  Clientes: <b>{uso.usoClientes}</b>
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(t, true)}
                  className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(t, false)}
                  className="text-xs h-7 px-2 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#0F766E]/10 gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleExcluir(t.id, t.nome)}
                  className="w-7 h-7 text-red-600 hover:bg-red-50"
                  title="Excluir Tag"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
        {tagsFiltradas.length === 0 && !carregando && (
          <div className="col-span-full p-8 text-center text-xs text-[#5B6470] bg-white border border-[#E5E1D8] rounded-xl">
            Nenhuma tag encontrada.
          </div>
        )}
      </div>

      {/* Modal Criar / Editar / Ver */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#0F766E]" />
              {modo === 'criar' ? 'Nova Tag' : modo === 'editar' ? 'Editar Tag' : 'Visualizar Tag'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Nome da Tag</label>
              <Input
                disabled={modo === 'ver'}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Estratégia, VIP, Follow-up..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

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
                  className="text-xs border-[#E5E1D8] max-w-[120px]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Descrição</label>
              <Textarea
                disabled={modo === 'ver'}
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Finalidade e onde utilizar esta tag..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            {modo === 'ver' && tagSelecionada && (
              <div className="p-3 rounded-lg bg-[#FAFAF9] border border-[#E5E1D8] text-xs space-y-1">
                <span className="font-semibold text-[#1A1D21] block">Estatísticas de Uso:</span>
                {(() => {
                  const uso = contarUsoTag(tagSelecionada.nome)
                  return (
                    <div className="text-[#5B6470] space-y-0.5 text-[11px]">
                      <div>Cards no Kanban: {uso.usoCards}</div>
                      <div>Contatos: {uso.usoContatos}</div>
                      <div>Clientes: {uso.usoClientes}</div>
                      <div className="font-semibold text-[#1A1D21] pt-1">
                        Total de Ocorrências: {uso.total}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
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
                <span>{salvando ? 'Salvando...' : 'Salvar Tag'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
