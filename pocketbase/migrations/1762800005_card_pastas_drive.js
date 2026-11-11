/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 1762800005 — Pastas do Google Drive vinculadas ao card.
 * Nova coleção `card_pastas_drive`: guarda o vínculo de uma pasta do Drive do
 * usuário (conectores de app) com um card do Fluxo — sem upload local:
 * card + nome da pasta + drive_file_id + drive_url + criado_por.
 */
migrate(
  (app) => {
    if (app.hasTable('card_pastas_drive')) return // idempotente

    const cardsId = app.findCollectionByNameOrId('cards').id
    const usersId = '_pb_users_auth_'

    const collection = new Collection({
      name: 'card_pastas_drive',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && criado_por = @request.auth.id",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'card',
          type: 'relation',
          required: true,
          collectionId: cardsId,
          maxSelect: 1,
          onDelete: 'Cascade',
        },
        { name: 'nome', type: 'text', required: true, max: 200 },
        { name: 'drive_file_id', type: 'text', required: true },
        { name: 'drive_url', type: 'text', required: true },
        { name: 'criado_por', type: 'relation', collectionId: usersId, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_card_pastas_drive_card ON card_pastas_drive (card)',
        'CREATE INDEX idx_card_pastas_drive_created ON card_pastas_drive (created DESC)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('card_pastas_drive')
      app.delete(col)
    } catch (_) {}
  },
)
