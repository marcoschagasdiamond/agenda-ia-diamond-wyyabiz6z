/**
 * Coleção chat_mensagens — Chat interno estilo WhatsApp entre colaboradores.
 * Cada usuário só vê mensagens em que é remetente OU destinatário.
 * lida_em (date, nulo = não lida) alimenta o badge do menu lateral.
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'

    const chat = new Collection({
      name: 'chat_mensagens',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (remetente = @request.auth.id || destinatario = @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (remetente = @request.auth.id || destinatario = @request.auth.id)",
      createRule:
        "@request.auth.id != '' && remetente = @request.auth.id && destinatario != @request.auth.id",
      // Apenas o destinatário pode marcar como lida; ninguém apaga nem edita texto de outra pessoa.
      updateRule:
        "@request.auth.id != '' && destinatario = @request.auth.id && remetente != @request.auth.id",
      deleteRule: null,
      fields: [
        {
          name: 'remetente',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'destinatario',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'texto', type: 'text', required: true, maxSize: 4000 },
        { name: 'lida_em', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_chat_dest_lida ON chat_mensagens (destinatario, lida_em)',
        'CREATE INDEX idx_chat_par_created ON chat_mensagens (remetente, destinatario, created)',
        'CREATE INDEX idx_chat_created ON chat_mensagens (created)',
      ],
    })
    app.save(chat)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('chat_mensagens')
      app.delete(col)
    } catch (_) {}
  },
)
