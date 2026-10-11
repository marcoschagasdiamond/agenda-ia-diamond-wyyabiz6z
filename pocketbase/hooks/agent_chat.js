/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoints para o chat com o assistente nativo Skip Cloud Agent
 */

// Listar conversas do usuário autenticado
routerAdd(
  'GET',
  '/backend/v1/agent/conversations',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    const limit = parseInt(e.requestInfo().query?.limit || '20', 10) || 20
    try {
      return e.json(
        200,
        $ai.agent('agenda-diamond-assistant').listConversations({ user_id: userId, limit }),
      )
    } catch (err) {
      return e.json(200, [])
    }
  },
  $apis.requireAuth(),
)

// Listar mensagens de uma conversa
routerAdd(
  'GET',
  '/backend/v1/agent/conversations/{convId}/messages',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')
    const convId = e.request.pathValue('convId')
    try {
      const res = $ai.agent('agenda-diamond-assistant').listMessages({
        conversation_id: convId,
        user_id: userId,
      })
      return e.json(200, res)
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao buscar mensagens' })
    }
  },
  $apis.requireAuth(),
)

// Chat síncrono com o agente Diamond
routerAdd(
  'POST',
  '/backend/v1/agent/chat',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')

      const body = e.requestInfo().body || {}
      if (!body.message || !body.message.trim()) {
        return e.badRequestError('A mensagem não pode ser vazia.')
      }

      const result = $ai.agent('agenda-diamond-assistant').chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: body.message,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao conversar com a IA' })
    }
  },
  $apis.requireAuth(),
)

// Chat streaming com o agente Diamond
routerAdd(
  'POST',
  '/backend/v1/agent/chat-stream',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')

      const body = e.requestInfo().body || {}
      if (!body.message || !body.message.trim()) {
        return e.badRequestError('A mensagem não pode ser vazia.')
      }

      const conv = $ai.agent('agenda-diamond-assistant').getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
      })

      const iter = $ai.agent('agenda-diamond-assistant').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: body.message,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)

      $response.stream(e, iter)
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro no streaming do agente' })
    }
  },
  $apis.requireAuth(),
)
