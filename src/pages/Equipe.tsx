import React, { useState, useEffect } from 'react'
import { diamondApi } from '@/services/diamondApi'
import { ModalDesbloqueioPlano } from '@/components/comercial/ModalDesbloqueioPlano'
import { useAuth } from '@/hooks/use-auth'
import { useNavegacao } from '@/contexts/NavegacaoContext'
import type { MembroEquipe, ConviteEquipe, EscopoItem, LimitesConsumoConta } from '@/types'
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
  Phone,
  MessageSquare,
  Copy,
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
  const { user, isMaster } = useAuth()
  const { toast } = useToast()
  const {
    membrosEquipe,
    convitesEquipe,
    setModalConvidarEquipeOpen,
    setModalConvidarEscopoPadrao,
    recarregarDadosGlobais,
  } = useNavegacao()

  const [limites, setLimites] = useState<LimitesConsumoConta | null>(null)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [tabAtiva, setTabAtiva] = useState<'membros' | 'convites' | 'todos'>('membros')
  const [filtroStatusConvite, setFiltroStatusConvite] = useState<string>('todos')
  const [processandoAcao, setProcessandoAcao] = useState<string | null>(null)
  const [conviteParaExcluir, setConviteParaExcluir] = useState<ConviteEquipe | null>(null)
  const [membroParaConfirmarAdmin, setMembroParaConfirmarAdmin] = useState<{
    membro: MembroEquipe
    acao: 'eleger' | 'remover'
  } | null>(null)

  useEffect(() => {
    diamondApi
      .getLimitesConsumoConta(user?.id, user?.email)
      .then(setLimites)
      .catch(() => {})
  }, [user])

  const convitesBloqueados = Boolean(limites?.bloqueadoConvites)

  const handleTentarConvidar = () => {
    if (convitesBloqueados) {
      setModalUpgradeOpen(true)
      return
    }
    setModalConvidarEscopoPadrao({ tipo: 'geral', nome: 'Workspace Completo' })
    setModalConvidarEquipeOpen(true)
  }

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

  // Copiar link de aceite direto
  const handleCopiarLinkConvite = (convite: ConviteEquipe) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${origin}/aceitar-convite?token=${convite.token}`
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast({
          title: 'Link de convite copiado!',
          description: 'O link direto de aceite foi copiado para sua área de transferência.',
        })
      })
      .catch(() => {
        toast({
          title: 'Link do convite',
          description: link,
        })
      })
  }

  // Reenviar convite por canal específico
  const handleReenviarConvite = async (
    convite: ConviteEquipe,
    canal: 'email' | 'whatsapp' | 'ambos' = 'ambos',
  ) => {
    setProcessandoAcao(convite.id)
    try {
      const resp = await diamondApi.reenviarConvite(convite.id, canal)
      await recarregarDadosGlobais()

      const avisos: string[] = []
      if (resp.whatsapp_enviado) {
        avisos.push('WhatsApp entregue com sucesso')
      } else if (resp.whatsapp_erro) {
        avisos.push(`WhatsApp falhou: ${resp.whatsapp_erro}`)
      }

      if (resp.email_enviado) {
        avisos.push('E-mail entregue via Resend')
      } else if (resp.email_erro) {
        avisos.push(`E-mail falhou: ${resp.email_erro}`)
      }

      if (resp.sucesso) {
        toast({
          title: `Convite reenviado (${canal === 'ambos' ? 'E-mail & WhatsApp' : canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'})!`,
          description: avisos.length > 0 ? avisos.join(' • ') : resp.mensagem,
        })
      } else {
        toast({
          title: 'Aviso no reenvio do convite',
          description: resp.mensagem || resp.erro || 'Verifique o status do canal.',
          variant: 'default',
        })
      }
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

  // Eleger outro membro como administrador
  const handleElegerAdmin = async (membro: MembroEquipe) => {
    setProcessandoAcao(membro.id)
    try {
      await diamondApi.elegerAdmin(membro.id)
      await recarregarDadosGlobais()
      toast({
        title: 'Administrador eleito com sucesso!',
        description: `${membro.nome || membro.email} agora possui perfil de administrador.`,
      })
    } catch {
      toast({ title: 'Erro ao eleger administrador', variant: 'destructive' })
    } finally {
      setProcessandoAcao(null)
      setMembroParaConfirmarAdmin(null)
    }
  }

  // Rebaixar administrador eleito para membro comum
  const handleRemoverAdmin = async (membro: MembroEquipe) => {
    setProcessandoAcao(membro.id)
    try {
      await diamondApi.removerAdmin(membro.id)
      await recarregarDadosGlobais()
      toast({
        title: 'Função de administrador removida',
        description: `${membro.nome || membro.email} voltou ao papel de membro comum da equipe.`,
      })
    } catch {
      toast({ title: 'Erro ao remover administrador', variant: 'destructive' })
    } finally {
      setProcessandoAcao(null)
      setMembroParaConfirmarAdmin(null)
    }
  }

  // Alterar função ou nível de acesso do membro
  const handleAlterarNivelMembro = async (
    membro: MembroEquipe,
    novoNivel: 'leitura' | 'edicao' | 'admin',
  ) => {
    if (novoNivel === 'admin') {
      if (!isMaster) {
        toast({
          title: 'Ação restrita ao Administrador Master',
          description: 'Apenas o Administrador Master pode eleger administradores na conta.',
          variant: 'destructive',
        })
        return
      }
      setMembroParaConfirmarAdmin({ membro, acao: 'eleger' })
      return
    }

    setProcessandoAcao(membro.id)
    try {
      if (membro.funcao === 'admin' || membro.nivel_acesso === 'admin') {
        await diamondApi.removerAdmin(membro.id)
        if (novoNivel === 'leitura') {
          await diamondApi.updateMembroEquipe(membro.id, {
            nivel_acesso: 'leitura',
            funcao: 'membro',
          })
        }
      } else {
        await diamondApi.updateMembroEquipe(membro.id, {
          nivel_acesso: novoNivel,
          funcao: 'membro',
        })
      }
      await recarregarDadosGlobais()
      toast({ title: `Nível de acesso atualizado para ${novoNivel}` })
    } catch {
      toast({ title: 'Erro ao atualizar nível', variant: 'destructive' })
    } finally {
      setProcessandoAcao(null)
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
            onClick={handleTentarConvidar}
            className={`text-xs gap-1.5 font-semibold shadow-xs h-9 px-3.5 ${
              convitesBloqueados
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-[#0F766E] hover:bg-[#0D5C56] text-white'
            }`}
          >
            {convitesBloqueados ? (
              <>
                <Ban className="w-4 h-4 text-amber-200" />
                <span>Convidar Membro (Bloqueado)</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Convidar Membro</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Aviso de bloqueio visível quando plano gratuito */}
      {convitesBloqueados && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-amber-950 uppercase tracking-wide">
                  Envio de Convites Bloqueado no Plano Prova Viva
                </h3>
                <Badge className="bg-amber-600 text-white text-[10px] h-4.5 px-1.5 font-bold">
                  Recurso Pago
                </Badge>
              </div>
              <p className="text-xs text-amber-900 mt-0.5">
                O envio de novos convites de equipe para sócios e colaboradores é restrito ao plano
                pago. Desbloqueie o plano para liberar convites ilimitados por escopo.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setModalUpgradeOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-200" />
            Desbloquear Convites
          </Button>
        </div>
      )}

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
                          {membro.is_master || isFundador ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-zinc-950 text-[9px] px-1.5 py-0 h-4 font-bold tracking-tight">
                              Admin Master
                            </Badge>
                          ) : membro.funcao === 'admin' ? (
                            <Badge className="bg-purple-100 text-purple-800 text-[9px] px-1.5 py-0 h-4 font-bold">
                              Admin Eleito
                            </Badge>
                          ) : null}
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

                      {/* Botões Rápidos e Dropdown de Ações */}
                      {!isFundador && (
                        <div className="flex items-center gap-1.5">
                          {/* Ação de Eleger / Remover Administrador (Visível para o Master) */}
                          {isMaster &&
                            !membro.is_master &&
                            (membro.funcao === 'admin' || membro.nivel_acesso === 'admin' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processandoAcao === membro.id}
                                onClick={() =>
                                  setMembroParaConfirmarAdmin({ membro, acao: 'remover' })
                                }
                                className="h-7 px-2 text-[11px] font-medium border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 gap-1"
                                title="Remover privilégios de administrador deste colaborador"
                              >
                                <Shield className="w-3 h-3" />
                                <span className="hidden sm:inline">Remover Admin</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={processandoAcao === membro.id}
                                onClick={() =>
                                  setMembroParaConfirmarAdmin({ membro, acao: 'eleger' })
                                }
                                className="h-7 px-2 text-[11px] font-medium border-[#0F766E]/30 text-[#0F766E] hover:bg-[#0F766E]/10 gap-1"
                                title="Eleger este colaborador como Administrador da conta"
                              >
                                <ShieldCheck className="w-3 h-3 text-[#0F766E]" />
                                <span className="hidden sm:inline">Eleger Admin</span>
                              </Button>
                            ))}

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
                              className="w-52 bg-white border-[#E5E1D8]"
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

                              {isMaster && (
                                <>
                                  <DropdownMenuSeparator />
                                  {membro.funcao === 'admin' || membro.nivel_acesso === 'admin' ? (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setMembroParaConfirmarAdmin({ membro, acao: 'remover' })
                                      }
                                      className="text-xs text-purple-700 cursor-pointer font-medium"
                                    >
                                      <Shield className="w-3.5 h-3.5 mr-2" />
                                      Remover Administrador
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setMembroParaConfirmarAdmin({ membro, acao: 'eleger' })
                                      }
                                      className="text-xs text-[#0F766E] cursor-pointer font-medium"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 mr-2 text-[#0F766E]" />
                                      Eleger Administrador
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

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
                        </div>
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
                        {convite.telefone && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#0F766E] font-mono bg-[#0F766E]/5 px-1.5 py-0.5 rounded border border-[#0F766E]/20">
                            <Phone className="w-2.5 h-2.5" />
                            {convite.telefone}
                          </span>
                        )}
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

                        {/* Badge do canal E-mail */}
                        {convite.email_enviado === true && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] py-0 px-1.5 h-4 gap-1"
                            title="E-mail de convite entregue via Resend"
                          >
                            <Mail className="w-2.5 h-2.5" />
                            <span>E-mail</span>
                          </Badge>
                        )}
                        {convite.email_enviado === false && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] py-0 px-1.5 h-4 gap-1"
                            title={convite.erro_envio || 'Falha no envio de e-mail'}
                          >
                            <Mail className="w-2.5 h-2.5" />
                            <span>E-mail falhou</span>
                          </Badge>
                        )}

                        {/* Badge do canal WhatsApp */}
                        {convite.telefone && convite.whatsapp_enviado === true && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] py-0 px-1.5 h-4 gap-1"
                            title="Mensagem de WhatsApp enviada pelo número pessoal conectado"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>WhatsApp</span>
                          </Badge>
                        )}
                        {convite.telefone && convite.whatsapp_enviado === false && (
                          <Badge
                            variant="secondary"
                            className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] py-0 px-1.5 h-4 gap-1"
                            title={convite.whatsapp_erro || 'Falha no envio via WhatsApp'}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>WhatsApp falhou</span>
                          </Badge>
                        )}
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
                        {convite.erro_envio && (
                          <span
                            className="text-amber-800 block text-[10px] font-medium max-w-md break-words mt-0.5 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200"
                            title={convite.erro_envio}
                          >
                            <span className="font-bold">E-mail:</span> {convite.erro_envio}
                          </span>
                        )}
                        {convite.whatsapp_erro && (
                          <span
                            className="text-rose-800 block text-[10px] font-medium max-w-md break-words mt-0.5 bg-rose-50/80 px-1.5 py-0.5 rounded border border-rose-200"
                            title={convite.whatsapp_erro}
                          >
                            <span className="font-bold">WhatsApp:</span> {convite.whatsapp_erro}
                          </span>
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
                            onClick={() => handleCopiarLinkConvite(convite)}
                            className="text-xs h-7 px-2 text-[#1A1D21] border-[#E5E1D8] hover:bg-[#F4F2EE] gap-1 font-medium"
                            title="Copiar link direto de aceite"
                          >
                            <Copy className="w-3 h-3 text-[#0F766E]" />
                            <span className="hidden sm:inline">Copiar Link</span>
                          </Button>

                          {/* Se tem telefone, permite escolher canal ou reenviar ambos */}
                          {convite.telefone ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={processandoAcao === convite.id}
                                  className="text-xs h-7 px-2 text-[#0F766E] border-[#E5E1D8] hover:bg-[#0F766E]/10 gap-1 font-medium"
                                  title="Reenviar convite por canal"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reenviar</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem
                                  onClick={() => handleReenviarConvite(convite, 'ambos')}
                                  className="gap-2 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-[#0F766E]" />
                                  <span>Reenviar Ambos (E-mail + WhatsApp)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleReenviarConvite(convite, 'whatsapp')}
                                  className="gap-2 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Apenas WhatsApp</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleReenviarConvite(convite, 'email')}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Apenas E-mail</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={processandoAcao === convite.id}
                              onClick={() => handleReenviarConvite(convite, 'email')}
                              className="text-xs h-7 px-2 text-[#0F766E] border-[#E5E1D8] hover:bg-[#0F766E]/10 gap-1 font-medium"
                              title="Reenviar e-mail de convite"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reenviar E-mail</span>
                            </Button>
                          )}

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
                            onClick={() => handleCopiarLinkConvite(convite)}
                            className="text-xs h-7 px-2 text-[#1A1D21] border-[#E5E1D8] hover:bg-[#F4F2EE] gap-1 font-medium"
                            title="Copiar link direto de aceite"
                          >
                            <Copy className="w-3 h-3 text-[#0F766E]" />
                            <span className="hidden sm:inline">Copiar Link</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={processandoAcao === convite.id}
                            onClick={() => handleReenviarConvite(convite, 'ambos')}
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

      {/* Modal de Desbloqueio Comercial */}
      <ModalDesbloqueioPlano
        open={modalUpgradeOpen}
        onOpenChange={setModalUpgradeOpen}
        recursoNome="Envio de Convites de Equipe"
        motivo="O envio de convites para colaboradores e clientes é liberado mediante ativação do plano pago da conta."
        isMaster={isMaster}
        isContaTeste={limites?.isContaTeste}
      />

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

      {/* Modal de confirmação para Eleger ou Remover Administrador */}
      <AlertDialog
        open={!!membroParaConfirmarAdmin}
        onOpenChange={(open) => {
          if (!open) setMembroParaConfirmarAdmin(null)
        }}
      >
        <AlertDialogContent className="bg-white border-[#E5E1D8] max-w-md">
          <AlertDialogHeader>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                membroParaConfirmarAdmin?.acao === 'eleger'
                  ? 'bg-emerald-50 text-[#0F766E]'
                  : 'bg-purple-50 text-purple-700'
              }`}
            >
              {membroParaConfirmarAdmin?.acao === 'eleger' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <AlertDialogTitle className="text-base font-bold text-[#1A1D21]">
              {membroParaConfirmarAdmin?.acao === 'eleger'
                ? 'Eleger como Administrador?'
                : 'Remover função de Administrador?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#5B6470] space-y-1.5">
              {membroParaConfirmarAdmin?.acao === 'eleger' ? (
                <span>
                  Você está elegendo{' '}
                  <strong className="text-[#1A1D21] font-semibold">
                    {membroParaConfirmarAdmin.membro.nome || membroParaConfirmarAdmin.membro.email}
                  </strong>{' '}
                  como Administrador. Este usuário poderá visualizar todos os módulos e gerenciar
                  recursos da conta conforme permissões administrativas delegadas pelo Master.
                </span>
              ) : (
                <span>
                  Você está rebaixando{' '}
                  <strong className="text-[#1A1D21] font-semibold">
                    {membroParaConfirmarAdmin?.membro.nome ||
                      membroParaConfirmarAdmin?.membro.email}
                  </strong>{' '}
                  para membro comum da equipe. Seus privilégios administrativos serão revogados
                  imediatamente.
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
                if (!membroParaConfirmarAdmin) return
                if (membroParaConfirmarAdmin.acao === 'eleger') {
                  handleElegerAdmin(membroParaConfirmarAdmin.membro)
                } else {
                  handleRemoverAdmin(membroParaConfirmarAdmin.membro)
                }
              }}
              className={`text-xs h-9 text-white font-semibold ${
                membroParaConfirmarAdmin?.acao === 'eleger'
                  ? 'bg-[#0F766E] hover:bg-[#0D5C56]'
                  : 'bg-purple-700 hover:bg-purple-800'
              }`}
            >
              {processandoAcao
                ? 'Processando...'
                : membroParaConfirmarAdmin?.acao === 'eleger'
                  ? 'Confirmar Eleição'
                  : 'Remover Função Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
