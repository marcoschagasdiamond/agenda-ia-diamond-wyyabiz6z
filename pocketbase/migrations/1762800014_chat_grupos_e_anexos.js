// Grupos de chat interno + anexos nas mensagens.
// - Coleção chat_grupos: nome, criado_por, descricao e membros (relation multi → users).
// - chat_mensagens: campo opcional grupo (relation → chat_grupos) e anexo (file único).
// - destinatario deixa de ser required (mensagens de grupo não têm destinatário).
migrate(
  (app) => {
    const grupos = new Collection({
      name: 'chat_grupos',
      listRule:
        "@request.auth.id != '' && (criado_por = @request.auth.id || membros.id ?= @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (criado_por = @request.auth.id || membros.id ?= @request.auth.id)",
      createRule: "@request.auth.id != '' && criado_por = @request.auth.id",
      updateRule: "@request.auth.id != '' && criado_por = @request.auth.id",
      deleteRule: "@request.auth.id != '' && criado_por = @request.auth.id",
      fields: [
        { name: 'nome', type: 'text', required: true, max: 120 },
        { name: 'descricao', type: 'text', max: 300 },
        {
          name: 'criado_por',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'membros',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 100,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_chat_grupos_criado_por ON chat_grupos (criado_por)'],
    })
    app.save(grupos)

    const chat = app.findCollectionByNameOrId('chat_mensagens')

    // destinatario vira opcional (mensagem de grupo não tem destinatário único)
    const dest = chat.fields.getByName('destinatario')
    if (dest) {
      dest.required = false
    }

    // Regras: visibilidade = remetente, destinatário OU membro do grupo da mensagem.
    chat.listRule =
      "@request.auth.id != '' && (remetente = @request.auth.id || destinatario = @request.auth.id || (grupo != '' && grupo.membros.id ?= @request.auth.id))"
    chat.viewRule = chat.listRule
    chat.createRule =
      "@request.auth.id != '' && remetente = @request.auth.id && (destinatario != @request.auth.id || (grupo != '' && grupo.membros.id ?= @request.auth.id))"
    // Atualização continua só do destinatário (marcar lida); mensagem de grupo:
    // qualquer membro do grupo marca como lida.
    chat.updateRule =
      "@request.auth.id != '' && remetente != @request.auth.id && (destinatario = @request.auth.id || (grupo != '' && grupo.membros.id ?= @request.auth.id))"

    // Campos novos
    if (!chat.fields.getByName('grupo')) {
      chat.fields.add(
        new RelationField({
          name: 'grupo',
          collectionId: grupos.id,
          maxSelect: 1,
          minSelect: 0,
          cascadeDelete: true,
        }),
      )
    }
    if (!chat.fields.getByName('anexo')) {
      chat.fields.add(
        new FileField({
          name: 'anexo',
          maxSelect: 1,
          maxSize: 10485760,
          thumbs: ['300x300'],
        }),
      )
    }

    app.save(chat)
  },
  (app) => {
    const chat = app.findCollectionByNameOrId('chat_mensagens')
    const g = chat.fields.getByName('grupo')
    if (g) chat.fields.removeByName('grupo')
    const a = chat.fields.getByName('anexo')
    if (a) chat.fields.removeByName('anexo')
    chat.listRule =
      "@request.auth.id != '' && (remetente = @request.auth.id || destinatario = @request.auth.id)"
    chat.viewRule = chat.listRule
    chat.createRule =
      "@request.auth.id != '' && remetente = @request.auth.id && destinatario != @request.auth.id"
    chat.updateRule =
      "@request.auth.id != '' && destinatario = @request.auth.id && remetente != @request.auth.id"
    app.save(chat)

    try {
      const grupos = app.findCollectionByNameOrId('chat_grupos')
      app.delete(grupos)
    } catch (_) {
      // nada a reverter
    }
  },
)
