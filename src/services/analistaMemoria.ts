// Serviço de conversa com o agente nativo "Diamantina — Analista de Memória"
// (definido via migration em pocketbase/migrations/1762800019_define_analista_memoria.js).
// Reutiliza os leitores de SSE já testados de src/lib/skipAi.ts — nunca ler o
// stream à mão (o histórico do projeto mostra que sai "undefinedundefined…").
import pb from '@/lib/pocketbase/client'
import { streamAgentChat } from '@/lib/skipAi'
import type { AgentCitation } from '@/lib/skipAi'

export interface AnalistaChatResult {
  conversation_id: string
  content: string
  citations?: AgentCitation[]
  message_id?: string
}

const BASE = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/analista-memoria`

function cabecalhos(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: pb.authStore.token,
  }
}

/** Conversa síncrona com a Analista de Memória (mesmo padrão do /agente). */
export async function conversarComAnalista(
  message: string,
  conversationId: string | null,
): Promise<AnalistaChatResult> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: cabecalhos(),
    body: JSON.stringify({ message, conversation_id: conversationId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Falha ao conversar com a Analista de Memória.')
  }

  return res.json()
}

/** Conversa em streaming (SSE) com a Analista de Memória. */
export async function conversarComAnalistaStream(
  message: string,
  conversationId: string | null,
  aoReceberTrecho: (textoAcumulado: string) => void,
): Promise<AnalistaChatResult> {
  const res = await fetch(`${BASE}/chat-stream`, {
    method: 'POST',
    headers: cabecalhos(),
    body: JSON.stringify({ message, conversation_id: conversationId }),
  })

  const resultado = await streamAgentChat(res, {
    onChunk: (_delta, acumulado) => aoReceberTrecho(acumulado),
  })

  return {
    conversation_id: resultado.conversation_id || conversationId || '',
    content: resultado.content,
    citations: resultado.citations,
    message_id: resultado.message_id,
  }
}
