import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Brain, Send, Loader2, RefreshCw, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { conversarComAnalistaStream } from '@/services/analistaMemoria'

interface Mensagem {
  id: string
  sender: 'user' | 'assistant'
  content: string
  erro?: boolean
}

const CHIPS_SUGESTOES = [
  'O que decidimos com o cliente X na última conversa?',
  'Quais demandas do projeto Y estão paradas?',
  'Que sementes tenho no cofre com o parceiro Z?',
  'Resuma o histórico do contato A',
  'O que decidimos esta semana?',
]

const MENSAGEM_BOAS_VINDAS: Mensagem = {
  id: 'welcome',
  sender: 'assistant',
  content:
    'Olá! Eu sou a Diamantina, sua Analista de Memória — o segundo cérebro do Agenda IA Diamond.\nPergunte em português sobre seus contatos, projetos, fluxos, conversas, sementes do cofre ou resumos do dia, e eu respondo com base nos dados reais do sistema, indicando sempre de onde tirei cada informação.',
}

export default function Memoria() {
  const { toast } = useToast()
  const [mensagens, setMensagens] = useState<Mensagem[]>([MENSAGEM_BOAS_VINDAS])
  const [texto, setTexto] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  const enviarPergunta = useCallback(
    async (perguntaOriginal: string) => {
      const pergunta = perguntaOriginal.trim()
      if (!pergunta || carregando) return

      setTexto('')
      setMensagens((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, sender: 'user', content: pergunta },
      ])
      setCarregando(true)

      const respostaId = `a-${Date.now()}`
      setMensagens((prev) => [...prev, { id: respostaId, sender: 'assistant', content: '' }])

      try {
        const resultado = await conversarComAnalistaStream(
          pergunta,
          conversationId,
          (textoAcumulado) => {
            setMensagens((prev) =>
              prev.map((m) => (m.id === respostaId ? { ...m, content: textoAcumulado } : m)),
            )
          },
        )

        if (resultado.conversation_id) setConversationId(resultado.conversation_id)

        setMensagens((prev) =>
          prev.map((m) =>
            m.id === respostaId ? { ...m, content: resultado.content || 'Compreendido.' } : m,
          ),
        )
      } catch (err) {
        const mensagemErro = (err as Error)?.message || 'Falha desconhecida.'
        setMensagens((prev) =>
          prev.map((m) =>
            m.id === respostaId
              ? {
                  ...m,
                  erro: true,
                  content:
                    'Desculpe, tive uma instabilidade temporária ao consultar sua memória. Pode tentar de novo?',
                }
              : m,
          ),
        )
        toast({
          title: 'Erro na Analista de Memória',
          description: mensagemErro,
          variant: 'destructive',
        })
      } finally {
        setCarregando(false)
      }
    },
    [carregando, conversationId, toast],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarPergunta(texto)
    }
  }

  const novaSessao = () => {
    setConversationId(null)
    setMensagens([
      {
        ...MENSAGEM_BOAS_VINDAS,
        id: `welcome-${Date.now()}`,
        content:
          'Nova sessão iniciada. A memória durável da Diamantina continua preservada — os destaques das conversas anteriores seguem disponíveis. Sobre o que vamos analisar agora?',
      },
    ])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-4xl mx-auto bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
      {/* Cabeçalho */}
      <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between bg-[#FAFAF9]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-sm">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#1A1D21]">Analista de Memória</h2>
              <Badge
                className="bg-emerald-50 text-emerald-700 text-[10px] border-emerald-200"
                variant="outline"
              >
                Segundo cérebro · Memória persistente
              </Badge>
            </div>
            <p className="text-[11px] text-[#5B6470]">
              Diamantina responde em português sobre contatos, projetos, fluxos, conversas, sementes
              e resumos — citando a origem de cada informação.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={novaSessao}
          className="text-xs h-8 border-[#E5E1D8] text-[#5B6470] gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Nova conversa
        </Button>
      </div>

      {/* Feed de mensagens */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F4F2EE]/40">
        {mensagens.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? 'bg-[#E5E1D8] text-[#1A1D21]' : 'bg-[#0F766E] text-white shadow-2xs'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                  msg.erro
                    ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-none'
                    : isUser
                      ? 'bg-[#0F766E] text-white rounded-tr-none'
                      : 'bg-white text-[#1A1D21] border border-[#E5E1D8] rounded-tl-none'
                }`}
              >
                {msg.content || '…'}
              </div>
            </div>
          )
        })}

        {carregando && (
          <div className="flex items-center gap-2 text-xs text-[#5B6470] p-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-[#0F766E]" />
            <span>Diamantina está pensando…</span>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      {/* Chips de sugestões */}
      <div className="px-4 pt-3 pb-1 bg-white border-t border-[#E5E1D8]">
        <div className="flex flex-wrap gap-1.5">
          {CHIPS_SUGESTOES.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={carregando}
              onClick={() => enviarPergunta(chip)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-[#E5E1D8] bg-[#FAFAF9] text-[#5B6470] hover:bg-[#0F766E]/5 hover:border-[#0F766E]/40 hover:text-[#0F766E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Campo de envio */}
      <div className="p-3 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            enviarPergunta(texto)
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={carregando}
            placeholder="Pergunte sobre seus negócios: 'O que decidimos com o cliente X?', 'Quais demandas estão paradas?'…"
            className="text-xs resize-none border-[#E5E1D8] focus-visible:ring-1 focus-visible:ring-[#0F766E]"
          />
          <Button
            type="submit"
            disabled={carregando || !texto.trim()}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white h-14 px-4 shrink-0 shadow-sm"
          >
            {carregando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-[#5B6470] mt-1.5 text-center">
          Pressione Enter para enviar. Shift + Enter para quebra de linha.
        </p>
      </div>
    </div>
  )
}
