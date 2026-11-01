migrate(
  (app) => {
    // 1. Coleção configuracoes_whatsapp
    const cfgCollection = new Collection({
      name: 'configuracoes_whatsapp',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        {
          name: 'usuario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'modo_selecao',
          type: 'select',
          required: false,
          values: ['apenas_escolhidos', 'todos_exceto', 'desligado'],
          maxSelect: 1,
        },
        {
          name: 'contatos_escolhidos',
          type: 'json',
          required: false,
        },
        {
          name: 'contatos_ignorados',
          type: 'json',
          required: false,
        },
        {
          name: 'grupos_escolhidos',
          type: 'json',
          required: false,
        },
        {
          name: 'ultima_sincronizacao',
          type: 'text',
          required: false,
        },
        {
          name: 'phone_number_id',
          type: 'text',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_cfg_whatsapp_user ON configuracoes_whatsapp (usuario)'],
    })
    app.save(cfgCollection)

    // 2. Coleção mensagens_whatsapp_sincronizadas (para idempotência das mensagens recebidas)
    const msgCollection = new Collection({
      name: 'mensagens_whatsapp_sincronizadas',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        {
          name: 'usuario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'message_id',
          type: 'text',
          required: true,
        },
        {
          name: 'remetente_numero',
          type: 'text',
          required: false,
        },
        {
          name: 'remetente_nome',
          type: 'text',
          required: false,
        },
        {
          name: 'is_grupo',
          type: 'bool',
          required: false,
        },
        {
          name: 'grupo_id',
          type: 'text',
          required: false,
        },
        {
          name: 'grupo_nome',
          type: 'text',
          required: false,
        },
        {
          name: 'autor_mensagem',
          type: 'text',
          required: false,
        },
        {
          name: 'folha_dia_id',
          type: 'text',
          required: false,
        },
        {
          name: 'timestamp_mensagem',
          type: 'text',
          required: false,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_msg_wa_user_msgid ON mensagens_whatsapp_sincronizadas (usuario, message_id)',
      ],
    })
    app.save(msgCollection)
  },
  (app) => {
    try {
      const col2 = app.findCollectionByNameOrId('mensagens_whatsapp_sincronizadas')
      app.delete(col2)
    } catch (_) {}
    try {
      const col1 = app.findCollectionByNameOrId('configuracoes_whatsapp')
      app.delete(col1)
    } catch (_) {}
  },
)
