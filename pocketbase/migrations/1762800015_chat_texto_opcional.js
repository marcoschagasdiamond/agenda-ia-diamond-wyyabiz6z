// Mensagens apenas com anexo: texto deixa de ser obrigatório em chat_mensagens.
// Aproveita para indexar (grupo, created) — a conversa de grupo ordena por created.
migrate(
  (app) => {
    const chat = app.findCollectionByNameOrId('chat_mensagens')
    const texto = chat.fields.getByName('texto')
    if (texto) {
      texto.required = false
    }
    chat.addIndex('idx_chat_grupo_created', false, 'grupo,created', '')
    app.save(chat)
  },
  (app) => {
    const chat = app.findCollectionByNameOrId('chat_mensagens')
    chat.removeIndex('idx_chat_grupo_created')
    const texto = chat.fields.getByName('texto')
    if (texto) {
      texto.required = true
    }
    app.save(chat)
  },
)
