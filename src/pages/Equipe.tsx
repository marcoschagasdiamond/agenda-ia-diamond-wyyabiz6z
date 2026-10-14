import React, { useState } from 'react'
import { diamondApi } from '@/services/diamondApi'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import type { MembroEquipe, ConviteEquipe, EscopoItem } from '@/types'
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Ban,
  Trash2,
  Search,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  FolderKanban,
  KanbanSquare,
  UserCheck,
  ListTodo,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

export default function Equipe() {
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    membrosEquipe,
    convitesEquipe,
    setModalConvidarEquipeOpen,
    setModalConvidarEscopoPadrao,
    recarregarDadosGlobais,
  } = useNavegacao()

  const [busca, setBusca] = useState('')
  const [tabAtiva, setTabAtiva] = useState<'membros' | 'convites' | 'todos'>('membros')
  const [filtroStatusConvite, setFiltroStatusConvite] = useState<string>('todos')
  const [processandoAcao, setProcessandoAcao] = useState<string | null>(null)
  const [conviteParaExcluir, setConviteParaExcluir] = useState<ConviteEquipe | null>(null)

  // Membros filtrados
  const membrosFiltrados = membrosEquipe.filter((m) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    return (
      m.nome?.toLowerCase().includes(termo) ||
      m.email.toLowerCase().includes(termo) ||
      m.funcao?.toLowerCase().includes(termo)
    )
  })

  // Convites filtrados
  const convitesFiltrados = convitesEquipe.filter((c) => {
    if (filtroStatusConvite !== 'todos' && c.status !== filtroStatusConvite) {
      return false
    }
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    return (
      c.email.toLowerCase().includes(termo) ||
      c.escopo_nome?.toLowerCase().includes(termo) ||
      c.escopo_tipo.toLowerCase().includes(termo)
    )
  })

  // Métricas de equipe
  const totalMembrosAtivos = membrosEquipe.filter((m) => m.status === 'ativo').length
  const totalConvitesPendentes = convitesEquipe.filter((c) => c.status === 'pendente').length
  const totalConvitesExpirados = convitesEquipe.filter((c) => c.status === 'expirado').length

  // Reenviar convite
  const handleReenviarConvite = async (convite: ConviteEquipe) => {
    setProcessandoAcao(convite.id)
    try {
      await diamondApi.reenviarConvite(convite.id)
      await recarregarDadosGlobais()
      toast({
        title: 'Convite reenviado por e-mail!',
        description: `Enviamos novamente o link de aceite para ${convite.email}.`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao reenviar',
        description: (err as Error)?.message || 'Não foi possível reenviar o convite.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Revogar convite
  const handleRevogarConvite = async (convite: ConviteEquipe) => {
    if (!confirm(`Deseja revogar o convite para ${convite.email}? O link deixará de funcionar.`)) {
      return
    }
    setProcessandoAcao(convite.id)
    try {
      await diamondApi.revogarConvite(convite.id)
      await recarregarDadosGlobais()
      toast({ title: 'Convite revogado com sucesso.' })
    } catch {
      toast({ title: 'Erro ao revogar convite', variant: 'destructive' })
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Excluir convite definitivamente
  const handleConfirmarExcluirConvite = async () => {
    if (!conviteParaExcluir) return
    const id = conviteParaExcluir.id
    const email = conviteParaExcluir.email
    setProcessandoAcao(id)
    try {
      await diamondApi.excluirConvite(id)
      await recarregarDadosGlobais()
      toast({
        title: 'Convite excluído com sucesso',
        description: `O convite para ${email} foi removido definitivamente.`,
      })
      setConviteParaExcluir(null)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir convite',
        description: (err as Error)?.message || 'Não foi possível excluir o convite.',
        variant: 'destructive',
      })
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Remover membro
  const handleRemoverMembro = async (membro: MembroEquipe) => {
    if (membro.email === 'marcoschagasdiamond@icloud.com') {
      toast({
        title: 'Ação não permitida',
        description: 'O proprietário da conta não pode ser removido da equipe.',
        variant: 'destructive',
      })
      return
    }
    if (!confirm(`Remover ${membro.nome || membro.email} da equipe?`)) {
      return
    }
    setProcessandoAcao(membro.id)
    try {
      await diamondApi.deleteMembroEquipe(membro.id)
      await recarregarDadosGlobais()
      toast({ title: 'Membro removido da equipe.' })
    } catch {
      toast({ title: 'Erro ao remover membro', variant: 'destructive' })
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Alterar função ou nível de acesso do membro
  const handleAlterarNivelMembro = async (
    membro: MembroEquipe,
    novoNivel: 'leitura' | 'edicao' | 'admin',
  ) => {
    try {
      await diamondApi.updateMembroEquipe(membro.id, {
        nivel_acesso: novoNivel,
        funcao: novoNivel === 'admin' ? 'admin' : 'membro',
      })
      await recarregarDadosGlobais()
      toast({ title: `Nível de acesso atualizado para ${novoNivel}` })
    } catch {
      toast({ title: 'Erro ao atualizar nível', variant: 'destructive' })
    }
  }

  // Helper para renderizar badge de escopo
  const renderIconeEscopo = (tipo: string) => {
    switch (tipo) {
      case 'projeto':
        return <FolderKanban className="w-3 h-3 text-[#0F766E]" />
      case 'fluxo':
        return <KanbanSquare className="w-3 h-3 text-emerald-600" />
      case 'categoria':
        return <Shield className="w-3 h-3 text-purple-600" />
      case 'cliente':
        return <UserCheck className="w-3 h-3 text-blue-600" />
      case 'demanda':
        return <ListTodo className="w-3 h-3 text-amber-600" />
      default:
        return <Sparkles className="w-3 h-3 text-[#0F766E]" />
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner de Gestão de Equipe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1A1D21]">
              Gestão da Equipe & Colaboradores
            </h1>
            <Badge className="bg-[#0F766E]/10 text-[#0F766E] border-none text-[11px] font-semibold">
              Multi-Escopo
            </Badge>
          </div>
          <p className="text-xs text-[#5B6470] mt-1">
            Convide pessoas por e-mail com permissões pontuais por projeto, demanda, fluxo Kanban,
            categoria ou acesso geral.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setModalConvidarEscopoPadrao({ tipo: 'geral', nome: 'Workspace Completo' })
              setModalConvidarEquipeOpen(true)
            }}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5 font-semibold shadow-xs h-9 px-3.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Convidar Membro</span>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6470] block">
              Membros Ativos
            </span>
            <span className="text-2xl font-extrabold text-[#1A1D21] mt-0.5 block">
              {totalMembrosAtivos}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6470] block">
              Convites Pendentes
            </span>
            <span className="text-2xl font-extrabold text-amber-600 mt-0.5 block">
              {totalConvitesPendentes}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E1D8] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6470] block">
              Convites Expirados / Revogados
            </span>
            <span className="text-2xl font-extrabold text-[#5B6470] mt-0.5 block">
              {
                convitesEquipe.filter((c) => c.status === 'expirado' || c.status === 'revogado')
                  .length
              }
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 text-[#5B6470] flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filtros e Abas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E1D8]">
        {/* Abas */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTabAtiva('membros')}
            className={`text-xs h-8 px-3 rounded-lg font-semibold ${
              tabAtiva === 'membros'
                ? 'bg-[#1A1D21] text-white hover:bg-[#1A1D21] hover:text-white'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            Membros da Equipe ({membrosFiltrados.length})
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTabAtiva('convites')}
            className={`text-xs h-8 px-3 rounded-lg font-semibold ${
              tabAtiva === 'convites'
                ? 'bg-[#1A1D21] text-white hover:bg-[#1A1D21] hover:text-white'
                : 'text-[#5B6470] hover:bg-[#F4F2EE] hover:text-[#1A1D21]'
            }`}
          >
            Convites Enviados ({convitesFiltrados.length})
          </Button>
        </div>

        {/* Barra de Busca e Filtro de Status para Convites */}
        <div className="flex items-center gap-2">
          {tabAtiva === 'convites' && (
            <div className="flex items-center gap-1 bg-[#F4F2EE] p-0.5 rounded-lg border border-[#E5E1D8]">
              <button
                type="button"
                onClick={() => setFiltroStatusConvite('todos')}
                className={`text-[11px] px-2 py-1 rounded font-medium ${
                  filtroStatusConvite === 'todos'
                    ? 'bg-white text-[#1A1D21] shadow-2xs font-bold'
                    : 'text-[#5B6470]'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusConvite('pendente')}
                className={`text-[11px] px-2 py-1 rounded font-medium ${
                  filtroStatusConvite === 'pendente'
                    ? 'bg-white text-[#0F766E] shadow-2xs font-bold'
                    : 'text-[#5B6470]'
                }`}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusConvite('aceito')}
                className={`text-[11px] px-2 py-1 rounded font-medium ${
                  filtroStatusConvite === 'aceito'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-[#5B6470]'
                }`}
              >
                Aceitos
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatusConvite('expirado')}
                className={`text-[11px] px-2 py-1 rounded font-medium ${
                  filtroStatusConvite === 'expirado'
                    ? 'bg-white text-amber-700 shadow-2xs font-bold'
                    : 'text-[#5B6470]'
                }`}
              >
                Expirados
              </button>
            </div>
          )}

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#5B6470]" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="pl-8 text-xs h-8 border-[#E5E1D8]"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo da Aba Membros */}
      {tabAtiva === 'membros' && (
        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
            <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0F766E]" />
                Membros com Acesso ao Sistema
              </span>
              <span className="text-xs text-[#5B6470] font-normal">
                {membrosFiltrados.length} colaborador(es)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E5E1D8]">
              {membrosFiltrados.map((membro) => {
                const escoposLista: EscopoItem[] = Array.isArray(membro.escopos)
                  ? membro.escopos
                  : []
                const isFundador = membro.email === 'marcoschagasdiamond@icloud.com'

                return (
                  <div
                    key={membro.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
                  >
                    {/* Identificação do Usuário */}
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <div className="w-10 h-10 rounded-full bg-[#1A1D21] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-[#E5E1D8]">
                        {membro.nome?.[0] || membro.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#1A1D21]">
                            {membro.nome || membro.email.split('@')[0]}
                          </span>
                          {isFundador && (
                            <Badge className="bg-[#0F766E] text-white text-[9px] px-1.5 py-0 h-4">
                              Fundador
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-[#5B6470] flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {membro.email}
                        </span>
                      </div>
                    </div>

                    {/* Escopos Concedidos */}
                    <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                      {escoposLista.length === 0 ? (
                        <span className="text-[11px] text-[#5B6470] italic">Acesso básico</span>
                      ) : (
                        escoposLista.map((esc, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="bg-[#F4F2EE] text-[#1A1D21] border border-[#E5E1D8] text-[10px] font-medium py-0.5 px-2 gap-1 flex items-center"
                          >
                            {renderIconeEscopo(esc.tipo)}
                            <span className="font-semibold capitalize">{esc.tipo}:</span>
                            <span className="truncate max-w-[150px]">{esc.nome || 'Item'}</span>
                            <span className="text-[9px] text-[#0F766E] font-bold">
                              ({esc.nivel})
                            </span>
                          </Badge>
                        ))
                      )}
                    </div>

                    {/* Nível de Acesso / Função */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                          membro.nivel_acesso === 'admin'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : membro.nivel_acesso === 'edicao'
                              ? 'bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/30'
                              : 'bg-zinc-100 text-[#5B6470] border-zinc-200'
                        }`}
                      >
                        {membro.nivel_acesso || 'Edição'}
                      </Badge>

                      {/* Dropdown de Ações */}
                      {!isFundador && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[#5B6470] hover:text-[#1A1D21]"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 bg-white border-[#E5E1D8]"
                          >
                            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">
                              Alterar Permissão
                            </div>
                            <DropdownMenuItem
                              onClick={() => handleAlterarNivelMembro(membro, 'leitura')}
                              className="text-xs cursor-pointer"
                            >
                              Somente Leitura
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAlterarNivelMembro(membro, 'edicao')}
                              className="text-xs cursor-pointer"
                            >
                              Pode Editar (Padrão)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAlterarNivelMembro(membro, 'admin')}
                              className="text-xs cursor-pointer"
                            >
                              Administrador
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoverMembro(membro)}
                              className="text-xs text-red-600 focus:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Remover da Equipe
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )
              })}

              {membrosFiltrados.length === 0 && (
                <div className="p-8 text-center text-xs text-[#5B6470]">
                  Nenhum membro encontrado com este filtro.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo da Aba Convites */}
      {tabAtiva === 'convites' && (
        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
            <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#0F766E]" />
                Histórico de Convites por E-mail
              </span>
              <span className="text-xs text-[#5B6470] font-normal">
                {convitesFiltrados.length} convite(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E5E1D8]">
              {convitesFiltrados.map((convite) => {
                const isPendente = convite.status === 'pendente'
                const isAceito = convite.status === 'aceito'
                const isExpirado = convite.status === 'expirado'
                const isRevogado = convite.status === 'revogado'

                return (
                  <div
                    key={convite.id}
                    className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
                  >
                    {/* E-mail e Status */}
                    <div className="min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1A1D21]">{convite.email}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold uppercase py-0 px-1.5 h-4 ${
                            isAceito
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isPendente
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : isExpirado
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-zinc-100 text-[#5B6470] border-zinc-200'
                          }`}
                        >
                          {convite.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-[#5B6470] mt-0.5 block">
                        Enviado em:{' '}
                        {convite.created
                          ? new Date(convite.created).toLocaleDateString('pt-BR')
                          : '-'}
                        {convite.expira_em && isPendente && (
                          <>
                            {' '}
                            &bull; Expira em:{' '}
                            {new Date(convite.expira_em).toLocaleDateString('pt-BR')}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Escopo do Convite */}
                    <div className="flex-1 flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className="bg-[#F4F2EE] text-[#1A1D21] border border-[#E5E1D8] text-[11px] py-1 px-2.5 gap-1.5"
                      >
                        {renderIconeEscopo(convite.escopo_tipo)}
                        <span className="font-semibold capitalize">{convite.escopo_tipo}:</span>
                        <span className="font-medium text-[#0F766E]">
                          {convite.escopo_nome || 'Workspace'}
                        </span>
                        <span className="text-[10px] text-[#5B6470]">({convite.nivel_acesso})</span>
                      </Badge>

                      {convite.mensagem && (
                        <span
                          className="text-[11px] text-[#5B6470] truncate max-w-[220px] italic hidden lg:inline"
                          title={convite.mensagem}
                        >
                          "{convite.mensagem}"
                        </span>
                      )}
                    </div>

                    {/* Ações: Reenviar, Revogar, Excluir */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPendente && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={processandoAcao === convite.id}
                            onClick={() => handleReenviarConvite(convite)}
                            className="text-xs h-7 px-2 text-[#0F766E] border-[#E5E1D8] hover:bg-[#0F766E]/10 gap-1 font-medium"
                            title="Reenviar e-mail de convite"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reenviar</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={processandoAcao === convite.id}
                            onClick={() => handleRevogarConvite(convite)}
                            className="text-xs h-7 px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50 gap-1 font-medium"
                            title="Revogar link de acesso"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Revogar</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={processandoAcao === convite.id}
                            onClick={() => setConviteParaExcluir(convite)}
                            className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 font-medium"
                            title="Excluir convite definitivamente"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </Button>
                        </>
                      )}

                      {isExpirado && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={processandoAcao === convite.id}
                            onClick={() => handleReenviarConvite(convite)}
                            className="text-xs h-7 px-2 text-[#0F766E] border-[#E5E1D8] hover:bg-[#0F766E]/10 gap-1 font-medium"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Renovar & Reenviar</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={processandoAcao === convite.id}
                            onClick={() => setConviteParaExcluir(convite)}
                            className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 font-medium"
                            title="Excluir convite definitivamente"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </Button>
                        </>
                      )}

                      {isRevogado && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={processandoAcao === convite.id}
                          onClick={() => setConviteParaExcluir(convite)}
                          className="text-xs h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 font-medium"
                          title="Excluir convite definitivamente"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Excluir</span>
                        </Button>
                      )}

                      {isAceito && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium px-2 py-0.5 bg-emerald-50 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Aceito em{' '}
                            {convite.aceito_em
                              ? new Date(convite.aceito_em).toLocaleDateString('pt-BR')
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {convitesFiltrados.length === 0 && (
                <div className="p-8 text-center text-xs text-[#5B6470]">
                  Nenhum convite encontrado com este filtro.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmação de exclusão de convite */}
      <AlertDialog
        open={!!conviteParaExcluir}
        onOpenChange={(open) => {
          if (!open) setConviteParaExcluir(null)
        }}
      >
        <AlertDialogContent className="bg-white border-[#E5E1D8] max-w-md">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-[#1A1D21]">
              Excluir convite?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5B6470] space-y-1.5">
              <span>
                Esta ação não pode ser desfeita. O convite para{' '}
                <strong className="text-[#1A1D21] font-semibold">
                  {conviteParaExcluir?.email}
                </strong>{' '}
                será removido definitivamente do sistema.
              </span>
              {conviteParaExcluir?.escopo_nome && (
                <span className="block text-[11px] text-[#0F766E] font-medium pt-1">
                  Escopo: {conviteParaExcluir.escopo_tipo} &bull; {conviteParaExcluir.escopo_nome} (
                  {conviteParaExcluir.nivel_acesso})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={!!processandoAcao}
              className="text-xs h-9 border-[#E5E1D8] hover:bg-[#F4F2EE]"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!!processandoAcao}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmarExcluirConvite()
              }}
              className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {processandoAcao ? 'Excluindo...' : 'Excluir convite'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
