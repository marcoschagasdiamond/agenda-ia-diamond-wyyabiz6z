/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de VALIDAÇÃO EM RUNTIME do Analista de Memória (validacao_analista.js).
 * NÃO faz parte da aplicação — deve ser REMOVIDO após a validação.
 *
 * IMPORTANTE (JSVM): nada de declarações de topo — toda lógica inline no callback.
 *
 * 1) Rotas GET (só superusuário), para teste manual com token de admin:
 *   GET /backend/v1/validacao-analista/chat?email=<email-real>&mensagem=<pergunta>
 *   GET /backend/v1/validacao-analista/chat-stream?email=<email-real>&mensagem=<pergunta>
 *
 * 2) Cron de auto-teste "validacao_analista_runtime" (a cada 5 min): conversa
 *   com o agente 'diamantina-analista-memoria' como usuário REAL (Marcos),
 *   faz a pergunta inicial + uma de acompanhamento (mesma conversa) e registra
 *   o resultado nos logs de hooks. Exercita exatamente o mesmo caminho que
 *   POST /backend/v1/analista-memoria/chat usa.
 */
routerAdd('GET', '/backend/v1/validacao-analista/chat', (e) => {
  const admin = e.auth

  if (!admin || admin.collection().name !== '_superusers') {
    return e.unauthorizedError('rota de validação: só superusuário')
  }

  try {
    const query = e.requestInfo().query || {}
    const email = String(query.email || '').trim()
    const mensagem = String(query.mensagem || '').trim()
    const conversationId = String(query.conversation_id || '').trim()

    if (!email || !mensagem) {
      return e.badRequestError('informe ?email=<email-real>&mensagem=<pergunta>')
    }

    const usuario = $app.findAuthRecordByEmail('users', email)

    const result = $ai.agent('diamantina-analista-memoria').chat({
      user_id: usuario.id,
      conversation_id: conversationId || null,
      message: mensagem,
    })

    return e.json(200, {
      usuario: usuario.id,
      conversation_id: result.conversation_id,
      content: result.content,
      citations: result.citations || [],
      message_id: result.message_id,
    })
  } catch (err) {
    return e.json(500, {
      error: err.message || 'erro na validação do analista de memória',
      status: err.status || null,
    })
  }
})

routerAdd('GET', '/backend/v1/validacao-analista/chat-stream', (e) => {
  const admin = e.auth
  if (!admin || admin.collection().name !== '_superusers') {
    return e.unauthorizedError('rota de validação: só superusuário')
  }

  try {
    const query = e.requestInfo().query || {}
    const email = String(query.email || '').trim()
    const mensagem = String(query.mensagem || '').trim()
    const conversationId = String(query.conversation_id || '').trim()

    if (!email || !mensagem) {
      return e.badRequestError('informe ?email=<email-real>&mensagem=<pergunta>')
    }

    const usuario = $app.findAuthRecordByEmail('users', email)

    const agente = $ai.agent('diamantina-analista-memoria')
    const conv = agente.getOrCreateConversation({
      user_id: usuario.id,
      id: conversationId || null,
    })

    const iter = agente.chat({
      user_id: usuario.id,
      conversation_id: conv.id,
      message: mensagem,
      stream: true,
    })

    e.response.header().set('Content-Type', 'text/event-stream')
    e.response.header().set('Cache-Control', 'no-cache')
    e.response.header().set('X-Conversation-Id', conv.id)

    $response.stream(e, iter)
  } catch (err) {
    return e.json(500, {
      error: err.message || 'erro no streaming de validação do analista de memória',
      status: err.status || null,
    })
  }
})

cronAdd('validacao_analista_runtime', '*/5 * * * *', () => {
  const rotulo = '[validacao-analista]'
  try {
    const usuario = $app.findAuthRecordByEmail('users', 'marcoschagasdiamond@icloud.com')
    console.log(rotulo + ' iniciando com usuario real id=' + usuario.id)

    const t0 = Date.now()
    const r1 = $ai.agent('diamantina-analista-memoria').chat({
      user_id: usuario.id,
      conversation_id: null,
      message: 'Quantos contatos eu tenho no sistema? Cite de onde tirou o número.',
    })
    console.log(
      rotulo +
        ' P1 ok em ' +
        (Date.now() - t0) +
        'ms conversation_id=' +
        r1.conversation_id +
        ' citations=' +
        (r1.citations || []).length,
    )
    console.log(rotulo + ' R1: ' + String(r1.content).slice(0, 700))

    const t1 = Date.now()
    const r2 = $ai.agent('diamantina-analista-memoria').chat({
      user_id: usuario.id,
      conversation_id: r1.conversation_id,
      message:
        'E desses contatos, quantos vieram de importação do iCloud? E tenho algum projeto ativo?',
    })
    console.log(
      rotulo + ' P2 ok em ' + (Date.now() - t1) + 'ms (mesma conversa, contexto anterior)',
    )
    console.log(rotulo + ' R2: ' + String(r2.content).slice(0, 700))

    console.log(rotulo + ' VALIDACAO CONCLUIDA SEM ERROS')
  } catch (err) {
    console.log(
      rotulo +
        ' ERRO: ' +
        (err && err.message ? err.message : String(err)) +
        (err && err.status ? ' | status=' + err.status : ''),
    )
  }
})
