/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0025: Adiciona campos de arquivamento e fixação na coleção folha_dia
 * - arquivado (bool, default false)
 * - fixado (bool, default false)
 * - índices auxiliares e backfill para garantir valores consistentes
 */
migrate(
  (app) => {
    const folhaCol = app.findCollectionByNameOrId('folha_dia')

    if (!folhaCol.fields.getByName('arquivado')) {
      folhaCol.fields.add(
        new BoolField({
          name: 'arquivado',
        }),
      )
    }

    if (!folhaCol.fields.getByName('fixado')) {
      folhaCol.fields.add(
        new BoolField({
          name: 'fixado',
        }),
      )
    }

    folhaCol.addIndex('idx_folha_dia_arquivado', false, 'arquivado', '')
    folhaCol.addIndex('idx_folha_dia_fixado', false, 'fixado', '')

    app.save(folhaCol)

    // Backfill defensivo e idempotente: garantir que registros existentes não fiquem com null
    try {
      app.db().newQuery('UPDATE folha_dia SET arquivado = 0 WHERE arquivado IS NULL').execute()
      app.db().newQuery('UPDATE folha_dia SET fixado = 0 WHERE fixado IS NULL').execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const folhaCol = app.findCollectionByNameOrId('folha_dia')
      folhaCol.removeIndex('idx_folha_dia_arquivado')
      folhaCol.removeIndex('idx_folha_dia_fixado')
      if (folhaCol.fields.getByName('arquivado')) folhaCol.fields.removeByName('arquivado')
      if (folhaCol.fields.getByName('fixado')) folhaCol.fields.removeByName('fixado')
      app.save(folhaCol)
    } catch (_) {}
  },
)
