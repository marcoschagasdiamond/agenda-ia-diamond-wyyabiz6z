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
  CreditCard,
  Link as LinkIcon,
  Copy,
  Check,
  Globe,
  Sliders,
  DollarSign,
  FlaskConical,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import { ResumoContaMaster, PlanoLicencaTipo, MembroEquipe, ModuloLicenca } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { useToast } from '@/hooks/use-toast'

export function Master() {
  const { user, isMaster } = useAuth()
  const { toast } = useToast()

  const [contas, setContas] = useState<ResumoContaMaster[]>([])
  const [loading, setLoading] = useState(true)
  const [carregandoAcao, setCarregandoAcao] = useState(false)

  // Configuração Comercial Global / Checkout Stripe
  const [paymentLink, setPaymentLink] = useState('')
  const [precoMensal, setPrecoMensal] = useState(197)
  const [salvandoCheckout, setSalvandoCheckout] = useState(false)
  const [copiadoWebhook, setCopiadoWebhook] = useState(false)

  // Configuração do Plano Gratuito Inicial (Prova Viva)
  const [configGratuito, setConfigGratuito] = useState<{
    id: string
    max_dias_folha: number
    max_projetos: number
    permite_convites: boolean
    permite_whatsapp: boolean
    permite_ia: boolean
    permite_financas: boolean
    modulos_inclusos: string[]
    nome_exibicao: string
    descricao: string
  }>({
    id: '',
    max_dias_folha: 2,
    max_projetos: 2,
    permite_convites: false,
    permite_whatsapp: false,
    permite_ia: false,
    permite_financas: false,
    modulos_inclusos: ['nucleo', 'folha_dia', 'projetos'],
    nome_exibicao: 'Prova Viva',
    descricao: 'Plano gratuito inicial concedido a novos usuários.',
  })
  const [salvandoConfigGratuito, setSalvandoConfigGratuito] = useState(false)

  // Modal Alterar Plano
  const [modalPlanoOpen, setModalPlanoOpen] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState<ResumoContaMaster | null>(null)
  const [novoPlano, setNovoPlano] = useState<PlanoLicencaTipo>('pro')

  // Modal Confirmar Modo Conta de Teste
  const [modalTesteOpen, setModalTesteOpen] = useState(false)
  const [contaParaTeste, setContaParaTeste] = useState<ResumoContaMaster | null>(null)
  const [alvoContaTeste, setAlvoContaTeste] = useState<boolean>(false)

  // Modal Eleger / Remover Admin
  const [modalAdminsOpen, setModalAdminsOpen] = useState(false)

  // Modal Módulos da Conta
  const [modalModulosOpen, setModalModulosOpen] = useState(false)
  const [modulosConta, setModulosConta] = useState<ModuloLicenca[]>([])
  const [carregandoModulos, setCarregandoModulos] = useState(false)

  const backendBaseUrl = (import.meta.env.VITE_POCKETBASE_URL || window.location.origin).replace(
    /\/$/,
    '',
  )
  const webhookUrlCompleta = `${backendBaseUrl}/backend/v1/stripe_webhook`

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [resumos, limites, cfgGratuito] = await Promise.all([
        diamondApi.getPainelMasterDados(),
        diamondApi.getLimitesConsumoConta(),
        diamondApi.getConfigPlanoGratuito(),
      ])
      setContas(resumos)
      if (limites.stripePaymentLink) {
        setPaymentLink(limites.stripePaymentLink)
      }
      if (limites.precoMensal) {
        setPrecoMensal(limites.precoMensal)
      }
      if (cfgGratuito) {
        setConfigGratuito({
          id: cfgGratuito.id || '',
          max_dias_folha: cfgGratuito.max_dias_folha,
          max_projetos: cfgGratuito.max_projetos,
          permite_convites: cfgGratuito.permite_convites,
          permite_whatsapp: cfgGratuito.permite_whatsapp,
          permite_ia: cfgGratuito.permite_ia,
          permite_financas: cfgGratuito.permite_financas,
          modulos_inclusos: cfgGratuito.modulos_inclusos || ['nucleo', 'folha_dia', 'projetos'],
          nome_exibicao: cfgGratuito.nome_exibicao || 'Prova Viva',
          descricao: cfgGratuito.descricao || '',
        })
      }
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

  const handleSalvarCheckoutGlobal = async () => {
    try {
      setSalvandoCheckout(true)
      await diamondApi.salvarConfiguracaoCheckoutGlobal(paymentLink, precoMensal)
      toast({
        title: 'Checkout Stripe Configurado!',
        description:
          'O Payment Link e o preço R$ 197/mês foram vinculados a todas as licenças da base.',
      })
      await carregarDados()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar link de checkout'
      toast({
        title: 'Erro ao salvar Payment Link',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoCheckout(false)
    }
  }

  const handleCopiarWebhook = () => {
    navigator.clipboard.writeText(webhookUrlCompleta)
    setCopiadoWebhook(true)
    toast({
      title: 'URL do Webhook Copiada!',
      description: 'Cole esta URL no painel do Stripe em Desenvolvedores > Webhooks.',
    })
    setTimeout(() => setCopiadoWebhook(false), 3000)
  }

  const handleSalvarPlanoGratuito = async () => {
    try {
      setSalvandoConfigGratuito(true)
      await diamondApi.salvarConfigPlanoGratuito({
        max_dias_folha: Number(configGratuito.max_dias_folha),
        max_projetos: Number(configGratuito.max_projetos),
        permite_convites: Boolean(configGratuito.permite_convites),
        permite_whatsapp: Boolean(configGratuito.permite_whatsapp),
        permite_ia: Boolean(configGratuito.permite_ia),
        permite_financas: Boolean(configGratuito.permite_financas),
        modulos_inclusos: configGratuito.modulos_inclusos,
        nome_exibicao: configGratuito.nome_exibicao,
        descricao: configGratuito.descricao,
      })
      toast({
        title: 'Plano Gratuito Configurado!',
        description:
          'Os novos limites e módulos do plano gratuito foram salvos e aplicados às contas da base.',
      })
      await carregarDados()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Falha ao salvar configuração do plano gratuito'
      toast({
        title: 'Erro ao salvar plano gratuito',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoConfigGratuito(false)
    }
  }

  const handleToggleModuloGratuito = (codigoModulo: string) => {
    setConfigGratuito((prev) => {
      const jaExiste = prev.modulos_inclusos.includes(codigoModulo)
      const novaLista = jaExiste
        ? prev.modulos_inclusos.filter((c) => c !== codigoModulo)
        : [...prev.modulos_inclusos, codigoModulo]

      return {
        ...prev,
        modulos_inclusos: novaLista,
        permite_whatsapp:
          codigoModulo === 'whatsapp' || codigoModulo === 'whatsapp_radar'
            ? !jaExiste
            : prev.permite_whatsapp,
        permite_ia: codigoModulo === 'ia' ? !jaExiste : prev.permite_ia,
        permite_financas:
          codigoModulo === 'financas' || codigoModulo === 'contabilidade_5_0'
            ? !jaExiste
            : prev.permite_financas,
        permite_convites: codigoModulo === 'equipe_convites' ? !jaExiste : prev.permite_convites,
      }
    })
  }

  const handleSolicitarToggleTeste = (conta: ResumoContaMaster) => {
    const novoValor = !conta.conta_teste
    setContaParaTeste(conta)
    setAlvoContaTeste(novoValor)
    setModalTesteOpen(true)
  }

  const handleConfirmarToggleTeste = async () => {
    if (!contaParaTeste) return
    try {
      setCarregandoAcao(true)
      await diamondApi.alternarContaTeste(contaParaTeste.id, alvoContaTeste)
      toast({
        title: alvoContaTeste ? 'Modo Conta de Teste ATIVADO' : 'Modo Conta de Teste DESLIGADO',
        description: alvoContaTeste
          ? `A conta "${contaParaTeste.nome_conta}" agora está em modo de teste: os recursos estão liberados para uso e os botões de pagamento estão exibidos mas desabilitados com aviso.`
          : `A conta "${contaParaTeste.nome_conta}" retornou ao modo normal: os limites do plano vigente voltaram a ser aplicados e o checkout do Stripe foi reativado.`,
      })
      setModalTesteOpen(false)
      setContaParaTeste(null)
      await carregarDados()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao alterar modo Conta de Teste'
      toast({
        title: 'Erro ao alterar modo teste',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setCarregandoAcao(false)
    }
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

  const handleAbrirModulos = async (conta: ResumoContaMaster) => {
    setContaSelecionada(conta)
    setModalModulosOpen(true)
    try {
      setCarregandoModulos(true)
      const mods = await diamondApi.listModulosLicenca(conta.id)
      setModulosConta(mods)
    } catch {
      toast({
        title: 'Erro ao carregar módulos',
        description: 'Não foi possível ler os módulos da conta selecionada.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoModulos(false)
    }
  }

  const handleToggleModulo = async (moduloId: string, ativoAtual: boolean) => {
    try {
      await diamondApi.toggleModuloLicenca(moduloId, !ativoAtual)
      setModulosConta((prev) =>
        prev.map((m) => (m.id === moduloId ? { ...m, ativo: !ativoAtual } : m)),
      )
      toast({
        title: 'Módulo atualizado',
        description: `Módulo ${!ativoAtual ? 'ativado' : 'desativado'} com sucesso.`,
      })
      await carregarDados()
    } catch {
      toast({
        title: 'Erro ao alternar módulo',
        description: 'Falha ao atualizar o status do módulo na licença.',
        variant: 'destructive',
      })
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
          <Badge className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-[11px] border-0 shadow-xs">
            <Sparkles className="w-3 h-3 mr-1 text-emerald-200" />
            Pro Comercial (R$ 197/mês)
          </Badge>
        )
      case 'gratuito':
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Diamond Master */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-950 p-6 rounded-2xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-zinc-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider px-2.5 py-0.5 border-0">
              <Crown className="w-3.5 h-3.5 mr-1" />
              Painel do Master
            </Badge>
            <span className="text-xs text-zinc-400 font-mono">Hierarquia & Licenciamento</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Gestão Comercial, Planos e Módulos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl">
            Acompanhe o consumo das empresas, configure o Stripe Payment Link para recebimentos
            reais e controle a ativação modular (WhatsApp, IA, Finanças e Núcleo).
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

      {/* BLOCO DE INTEGRAÇÃO STRIPE: PAYMENT LINK + WEBHOOK */}
      <Card className="border-[#0F766E]/30 bg-gradient-to-br from-teal-50/70 via-white to-amber-50/50 shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5E1D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0F766E]" />
                <span>Configuração de Checkout Stripe & Liberação Automática</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-600">
                Cole o Stripe Payment Link do seu produto para cobrança mensal de R$ 197/mês. O
                webhook libera automaticamente o plano e todos os módulos.
              </CardDescription>
            </div>
            <Badge className="bg-[#0F766E] text-white text-[11px] font-semibold w-fit">
              R$ 197 / mês • Plano Pro Completo
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Campo do Payment Link */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-[#E5E1D8]">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Stripe Payment Link (URL do Checkout)</span>
              </label>
              <p className="text-[11px] text-zinc-500">
                Crie um Payment Link no Stripe Dashboard (recorrência mensal de R$ 197) e cole a URL
                abaixo:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="https://buy.stripe.com/..."
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  className="text-xs border-zinc-300 font-mono bg-zinc-50"
                />
                <Button
                  size="sm"
                  onClick={handleSalvarCheckoutGlobal}
                  disabled={salvandoCheckout}
                  className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs font-semibold shrink-0"
                >
                  {salvandoCheckout ? 'Salvando...' : 'Salvar Link'}
                </Button>
              </div>
              {paymentLink ? (
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Link configurado e ativo no Modal de Desbloqueio da aplicação.
                </p>
              ) : (
                <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" />
                  Nenhum link configurado ainda. O modal exibirá aviso ao usuário.
                </p>
              )}
            </div>

            {/* URL do Webhook do Stripe */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-[#E5E1D8]">
              <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>URL do Webhook para o Stripe (Endpoint)</span>
              </label>
              <p className="text-[11px] text-zinc-500">
                Adicione este endpoint no Stripe (evento:{' '}
                <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-800 font-mono">
                  checkout.session.completed
                </code>
                ) para liberação instantânea:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  readOnly
                  value={webhookUrlCompleta}
                  className="text-xs border-zinc-200 font-mono bg-zinc-100 text-zinc-700 cursor-text select-all"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopiarWebhook}
                  className="text-xs border-zinc-300 shrink-0 gap-1"
                >
                  {copiadoWebhook ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Segredo do Webhook (opcional): defina a variável{' '}
                <code className="font-mono bg-zinc-100 px-1 rounded text-zinc-700">
                  STRIPE_WEBHOOK_SECRET
                </code>{' '}
                para validação criptográfica estrita.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO: CONFIGURAÇÃO DO PLANO GRATUITO INICIAL (PROVA VIVA) */}
      <Card className="border-amber-300/80 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 shadow-xs">
        <CardHeader className="pb-3 border-b border-amber-200/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-700" />
                <span>Configuração do Plano Gratuito Inicial (Prova Viva)</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-600">
                Defina os limites comerciais e módulos concedidos a todo novo comprador ou usuário
                que ingressa na plataforma.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-amber-400 bg-amber-100/70 text-amber-900 font-bold text-xs"
              >
                <Lock className="w-3 h-3 mr-1 text-amber-700" />
                Regra Padrão de Entrada
              </Badge>
              <Button
                size="sm"
                onClick={handleSalvarPlanoGratuito}
                disabled={salvandoConfigGratuito}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-xs"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 mr-1.5 ${salvandoConfigGratuito ? 'animate-spin' : ''}`}
                />
                {salvandoConfigGratuito ? 'Salvando...' : 'Salvar Configuração do Plano'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Limite de Dias na Folha */}
            <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-700" />
                  <span>Limite de Dias na Folha</span>
                </label>
                <Badge variant="outline" className="border-amber-300 text-amber-800 text-[10px]">
                  Atual: {configGratuito.max_dias_folha} dias
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500">
                Quantidade máxima de datas distintas que o usuário gratuito pode registrar na Folha
                do Dia.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={configGratuito.max_dias_folha}
                  onChange={(e) =>
                    setConfigGratuito((prev) => ({
                      ...prev,
                      max_dias_folha: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="text-xs font-bold border-zinc-200"
                />
                <span className="text-xs text-zinc-500 font-medium">dias</span>
              </div>
            </div>

            {/* Limite de Projetos Ativos */}
            <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-amber-700" />
                  <span>Limite de Projetos</span>
                </label>
                <Badge variant="outline" className="border-amber-300 text-amber-800 text-[10px]">
                  Atual: {configGratuito.max_projetos} projetos
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500">
                Número máximo de projetos permitidos simultaneamente antes do bloqueio do modal.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={configGratuito.max_projetos}
                  onChange={(e) =>
                    setConfigGratuito((prev) => ({
                      ...prev,
                      max_projetos: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                  className="text-xs font-bold border-zinc-200"
                />
                <span className="text-xs text-zinc-500 font-medium">projetos</span>
              </div>
            </div>

            {/* Permissão de Convites de Equipe */}
            <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-700" />
                    <span>Envio de Convites</span>
                  </label>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      configGratuito.permite_convites
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-amber-300 bg-amber-50 text-amber-800'
                    }`}
                  >
                    {configGratuito.permite_convites ? 'Liberado' : 'Bloqueado'}
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Se ativado, contas gratuitas poderão disparar convites com escopo externo.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700">
                  {configGratuito.permite_convites
                    ? 'Convites liberados no gratuito'
                    : 'Convites bloqueados (exige plano Pro)'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setConfigGratuito((prev) => ({
                      ...prev,
                      permite_convites: !prev.permite_convites,
                    }))
                  }
                  className={`text-xs font-bold ${
                    configGratuito.permite_convites
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {configGratuito.permite_convites ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Liberado
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Bloqueado
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Seleção de Módulos Inclusos no Plano Gratuito */}
          <div className="bg-white p-4 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Módulos Ativos no Plano Gratuito</span>
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Selecione quais recursos adicionais acompanham o plano gratuito inicial (o Núcleo
                  é sempre obrigatório).
                </p>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {configGratuito.modulos_inclusos.length} selecionados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {/* Núcleo - Fixo */}
              <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-900">Núcleo Essencial</p>
                  <p className="text-[10px] text-zinc-500">Navegação e base</p>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                  Obrigatório
                </Badge>
              </div>

              {/* Folha do Dia */}
              <button
                type="button"
                onClick={() => handleToggleModuloGratuito('folha_dia')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  configGratuito.modulos_inclusos.includes('folha_dia')
                    ? 'border-emerald-400 bg-emerald-50/80 shadow-2xs'
                    : 'border-zinc-200 bg-zinc-50/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900">Folha do Dia</p>
                  <p className="text-[10px] text-zinc-500">Demandas diárias</p>
                </div>
                <Badge
                  variant={
                    configGratuito.modulos_inclusos.includes('folha_dia') ? 'default' : 'outline'
                  }
                  className={
                    configGratuito.modulos_inclusos.includes('folha_dia')
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'border-zinc-300 text-zinc-600 text-[10px]'
                  }
                >
                  {configGratuito.modulos_inclusos.includes('folha_dia') ? 'Incluso' : 'Inativo'}
                </Badge>
              </button>

              {/* Projetos */}
              <button
                type="button"
                onClick={() => handleToggleModuloGratuito('projetos')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  configGratuito.modulos_inclusos.includes('projetos')
                    ? 'border-emerald-400 bg-emerald-50/80 shadow-2xs'
                    : 'border-zinc-200 bg-zinc-50/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900">Projetos & Kanban</p>
                  <p className="text-[10px] text-zinc-500">Marcos e entregas</p>
                </div>
                <Badge
                  variant={
                    configGratuito.modulos_inclusos.includes('projetos') ? 'default' : 'outline'
                  }
                  className={
                    configGratuito.modulos_inclusos.includes('projetos')
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'border-zinc-300 text-zinc-600 text-[10px]'
                  }
                >
                  {configGratuito.modulos_inclusos.includes('projetos') ? 'Incluso' : 'Inativo'}
                </Badge>
              </button>

              {/* WhatsApp Radar */}
              <button
                type="button"
                onClick={() => handleToggleModuloGratuito('whatsapp')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  configGratuito.modulos_inclusos.includes('whatsapp') ||
                  configGratuito.permite_whatsapp
                    ? 'border-emerald-400 bg-emerald-50/80 shadow-2xs'
                    : 'border-zinc-200 bg-zinc-50/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900">Radar WhatsApp</p>
                  <p className="text-[10px] text-zinc-500">Conexão & Sementes</p>
                </div>
                <Badge
                  variant={
                    configGratuito.modulos_inclusos.includes('whatsapp') ||
                    configGratuito.permite_whatsapp
                      ? 'default'
                      : 'outline'
                  }
                  className={
                    configGratuito.modulos_inclusos.includes('whatsapp') ||
                    configGratuito.permite_whatsapp
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'border-zinc-300 text-zinc-600 text-[10px]'
                  }
                >
                  {configGratuito.modulos_inclusos.includes('whatsapp') ||
                  configGratuito.permite_whatsapp
                    ? 'Incluso'
                    : 'Exige Pro'}
                </Badge>
              </button>

              {/* Agente IA */}
              <button
                type="button"
                onClick={() => handleToggleModuloGratuito('ia')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  configGratuito.modulos_inclusos.includes('ia') || configGratuito.permite_ia
                    ? 'border-emerald-400 bg-emerald-50/80 shadow-2xs'
                    : 'border-zinc-200 bg-zinc-50/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900">Agente Executivo IA</p>
                  <p className="text-[10px] text-zinc-500">Segundo cérebro</p>
                </div>
                <Badge
                  variant={
                    configGratuito.modulos_inclusos.includes('ia') || configGratuito.permite_ia
                      ? 'default'
                      : 'outline'
                  }
                  className={
                    configGratuito.modulos_inclusos.includes('ia') || configGratuito.permite_ia
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'border-zinc-300 text-zinc-600 text-[10px]'
                  }
                >
                  {configGratuito.modulos_inclusos.includes('ia') || configGratuito.permite_ia
                    ? 'Incluso'
                    : 'Exige Pro'}
                </Badge>
              </button>

              {/* Módulo Finanças */}
              <button
                type="button"
                onClick={() => handleToggleModuloGratuito('financas')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  configGratuito.modulos_inclusos.includes('financas') ||
                  configGratuito.permite_financas
                    ? 'border-emerald-400 bg-emerald-50/80 shadow-2xs'
                    : 'border-zinc-200 bg-zinc-50/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900">Módulo Finanças</p>
                  <p className="text-[10px] text-zinc-500">Contabilidade 5.0</p>
                </div>
                <Badge
                  variant={
                    configGratuito.modulos_inclusos.includes('financas') ||
                    configGratuito.permite_financas
                      ? 'default'
                      : 'outline'
                  }
                  className={
                    configGratuito.modulos_inclusos.includes('financas') ||
                    configGratuito.permite_financas
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'border-zinc-300 text-zinc-600 text-[10px]'
                  }
                >
                  {configGratuito.modulos_inclusos.includes('financas') ||
                  configGratuito.permite_financas
                    ? 'Incluso'
                    : 'Exige Pro'}
                </Badge>
              </button>

              {/* Convites de Equipe */}
              <button
                type="button"
                onClick={() => handleToggleModuloGratuito('equipe_convites')}
                className={`p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                  configGratuito.modulos_inclusos.includes('equipe_convites') ||
                  configGratuito.permite_convites
                    ? 'border-emerald-400 bg-emerald-50/80 shadow-2xs'
                    : 'border-zinc-200 bg-zinc-50/60 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-zinc-900">Convites Granulares</p>
                  <p className="text-[10px] text-zinc-500">Convidados externos</p>
                </div>
                <Badge
                  variant={
                    configGratuito.modulos_inclusos.includes('equipe_convites') ||
                    configGratuito.permite_convites
                      ? 'default'
                      : 'outline'
                  }
                  className={
                    configGratuito.modulos_inclusos.includes('equipe_convites') ||
                    configGratuito.permite_convites
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'border-zinc-300 text-zinc-600 text-[10px]'
                  }
                >
                  {configGratuito.modulos_inclusos.includes('equipe_convites') ||
                  configGratuito.permite_convites
                    ? 'Incluso'
                    : 'Bloqueado'}
                </Badge>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Trava {configGratuito.max_dias_folha}d / {configGratuito.max_projetos}p
              </p>
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
              <span>Contas da Base, Planos e Módulos Ativos</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-500 mt-0.5">
              Monitore consumo e gerencie módulos individuais (WhatsApp, IA, Finanças) ou plano
              completo Pro.
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
              Nenhuma conta encontrada no banco.
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
                    className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-zinc-50/70 transition-colors"
                  >
                    {/* Coluna 1: Identificação da Conta */}
                    <div className="space-y-1.5 max-w-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-zinc-900">
                          {conta.nome_conta}
                        </h4>
                        {renderBadgePlano(conta.plano)}
                        {conta.status === 'ativo' ? (
                          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                            Ativa
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-800 border-rose-200 text-[10px]">
                            {conta.status}
                          </Badge>
                        )}
                        {conta.conta_teste && (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px] flex items-center gap-1 shadow-xs animate-pulse">
                            <FlaskConical className="w-3 h-3 text-amber-700" />
                            Conta de Teste
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500">
                        Workspace:{' '}
                        <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px] font-mono text-zinc-700">
                          {conta.nome_conta}
                        </code>
                      </p>

                      {/* Administradores Eleitos */}
                      <div className="pt-1 flex items-center gap-1.5 text-xs text-zinc-600">
                        <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="font-semibold">Admins:</span>
                        {conta.admins.length === 0 ? (
                          <span className="text-zinc-400 italic">Nenhum eleito</span>
                        ) : (
                          <span className="text-zinc-800 font-medium">
                            {conta.admins.map((a) => a.nome || a.email).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Módulos Ativos */}
                      <div className="pt-1 flex items-center gap-1.5 text-xs text-zinc-600 flex-wrap">
                        <Sliders className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                        <span className="font-semibold">Módulos:</span>
                        {conta.modulos.length === 0 ? (
                          <span className="text-zinc-400 text-[11px]">Núcleo padrão</span>
                        ) : (
                          conta.modulos.map((m) => (
                            <Badge
                              key={m.id}
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                m.ativo
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : 'border-zinc-200 text-zinc-400 bg-zinc-50'
                              }`}
                            >
                              {m.nome}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Coluna 2: Consumo e Limites */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full lg:w-auto">
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
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-end w-full sm:w-auto">
                      <Button
                        size="sm"
                        onClick={() => handleSolicitarToggleTeste(conta)}
                        variant={conta.conta_teste ? 'default' : 'outline'}
                        className={`text-xs font-semibold shadow-xs ${
                          conta.conta_teste
                            ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600'
                            : 'border-amber-300 hover:bg-amber-50 text-amber-800'
                        }`}
                      >
                        <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
                        {conta.conta_teste ? 'Desligar Modo Teste' : 'Ativar Conta de Teste'}
                      </Button>

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
                        Alterar Plano
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAbrirModulos(conta)}
                        className="text-xs border-zinc-300 hover:bg-zinc-100 text-zinc-800"
                      >
                        <Sliders className="w-3.5 h-3.5 mr-1.5 text-[#0F766E]" />
                        Módulos da Licença
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

      {/* Modal de Confirmação: Modo Conta de Teste */}
      <Dialog open={modalTesteOpen} onOpenChange={setModalTesteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-1">
              <FlaskConical className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <span>
                {alvoContaTeste
                  ? 'Ativar Modo "Conta de Teste"?'
                  : 'Desligar Modo "Conta de Teste"?'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Conta: <strong className="text-zinc-800">{contaParaTeste?.nome_conta}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs text-zinc-600">
            {alvoContaTeste ? (
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 space-y-2 text-amber-900">
                <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  Efeitos imediatos da Conta de Teste:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                  <li>
                    <strong>Uso gratuito liberado:</strong> A conta pode cadastrar projetos, usar
                    dias de folha e convidar membros sem sofrer bloqueios.
                  </li>
                  <li>
                    <strong>Cobrança desativada em teste:</strong> Os botões de pagamento e
                    assinatura de R$ 197/mês continuam visíveis, porém <em>desabilitados</em> com o
                    aviso &quot;Pagamento desativado em teste&quot;.
                  </li>
                  <li>
                    <strong>Badge &quot;Conta de Teste&quot;:</strong> Exibido nos banners de
                    consumo e painéis para clareza da equipe.
                  </li>
                </ul>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2 text-zinc-700">
                <p className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-zinc-700" />
                  Efeitos ao desligar o modo de teste:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                  <li>
                    A conta volta ao comportamento normal com os limites do plano vigente (
                    <strong>
                      {contaParaTeste?.plano === 'gratuito' ? 'Gratuito Prova Viva' : 'Pago'}
                    </strong>
                    ).
                  </li>
                  <li>
                    Os botões de pagamento e checkout do Stripe são <em>reativados</em>{' '}
                    imediatamente.
                  </li>
                  <li>Nenhum dado cadastrado durante o teste é perdido.</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalTesteOpen(false)}
              disabled={carregandoAcao}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarToggleTeste}
              disabled={carregandoAcao}
              className={`text-xs font-semibold ${
                alvoContaTeste
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-[#0F766E] hover:bg-[#0D9488] text-white'
              }`}
            >
              {carregandoAcao
                ? 'Atualizando...'
                : alvoContaTeste
                  ? 'Confirmar Ativação de Teste'
                  : 'Confirmar e Desligar Teste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <SelectItem value="pro">
                    Pro Comercial (R$ 197/mês — Módulos Liberados)
                  </SelectItem>
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
                  <li>Convites liberados e todos os módulos (WhatsApp, IA, Finanças) ativados</li>
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

      {/* Modal Módulos da Licença */}
      <Dialog open={modalModulosOpen} onOpenChange={setModalModulosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#0F766E]" />
              <span>Licenciamento Modular</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Ative ou desative módulos individuais para a conta{' '}
              <strong>{contaSelecionada?.nome_conta}</strong> (estrutura replicável no Contabilidade
              5.0).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {carregandoModulos ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#0F766E] mb-2" />
                Carregando módulos da licença...
              </div>
            ) : modulosConta.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-6">
                Nenhum módulo modular configurado para esta licença.
              </p>
            ) : (
              modulosConta.map((mod) => (
                <div
                  key={mod.id}
                  className="p-3 rounded-xl border border-zinc-200 bg-white flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900">{mod.nome}</span>
                      <code className="text-[10px] bg-zinc-100 px-1 py-0.5 rounded text-zinc-600">
                        {mod.codigo || mod.slug}
                      </code>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {mod.ativo
                        ? 'Ativo: recursos deste módulo liberados'
                        : 'Inativo: recursos bloqueados por aviso comercial'}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={mod.ativo ? 'default' : 'outline'}
                    onClick={() => handleToggleModulo(mod.id, mod.ativo)}
                    className={`text-xs font-semibold h-7 px-3 ${
                      mod.ativo
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'border-zinc-300 text-zinc-700'
                    }`}
                  >
                    {mod.ativo ? 'Ativo' : 'Inativo'}
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalModulosOpen(false)}
              className="text-xs"
            >
              Fechar
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
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{membro.email}</p>
                    </div>

                    <div>
                      {isFundadorMaster ? (
                        <span className="text-[11px] text-zinc-400 font-medium italic">
                          Fundador Master
                        </span>
                      ) : isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoverAdmin(membro.id, membro.nome || membro.email)}
                          disabled={carregandoAcao}
                          className="text-[11px] text-rose-700 border-rose-200 hover:bg-rose-50 h-7"
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          Rebaixar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleElegerAdmin(membro.id, membro.nome || membro.email)}
                          disabled={carregandoAcao}
                          className="text-[11px] text-purple-700 border-purple-200 hover:bg-purple-50 h-7"
                        >
                          <UserCheck className="w-3 h-3 mr-1" />
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
              variant="outline"
              size="sm"
              onClick={() => setModalAdminsOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Master
