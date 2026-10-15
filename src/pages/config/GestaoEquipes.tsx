import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import type { MembroEquipe, ConviteEquipe } from '@/types'
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Check,
  Mail,
  ShieldCheck,
  ExternalLink,
  Send,
  UserCheck,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface GestaoEquipesProps {
  onRecarregarGlobal?: () => void
}

export default function GestaoEquipes({ onRecarregarGlobal }: GestaoEquipesProps) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [membros, setMembros] = useState<MembroEquipe[]>([])
  const [convites, setConvites] = useState<ConviteEquipe[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')

  // Modal de edição/detalhes de membro
  const [modalMembroOpen, setModalMembroOpen] = useState(false)
  const [modoMembro, setModoMembro] = useState<'editar' | 'ver'>('ver')
  const [membroSelecionado, setMembroSelecionado] = useState<MembroEquipe | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [funcao, setFuncao] = useState<string>('membro')
  const [nivelAcesso, setNivelAcesso] = useState<string>('edicao')
  const [status, setStatus] = useState<string>('ativo')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal para criar convite rápido
  const [modalConviteOpen, setModalConviteOpen] = useState(false)
  const [conviteEmail, setConviteEmail] = useState('')
  const [conviteEscopoTipo, setConviteEscopoTipo] = useState<string>('geral')
  const [conviteNivel, setConviteNivel] = useState<string>('edicao')
  const [conviteMensagem, setConviteMensagem] = useState('')
  const [salvandoConvite, setSalvandoConvite] = useState(false)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [m, c] = await Promise.all([
        diamondApi.listMembrosEquipe(),
        diamondApi.listConvitesEquipe(),
      ])
      setMembros(m)
      setConvites(c)
    } catch {
      toast({ title: 'Erro ao carregar equipe e convites', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirEditarMembro = (m: MembroEquipe, apenasVer = false) => {
    setModoMembro(apenasVer ? 'ver' : 'editar')
    setMembroSelecionado(m)
    setNome(m.nome || '')
    setEmail(m.email)
    setFuncao(m.funcao || 'membro')
    setNivelAcesso(m.nivel_acesso || 'edicao')
    setStatus(m.status || 'ativo')
    setObservacoes(m.observacoes || '')
    setModalMembroOpen(true)
  }

  const handleSalvarMembro = async () => {
    if (!membroSelecionado) return
    setSalvando(true)
    try {
      await diamondApi.updateMembroEquipe(membroSelecionado.id, {
        nome: nome.trim(),
        funcao: funcao as any,
        nivel_acesso: nivelAcesso as any,
        status: status as any,
        observacoes: observacoes.trim(),
      })
      toast({ title: 'Membro atualizado com sucesso!' })
      setModalMembroOpen(false)
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao salvar membro', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirMembro = async (id: string, emailMembro: string) => {
    if (!confirm(`Deseja remover o membro "${emailMembro}" da equipe?`)) return
    try {
      await diamondApi.deleteMembroEquipe(id)
      toast({ title: 'Membro removido da equipe' })
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao excluir membro', variant: 'destructive' })
    }
  }

  const handleEnviarConvite = async () => {
    if (!conviteEmail.trim()) {
      toast({ title: 'Informe o e-mail para convite', variant: 'destructive' })
      return
    }
    setSalvandoConvite(true)
    try {
      await diamondApi.criarConvite({
        email: conviteEmail.trim().toLowerCase(),
        escopo_tipo: conviteEscopoTipo,
        escopo_nome: 'Workspace Completo',
        nivel_acesso: conviteNivel,
        mensagem: conviteMensagem.trim(),
      })
      toast({ title: 'Convite criado com sucesso!' })
      setModalConviteOpen(false)
      setConviteEmail('')
      setConviteMensagem('')
      await carregarDados()
      onRecarregarGlobal?.()
    } catch {
      toast({ title: 'Erro ao criar convite', variant: 'destructive' })
    } finally {
      setSalvandoConvite(false)
    }
  }

  const handleRevogarConvite = async (id: string) => {
    try {
      await diamondApi.revogarConvite(id)
      toast({ title: 'Convite revogado' })
      await carregarDados()
    } catch {
      toast({ title: 'Erro ao revogar convite', variant: 'destructive' })
    }
  }

  const membrosFiltrados = membros.filter(
    (m) =>
      (m.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
      m.email.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Topo / Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E1D8]">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6470]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por membro ou e-mail..."
            className="pl-9 text-xs border-[#E5E1D8]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/equipe')}
            className="text-xs border-[#E5E1D8] text-[#1A1D21] gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Módulo /equipe</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setModalConviteOpen(true)}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Convidar Membro</span>
          </Button>
        </div>
      </div>

      {/* Membros Ativos */}
      <div>
        <h3 className="text-sm font-bold text-[#1A1D21] mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0F766E]" />
          <span>Membros Cadastrados ({membrosFiltrados.length})</span>
        </h3>

        <div className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
          {membrosFiltrados.map((m) => (
            <div
              key={m.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1A1D21] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {m.nome?.[0]?.toUpperCase() || m.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1A1D21]">
                      {m.nome || m.email.split('@')[0]}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        m.funcao === 'admin'
                          ? 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30 font-semibold'
                          : 'bg-[#F4F2EE] text-[#5B6470]'
                      }`}
                    >
                      {m.funcao || 'membro'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize text-[#5B6470]">
                      {m.nivel_acesso || 'Edição'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#5B6470] mt-0.5">
                    <Mail className="w-3 h-3" />
                    <span>{m.email}</span>
                  </div>
                  {m.observacoes && (
                    <p className="text-[10px] text-[#5B6470] mt-1 italic">{m.observacoes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditarMembro(m, true)}
                  className="text-xs h-7 px-2.5 text-[#5B6470] border-[#E5E1D8] gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => abrirEditarMembro(m, false)}
                  className="text-xs h-7 px-2.5 text-[#0F766E] border-[#0F766E]/40 hover:bg-[#0F766E]/10 gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleExcluirMembro(m.id, m.email)}
                  className="w-7 h-7 text-red-600 hover:bg-red-50"
                  title="Remover Membro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {membrosFiltrados.length === 0 && !carregando && (
            <div className="p-8 text-center text-xs text-[#5B6470]">
              Nenhum membro encontrado na equipe.
            </div>
          )}
        </div>
      </div>

      {/* Convites Pendentes */}
      <div>
        <h3 className="text-sm font-bold text-[#1A1D21] mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-[#0F766E]" />
          <span>Convites Enviados ({convites.length})</span>
        </h3>

        <div className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden divide-y divide-[#E5E1D8]">
          {convites.map((c) => (
            <div
              key={c.id}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#1A1D21]">{c.email}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] ${
                      c.status === 'pendente'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : c.status === 'aceito'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {c.status}
                  </Badge>
                </div>
                <div className="text-[11px] text-[#5B6470] mt-0.5">
                  Escopo: <span className="capitalize font-medium">{c.escopo_tipo}</span> (
                  {c.escopo_nome || 'Geral'}) · Acesso: {c.nivel_acesso}
                </div>
              </div>

              {c.status === 'pendente' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRevogarConvite(c.id)}
                  className="text-xs h-7 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                >
                  Revogar
                </Button>
              )}
            </div>
          ))}
          {convites.length === 0 && (
            <div className="p-6 text-center text-xs text-[#5B6470]">Nenhum convite emitido.</div>
          )}
        </div>
      </div>

      {/* Modal Editar Membro */}
      <Dialog open={modalMembroOpen} onOpenChange={setModalMembroOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0F766E]" />
              {modoMembro === 'editar' ? 'Editar Membro da Equipe' : 'Visualizar Membro'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Nome</label>
              <Input
                disabled={modoMembro === 'ver'}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="text-xs border-[#E5E1D8]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">E-mail</label>
              <Input disabled value={email} className="text-xs border-[#E5E1D8] bg-[#F4F2EE]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Função</label>
                <Select disabled={modoMembro === 'ver'} value={funcao} onValueChange={setFuncao}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="membro">Membro</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Nível de Acesso
                </label>
                <Select
                  disabled={modoMembro === 'ver'}
                  value={nivelAcesso}
                  onValueChange={setNivelAcesso}
                >
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Acesso Total (Admin)</SelectItem>
                    <SelectItem value="edicao">Edição</SelectItem>
                    <SelectItem value="leitura">Somente Leitura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Status</label>
              <Select disabled={modoMembro === 'ver'} value={status} onValueChange={setStatus}>
                <SelectTrigger className="text-xs border-[#E5E1D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Observações</label>
              <Input
                disabled={modoMembro === 'ver'}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Responsável técnico por automações"
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalMembroOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              {modoMembro === 'ver' ? 'Fechar' : 'Cancelar'}
            </Button>
            {modoMembro === 'editar' && (
              <Button
                size="sm"
                disabled={salvando}
                onClick={handleSalvarMembro}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{salvando ? 'Salvando...' : 'Salvar Alterações'}</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Convidar */}
      <Dialog open={modalConviteOpen} onOpenChange={setModalConviteOpen}>
        <DialogContent className="max-w-md bg-white border-[#E5E1D8]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#0F766E]" />
              Convidar Novo Membro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">E-mail</label>
              <Input
                type="email"
                value={conviteEmail}
                onChange={(e) => setConviteEmail(e.target.value)}
                placeholder="colaborador@diamondgroup.com.br"
                className="text-xs border-[#E5E1D8]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">Escopo</label>
                <Select value={conviteEscopoTipo} onValueChange={setConviteEscopoTipo}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral (Workspace)</SelectItem>
                    <SelectItem value="projeto">Projeto Específico</SelectItem>
                    <SelectItem value="fluxo">Fluxo Kanban</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                  Nível de Acesso
                </label>
                <Select value={conviteNivel} onValueChange={setConviteNivel}>
                  <SelectTrigger className="text-xs border-[#E5E1D8]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edicao">Edição</SelectItem>
                    <SelectItem value="leitura">Leitura</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1A1D21] block mb-1">
                Mensagem Pessoal (Opcional)
              </label>
              <Input
                value={conviteMensagem}
                onChange={(e) => setConviteMensagem(e.target.value)}
                placeholder="Olá, junte-se ao nosso workspace executivo..."
                className="text-xs border-[#E5E1D8]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalConviteOpen(false)}
              className="text-xs border-[#E5E1D8]"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={salvandoConvite}
              onClick={handleEnviarConvite}
              className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{salvandoConvite ? 'Enviando...' : 'Criar Convite'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
