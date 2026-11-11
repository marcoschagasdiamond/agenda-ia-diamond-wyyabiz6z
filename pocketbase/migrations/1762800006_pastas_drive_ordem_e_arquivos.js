/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 1762800006 — Melhorias nas pastas do Google Drive.
 * 1) `card_pastas_drive` ganha campo `ordem` (número inteiro) para permitir
 *    reordenar os vínculos de pastas de um card; backfill sequencial por card
 *    (ordem de criação). Múltiplos vínculos por card já eram linhas
 *    independentes — nada substitui nada.
 * 2) Nova coleção `arquivos_pastas_drive`: pasta do Drive vinculada à área
 *    /arquivos (SEM card obrigatório, por isso não reutiliza card_pastas_drive):
 *    nome + drive_file_id + drive_url + criado_por.
 */
migrate(
  (app) => {
    // ---------- 1. card_pastas_drive: campo ordem + índice ----------
    const col = app.findCollectionByNameOrId('card_pastas_drive')
    if (!col.fields.getByName('ordem')) {
      col.fields.add(new NumberField({ name: 'ordem', onlyInt: true }))
    }
    col.addIndex('idx_card_pastas_drive_card_ordem', false, 'card, ordem', '')
    app.save(col)

    // Backfill: numera 0..n-1 por card, na ordem de criação (id desempata).
    app
      .db()
      .newQuery(
        `UPDATE card_pastas_drive SET ordem = (
          SELECT COUNT(*) FROM card_pastas_drive p2
          WHERE p2.card = card_pastas_drive.card
            AND (p2.created < card_pastas_drive.created
              OR (p2.created = card_pastas_drive.created AND p2.id <= card_pastas_drive.id))
        ) - 1`,
      )
      .execute()

    // ---------- 2. Nova coleção arquivos_pastas_drive (/arquivos) ----------
    if (!app.hasTable('arquivos_pastas_drive')) {
      const usersId = '_pb_users_auth_'

      const collection = new Collection({
        name: 'arquivos_pastas_drive',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && criado_por = @request.auth.id",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true, max: 200 },
          { name: 'drive_file_id', type: 'text', required: true },
          { name: 'drive_url', type: 'text', required: true },
          { name: 'criado_por', type: 'relation', collectionId: usersId, maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_arquivos_pastas_drive_criado ON arquivos_pastas_drive (criado_por)',
          'CREATE INDEX idx_arquivos_pastas_drive_created ON arquivos_pastas_drive (created DESC)',
        ],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('arquivos_pastas_drive')
      app.delete(col)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('card_pastas_drive')
      col.removeIndex('idx_card_pastas_drive_card_ordem')
      try {
        col.fields.removeByName('ordem')
      } catch (_) {}
      app.save(col)
    } catch (_) {}
  },
)
