import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Crown,
  Building2,
  Sliders,
  Layers,
  Mail,
  MessageSquare,
  MessageSquareQuote,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  FlaskConical,
  ExternalLink,
  ChevronRight,
  Lock,
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { diamondApi } from '@/services/diamondApi'
import { ResumoContaMaster } from '@/types'

interface NavColunaMasterProps {
  onCloseMobile?: () => void
}

export default function NavColunaMaster({ onCloseMobile }: NavColunaMasterProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const [contas, setContas] = useState<ResumoContaMaster[]>([])
  const [totalFeedbacksNovos, setTotalFeedbacksNovos] = useState<number>(0)
  const [totalFeedbacks, setTotalFeedbacks] = useState<number>(0)
  const [statusResend, setStatusResend] = useState<{
    conectado: boolean
    detalhe: string
    remetente_padrao?: string
  } | null>(null)
  const [statusWhatsApp, setStatusWhatsApp] = useState<{
    status: 'conectado' | 'desconectado' | 'ativo_com_alertas'
    master_conectado: boolean
    mensagem: string
  } | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)
  const [recarregando, setRecarregando] = useState<boolean>(false)

  const carregarResumoMaster = async (isManual = false) => {
    try {
      if (isManual) setRecarregando(true)
      else setCarregando(true)

      const [resContas, resFeedbacks, resResend, resWhatsApp] = await Promise.all([
        diamondApi.getPainelMasterDados().catch(() => []),
        diamondApi.listarFeedbacksTeste().catch(() => []),
        diamondApi.getStatusResend().catch(() => null),
        diamondApi.getStatusWhatsAppMaster().catch(() => null),
      ])

      setContas(resContas)
      setTotalFeedbacks(resFeedbacks.length)
      setTotalFeedbacksNovos(resFeedbacks.filter((f) => f.status === 'novo').length)
      if (resResend) {
        setStatusResend({
          conectado: Boolean(resResend.conectado),
          detalhe: resResend.detalhe || '',
          remetente_padrao: resResend.remetente_padrao,
        })
      }
      if (resWhatsApp) {
        setStatusWhatsApp({
          status: resWhatsApp.status,
          master_conectado: Boolean(resWhatsApp.master_conectado),
          mensagem: resWhatsApp.mensagem || '',
        })
      }
    } catch (err) {
      console.warn('Erro ao carregar resumo do painel master na 2ª coluna:', err)
    } finally {
      setCarregando(false)
      setRecarregando(false)
    }
  }

  useEffect(() => {
    carregarResumoMaster()
  }, [])

  // Métricas do resumo executivo
  const totalContas = contas.length
  const contasPagas = contas.filter(
    (c) => c.plano === 'pro' || c.plano === 'diamond_executive',
  ).length
  const contasGratuitas = contas.filter((c) => c.plano === 'gratuito').length
  const contasTeste = contas.filter((c) => c.conta_teste).length

  // Rolar suavemente para a seção alvo
  const rolarParaSecao = (secaoId: string) => {
    if (pathname !== '/master') {
      navigate(`/master#${secaoId}`)
      if (onCloseMobile) onCloseMobile()
      return
    }

    const elemento = document.getElementById(secaoId)
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Pequeno destaque temporário visual na seção alvo
      elemento.classList.add('ring-2', 'ring-[#0F766E]/50', 'transition-all', 'duration-500')
      setTimeout(() => {
        elemento.classList.remove('ring-2', 'ring-[#0F766E]/50')
      }, 1500)
    } else {
      window.location.hash = secaoId
    }

    if (onCloseMobile) onCloseMobile()
  }

  return (
    <div className="flex flex-col h-full bg-white select-none">
      {/* 1. Topo do Painel Master com Badge */}
      <div className="p-3.5 border-b border-[#E5E1D8] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 text-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <h2 className="text-sm font-black tracking-tight text-white">Painel Master</h2>
          </div>
          <Badge className="bg-amber-400 text-zinc-950 font-black text-[9px] uppercase tracking-wider px-1.5 py-0 border-0">
            Admin Master
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400">
          <span>Controle Global do Sistema</span>
          <button
            onClick={() => carregarResumoMaster(true)}
            title="Recarregar dados do Master"
            className="hover:text-amber-300 transition-colors p-0.5"
            disabled={recarregando || carregando}
          >
            <RefreshCw
              className={`w-3 h-3 ${recarregando || carregando ? 'animate-spin text-amber-300' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 2. Conteúdo com Rolagem Independente */}
      <div className="flex-1 p-2 space-y-3 overflow-y-auto">
        {/* RESUMO EXECUTIVO COMPACTO */}
        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E1D8] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470]">
              Resumo Executivo
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {carregando ? '...' : `${totalContas} contas`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {/* Contas Ativas */}
            <div className="p-1.5 rounded-lg bg-white border border-[#E5E1D8]">
              <span className="text-[9px] text-[#5B6470] block leading-none">Total Contas</span>
              <span className="text-sm font-black text-zinc-900 mt-0.5 block leading-none">
                {carregando ? '-' : totalContas}
              </span>
            </div>

            {/* Contas Pagantes vs Gratuitas */}
            <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="text-[9px] text-emerald-800 font-medium block leading-none">
                Pro Comercial
              </span>
              <span className="text-sm font-black text-emerald-700 mt-0.5 block leading-none">
                {carregando ? '-' : contasPagas}
              </span>
            </div>

            {/* Prova Viva (Gratuito) */}
            <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-200">
              <span className="text-[9px] text-amber-800 font-medium block leading-none">
                Prova Viva
              </span>
              <span className="text-sm font-black text-amber-700 mt-0.5 block leading-none">
                {carregando ? '-' : contasGratuitas}
              </span>
            </div>

            {/* Contas em Modo Teste */}
            <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-200">
              <span className="text-[9px] text-purple-800 font-medium block leading-none">
                Modo Teste
              </span>
              <span className="text-sm font-black text-purple-700 mt-0.5 block leading-none">
                {carregando ? '-' : contasTeste}
              </span>
            </div>
          </div>

          {/* Destaque Feedbacks */}
          <div className="flex items-center justify-between px-1.5 py-1 rounded-md bg-white border border-[#E5E1D8] text-[11px]">
            <span className="text-[#5B6470] text-[10px]">Feedbacks de Teste:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-zinc-900 text-[10px]">
                {carregando ? '-' : totalFeedbacks}
              </span>
              {totalFeedbacksNovos > 0 ? (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] px-1 py-0 h-4">
                  {totalFeedbacksNovos} novos
                </Badge>
              ) : (
                <span className="text-[9px] text-zinc-400">0 pendentes</span>
              )}
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO INTERNA / ATALHOS PARA SEÇÕES DO /MASTER */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 pt-1">
            Seções do Master
          </div>

          {/* 1. Contas & Licenças */}
          <button
            type="button"
            onClick={() => rolarParaSecao('secao-master-contas')}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
              <span className="truncate">Contas &amp; Licenças</span>
            </div>
            <Badge
              variant="outline"
              className="border-zinc-300 text-zinc-700 text-[10px] font-bold shrink-0 ml-1"
            >
              {carregando ? '...' : totalContas}
            </Badge>
          </button>

          {/* 2. Configuração do Plano Gratuito */}
          <button
            type="button"
            onClick={() => rolarParaSecao('secao-master-plano-gratuito')}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sliders className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Plano Gratuito (Prova Viva)</span>
            </div>
            <ChevronRight className="w-3 h-3 text-zinc-400 group-hover:text-zinc-700 shrink-0" />
          </button>

          {/* 3. Módulos & Checkout Stripe */}
          <button
            type="button"
            onClick={() => rolarParaSecao('secao-master-checkout-stripe')}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
              <span className="truncate">Checkout Stripe &amp; Módulos</span>
            </div>
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[9px] font-semibold shrink-0">
              R$ 197/mês
            </Badge>
          </button>

          {/* 4. E-mail & Notificações (com status do Resend) */}
          <button
            type="button"
            onClick={() => rolarParaSecao('secao-master-email-sistema')}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">E-mail &amp; Notificações</span>
            </div>
            {statusResend?.conectado ? (
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                title="Resend conectado e ativo"
              />
            ) : statusResend ? (
              <span
                className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                title="Resend com aviso ou desconectado"
              />
            ) : null}
          </button>

          {/* 5. Diagnóstico WhatsApp */}
          <button
            type="button"
            onClick={() => rolarParaSecao('secao-master-diagnostico-whatsapp')}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Diagnóstico WhatsApp</span>
            </div>
            {statusWhatsApp?.status === 'conectado' ? (
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                title="WhatsApp conectado"
              />
            ) : statusWhatsApp?.status === 'ativo_com_alertas' ? (
              <span
                className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                title="WhatsApp ativo com alertas"
              />
            ) : statusWhatsApp ? (
              <span
                className="w-2 h-2 rounded-full bg-zinc-400 shrink-0"
                title="WhatsApp não conectado"
              />
            ) : null}
          </button>

          {/* 6. Feedback dos Testadores (com contador de novos) */}
          <button
            type="button"
            onClick={() => rolarParaSecao('secao-master-feedbacks-testadores')}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-[#1A1D21] hover:bg-[#F4F2EE] transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquareQuote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Feedback dos Testadores</span>
            </div>
            {totalFeedbacksNovos > 0 ? (
              <Badge className="bg-amber-500 text-white font-bold text-[9px] px-1.5 py-0 h-4 shrink-0">
                {totalFeedbacksNovos} novo{totalFeedbacksNovos > 1 ? 's' : ''}
              </Badge>
            ) : (
              <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                {carregando ? '...' : totalFeedbacks}
              </span>
            )}
          </button>
        </div>

        {/* STATUS RÁPIDO DOS CANAIS */}
        <div className="pt-2 border-t border-[#E5E1D8]/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6470] px-2 mb-1.5">
            Canais de Disparo
          </div>

          <div className="space-y-1.5 px-1">
            {/* Resend Status */}
            <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5E1D8] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Mail className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="text-zinc-700 font-medium truncate">Resend E-mails</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${
                  statusResend?.conectado
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                    : 'border-zinc-300 text-zinc-600 bg-white'
                }`}
              >
                {statusResend?.conectado ? 'Conectado' : 'Aguardando'}
              </Badge>
            </div>

            {/* WhatsApp Status */}
            <div className="p-2 rounded-lg bg-[#FAF8F5] border border-[#E5E1D8] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-zinc-700 font-medium truncate">WhatsApp API</span>
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${
                  statusWhatsApp?.status === 'conectado'
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                    : statusWhatsApp?.status === 'ativo_com_alertas'
                      ? 'border-amber-300 text-amber-800 bg-amber-50'
                      : 'border-zinc-300 text-zinc-600 bg-white'
                }`}
              >
                {statusWhatsApp?.status === 'conectado'
                  ? 'Ativo'
                  : statusWhatsApp?.status === 'ativo_com_alertas'
                    ? 'Alertas'
                    : 'Offline'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
