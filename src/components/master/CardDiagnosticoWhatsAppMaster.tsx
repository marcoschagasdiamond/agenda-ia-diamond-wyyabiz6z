import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Send,
  Users,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export interface StatusWhatsAppMasterData {
  status: 'conectado' | 'desconectado' | 'ativo_com_alertas'
  provedor: string
  modo: string
  master_conectado: boolean
  numero_master?: string
  erro_master?: string
  estatisticas: {
    total_convites: number
    total_com_telefone: number
    total_enviados: number
    total_falhas: number
    ultimo_erro: string
  }
  mensagem: string
  testado_em?: string
}

interface CardDiagnosticoWhatsAppMasterProps {
  statusWhatsApp: StatusWhatsAppMasterData | null
  testandoWhatsApp: boolean
  onChecarStatusWhatsApp: () => void
}

export const CardDiagnosticoWhatsAppMaster: React.FC<CardDiagnosticoWhatsAppMasterProps> = ({
  statusWhatsApp,
  testandoWhatsApp,
  onChecarStatusWhatsApp,
}) => {
  const isConectado = statusWhatsApp?.status === 'conectado'
  const isAlerta = statusWhatsApp?.status === 'ativo_com_alertas'

  const stats = statusWhatsApp?.estatisticas || {
    total_convites: 0,
    total_com_telefone: 0,
    total_enviados: 0,
    total_falhas: 0,
    ultimo_erro: '',
  }

  const taxaSucesso =
    stats.total_com_telefone > 0
      ? Math.round((stats.total_enviados / stats.total_com_telefone) * 100)
      : null

  return (
    <Card className="border-[#0F766E]/40 bg-white shadow-xs">
      <CardHeader className="pb-3 border-b border-[#E5E1D8]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span>Canal WhatsApp de Convites &amp; Notificações</span>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-medium"
                >
                  WhatsApp Cloud API
                </Badge>
              </div>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-600">
              Diagnóstico em tempo real dos disparos multi-canal de convites via WhatsApp e status
              da conexão da conta pessoal do Master.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {testandoWhatsApp ? (
              <Badge
                variant="outline"
                className="bg-zinc-50 text-zinc-600 border-zinc-300 text-[11px] gap-1.5 py-1"
              >
                <RefreshCw className="w-3 h-3 animate-spin text-[#0F766E]" />
                <span>Verificando WhatsApp...</span>
              </Badge>
            ) : isConectado ? (
              <Badge className="bg-emerald-600 text-white text-[11px] font-semibold gap-1.5 py-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>WhatsApp Conectado (Ativo)</span>
              </Badge>
            ) : isAlerta ? (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-semibold gap-1.5 py-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Ativo com Alertas de Falha</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-zinc-100 text-zinc-700 border-zinc-300 text-[11px] font-semibold gap-1.5 py-1"
              >
                <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Master Não Conectado</span>
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onChecarStatusWhatsApp}
              disabled={testandoWhatsApp}
              className="text-xs h-7 px-2.5 border-zinc-300 gap-1.5 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50"
              title="Testar conexão e recarregar estatísticas do WhatsApp"
            >
              <RefreshCw
                className={`w-3 h-3 ${testandoWhatsApp ? 'animate-spin text-[#0F766E]' : ''}`}
              />
              <span>Testar Conexão</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Grid de 3 cards informativos: Modelo, Conta Master, Diagnóstico */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Modo de Operação */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E5E1D8]">
            <span className="text-[11px] text-zinc-500 font-medium block">Modelo de Envio</span>
            <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
              Modelo Pessoal (Conector de App)
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 block leading-relaxed">
              Cada usuário do app conecta a própria conta do WhatsApp em Configurações. O convite é
              disparado do número de quem convida.
            </span>
          </div>

          {/* Card 2: Conexão do Master */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E5E1D8]">
            <span className="text-[11px] text-zinc-500 font-medium block">Conta Master Atual</span>
            <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5 mt-0.5 truncate">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {statusWhatsApp?.numero_master || (
                <span className="text-zinc-500 font-normal">Nenhum número conectado</span>
              )}
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              {statusWhatsApp?.master_conectado ? (
                <span className="text-emerald-700 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  Pronto para disparos realizados pelo Master
                </span>
              ) : (
                <span className="text-zinc-500">
                  Conecte seu WhatsApp em{' '}
                  <a
                    href="/config"
                    className="text-[#0F766E] underline font-medium hover:text-[#0D5C56]"
                  >
                    /config &gt; WhatsApp
                  </a>
                </span>
              )}
            </span>
          </div>

          {/* Card 3: Diagnóstico Geral */}
          <div className="bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E5E1D8]">
            <span className="text-[11px] text-zinc-500 font-medium block">
              Diagnóstico do Canal
            </span>
            <span
              className={`text-xs font-semibold block mt-0.5 truncate ${
                isConectado ? 'text-emerald-700' : isAlerta ? 'text-amber-800' : 'text-zinc-700'
              }`}
              title={statusWhatsApp?.mensagem}
            >
              {isConectado
                ? 'Canal operando normalmente'
                : isAlerta
                  ? 'Falhas registradas nos envios'
                  : 'Aguardando conexão do Master'}
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 block truncate">
              {statusWhatsApp?.testado_em
                ? `Testado: ${new Date(statusWhatsApp.testado_em).toLocaleTimeString('pt-BR')}`
                : 'Erros detalhados ficam gravados em convites_equipe'}
            </span>
          </div>
        </div>

        {/* Linha de Estatísticas de Entrega de Convites por WhatsApp */}
        <div className="bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/50 p-4 rounded-xl border border-emerald-200/60 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              Estatísticas de Convites via WhatsApp (Histórico Recente)
            </span>
            {taxaSucesso !== null && (
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  taxaSucesso >= 80
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : taxaSucesso >= 50
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}
              >
                Taxa de Sucesso: {taxaSucesso}%
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Total de convites */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E1D8] shadow-2xs">
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">
                Convites Gerados
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-zinc-900 font-mono">
                  {stats.total_convites}
                </span>
                <span className="text-[10px] text-zinc-400">total geral</span>
              </div>
            </div>

            {/* Com telefone */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E1D8] shadow-2xs">
              <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">
                Com Telefone
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-[#0F766E] font-mono">
                  {stats.total_com_telefone}
                </span>
                <span className="text-[10px] text-zinc-400">destinatários</span>
              </div>
            </div>

            {/* Enviados via WhatsApp */}
            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-[10px] text-emerald-700 font-medium uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Enviados WhatsApp
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {stats.total_enviados}
                </span>
                <span className="text-[10px] text-emerald-600/80">disparados</span>
              </div>
            </div>

            {/* Falhas / Erros */}
            <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs">
              <span className="text-[10px] text-rose-700 font-medium uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" />
                Falhas de Envio
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-black text-rose-700 font-mono">
                  {stats.total_falhas}
                </span>
                <span className="text-[10px] text-rose-600/80">
                  {stats.total_falhas > 0 ? 'necessitam reenvio' : 'sem falhas'}
                </span>
              </div>
            </div>
          </div>

          {/* Mensagem detalhada retornada pela rota /status-whatsapp */}
          {statusWhatsApp?.mensagem && (
            <p className="text-xs text-zinc-700 bg-white/80 p-2.5 rounded-lg border border-[#E5E1D8] leading-relaxed">
              <strong className="text-zinc-900 font-semibold">Status do Diagnóstico:</strong>{' '}
              {statusWhatsApp.mensagem}
            </p>
          )}

          {/* Alerta de Último Erro de envio se houver */}
          {stats.ultimo_erro && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-bold block">Último erro registrado pelo conector:</span>
                <span className="font-mono text-[11px] text-rose-900 break-all">
                  {stats.ultimo_erro}
                </span>
              </div>
            </div>
          )}

          {/* Rodapé explicativo do canal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-emerald-200/50 text-[11px] text-zinc-600">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#0F766E]" />
              Convites não são bloqueados por falhas no WhatsApp: o link é gerado e fica disponível
              para envio manual na tela de Equipe.
            </span>
            <Button
              variant="link"
              size="sm"
              onClick={() => (window.location.href = '/config')}
              className="h-auto p-0 text-xs text-[#0F766E] hover:text-[#0D5C56] font-semibold gap-1 self-start sm:self-center"
            >
              <span>Gerenciar Conector WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CardDiagnosticoWhatsAppMaster
