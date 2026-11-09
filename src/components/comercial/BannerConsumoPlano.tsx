import { Lock, Sparkles, AlertTriangle } from 'lucide-react'
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
}

export function BannerConsumoPlano({
  titulo,
  usado,
  max,
  unidade,
  bloqueado,
  onDesbloquear,
  recursoNome,
}: BannerConsumoPlanoProps) {
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
