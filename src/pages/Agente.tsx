import React, { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Bot,
  Send,
  Sparkles,
  User,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Brain,
  History,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ModalDesbloqueioPlano } from '@/components/comercial/ModalDesbloqueioPlano'
import { diamondApi } from '@/services/diamondApi'
import type { LimitesConsumoConta } from '@/types'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  content: string
  created?: string
}

export default function Agente() {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: `Olá! Eu sou seu copiloto inteligente Diamond.
Tenho acesso ao seu histórico completo, projetos, contatos, notas da folha do dia e às diretrizes que você registrou no seu onboarding.

Como posso ajudar sua estratégia ou demandas hoje?`,
    },
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [limites, setLimites] = useState<LimitesConsumoConta | null>(null)
  const [modalUpgradeOpen, setModalUpgradeOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    diamondApi
      .getLimitesConsumoConta(user?.id, user?.email)
      .then(setLimites)
      .catch(() => {})
  }, [user?.id, user?.email])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputText.trim() || loading) return

    // Se o módulo IA estiver inativo, abrir modal de desbloqueio
    if (limites && !limites.moduloIaAtivo) {
      setModalUpgradeOpen(true)
      return
    }

    const userMsgText = inputText.trim()
    setInputText('')

    const newMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: userMsgText,
    }
    setMessages((prev) => [...prev, newMsg])
    setLoading(true)

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          message: userMsgText,
          conversation_id: conversationId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao conversar com o agente.')
      }

      const data = await res.json()
      if (data.conversation_id) {
        setConversationId(data.conversation_id)
      }

      const assistantMsg: Message = {
        id: data.message_id || `a-${Date.now()}`,
        sender: 'assistant',
        content: data.content || 'Compreendido.',
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      toast({
        title: 'Erro no agente',
        description: (err as Error)?.message,
        variant: 'destructive',
      })
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content:
            'Desculpe, tive uma instabilidade temporária ao consultar sua memória. Por favor, tente novamente.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleLimparChat = () => {
    setConversationId(null)
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        content: `Nova sessão iniciada. O contexto permanente do seu perfil e projetos continua preservado. Como posso ajudar?`,
      },
    ])
  }

  const moduloIaInativo = limites ? !limites.moduloIaAtivo : false

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] max-w-4xl mx-auto bg-white rounded-xl border border-[#E5E1D8] shadow-xs overflow-hidden">
      <ModalDesbloqueioPlano
        open={modalUpgradeOpen}
        onOpenChange={setModalUpgradeOpen}
        recursoNome="Módulo Copiloto Inteligente IA"
        motivo="O Copiloto IA faz parte do plano Pro comercial (R$ 197/mês). Ative para ter consultas inteligentes ilimitadas conectadas a todas as suas notas, projetos e contatos."
        stripePaymentLink={limites?.stripePaymentLink}
        precoMensalTexto={limites?.precoMensalTexto}
        isContaTeste={limites?.isContaTeste}
      />

      {moduloIaInativo && (
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Módulo IA Inativo:</strong> Envio de mensagens e respostas da IA requerem
              plano Pro ({limites?.precoMensalTexto || 'R$ 197/mês'}).
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setModalUpgradeOpen(true)}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white text-[11px] h-7 px-2.5 font-semibold shrink-0 gap-1"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Desbloquear IA</span>
          </Button>
        </div>
      )}

      {/* Header do Chat */}
      <div className="p-4 border-b border-[#E5E1D8] flex items-center justify-between bg-[#FAFAF9]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-sm font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#1A1D21]">Agente IA Diamond</h2>
              <Badge
                className="bg-emerald-50 text-emerald-700 text-[10px] border-emerald-200"
                variant="outline"
              >
                Memória Persistente
              </Badge>
            </div>
            <p className="text-[11px] text-[#5B6470]">
              Copiloto executivo com leitura e escrita em Projetos, Cards, Contatos e Resumos.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLimparChat}
          className="text-xs h-8 border-[#E5E1D8] text-[#5B6470] gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Novo Chat
        </Button>
      </div>

      {/* Feed de Mensagens */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F4F2EE]/40">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 max-w-[85%] ${
                isUser ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? 'bg-[#E5E1D8] text-[#1A1D21]' : 'bg-[#0F766E] text-white shadow-2xs'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                  isUser
                    ? 'bg-[#0F766E] text-white rounded-tr-none'
                    : 'bg-white text-[#1A1D21] border border-[#E5E1D8] rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#5B6470] p-2 animate-pulse">
            <Bot className="w-4 h-4 text-[#0F766E]" />
            <span>Consultando Segundo Cérebro e gerando resposta...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <div className="p-3 border-t border-[#E5E1D8] bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <Textarea
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre seus projetos, peça um resumo das prioridades de hoje ou peça para estruturar uma demanda..."
            className="text-xs resize-none border-[#E5E1D8] focus-visible:ring-1 focus-visible:ring-[#0F766E]"
          />
          <Button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="bg-[#0F766E] hover:bg-[#0D5C56] text-white h-14 px-4 shrink-0 shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
        <p className="text-[10px] text-[#5B6470] mt-1.5 text-center">
          Pressione Enter para enviar. Shift + Enter para quebra de linha.
        </p>
      </div>
    </div>
  )
}
