import React, { useState, useEffect } from 'react'
import {
  Crown,
  Building2,
  Users,
  Shield,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderKanban,
  FileText,
  Mail,
  UserCheck,
  UserMinus,
  Settings2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import { ResumoContaMaster, PlanoLicencaTipo, MembroEquipe } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'

export function Master() {
  const { user, isMaster } = useAuth()
  const { toast } = useToast()

  const [contas, setContas] = useState<ResumoContaMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [carregandoAcao, setCarregandoAcao] = useState(false)

  // Modal Alterar Plano
  const [modalPlanoOpen, setModalPlanoOpen] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState<ResumoContaMaster | null>(null)
  const [novoPlano, setNovoPlano] = useState<PlanoLicencaTipo>('pro')

  // Modal Eleger / Remover Admin
  const [modalAdminsOpen, setModalAdminsOpen] = useState(false)

  const carregarDados = async () => {
    try {
      setLoading(true)
      const resumos = await diamondApi.getPainelMasterDados()
      setContas(resumos)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar painel master'
      toast({
        title: 'Erro no Painel Master',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isMaster) {
      carregarDados()
    }
  }, [isMaster])

  // Se não for master, bloqueia com tela clara
  if (!isMaster) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 bg-[#FAF8F5]">
        <Card className="max-w-md w-full border-amber-300 shadow-md bg-white">
          <CardHeader className="text-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto mb-3 text-amber-800">
              <Lock className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold text-zinc-900 tracking-tight">
              Acesso Exclusivo ao Administrador Master
            </CardTitle>
            <CardDescription className="text-xs text-zinc-600 mt-1">
              Este painel de controle global é reservado exclusivamente ao Administrador Master da
              plataforma Agenda IA Diamond.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-2 space-y-4">
            <p className="text-xs text-zinc-500">
              Usuário conectado: <strong>{user?.email || 'Não autenticado'}</strong>
            </p>
            <Button
              className="w-full bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold"
              onClick={() => (window.location.href = '/dashboard')}
            >
              Voltar ao Meu Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSalvarPlano = async () => {
    if (!contaSelecionada) return
    try {
      setCarregandoAcao(true)
      await diamondApi.alterarPlanoConta(contaSelecionada.id, novoPlano, 'ativo')
      toast({
        title: 'Plano atualizado com sucesso!',
        description: `A conta ${contaSelecionada.nome_conta} agora está no plano ${novoPlano.toUpperCase()}. Os limites foram ajustados.`,
      })
      setModalPlanoOpen(false)
      await carregarDados()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível alterar o plano'
      toast({
        title: 'Erro ao alterar plano',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
  }

  const handleElegerAdmin = async (membroId: string, nomeMembro: string) => {
    try {
      setCarregandoAcao(true)
      await diamondApi.elegerAdmin(membroId)
      toast({
        title: 'Administrador Eleito',
        description: `${nomeMembro} agora é Administrador desta conta.`,
      })
      await carregarDados()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao eleger admin'
      toast({
        title: 'Erro ao eleger admin',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
  }

  const handleRemoverAdmin = async (membroId: string, nomeMembro: string) => {
    try {
      setCarregandoAcao(true)
      await diamondApi.removerAdmin(membroId)
      toast({
        title: 'Administrador Rebaixado',
        description: `${nomeMembro} retornou ao papel de membro colaborador.`,
      })
      await carregarDados()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao remover admin'
      toast({
        title: 'Erro ao remover admin',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
  }

  const renderBadgePlano = (plano: PlanoLicencaTipo) => {
    switch (plano) {
      case 'diamond_executive':
        return (
          <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[11px] border-0 shadow-xs">
            <Crown className="w-3 h-3 mr-1 text-amber-300" />
            Diamond Executive
          </Badge>
        )
      case 'pro':
        return (
          <Badge className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold text-[11px] border-0 shadow-xs">
            <Sparkles className="w-3 h-3 mr-1 text-amber-200" />
            Pro Empresarial
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="border-amber-400 bg-amber-50 text-amber-800 font-bold text-[11px]"
          >
            <Lock className="w-3 h-3 mr-1 text-amber-600" />
            Prova Viva (Gratuito)
          </Badge>
        )
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Topo do Painel Master */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#1A1D21] via-[#2A3038] to-[#1A1D21] text-white p-6 rounded-2xl shadow-sm border border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-zinc-950 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Crown className="w-3.5 h-3.5 text-zinc-950" />
              Painel do Administrador Master
            </span>
            <Badge variant="outline" className="border-white/30 text-white text-[10px]">
              Onda Comercial 2
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Gestão Global de Contas &amp; Licenças
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl">
            Visão consolidada de todas as contas da base, limites operacionais, consumo de Folha e
            Projetos, eleição de administradores e destravamento comercial.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="border-zinc-700 bg-zinc-800/80 text-white hover:bg-zinc-700 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Base
          </Button>
          <Button
            size="sm"
            onClick={() => (window.location.href = '/equipe')}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Tela de Equipe
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Total de Contas
              </p>
              <h3 className="text-2xl font-black text-zinc-900 mt-1">{contas.length}</h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Empresas / Workspaces</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E]">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Contas Pagas
              </p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">
                {contas.filter((c) => c.plano === 'pro' || c.plano === 'diamond_executive').length}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Sem travas de consumo</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Plano Prova Viva
              </p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">
                {contas.filter((c) => c.plano === 'gratuito').length}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Trava 2 dias / 2 projetos</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Lock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5E1D8] bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Admins Eleitos
              </p>
              <h3 className="text-2xl font-black text-zinc-900 mt-1">
                {contas.reduce((acc, c) => acc + c.admins.length, 0)}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5">Em todas as contas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela / Grid das Contas */}
      <Card className="border-[#E5E1D8] bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0F766E]" />
              <span>Contas da Base &amp; Consumo em Tempo Real</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 mt-0.5">
              Monitore dias de folha e projetos consumidos, e faça a gestão direta de planos e
              administradores.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-zinc-300 text-zinc-700 text-xs w-fit">
            {contas.length} {contas.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0F766E]" />
              <span>Carregando dados das contas e consumo da base...</span>
            </div>
          ) : contas.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Nenhuma licença de conta encontrada.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {contas.map((conta) => {
                const isGratuito = conta.plano === 'gratuito'
                const folhaBloqueada = isGratuito && conta.diasFolhaUsados >= conta.max_dias_folha
                const projetosBloqueados = isGratuito && conta.projetosUsados >= conta.max_projetos

                return (
                  <div
                    key={conta.id}
                    className="p-5 sm:p-6 transition-colors hover:bg-zinc-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    {/* Coluna 1: Info da Conta */}
                    <div className="space-y-2 lg:max-w-md">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-extrabold text-base text-zinc-900 tracking-tight flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-zinc-500" />
                          <span>{conta.nome_conta}</span>
                        </h3>
                        {renderBadgePlano(conta.plano)}
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            conta.status === 'ativo'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-zinc-300 bg-zinc-50 text-zinc-600'
                          }`}
                        >
                          Status: {conta.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                        {conta.titular_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-zinc-400" />
                            {conta.titular_email}
                          </span>
                        )}
                        {conta.titular_nome && (
                          <span className="text-zinc-400">• Titular: {conta.titular_nome}</span>
                        )}
                      </div>

                      {conta.observacoes && (
                        <p className="text-xs text-zinc-500 italic bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                          {conta.observacoes}
                        </p>
                      )}

                      {/* Lista resumida de Admins da Conta */}
                      <div className="pt-1">
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                          Administradores ({conta.admins.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {conta.admins.length === 0 ? (
                            <span className="text-xs text-zinc-400 italic">
                              Nenhum admin eleito
                            </span>
                          ) : (
                            conta.admins.map((admin) => (
                              <Badge
                                key={admin.id}
                                variant="outline"
                                className={`text-[11px] ${
                                  admin.is_master
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                    : 'bg-purple-50 text-purple-900 border-purple-200'
                                }`}
                              >
                                <Shield className="w-3 h-3 mr-1 text-purple-600" />
                                {admin.nome || admin.email}
                                {admin.is_master && ' (Master)'}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2: Consumo (Folha, Projetos, Convites) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                      {/* Dias de Folha */}
                      <div
                        className={`p-3 rounded-xl border text-center ${
                          folhaBloqueada
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-700">
                          <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Dias de Folha</span>
                        </div>
                        <div className="text-lg font-black text-zinc-900 mt-1">
                          {conta.diasFolhaUsados}{' '}
                          <span className="text-xs font-semibold text-zinc-500">
                            / {isGratuito ? conta.max_dias_folha : '∞'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {folhaBloqueada ? (
                            <span className="text-amber-800 font-bold flex items-center justify-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Limite Atingido
                            </span>
                          ) : isGratuito ? (
                            `${conta.max_dias_folha - conta.diasFolhaUsados} dias livres`
                          ) : (
                            'Ilimitado'
                          )}
                        </p>
                      </div>

                      {/* Projetos */}
                      <div
                        className={`p-3 rounded-xl border text-center ${
                          projetosBloqueados
                            ? 'bg-amber-50/80 border-amber-300'
                            : 'bg-white border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-700">
                          <FolderKanban className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Projetos</span>
                        </div>
                        <div className="text-lg font-black text-zinc-900 mt-1">
                          {conta.projetosUsados}{' '}
                          <span className="text-xs font-semibold text-zinc-500">
                            / {isGratuito ? conta.max_projetos : '∞'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {projetosBloqueados ? (
                            <span className="text-amber-800 font-bold flex items-center justify-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Limite Atingido
                            </span>
                          ) : isGratuito ? (
                            `${conta.max_projetos - conta.projetosUsados} projetos livres`
                          ) : (
                            'Ilimitado'
                          )}
                        </p>
                      </div>

                      {/* Convites / Membros */}
                      <div className="p-3 rounded-xl border bg-white border-zinc-200 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-700">
                          <Users className="w-3.5 h-3.5 text-[#0F766E]" />
                          <span>Membros &amp; Convites</span>
                        </div>
                        <div className="text-lg font-black text-zinc-900 mt-1">
                          {conta.membros.length}{' '}
                          <span className="text-xs font-semibold text-zinc-500">
                            ({conta.convitesTotal} convites)
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {conta.permite_convites ? (
                            <span className="text-emerald-700 font-medium">Convites liberados</span>
                          ) : (
                            <span className="text-amber-700 font-medium">Convites bloqueados</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Coluna 3: Ações do Master */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-end">
                      <Button
                        size="sm"
                        onClick={() => {
                          setContaSelecionada(conta)
                          setNovoPlano(conta.plano)
                          setModalPlanoOpen(true)
                        }}
                        className="bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                        Alterar Plano / Licença
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setContaSelecionada(conta)
                          setModalAdminsOpen(true)
                        }}
                        className="text-xs border-zinc-300 hover:bg-zinc-100 text-zinc-800"
                      >
                        <Shield className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                        Gerenciar Admins
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Alterar Plano / Licença */}
      <Dialog open={modalPlanoOpen} onOpenChange={setModalPlanoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Alterar Plano da Conta</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Conta: <strong>{contaSelecionada?.nome_conta}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 block">
                Selecione o Plano da Licença:
              </label>
              <Select
                value={novoPlano}
                onValueChange={(val) => setNovoPlano(val as PlanoLicencaTipo)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gratuito">
                    Prova Viva (Gratuito — limite 2 dias e 2 projetos)
                  </SelectItem>
                  <SelectItem value="pro">Pro Empresarial (Ilimitado + Módulos Ativos)</SelectItem>
                  <SelectItem value="diamond_executive">
                    Diamond Executive (Completo sem travas)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5 text-[11px] text-zinc-600">
              <p className="font-bold text-zinc-800">Efeito imediato desta alteração:</p>
              {novoPlano === 'gratuito' ? (
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  <li>Trava ativa em 2 dias distintos de folha</li>
                  <li>Trava ativa em 2 projetos cadastrados</li>
                  <li>Disparo de novos convites de equipe bloqueado</li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 space-y-0.5 text-emerald-800">
                  <li>Folha do Dia ilimitada (sem bloqueios de data)</li>
                  <li>Projetos ilimitados</li>
                  <li>Convites de equipe e módulos comerciais ativados</li>
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalPlanoOpen(false)}
              disabled={carregandoAcao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarPlano}
              disabled={carregandoAcao}
              className="bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold"
            >
              {carregandoAcao ? 'Salvando...' : 'Confirmar e Atualizar Licença'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gerenciar Admins da Conta */}
      <Dialog open={modalAdminsOpen} onOpenChange={setModalAdminsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <span>Administradores da Conta</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Eleja ou rebaixe administradores para a conta{' '}
              <strong>{contaSelecionada?.nome_conta}</strong>. Apenas o Master pode realizar esta
              ação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {contaSelecionada?.membros.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                Nenhum membro cadastrado nesta conta.
              </p>
            ) : (
              contaSelecionada?.membros.map((membro) => {
                const isAdmin = membro.funcao === 'admin' || membro.nivel_acesso === 'admin'
                const isFundadorMaster =
                  membro.is_master || membro.email === 'marcoschagasdiamond@icloud.com'

                return (
                  <div
                    key={membro.id}
                    className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">
                          {membro.nome || membro.email}
                        </span>
                        {isFundadorMaster && (
                          <Badge className="bg-amber-400 text-zinc-950 font-bold text-[10px]">
                            <Crown className="w-2.5 h-2.5 mr-1" />
                            Master
                          </Badge>
                        )}
                        {isAdmin && !isFundadorMaster && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold text-[10px]">
                            Admin
                          </Badge>
                        )}
                        {!isAdmin && !isFundadorMaster && (
                          <Badge variant="outline" className="text-zinc-600 text-[10px]">
                            Colaborador
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{membro.email}</p>
                    </div>

                    <div>
                      {isFundadorMaster ? (
                        <span className="text-[11px] text-amber-700 font-semibold italic">
                          Titular Permanente
                        </span>
                      ) : isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoverAdmin(membro.id, membro.nome || membro.email)}
                          disabled={carregandoAcao}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <UserMinus className="w-3.5 h-3.5 mr-1" />
                          Remover Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleElegerAdmin(membro.id, membro.nome || membro.email)}
                          disabled={carregandoAcao}
                          className="text-xs bg-purple-700 hover:bg-purple-800 text-white"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Eleger Admin
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setModalAdminsOpen(false)}
              className="text-xs bg-zinc-900 text-white"
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default Master
