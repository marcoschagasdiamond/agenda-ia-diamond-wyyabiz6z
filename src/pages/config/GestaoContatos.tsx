import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { Contato } from '@/types'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Check,
  Mail,
  Phone,
  Building,
  Tag,
  Upload,
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
import { ModalImportarContatos } from '@/components/contatos/ModalImportarContatos'

interface GestaoContatosProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoContatos({ onRecarregarGlobal }: GestaoContatosProps) {
  const { toast } = useToast()
  const [contatos, setContatos] = useState<Contato[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null)

  // Formulário
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargo, setCargo] = useState('')
  const [origem, setOrigem] = useState<string>('manual')
  const [tagsStr, setTagsStr] = useState('')
  const [contexto, setContexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal Importar Contatos (.vcf / .csv)
  const [modalImportarOpen, setModalImportarOpen] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const data = await diamondApi.listContatos()
      setContatos(data)
    } catch {
      toast({ title: 'Erro ao carregar contatos', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNovo = () => {
    setModo('criar')
    setContatoSelecionado(null)
    setNome('')
    setEmpresa('')
    setEmail('')
    setTelefone('')
    setCargo('')
    setOrigem('manual')
    setTagsStr('')
    setContexto('')
    setModalOpen(true)
  }

  const abrirEditar = (c: Contato, apenasVer = false) => {
    setModo(apenasVer ? 'ver' : 'editar')
    setContatoSelecionado(c)
    setNome(c.nome)
    setEmpresa(c.empresa || '')
    setEmail(c.email || '')
    setTelefone(c.telefone || '')
    setCargo(c.cargo || '')
    setOrigem(c.origem || 'manual')
    setTagsStr(Array.isArray(c.tags) ? c.tags.join(', ') : '')
    setContexto(c.contexto_resumido || '')
    setModalOpen(true)
  }

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome do contato', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const tagsArray = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const payload: Partial<Contato> = {
        nome: nome.trim(),
        empresa: empresa.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        cargo: cargo.trim(),
        origem: origem as any,
        tags: tagsArray,
        contexto_resumido: contexto.trim(),
      }

      if (modo === 'criar') {
        await diamondApi.createContato(payload)
        toast({ title: 'Contato criado com sucesso!' })
      } else if (modo === 'editar' && contatoSelecionado) {
        await diamondApi.updateContato(contatoSelecionado.id, payload)
        toast({ title: 'Contato atualizado!' })
      }
      setModalOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar contato', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string, nomeContato: string) => {
    if (!confirm(`Deseja realmente excluir o contato "${nomeContato}"?`)) return
    try {
      await diamondApi.deleteContato(id)
      toast({ title: 'Contato excluído' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir contato', variant: 'destructive' })
    }
  }

  const contatosFiltrados = contatos.filter((c) => {
    const atendeBusca =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.empresa || '').toLowerCase().includes(busca.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(busca.toLowerCase())
    const atendeOrigem = filtroOrigem === 'todos' || c.origem === filtroOrigem
    return atendeBusca && atendeOrigem
  })

  return (
    <div className="space-y-4">
      {/* Topo / Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou empresa..."
              className="pl-9 text-xs border-[#E5E1D8]"
            />
          </div>
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="w-36 text-xs border-[#E5E1D8]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Origens</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="importado">Importado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalImportarOpen(true)}
            className="text-xs border-[#E5E1D8] gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#5B6470]" />
            <span>Importar (.vcf / .csv)</span>
          </Button>
          <Button
            size="sm"
            onClick={abrirNovo}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Contato</span>
          </Button>
        </div>
      </div>

      {/* Lista de Contatos */}
      <div className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
        {contatosFiltrados.map((c) => (
          <div
            key={c.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1A1D21] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {c.nome?.[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1A1D21]">{c.nome}</span>
                  {c.cargo && <span className="text-[11px] text-[#5B6470]">· {c.cargo}</span>}
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase text-[#5B6470] border-[#E5E1D8]"
                  >
                    {c.origem || 'manual'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5B6470] mt-1">
                  {c.empresa && (
                    <span className="flex items-center gap-1 font-medium text-[#1A1D21]">
                      <Building className="w-3 h-3 text-[#0F766E]" />
                      <span>{c.empresa}</span>
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{c.email}</span>
                    </span>
                  )}
                  {c.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{c.telefone}</span>
                    </span>
                  )}
                </div>

                {Array.isArray(c.tags) && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.tags.map((t, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-[9px] bg-[#E5E1D8]/50 text-[#1A1D21] px-1.5 py-0"
                      >
                        #{t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center">
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
                onClick={() => handleExcluir(c.id, c.nome)}
                className="w-7 h-7 text-red-600 hover:bg-red-50"
                title="Excluir Contato"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {contatosFiltrados.length === 0 && !carregando && (
          <div className="p-8 text-center text-xs text-[#5B6470]">Nenhum contato encontrado.</div>
        )}
      </div>

      {/* Modal Criar / Editar / Ver */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F766E]" />
              {modo === 'criar'
                ? 'Novo Contato'
                : modo === 'editar'
                  ? 'Editar Contato'
                  : 'Visualizar Contato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Nome Completo
              </label>
              <Input
                disabled={modo === 'ver'}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silveira"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Empresa</label>
                <Input
                  disabled={modo === 'ver'}
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Ex: Diamond Tech"
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Cargo</label>
                <Input
                  disabled={modo === 'ver'}
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Diretor Financeiro"
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">E-mail</label>
                <Input
                  disabled={modo === 'ver'}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos@empresa.com"
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Telefone</label>
                <Input
                  disabled={modo === 'ver'}
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-0000"
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Origem</label>
                <Select disabled={modo === 'ver'} value={origem} onValueChange={setOrigem}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="importado">Importado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Tags (separadas por vírgula)
                </label>
                <Input
                  disabled={modo === 'ver'}
                  value={tagsStr}
                  onChange={(e) => setTagsStr(e.target.value)}
                  placeholder="VIP, Estratégia, Follow-up"
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Contexto / Observações
              </label>
              <Textarea
                disabled={modo === 'ver'}
                rows={2}
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                placeholder="Histórico resumido do relacionamento..."
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
                <span>{salvando ? 'Salvando...' : 'Salvar Contato'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Importar Contatos */}
      <ModalImportarContatos
        open={modalImportarOpen}
        onOpenChange={setModalImportarOpen}
        contatosExistentes={contatos}
        onSucesso={() => {
          carregarDados()
          onRecarregarGlobal?.()
        }}
      />
    </div>
  )
}
