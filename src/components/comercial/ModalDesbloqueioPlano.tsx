import { useState, useEffect } from 'react'
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
import {
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Mail,
  ExternalLink,
  Crown,
} from 'lucide-react'
import { diamondApi } from '@/services/diamondApi'

interface ModalDesbloqueioPlanoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recursoNome?: string
  motivo?: string
  isMaster?: boolean
  stripePaymentLink?: string
  precoMensalTexto?: string
  isContaTeste?: boolean
}

export function ModalDesbloqueioPlano({
  open,
  onOpenChange,
  recursoNome,
  motivo,
  isMaster = false,
  stripePaymentLink,
  precoMensalTexto = 'R$ 197/mês',
  isContaTeste,
}: ModalDesbloqueioPlanoProps) {
  const [copiado, setCopiado] = useState(false)
  const [linkPagamento, setLinkPagamento] = useState<string | undefined>(stripePaymentLink)
  const [precoTexto, setPrecoTexto] = useState<string>(precoMensalTexto)
  const [contaEmTeste, setContaEmTeste] = useState<boolean>(Boolean(isContaTeste))

  useEffect(() => {
    if (typeof isContaTeste === 'boolean') {
      setContaEmTeste(isContaTeste)
    }
    if (stripePaymentLink) {
      setLinkPagamento(stripePaymentLink)
    }
    // Buscar link e flag de teste configurados na licença do PocketBase
    diamondApi
      .getLicencaConta()
      .then((lic) => {
        if (lic?.stripe_payment_link && !stripePaymentLink) {
          setLinkPagamento(lic.stripe_payment_link)
        }
        if (lic?.preco_recorrencia) {
          setPrecoTexto(
            `R$ ${lic.preco_recorrencia}/${lic.ciclo_cobranca === 'anual' ? 'ano' : 'mês'}`,
          )
        }
        if (typeof isContaTeste !== 'boolean') {
          setContaEmTeste(Boolean(lic?.conta_teste))
        }
      })
      .catch(() => {})
  }, [stripePaymentLink, open, isContaTeste])

  const handleCopiarContato = () => {
    navigator.clipboard?.writeText('marcoschagasdiamond@icloud.com')
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const handleCheckoutReal = () => {
    if (linkPagamento && linkPagamento.trim().startsWith('http')) {
      window.open(linkPagamento.trim(), '_blank', 'noopener,noreferrer')
      onOpenChange(false)
    } else if (isMaster) {
      onOpenChange(false)
      window.location.href = '/master'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-amber-200">
        {/* Topo Premium */}
        <div className="bg-gradient-to-br from-[#0F766E] via-[#0D9488] to-[#115E59] text-white p-6 relative">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-[#1A1D21] text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#1A1D21]" />
              Plano Pro Comercial
            </span>
            <Badge variant="outline" className="border-white/30 text-white text-[11px]">
              {precoTexto}
            </Badge>
            {contaEmTeste && (
              <Badge className="bg-amber-100 text-amber-950 border-amber-300 font-bold text-[10px] shadow-xs">
                Conta de Teste Ativa
              </Badge>
            )}
          </div>
          <DialogTitle className="text-2xl font-bold text-white tracking-tight">
            Desbloqueie o Ecossistema Completo
          </DialogTitle>
          <DialogDescription className="text-teal-100 text-sm mt-1">
            {contaEmTeste ? (
              <span>
                Esta conta está em <strong>Modo Conta de Teste</strong>: os recursos estão liberados
                para experimentação e a cobrança está desativada no momento.
              </span>
            ) : recursoNome ? (
              <span>
                O recurso <strong>{recursoNome}</strong> faz parte do plano pago do Agenda IA
                Diamond com ativação automática via Stripe.
              </span>
            ) : (
              <span>
                Libere todos os limites e ative WhatsApp, Agente IA e Finanças sem travas.
              </span>
            )}
          </DialogDescription>
        </div>

        {/* Conteúdo Informativo */}
        <div className="p-6 space-y-4 text-sm bg-white">
          {contaEmTeste && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-amber-900 uppercase tracking-wide">
                  Pagamento desativado em teste
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Sua conta foi colocada em <strong>modo de teste pelo Administrador Master</strong>
                  . Os recursos do sistema estão livres para uso e avaliação, sem necessidade de
                  pagamento no momento. O botão de assinatura abaixo é mantido apenas como
                  demonstração e está desabilitado.
                </p>
              </div>
            </div>
          )}

          {motivo && !contaEmTeste && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs text-amber-800 uppercase tracking-wide">
                  Aviso de Módulo ou Limite do Plano
                </p>
                <p className="text-xs text-amber-900 mt-0.5">{motivo}</p>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Incluso no Plano Pro ({precoTexto}):
            </h4>
            <ul className="space-y-2 text-xs text-zinc-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Todos os Módulos Ativos:</strong> Módulo WhatsApp, Agente IA e Finanças
                  integradas.
                </span>
              </li>
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
                  <strong>Projetos Ilimitados:</strong> Crie fluxos, marcos, equipe e orçamentos em
                  todos os projetos.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  <strong>Convites de Equipe:</strong> Convide sócios e colaboradores externos com
                  escopos granulares.
                </span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex items-center gap-2 text-zinc-800 font-semibold text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Liberação imediata via Stripe</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              O pagamento é processado com segurança pelo Stripe. Assim que confirmado, o webhook da
              plataforma atualiza os limites na hora sem necessidade de reiniciar a sessão.
            </p>
            {!linkPagamento && isMaster && (
              <p className="text-xs text-amber-800 font-medium mt-1.5 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  Dono/Master: cole o Stripe Payment Link no Painel Master para habilitar o checkout
                  direto.
                </span>
              </p>
            )}
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
            {copiado ? 'E-mail copiado!' : 'Falar com Master'}
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

            {contaEmTeste ? (
              <Button
                type="button"
                size="sm"
                disabled
                title="O pagamento está desativado nesta conta de teste"
                className="bg-zinc-200 text-zinc-500 cursor-not-allowed text-xs font-semibold opacity-80 gap-1.5 px-3"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>Assinar plano — {precoTexto}</span>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-bold ml-1">
                  Pagamento desativado em teste
                </span>
              </Button>
            ) : linkPagamento ? (
              <Button
                type="button"
                size="sm"
                onClick={handleCheckoutReal}
                className="bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-bold shadow-md gap-1.5 px-4"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Assinar plano — {precoTexto}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : isMaster ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  window.location.href = '/master'
                }}
                className="bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold shadow-xs"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300 mr-1" />
                <span>Configurar Payment Link no Master</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  window.location.href =
                    'mailto:marcoschagasdiamond@icloud.com?subject=Upgrade%20Agenda%20IA%20Diamond&body=Olá,%20gostaria%20de%20ativar%20o%20plano%20Pro%20(R$%20197/mês)%20no%20Agenda%20IA%20Diamond.'
                }}
                className="bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold shadow-xs"
              >
                <span>Solicitar ao Administrador</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
