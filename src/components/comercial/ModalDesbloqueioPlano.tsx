import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, CheckCircle2, Lock, ArrowRight, ShieldCheck, Mail } from 'lucide-react'

interface ModalDesbloqueioPlanoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recursoNome?: string
  motivo?: string
  isMaster?: boolean
}

export function ModalDesbloqueioPlano({
  open,
  onOpenChange,
  recursoNome,
  motivo,
  isMaster = false,
}: ModalDesbloqueioPlanoProps) {
  const [copiado, setCopiado] = useState(false)

  const handleCopiarContato = () => {
    navigator.clipboard?.writeText('marcoschagasdiamond@icloud.com')
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-amber-200">
        {/* Topo Premium */}
        <div className="bg-gradient-to-br from-[#0F766E] via-[#0D9488] to-[#115E59] text-white p-6 relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-[#1A1D21] text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#1A1D21]" />
              Plano Comercial Diamond
            </span>
            <Badge variant="outline" className="border-white/30 text-white text-[11px]">
              Onda Comercial 1
            </Badge>
          </div>
          <DialogTitle className="text-2xl font-bold text-white tracking-tight">
            Desbloqueie Todo o Potencial
          </DialogTitle>
          <DialogDescription className="text-teal-100 text-sm mt-1">
            {recursoNome ? (
              <span>
                O recurso <strong>{recursoNome}</strong> faz parte do plano pago do Agenda IA
                Diamond.
              </span>
            ) : (
              <span>Expanda os limites do plano gratuito e acesse o ecossistema completo.</span>
            )}
          </DialogDescription>
        </div>

        {/* Conteúdo Informativo */}
        <div className="p-6 space-y-4 text-sm bg-white">
          {motivo && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-amber-800 uppercase tracking-wide">
                  Limite do Plano Atingido
                </p>
                <p className="text-xs text-amber-900 mt-0.5">{motivo}</p>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Vantagens do Plano Completo Desbloqueado
            </h4>
            <ul className="space-y-2 text-xs text-zinc-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Folha do Dia Ilimitada:</strong> Registre e planeje quantos dias precisar
                  sem travas.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Projetos Ilimitados:</strong> Crie fluxos, marcos, equipe e investidores
                  em todos os seus projetos.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Convites de Equipe Desbloqueados:</strong> Convide sócios, consultores e
                  clientes com escopos granulares.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Ecossistema Integrado:</strong> Módulos para Contabilidade 5.0 e radar
                  comercial.
                </span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-2 text-zinc-800 font-semibold text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Como ativar o plano pago agora</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              {isMaster ? (
                <span>
                  Como <strong>Administrador Master</strong>, você pode alterar a licença da conta
                  no painel de <strong>Configurações &gt; Licença &amp; Comercial</strong> ou
                  solicitar o faturamento direto via Stripe / PIX executivo.
                </span>
              ) : (
                <span>
                  Entre em contato com o <strong>Administrador Master</strong> da sua conta ou com a
                  equipe Diamond para ativar a licença empresarial.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopiarContato}
            className="w-full sm:w-auto text-xs"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            {copiado ? 'E-mail copiado!' : 'Contatar Master (marcoschagasdiamond@icloud.com)'}
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                window.location.href = '/config?secao=licenca'
              }}
              className="bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold shadow-xs"
            >
              <span>Ver Planos &amp; Licença</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
