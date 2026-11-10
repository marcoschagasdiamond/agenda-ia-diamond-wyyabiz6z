migrate(
  (app) => {
    // 1) listas_selecao — listas reutilizáveis de itens (ex.: Redes Sociais)
    const listas = new Collection({
      name: 'listas_selecao',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true, max: 160 },
        { name: 'itens', type: 'json', maxSize: 2000000 },
        { name: 'ativo', type: 'bool' },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_listas_selecao_nome ON listas_selecao (nome)'],
    })
    app.save(listas)

    // 2) campos_personalizados — definição dos campos extras (modelo Ummense adaptado)
    const campos = new Collection({
      name: 'campos_personalizados',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'categoria',
          type: 'select',
          required: true,
          values: ['card', 'pessoa', 'empresa'],
          maxSelect: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'texto_curto',
            'texto_longo',
            'numero',
            'select',
            'radio',
            'checkbox',
            'lista_checkbox',
            'seletor_horario',
            'seletor_data',
            'upload',
            'lista_selecao',
            'moeda',
          ],
          maxSelect: 1,
        },
        {
          name: 'mascara',
          type: 'select',
          maxSelect: 1,
          values: ['cpf', 'cnpj', 'rg', 'passaporte', 'outros'],
        },
        { name: 'mascara_outros', type: 'text', max: 200 },
        { name: 'nome_interno', type: 'text', required: true, max: 120 },
        { name: 'rotulo', type: 'text', required: true, max: 160 },
        { name: 'mensagem_ajuda', type: 'text', max: 500 },
        { name: 'legenda', type: 'text', max: 160 },
        { name: 'opcoes', type: 'json', maxSize: 2000000 },
        {
          name: 'lista_selecao',
          type: 'relation',
          collectionId: listas.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'obrigatorio', type: 'bool' },
        { name: 'ativo', type: 'bool' },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_campos_pers_categoria ON campos_personalizados (categoria)',
        'CREATE INDEX idx_campos_pers_ativo ON campos_personalizados (ativo)',
        'CREATE INDEX idx_campos_pers_lista ON campos_personalizados (lista_selecao)',
      ],
    })
    app.save(campos)

    // 3) valores_campos_personalizados — valor de um campo aplicado a um card ou contato
    const valores = new Collection({
      name: 'valores_campos_personalizados',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'campo',
          type: 'relation',
          required: true,
          collectionId: campos.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'card',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('cards').id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'contato',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('contatos').id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'valor', type: 'json', maxSize: 2000000 },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_valor_campo_alvo ON valores_campos_personalizados (campo, card, contato)',
        'CREATE INDEX idx_valor_campo ON valores_campos_personalizados (campo)',
      ],
    })
    app.save(valores)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('valores_campos_personalizados'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('campos_personalizados'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('listas_selecao'))
    } catch (_) {}
  },
)
