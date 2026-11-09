import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { listConnectors, connect, disconnect, ConnectPopupBlockedError } from '@/lib/skipConnectors'
import { ConnectorButton } from '@/components/skip/ConnectorButton'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Unlink,
  ExternalLink,
  Bot,
  Key,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react'

export function GestaoGeminiUsuario() {
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [preferirMesmaAba, setPreferirMesmaAba] = useState(true)
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null)

  const carregarStatus = async () => {
    try {
      setCarregando(true)
      const lista = await listConnectors()
      const gemini = lista.find((c) => c.toolkit === 'gemini')
      setConectado(gemini?.status === 'connected')
    } catch (err) {
      console.warn('Erro ao verificar conector Gemini do usuário:', err)
      setConectado(false)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarStatus()
  }, [])

  // Obtém a URL de autorização diretamente da API Skip Connectors
  const obterUrlAutorizacao = async (): Promise<string> => {
    const returnUrl = window.location.origin + window.location.pathname
    // No Skip Cloud pb_hooks/connectors: rota POST /api/skip/connectors/gemini/connect
    const res: unknown = await pb.send(`/api/skip/connectors/gemini/connect`, {
      method: 'POST',
      body: { returnUrl },
    })
    if (
      res &&
      typeof res === 'object' &&
      'url' in res &&
      typeof (res as { url: unknown }).url === 'string'
    ) {
      return (res as { url: string }).url
    }
    throw new Error('Não foi possível obter a URL de autorização do Gemini.')
  }

  const handleConectar = async (forcarMesmaAba = preferirMesmaAba) => {
    try {
      setProcessando(true)
      setBlockedUrl(null)

      // Se configurado para navegar na mesma aba (padrão recomendado para Safari/iOS e navegadores estritos)
      if (forcarMesmaAba) {
        try {
          const consentUrl = await obterUrlAutorizacao()
          if (/^https?:/i.test(consentUrl)) {
            // Navega diretamente na mesma aba sem acionar o bloqueio de popups do Safari
            window.location.assign(consentUrl)
            return
          }
        } catch (apiErr: unknown) {
          console.warn('Tentando fallback via connect() do skipConnectors:', apiErr)
        }
      }

      // Fluxo padrão com fallback de popup
      await connect('gemini')
      await carregarStatus()
      toast({
        title: 'Google Gemini conectado com sucesso!',
        description:
          'Sua conta está ativa como alternativa de IA para reuniões, transcrições e extrações da Folha do Dia.',
      })
    } catch (err: unknown) {
      if (err instanceof ConnectPopupBlockedError) {
        setBlockedUrl(err.url)
        toast({
          title: 'Janela de autorização bloqueada pelo navegador',
          description:
            'O navegador (Safari/Chrome) bloqueou a abertura automática. Clique no botão de autorização abaixo para continuar com segurança.',
          variant: 'destructive',
        })
      } else if (
        err &&
        typeof err === 'object' &&
        'url' in err &&
        typeof (err as { url: unknown }).url === 'string'
      ) {
        setBlockedUrl((err as { url: string }).url)
      } else {
        const msg = err instanceof Error ? err.message : 'Tente novamente.'
        toast({
          title: 'Atenção ao conectar Gemini',
          description: msg,
          variant: 'destructive',
        })
      }
    } finally {
      setProcessando(false)
    }
  }

  const handleDesconectar = async () => {
    try {
      setProcessando(true)
      setBlockedUrl(null)
      await disconnect('gemini')
      await carregarStatus()
      toast({
        title: 'Google Gemini desconectado',
        description: 'A alternativa de IA via Gemini foi desativada.',
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
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-[#1A1D21] flex items-center gap-2">
                Conector Google Gemini (Conta Própria)
              </CardTitle>
              <CardDescription className="text-xs text-[#5B6470]">
                Alternativa de IA de alto desempenho para estruturação de reuniões e planos de ação
                (Chave própria gratuita em aistudio.google.com)
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {carregando ? (
              <Badge variant="outline" className="text-xs border-zinc-200 text-zinc-500 gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
              </Badge>
            ) : conectado ? (
              <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs font-semibold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Conectado
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
        {/* Como funciona & Instruções */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-start gap-2.5">
            <Key className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#1A1D21]">1. Obter Chave Gratuita</p>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                Crie sua chave de API gratuitamente no{' '}
                <a
                  href="https://aistudio.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#1A1D21]">2. Alternativa Inteligente</p>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                Se não tiver OpenAI conectada, o Agenda IA Diamond usa automaticamente o Gemini para
                reuniões.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-[#E5E1D8] bg-[#FAFAF9] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#1A1D21]">3. Privacidade da Conta</p>
              <p className="text-[11px] text-[#5B6470] mt-0.5">
                A conexão pertence exclusivamente ao seu usuário e não é compartilhada com mais
                ninguém.
              </p>
            </div>
          </div>
        </div>

        {/* Ações de conexão */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-zinc-100">
          <div className="text-xs text-zinc-600">
            {conectado ? (
              <span className="text-blue-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Sua conta Google Gemini está ativa e pronta para uso nas reuniões da Folha.
              </span>
            ) : (
              <span className="text-zinc-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Conecte o Gemini como alternativa de IA caso não utilize OpenAI.
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
                <span>Desconectar Gemini</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={() => handleConectar()}
                  disabled={processando}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-xs"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{processando ? 'Abrindo conexão...' : 'Conectar Minha Conta Gemini'}</span>
                </Button>
                <ConnectorButton toolkit="gemini" name="Google Gemini" />
              </div>
            )}
          </div>
        </div>

        {/* Fallback de Popup Bloqueado com links clicáveis e navegação na mesma aba */}
        {blockedUrl && (
          <div className="p-3.5 rounded-xl border border-blue-300 bg-blue-50/90 text-xs text-blue-950 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-900">
                  O navegador bloqueou a janela de autorização do Gemini
                </p>
                <p className="text-blue-800 leading-relaxed text-[11px]">
                  Para concluir a conexão com segurança, utilize os links abaixo. Você será levado à
                  tela oficial do conector Google Gemini para autorizar e retornará a esta página
                  com sua conta ativa.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 pl-6">
              <a
                href={blockedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Clique aqui para abrir a autorização do Gemini</span>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.assign(blockedUrl)
                }}
                className="text-xs text-blue-900 hover:bg-blue-100 h-8 font-medium"
              >
                Navegar nesta mesma aba
              </Button>
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

        {/* Opção de preferência de navegação (mesma aba vs popup) */}
        {!conectado && (
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
            <span className="text-[11px] text-[#5B6470]">Modo de autorização do conector:</span>
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-[#1A1D21]">
              <input
                type="checkbox"
                checked={preferirMesmaAba}
                onChange={(e) => setPreferirMesmaAba(e.target.checked)}
                className="rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
              ></input>
              <span>Navegar sempre na mesma aba (recomendado para Safari e mobile)</span>
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
