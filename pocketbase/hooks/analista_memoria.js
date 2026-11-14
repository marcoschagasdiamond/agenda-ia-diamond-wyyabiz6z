/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoints de conversa com o agente nativo "Diamantina — Analista de Memória"
 * (definido em pocketbase/migrations/1762800019_define_analista_memoria.js).
 *
 * IMPORTANTE (JSVM): callbacks de routerAdd NÃO veem declarações de topo de
 * arquivo — todo o helper fica inline dentro de cada callback.
 */

routerAdd(
  'POST',
  '/backend/v1/analista-memoria/chat',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const body = e.requestInfo().body || {}
      if (!body.message || !String(body.message).trim()) {
        return e.badRequestError('A mensagem não pode ser vazia.')
      }

      const result = $ai.agent('diamantina-analista-memoria').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: String(body.message),
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations || [],
        message_id: result.message_id,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao conversar com a Analista de Memória' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/analista-memoria/chat-stream',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('autenticação obrigatória')

      const body = e.requestInfo().body || {}
      if (!body.message || !String(body.message).trim()) {
        return e.badRequestError('A mensagem não pode ser vazia.')
      }

      const agente = $ai.agent('diamantina-analista-memoria')
      const conv = agente.getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
      })

      const iter = agente.chat({
        user_id: userId,
        conversation_id: conv.id,
        message: String(body.message),
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)

      $response.stream(e, iter)
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro no streaming da Analista de Memória' })
    }
  },
  $apis.requireAuth(),
)
