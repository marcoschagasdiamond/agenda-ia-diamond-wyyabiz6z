/**
 * Coleção eventos_card — Timeline dos cards (modelo Ummense).
 * Um registro por evento/ação no card: criação, anotações, movimentação
 * de coluna, membros adicionados, tarefas criadas/concluídas.
 * Also creates tarefas_card — the "Tarefas do card" checklist (não alimenta o Kanban).
 */
migrate(
  (app) => {
    const cardsColId = app.findCollectionByNameOrId('cards').id
    const usersColId = '_pb_users_auth_'

    const eventos = new Collection({
      name: 'eventos_card',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && autor = @request.auth.id",
      updateRule: "@request.auth.id != '' && autor = @request.auth.id",
      deleteRule: "@request.auth.id != '' && autor = @request.auth.id",
      fields: [
        {
          name: 'card',
          type: 'relation',
          required: true,
          collectionId: cardsColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_evento',
          type: 'select',
          required: true,
          values: ['anotacao', 'sistema', 'movimento', 'membro', 'tarefa'],
          maxSelect: 1,
        },
        { name: 'texto', type: 'text', maxSize: 8000 },
        {
          name: 'autor',
          type: 'relation',
          required: true,
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'dados', type: 'json', maxSize: 2000000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_eventos_card_card ON eventos_card (card)',
        'CREATE INDEX idx_eventos_card_card_created ON eventos_card (card, created)',
        'CREATE INDEX idx_eventos_card_tipo ON eventos_card (tipo_evento)',
      ],
    })
    app.save(eventos)

    const tarefas = new Collection({
      name: 'tarefas_card',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && criado_por = @request.auth.id",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'card',
          type: 'relation',
          required: true,
          collectionId: cardsColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true, maxSize: 2000 },
        { name: 'concluida', type: 'bool' },
        { name: 'descricao', type: 'text', maxSize: 8000 },
        { name: 'data_limite', type: 'date' },
        {
          name: 'responsavel',
          type: 'relation',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'criado_por',
          type: 'relation',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'ordem', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tarefas_card_card ON tarefas_card (card)',
        'CREATE INDEX idx_tarefas_card_card_ordem ON tarefas_card (card, ordem)',
      ],
    })
    app.save(tarefas)
  },
  (app) => {
    try {
      const eventos = app.findCollectionByNameOrId('eventos_card')
      app.delete(eventos)
    } catch (_) {}
    try {
      const tarefas = app.findCollectionByNameOrId('tarefas_card')
      app.delete(tarefas)
    } catch (_) {}
  },
)
