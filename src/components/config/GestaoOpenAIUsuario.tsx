import React, { useEffect, useState, useCallback } from 'react'
import { listConnectors, disconnect } from '@/lib/skipConnectors'
import { conectarViaNovaJanela } from '@/lib/conexaoAutorizacao'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Unlink,
  ExternalLink,
  Mic,
  Brain,
  Calendar,
  Sparkles,
} from 'lucide-react'

// URL segura de retorno no app para onde o conector deve redirecionar o usuário
const calcularReturnUrlConfig = (): string => {
  return `${window.location.origin}/config?aba=preferencias`
}

export function GestaoOpenAIUsuario() {
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null)

  const carregarStatus = useCallback(async () => {
    try {
      setCarregando(true)
      const lista = await listConnectors()
      const openai = lista.find((c) => c.toolkit === 'openai')
      setConectado(openai?.status === 'connected')
    } catch (err) {
      console.warn('Erro ao verificar conector OpenAI do usuário:', err)
      setConectado(false)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarStatus()

    // Recarregar status quando a janela/aba ganhar foco (usuário autorizou em nova aba e voltou)
    const onFocus = () => {
      carregarStatus()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
    }
  }, [carregarStatus])

  // Fluxo resiliente: abre a autorização em NOVA aba/janela (modelo que funciona no Safari).
  // Qualquer falha cai no fallback com link clicável — a página nunca navega nem quebra.
  const handleConectar = async () => {
    try {
      setProcessando(true)
      setBlockedUrl(null)

      const resultado = await conectarViaNovaJanela('openai', calcularReturnUrlConfig())

      if (resultado.janelaBloqueada && resultado.url) {
        setBlockedUrl(resultado.url)
        toast({
          title: 'Janela de autorização bloqueada pelo navegador',
          description:
            'Clique no botão de autorização destacado abaixo para abrir a OpenAI em nova aba.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Autorização aberta em nova aba',
        description:
          'Conclua a autorização na aba da OpenAI. Ao voltar para cá, o status atualiza automaticamente.',
      })
      // Revalida o status logo em seguida (a autorização pode já ter sido concluída).
      setTimeout(() => {
        carregarStatus()
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      setBlockedUrl(null)
      toast({
        title: 'Atenção ao conectar OpenAI',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  const handleDesconectar = async () => {
    try {
      setProcessando(true)
      setBlockedUrl(null)
      await disconnect('openai')
      await carregarStatus()
      toast({
        title: 'OpenAI desconectada',
        description: 'A gravação e transcrição exigirão reconectar a conta.',
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toast({
        title: 'Erro ao desconectar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Card className="border-[#E5E1D8] bg-white shadow-xs">
      <CardHeader className="pb-3 border-b border-[#E5E1D8]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                Conector OpenAI (Conta Própria)
              </CardTitle>
              <CardDescription className="text-xs text-[#5B6470]">
                Usado para gravação de reuniões, transcrição de áudio via Whisper e extração para
                Calendário e Kanban
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {carregando ? (
              <Badge variant="outline" className="text-xs border-zinc-200 text-zinc-500 gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
              </Badge>
            ) : conectado ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Conectado
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 text-xs font-medium gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Desconectado
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={carregarStatus}
              disabled={carregando}
              className="text-xs h-7 border-zinc-200"
            >
              <RefreshCw className={`w-3 h-3 ${carregando ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Como funciona */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-start gap-2.5">
            <Mic className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#1A1D21]">1. Gravação & Áudio</p>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                Grave até ~25 min diretamente na Folha do Dia via navegador.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-start gap-2.5">
            <Brain className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#1A1D21]">2. Transcrição & IA</p>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                Sua conta OpenAI transcreve e extrai data/hora, participantes e decisões.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-start gap-2.5">
            <Calendar className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#1A1D21]">3. Calendário & Kanban</p>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                Cria o evento com link Jitsi e manda os próximos passos como tarefas no Kanban.
              </p>
            </div>
          </div>
        </div>

        {/* Ações de conexão — APENAS UM BOTÃO DE AÇÃO */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          <div className="text-xs text-zinc-600">
            {conectado ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Sua conta pessoal da OpenAI está ativa e pronta para novas reuniões.
              </span>
            ) : (
              <span className="text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Conecte sua conta para habilitar o botão &quot;Nova Reunião&quot; na Folha do Dia.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {conectado ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDesconectar}
                disabled={processando}
                className="text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Desconectar OpenAI</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => handleConectar()}
                disabled={processando}
                className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-xs gap-1.5 shadow-xs"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{processando ? 'Abrindo conexão...' : 'Conectar Minha Conta OpenAI'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Fallback Clicável quando a nova janela for bloqueada pelo navegador */}
        {blockedUrl && (
          <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/90 text-xs text-emerald-950 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-emerald-950">
                  O navegador bloqueou a abertura da janela de autorização da OpenAI
                </p>
                <p className="text-emerald-800 leading-relaxed text-[11px]">
                  Para concluir a conexão, clique no link direto abaixo. Você será levado à tela
                  oficial de autorização da OpenAI e, ao voltar a esta página, o status atualiza
                  automaticamente.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 pl-6">
              <a
                href={blockedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D5C56] text-white font-medium text-xs shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Clique aqui para autorizar a OpenAI</span>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBlockedUrl(null)}
                className="text-xs text-zinc-500 hover:text-zinc-700 h-8"
              >
                Dispensar aviso
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
