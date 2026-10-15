import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { Projeto, Cliente } from '@/types'
import {
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Check,
  Calendar,
  DollarSign,
  User,
  ExternalLink,
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
import { useNavigate } from 'react-router-dom'

interface GestaoProjetosProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoProjetos({ onRecarregarGlobal }: GestaoProjetosProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modais
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState<'criar' | 'editar' | 'ver'>('criar')
  const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null)

  // Formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<string>('negocio')
  const [status, setStatus] = useState<string>('ativo')
  const [clienteId, setClienteId] = useState<string>('')
  const [orcamento, setOrcamento] = useState<string>('')
  const [cor, setCor] = useState('#0F766E')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [projs, clis] = await Promise.all([
        diamondApi.listProjetos(),
        diamondApi.listClientes(),
      ])
      setProjetos(projs)
      setClientes(clis)
    } catch {
      toast({ title: 'Erro ao carregar projetos', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirNovo = () => {
    setModo('criar')
    setProjetoSelecionado(null)
    setNome('')
    setDescricao('')
    setTipo('negocio')
    setStatus('ativo')
    setClienteId('')
    setOrcamento('')
    setCor('#0F766E')
    setDataInicio('')
    setDataFim('')
    setModalOpen(true)
  }

  const abrirEditar = (p: Projeto, apenasVer = false) => {
    setModo(apenasVer ? 'ver' : 'editar')
    setProjetoSelecionado(p)
    setNome(p.nome)
    setDescricao(p.descricao || '')
    setTipo(p.tipo || 'negocio')
    setStatus(p.status || 'ativo')
    setClienteId(p.cliente || '')
    setOrcamento(p.orcamento_total ? String(p.orcamento_total) : '')
    setCor(p.cor || '#0F766E')
    setDataInicio(p.data_inicio ? p.data_inicio.split('T')[0].split(' ')[0] : '')
    setDataFim(p.data_fim ? p.data_fim.split('T')[0].split(' ')[0] : '')
    setModalOpen(true)
  }

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe o nome do projeto', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      const payload: Partial<Projeto> = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        tipo: tipo as any,
        status: status as any,
        cliente: clienteId || undefined,
        orcamento_total: orcamento ? Number(orcamento) : undefined,
        cor,
        data_inicio: dataInicio ? `${dataInicio} 00:00:00.000Z` : undefined,
        data_fim: dataFim ? `${dataFim} 00:00:00.000Z` : undefined,
      }

      if (modo === 'criar') {
        await diamondApi.createProjeto(payload)
        toast({ title: 'Projeto criado com sucesso!' })
      } else if (modo === 'editar' && projetoSelecionado) {
        await diamondApi.updateProjeto(projetoSelecionado.id, payload)
        toast({ title: 'Projeto atualizado com sucesso!' })
      }
      setModalOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar projeto', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string, nomeProj: string) => {
    if (!confirm(`Deseja realmente excluir o projeto "${nomeProj}"?`)) return
    try {
      await diamondApi.deleteProjeto(id)
      toast({ title: 'Projeto excluído' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir projeto', variant: 'destructive' })
    }
  }

  const projetosFiltrados = projetos.filter((p) => {
    const atendeBusca =
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.descricao || '').toLowerCase().includes(busca.toLowerCase())
    const atendeStatus = filtroStatus === 'todos' || p.status === filtroStatus
    return atendeBusca && atendeStatus
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
              placeholder="Buscar projetos..."
              className="pl-9 text-xs border-[#E5E1D8]"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-36 text-xs border-[#E5E1D8]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="pausado">Pausados</SelectItem>
              <SelectItem value="concluido">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={abrirNovo}
          className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Projeto</span>
        </Button>
      </div>

      {/* Lista de Projetos */}
      <div className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
        {projetosFiltrados.map((p) => {
          const cli = clientes.find((c) => c.id === p.cliente)
          return (
            <div
              key={p.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
            >
              <div className="flex items-start gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: p.cor || '#0F766E' }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1A1D21]">{p.nome}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        p.status === 'ativo'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : p.status === 'pausado'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {p.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-[#5B6470] capitalize">
                      {p.tipo}
                    </Badge>
                  </div>
                  {p.descricao && (
                    <p className="text-[11px] text-[#5B6470] mt-0.5 line-clamp-1">{p.descricao}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5B6470] mt-1.5">
                    {cli && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#0F766E]" />
                        <span>{cli.nome}</span>
                      </span>
                    )}
                    {p.orcamento_total && (
                      <span className="flex items-center gap-1 font-medium text-[#1A1D21]">
                        <DollarSign className="w-3 h-3 text-[#0F766E]" />
                        <span>R$ {p.orcamento_total.toLocaleString('pt-BR')}</span>
                      </span>
                    )}
                    {(p.data_inicio || p.data_fim) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#5B6470]" />
                        <span>
                          {p.data_inicio ? p.data_inicio.split('T')[0].split(' ')[0] : '...'} até{' '}
                          {p.data_fim ? p.data_fim.split('T')[0].split(' ')[0] : '...'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/projetos/${p.id}`)}
                  className="text-xs h-7 px-2 text-[#0F766E] hover:bg-[#0F766E]/10 gap-1"
                  title="Abrir página completa do projeto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Detalhes</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(p, true)}
                  className="text-xs h-7 px-2 text-[#5B6470] border-[#E5E1D8] gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditar(p, false)}
                  className="text-xs h-7 px-2 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#0F766E]/10 gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleExcluir(p.id, p.nome)}
                  className="w-7 h-7 text-red-600 hover:bg-red-50"
                  title="Excluir Projeto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
        {projetosFiltrados.length === 0 && !carregando && (
          <div className="p-8 text-center text-xs text-[#5B6470]">Nenhum projeto encontrado.</div>
        )}
      </div>

      {/* Modal Criar / Editar / Ver */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#0F766E]" />
              {modo === 'criar'
                ? 'Novo Projeto'
                : modo === 'editar'
                  ? 'Editar Projeto'
                  : 'Visualizar Projeto'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Nome do Projeto
              </label>
              <Input
                disabled={modo === 'ver'}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Expansão Hospitalar VIP"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Tipo</label>
                <Select disabled={modo === 'ver'} value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negocio">Negócio Próprio</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="posicionamento">Posicionamento</SelectItem>
                    <SelectItem value="precos">Preços & Produtos</SelectItem>
                    <SelectItem value="devices">Devices</SelectItem>
                    <SelectItem value="estudo">Estudo / P&D</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Status</label>
                <Select disabled={modo === 'ver'} value={status} onValueChange={setStatus}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Cliente Vinculado (Opcional)
              </label>
              <Select disabled={modo === 'ver'} value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum cliente</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.empresa ? `(${c.empresa})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Orçamento Total (R$)
                </label>
                <Input
                  disabled={modo === 'ver'}
                  type="number"
                  value={orcamento}
                  onChange={(e) => setOrcamento(e.target.value)}
                  placeholder="Ex: 50000"
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
                    className="text-xs border-[#E5E1D8]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Data de Início
                </label>
                <Input
                  disabled={modo === 'ver'}
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Data de Término
                </label>
                <Input
                  disabled={modo === 'ver'}
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="text-xs border-[#E5E1D8]"
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
                placeholder="Objetivo e escopo estratégico do projeto..."
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
                <span>{salvando ? 'Salvando...' : 'Salvar Projeto'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
