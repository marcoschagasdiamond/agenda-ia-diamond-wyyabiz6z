import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { diamondApi } from '@/services/diamondApi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { LimitesConsumoConta, LicencaConta } from '@/types'
import {
  ArrowLeft,
  Crown,
  Sparkles,
  CheckCircle2,
  XCircle,
  FlaskConical,
  ExternalLink,
  ShieldCheck,
  UserRound,
  Building2,
  CreditCard,
} from 'lucide-react'

interface ModuloInfo {
  codigo: string
  nome: string
  descricao: string
  ativo: boolean
}

export default function MinhaConta() {
  const { user, profile, clienteProfile, isClientPortal, membroEquipe, isMaster, isAdmin } =
    useAuth()
  const navigate = useNavigate()
  const [limites, setLimites] = useState<LimitesConsumoConta | null>(null)
  const [licenca, setLicenca] = useState<LicencaConta | null>(null)
  const [convitesCount, setConvitesCount] = useState<number>(0)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const [l, lic] = await Promise.all([
        diamondApi.getLimitesConsumoConta(user?.id, user?.email),
        diamondApi.getLicencaConta(),
      ])
      setLimites(l)
      setLicenca(lic)

      // Contagem de convites enviados para a conta
      try {
        const convs = await pb.collection('convites_equipe').getList(1, 1, { fields: 'id' })
        setConvitesCount(convs.totalItems)
      } catch {
        setConvitesCount(0)
      }
    } catch {
      setLimites(null)
      setLicenca(null)
    } finally {
      setCarregando(false)
    }
  }, [user?.id, user?.email])

  useEffect(() => {
    carregar()
  }, [carregar])

  const isPago = Boolean(
    limites && (limites.plano === 'pro' || limites.plano === 'diamond_executive'),
  )
  const isContaTeste = Boolean(limites?.isContaTeste)
  const isGratuito = Boolean(limites && limites.plano === 'gratuito')

  // Nome de exibição do plano
  const nomePlano = isPago ? 'Plano Pro Comercial' : limites?.nome_conta || 'Plano Gratuito'

  const modulos: ModuloInfo[] = isPago
    ? [
        {
          codigo: 'whatsapp',
          nome: 'WhatsApp',
          descricao: 'Integração e disparos de mensagens.',
          ativo: true,
        },
        {
          codigo: 'ia',
          nome: 'IA / Transcrição',
          descricao: 'Agente IA, resumos e transcrição de reuniões.',
          ativo: true,
        },
        {
          codigo: 'financas',
          nome: 'Finanças',
          descricao: 'Orçamentos, custos e contabilidade.',
          ativo: true,
        },
        {
          codigo: 'agenda',
          nome: 'Agenda',
          descricao: 'Calendário de compromissos e lembretes.',
          ativo: true,
        },
        {
          codigo: 'fluxos',
          nome: 'Kanban / Fluxos',
          descricao: 'Quadros, categorias e fases personalizadas.',
          ativo: true,
        },
        {
          codigo: 'folha',
          nome: 'Folha do Dia',
          descricao: 'Captura de assuntos e demandas diárias.',
          ativo: true,
        },
        {
          codigo: 'projetos',
          nome: 'Projetos',
          descricao: 'Projetos com fases, equipe e orçamento.',
          ativo: true,
        },
      ]
    : limites
      ? [
          {
            codigo: 'whatsapp',
            nome: 'WhatsApp',
            descricao: 'Integração e disparos de mensagens.',
            ativo: limites.moduloWhatsappAtivo,
          },
          {
            codigo: 'ia',
            nome: 'IA / Transcrição',
            descricao: 'Agente IA, resumos e transcrição de reuniões.',
            ativo: limites.moduloIaAtivo,
          },
          {
            codigo: 'financas',
            nome: 'Finanças',
            descricao: 'Orçamentos, custos e contabilidade.',
            ativo: limites.moduloFinancasAtivo,
          },
          {
            codigo: 'agenda',
            nome: 'Agenda',
            descricao: 'Calendário de compromissos e lembretes.',
            ativo: true,
          },
          {
            codigo: 'fluxos',
            nome: 'Kanban / Fluxos',
            descricao: 'Quadros, categorias e fases personalizadas.',
            ativo: true,
          },
          {
            codigo: 'folha',
            nome: 'Folha do Dia',
            descricao: 'Captura de assuntos e demandas diárias.',
            ativo: limites.diasFolhaMax > 0,
          },
          {
            codigo: 'projetos',
            nome: 'Projetos',
            descricao: 'Projetos com fases, equipe e orçamento.',
            ativo: limites.projetosMax > 0,
          },
        ]
      : []

  // Função do usuário
  const funcao = (() => {
    if (isMaster) return 'Administrador Master'
    if (isAdmin) return 'Administrador'
    if (isClientPortal) return 'Portal do Cliente'
    if (membroEquipe?.funcao) return String(membroEquipe.funcao)
    if (membroEquipe?.nivel_acesso) return String(membroEquipe.nivel_acesso)
    return 'Usuário'
  })()

  // Cores da barra de progresso: normal/amarelo perto do limite/vermelho esgotado
  const corBarra = (usado: number, max: number) => {
    if (max <= 0) return 'bg-red-500'
    const pct = Math.min(100, Math.round((usado / max) * 100))
    if (pct >= 100) return 'bg-red-500'
    if (pct >= 75) return 'bg-amber-500'
    return 'bg-[#0F766E]'
  }

  const textoLimite = (usado: number, max: number, unidade: string) => {
    if (isContaTeste || isPago) return `${usado} ${unidade} • Ilimitado (teste)`
    return `${usado} de ${max} ${unidade}`
  }

  // Bloco genérico de barra de progresso com uso real
  const BarraLimite = ({
    titulo,
    usado,
    max,
    unidade,
  }: {
    titulo: string
    usado: number
    max: number
    unidade: string
  }) => {
    const pct = Math.min(100, Math.round((usado / (max || 1)) * 100))
    const cor = corBarra(usado, max)
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#1A1D21]">{titulo}</span>
          <span className="text-[10px] text-[#5B6470] shrink-0">
            {textoLimite(usado, max, unidade)}
          </span>
        </div>
        <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${cor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-3 text-xs text-[#5B6470] hover:text-[#1A1D21] gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-xl font-bold text-[#1A1D21] flex items-center gap-2">
          <Crown className="w-5 h-5 text-[#0F766E]" />
          Minha Conta
        </h1>
        <p className="text-sm text-[#5B6470] mt-0.5">
          Veja o seu plano ativo, os módulos incluídos e o uso atual da sua conta.
        </p>
      </div>

      {carregando ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* 1. Cabeçalho: plano ativo + badges */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isPago
                        ? 'bg-emerald-600 text-white'
                        : isContaTeste
                          ? 'bg-amber-500 text-white'
                          : 'bg-[#0F766E] text-white'
                    }`}
                  >
                    {isPago ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : isContaTeste ? (
                      <FlaskConical className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#1A1D21]">{nomePlano}</span>
                      <Badge
                        className={`text-[10px] h-5 px-2 font-bold ${
                          isPago
                            ? 'bg-emerald-600 text-white'
                            : isContaTeste
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-[#0F766E] text-white'
                        }`}
                      >
                        {isPago
                          ? 'Plano Ativo'
                          : isContaTeste
                            ? 'Conta de Teste'
                            : 'Plano Gratuito'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#5B6470] mt-0.5">
                      {isPago
                        ? 'Todos os módulos liberados (WhatsApp, IA, Finanças) com cobrança mensal via Stripe.'
                        : isContaTeste
                          ? 'Modo de teste ativo: recursos ilimitados liberados para experimentação. Pagamento desativado temporariamente.'
                          : `Configuração atual do plano gratuito da conta ${limites?.nome_conta || ''}.`}
                    </p>
                  </div>
                </div>
                {limites?.status && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-zinc-300 text-zinc-700 bg-zinc-50 self-start sm:self-center"
                  >
                    Status: {limites.status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Módulos incluídos no plano */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1A1D21]">
                O que está incluído no seu plano
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {modulos.map((m) => (
                <div
                  key={m.codigo}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                    m.ativo ? 'border-emerald-200 bg-emerald-50/40' : 'border-zinc-200 bg-zinc-50'
                  }`}
                >
                  {m.ativo ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold ${m.ativo ? 'text-[#1A1D21]' : 'text-zinc-500'}`}
                    >
                      {m.nome}
                    </p>
                    <p className="text-[10px] text-[#5B6470] leading-snug">{m.descricao}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-[9px] h-4 px-1.5 shrink-0 ${
                      m.ativo
                        ? 'border-emerald-300 text-emerald-700'
                        : 'border-zinc-300 text-zinc-500'
                    }`}
                  >
                    {m.ativo ? 'Liberado' : 'Bloqueado'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. Uso e limites */}
          {!isClientPortal && limites && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1A1D21]">Uso da conta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BarraLimite
                  titulo="Dias de Folha usados"
                  usado={limites.diasFolhaUsados}
                  max={limites.diasFolhaMax}
                  unidade="dias"
                />
                <BarraLimite
                  titulo="Projetos criados"
                  usado={limites.projetosUsados}
                  max={limites.projetosMax}
                  unidade="projetos"
                />
                <BarraLimite
                  titulo="Convites enviados"
                  usado={convitesCount}
                  max={
                    isContaTeste || isPago
                      ? 99999
                      : limites.permiteConvites
                        ? Math.max(limites.projetosMax, limites.diasFolhaMax, 10)
                        : 0
                  }
                  unidade="convites"
                />
                {limites.bloqueadoFolha && !isPago && !isContaTeste && (
                  <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Você atingiu o limite de dias de folha do plano gratuito. Assine o plano para
                    liberar mais dias.
                  </p>
                )}
                {limites.bloqueadoProjetos && !isPago && !isContaTeste && (
                  <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Você atingiu o limite de projetos do plano gratuito. Assine o plano para liberar
                    mais projetos.
                  </p>
                )}
                {limites.bloqueadoConvites && !isPago && !isContaTeste && (
                  <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    Convites de equipe não estão incluídos no seu plano atual.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 4. Cobrança */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0F766E]" />
                Cobrança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPago ? (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      Assinatura ativa
                    </p>
                    <p className="text-xs text-emerald-900/90 mt-0.5">
                      Plano {limites?.plano === 'diamond_executive' ? 'Diamond Executive' : 'Pro'} •{' '}
                      {limites?.precoMensalTexto || 'R$ 197/mês'} • Todos os módulos liberados
                      (WhatsApp, IA, Finanças).
                    </p>
                  </div>
                </div>
              ) : isContaTeste ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-300">
                    <FlaskConical className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                        Pagamento desativado em teste
                      </p>
                      <p className="text-xs text-amber-900/90 mt-0.5">
                        Sua conta foi colocada em{' '}
                        <strong>modo de teste pelo Administrador Master</strong>. Os recursos estão
                        livres para uso e o botão de assinatura é mantido apenas como demonstração.
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled
                    className="bg-zinc-200 text-zinc-500 cursor-not-allowed font-semibold gap-1.5 h-9"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                    Assinar R$ 197/mês — Todos os módulos
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1A1D21]">
                      Plano Pro Comercial — R$ 197/mês
                    </p>
                    <p className="text-xs text-[#5B6470] mt-0.5">
                      Todos os módulos: WhatsApp, IA e Finanças, sem limites de folha, projetos ou
                      convites.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const link = limites?.stripePaymentLink || licenca?.stripe_payment_link || ''
                      if (link && link.startsWith('http')) {
                        window.open(link, '_blank', 'noopener,noreferrer')
                      } else if (isMaster) {
                        navigate('/master')
                      }
                    }}
                    disabled={!limites?.stripePaymentLink && !isMaster}
                    className="bg-[#0F766E] hover:bg-[#0D9488] text-white font-bold text-xs h-9 gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Assinar R$ 197/mês — Todos os módulos
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Dados da conta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1A1D21] flex items-center gap-2">
                <UserRound className="w-4 h-4 text-[#0F766E]" />
                Dados da conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs font-medium text-[#5B6470] w-24 shrink-0">Nome</span>
                <span className="text-[#1A1D21]">
                  {user?.name?.trim() || user?.email?.split('@')[0]}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs font-medium text-[#5B6470] w-24 shrink-0">E-mail</span>
                <span className="text-[#1A1D21] break-all">{user?.email}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs font-medium text-[#5B6470] w-24 shrink-0">Função</span>
                <span className="text-[#1A1D21]">{funcao}</span>
              </div>
              {isClientPortal && clienteProfile && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="text-xs font-medium text-[#5B6470] w-24 shrink-0">Empresa</span>
                  <span className="text-[#1A1D21] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                    {clienteProfile.empresa || clienteProfile.nome}
                  </span>
                </div>
              )}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/perfil')}
                  className="text-xs"
                >
                  Editar dados no Meu Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
