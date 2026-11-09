import { Lock, Sparkles, AlertTriangle, CheckCircle2, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface BannerConsumoPlanoProps {
  titulo: string
  usado: number
  max: number
  unidade: string
  bloqueado: boolean
  onDesbloquear: () => void
  recursoNome?: string
  planoAtivo?: boolean
  isContaTeste?: boolean
}

export function BannerConsumoPlano({
  titulo,
  usado,
  max,
  unidade,
  bloqueado,
  onDesbloquear,
  recursoNome,
  planoAtivo = false,
  isContaTeste = false,
}: BannerConsumoPlanoProps) {
  // Se estiver em modo Conta de Teste
  if (isContaTeste) {
    return (
      <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-white p-3.5 transition-all mb-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-500 text-white shadow-2xs">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs text-zinc-900 tracking-tight">{titulo}</span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px] h-4.5 px-2 shadow-2xs">
                  Conta de Teste
                </Badge>
                <Badge
                  variant="outline"
                  className="border-amber-300 text-amber-800 bg-amber-50 text-[10px] h-4.5 px-1.5 font-medium"
                >
                  {usado} {unidade} em uso • Liberado em Teste
                </Badge>
              </div>
              <p className="text-xs text-amber-900/90 mt-0.5">
                Modo de teste ativo: recursos ilimitados liberados para experimentação. Pagamento
                desativado temporariamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={onDesbloquear}
              className="bg-amber-600/90 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-200" />
              <span>Ver Assinatura</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Se o plano for pago/ativo, renderiza banner verde "Plano Ativo" sem limites
  if (planoAtivo) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white p-3.5 transition-all mb-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-emerald-600 text-white shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-zinc-900 tracking-tight">{titulo}</span>
                <Badge className="bg-emerald-600 text-white text-[10px] h-4.5 px-2 font-bold shadow-2xs">
                  Plano Ativo
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-800 bg-emerald-100/60 text-[10px] h-4.5 px-1.5 font-medium"
                >
                  {usado} {unidade} cadastrados • Ilimitado
                </Badge>
              </div>
              <p className="text-xs text-emerald-900/80 mt-0.5">
                Sua conta possui acesso ilimitado com todos os módulos (WhatsApp, IA, Finanças e
                Folha contínua) liberados.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const percentual = Math.min(100, Math.round((usado / (max || 1)) * 100))

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all mb-4 ${
        bloqueado
          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-xs'
          : 'bg-white border-[#E5E1D8]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              bloqueado
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-teal-50 text-[#0F766E] border border-teal-200'
            }`}
          >
            {bloqueado ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#0F766E]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-zinc-900 tracking-tight">{titulo}</span>
              <Badge
                variant="outline"
                className={`text-[10px] h-4.5 px-1.5 font-bold ${
                  bloqueado
                    ? 'border-amber-400 text-amber-800 bg-amber-100/70'
                    : 'border-zinc-300 text-zinc-700 bg-zinc-50'
                }`}
              >
                {usado} de {max} {unidade} usados
              </Badge>
              {bloqueado && (
                <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] h-4.5 px-1.5">
                  Limite Atingido
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {bloqueado ? (
                <span className="text-amber-900 font-medium inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-700 inline" />
                  Você atingiu o limite do plano gratuito ({max} {unidade}). Novos cadastros de{' '}
                  {recursoNome || 'itens'} exigem o plano pago.
                </span>
              ) : (
                <span>
                  Plano Prova Viva Gratuito • Limite comercial de {max} {unidade}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Barra de progresso compacta */}
          <div className="w-24 sm:w-28 hidden md:block">
            <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  bloqueado ? 'bg-amber-500' : 'bg-[#0F766E]'
                }`}
                style={{ width: `${percentual}%` }}
              />
            </div>
          </div>

          <Button
            size="sm"
            onClick={onDesbloquear}
            className={`text-xs font-semibold shrink-0 ${
              bloqueado
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
            <span>Desbloquear Plano</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
