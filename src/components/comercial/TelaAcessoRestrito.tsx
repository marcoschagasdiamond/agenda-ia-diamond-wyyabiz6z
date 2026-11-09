import React from 'react'
import {
  Lock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Mail,
  ExternalLink,
  Layers,
  FolderKanban,
  FileText,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EscopoItem } from '@/types'

interface TelaAcessoRestritoProps {
  escopos?: EscopoItem[]
  rotaTentada?: string
  userEmail?: string
  onIrParaEscopo?: () => void
}

export function TelaAcessoRestrito({
  escopos = [],
  rotaTentada,
  userEmail,
  onIrParaEscopo,
}: TelaAcessoRestritoProps) {
  const escopoPrincipal = escopos[0]

  const getUrlEscopo = (item?: EscopoItem): string => {
    if (!item) return '/dashboard'
    switch (item.tipo) {
      case 'projeto':
        return item.id ? `/projetos/${item.id}` : '/projetos'
      case 'fluxo':
        return item.id ? `/fluxo?id=${item.id}` : '/fluxo'
      case 'categoria':
        return item.id ? `/fluxo?cat=${item.id}` : '/fluxo'
      case 'demanda':
        return item.id ? `/folha?demanda=${item.id}` : '/folha'
      case 'cliente':
        return item.id ? `/clientes/${item.id}` : '/clientes'
      default:
        return '/dashboard'
    }
  }

  const destinoUrl = getUrlEscopo(escopoPrincipal)

  return (
    <div className="min-h-[82vh] flex items-center justify-center p-4 sm:p-6 bg-[#FAF8F5]">
      <Card className="max-w-xl w-full border-amber-300 shadow-md bg-white overflow-hidden">
        {/* Topo em Destaque */}
        <div className="bg-gradient-to-br from-[#1A1D21] via-[#2D333B] to-[#1A1D21] text-white p-6 relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400 text-zinc-950 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Lock className="w-3.5 h-3.5 text-zinc-950" />
              Cerco de Convidado por Escopo
            </span>
            <Badge variant="outline" className="border-white/30 text-white text-[10px]">
              Onda Comercial 2
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold text-white tracking-tight">
            Acesso Restrito ao Escopo do Convite
          </CardTitle>
          <CardDescription className="text-zinc-300 text-xs mt-1">
            Você entrou no Agenda IA Diamond como convidado externo e possui acesso exclusivo ao
            item específico compartilhado com você.
          </CardDescription>
        </div>

        <CardContent className="p-6 space-y-5 text-sm">
          {/* Alerta de Rota Bloqueada */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs text-amber-800 uppercase tracking-wide">
                Acesso Bloqueado
              </p>
              <p className="text-xs text-amber-900 mt-0.5">
                A tela <strong>{rotaTentada || 'solicitada'}</strong> não faz parte do seu escopo de
                convidado. Para explorar o restante do sistema (Dashboard, Configurações, Equipe,
                outros Projetos e Fluxos), é necessária uma licença da conta.
              </p>
            </div>
          </div>

          {/* Escopo Liberado */}
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#0F766E]" />
                Seu Escopo de Trabalho Liberado
              </span>
              <Badge className="bg-[#0F766E] text-white text-[10px] font-semibold">
                Nível: {escopoPrincipal?.nivel || 'Convidado'}
              </Badge>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-10 h-10 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center text-[#0F766E] shrink-0">
                {escopoPrincipal?.tipo === 'projeto' ? (
                  <FolderKanban className="w-5 h-5" />
                ) : escopoPrincipal?.tipo === 'fluxo' ? (
                  <Layers className="w-5 h-5" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-zinc-900">
                  {escopoPrincipal?.nome || 'Item Compartilhado'}
                </h4>
                <p className="text-xs text-zinc-500 capitalize">
                  Tipo: {escopoPrincipal?.tipo || 'Projeto/Fluxo'}
                </p>
              </div>
            </div>
          </div>

          {/* Informações da Licença e Desbloqueio */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Deseja destravar o ecossistema completo?</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              O ecossistema integrado Diamond inclui Gestão Estratégica, Folha do Dia com
              transcrição de reuniões, Radar de WhatsApp, Módulos Contábeis e múltiplos projetos
              simultâneos. Fale com o Administrador Master para migrar sua conta para o plano Pro.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText('marcoschagasdiamond@icloud.com')
                alert('E-mail do Administrador Master copiado: marcoschagasdiamond@icloud.com')
              }}
              className="w-full sm:w-auto text-xs"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              Falar com o Master
            </Button>

            <Button
              size="sm"
              onClick={() => {
                if (onIrParaEscopo) {
                  onIrParaEscopo()
                } else {
                  window.location.href = destinoUrl
                }
              }}
              className="w-full sm:w-auto bg-[#0F766E] hover:bg-[#0D9488] text-white text-xs font-semibold shadow-xs"
            >
              <span>Ir para Meu Escopo ({escopoPrincipal?.nome || 'Liberado'})</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default TelaAcessoRestrito
