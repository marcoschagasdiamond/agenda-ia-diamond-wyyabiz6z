import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { Cliente } from '@/types'
import {
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Check,
  Mail,
  Phone,
  Building,
} from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

interface GestaoClientesProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoClientes({ onRecarregarGlobal }: GestaoClientesProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)

  // Formulário
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const data = await diamondApi.listClientes()
      setClientes(data)
    } catch {
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNovo = () => {
    setModo('criar')
    setClienteSelecionado(null)
    setNome('')
    setEmpresa('')
    setEmail('')
    setTelefone('')
    setTagsStr('')
    setModalOpen(true)
  }

  const abrirEditar = (c: Cliente, apenasVer = false) => {
    setModo(apenasVer ? 'ver' : 'editar')
    setClienteSelecionado(c)
    setNome(c.nome)
    setEmpresa(c.empresa || '')
    setEmail(c.email)
    setTelefone(c.telefone || '')
    setTagsStr(Array.isArray(c.tags) ? c.tags.join(', ') : '')
    setModalOpen(true)
  }

  const handleSalvar = async () => {
    if (!nome.trim() || !email.trim()) {
      toast({ title: 'Nome e e-mail são obrigatórios', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const tagsArray = tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const payload: Partial<Cliente> = {
        nome: nome.trim(),
        empresa: empresa.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim(),
        tags: tagsArray,
        cadastrado_por: user?.id,
      }

      if (modo === 'criar') {
        await diamondApi.createCliente(payload)
        toast({ title: 'Cliente cadastrado com sucesso!' })
      } else if (modo === 'editar' && clienteSelecionado) {
        await diamondApi.updateCliente(clienteSelecionado.id, payload)
        toast({ title: 'Cliente atualizado!' })
      }
      setModalOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar cliente', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string, nomeCliente: string) => {
    if (!confirm(`Deseja realmente excluir o cliente "${nomeCliente}"?`)) return
    try {
      await diamondApi.deleteCliente(id)
      toast({ title: 'Cliente excluído' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' })
    }
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (c.empresa || '').toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      {/* Topo / Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por cliente, empresa ou e-mail..."
            className="pl-9 text-xs border-[#E5E1D8]"
          />
        </div>

        <Button
          size="sm"
          onClick={abrirNovo}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Cliente</span>
        </Button>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
        {clientesFiltrados.map((c) => (
          <div
            key={c.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center font-bold text-xs shrink-0 border border-[#0F766E]/20">
                {c.nome?.[0]?.toUpperCase() || 'C'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1A1D21]">{c.nome}</span>
                  {c.empresa && <span className="text-[11px] text-[#5B6470]">· {c.empresa}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5B6470] mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-[#0F766E]" />
                    <span>{c.email}</span>
                  </span>
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
                title="Excluir Cliente"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {clientesFiltrados.length === 0 && !carregando && (
          <div className="p-8 text-center text-xs text-[#5B6470]">Nenhum cliente cadastrado.</div>
        )}
      </div>

      {/* Modal Criar / Editar / Ver */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#0F766E]" />
              {modo === 'criar'
                ? 'Novo Cliente'
                : modo === 'editar'
                  ? 'Editar Cliente'
                  : 'Visualizar Cliente'}
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
                placeholder="Ex: Dra. Helena Martins"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Empresa / Instituição
              </label>
              <Input
                disabled={modo === 'ver'}
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex: Hospital Premium São Paulo"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">E-mail</label>
                <Input
                  disabled={modo === 'ver'}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="helena@empresa.com"
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Telefone</label>
                <Input
                  disabled={modo === 'ver'}
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="text-xs border-[#E5E1D8]"
                />
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
                placeholder="VIP, Contrato Anual, Expansão"
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
                <span>{salvando ? 'Salvando...' : 'Salvar Cliente'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
