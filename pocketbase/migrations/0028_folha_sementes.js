/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0028: Adiciona suporte ao estado 'Semente' na Folha do Dia e Radar de Reativação
 * - estado_semente (bool, default false)
 * - condicao_reativacao (text, opcional)
 * - data_revisao_semente (date, opcional)
 * - reativada_em (date, opcional)
 * - semente_origem_id (text, opcional, para linkar alerta de radar à semente original)
 * - indices auxiliares e backfill defensivo
 */
migrate(
  (app) => {
    const folhaCol = app.findCollectionByNameOrId('folha_dia')

    if (!folhaCol.fields.getByName('estado_semente')) {
      folhaCol.fields.add(
        new BoolField({
          name: 'estado_semente',
        }),
      )
    }

    if (!folhaCol.fields.getByName('condicao_reativacao')) {
      folhaCol.fields.add(
        new TextField({
          name: 'condicao_reativacao',
        }),
      )
    }

    if (!folhaCol.fields.getByName('data_revisao_semente')) {
      folhaCol.fields.add(
        new DateField({
          name: 'data_revisao_semente',
        }),
      )
    }

    if (!folhaCol.fields.getByName('reativada_em')) {
      folhaCol.fields.add(
        new DateField({
          name: 'reativada_em',
        }),
      )
    }

    if (!folhaCol.fields.getByName('semente_origem_id')) {
      folhaCol.fields.add(
        new TextField({
          name: 'semente_origem_id',
        }),
      )
    }

    folhaCol.addIndex('idx_folha_dia_estado_semente', false, 'estado_semente', '')
    folhaCol.addIndex('idx_folha_dia_data_revisao_semente', false, 'data_revisao_semente', '')

    app.save(folhaCol)

    // Backfill defensivo e idempotente
    try {
      app
        .db()
        .newQuery('UPDATE folha_dia SET estado_semente = 0 WHERE estado_semente IS NULL')
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const folhaCol = app.findCollectionByNameOrId('folha_dia')
      folhaCol.removeIndex('idx_folha_dia_estado_semente')
      folhaCol.removeIndex('idx_folha_dia_data_revisao_semente')
      if (folhaCol.fields.getByName('estado_semente'))
        folhaCol.fields.removeByName('estado_semente')
      if (folhaCol.fields.getByName('condicao_reativacao'))
        folhaCol.fields.removeByName('condicao_reativacao')
      if (folhaCol.fields.getByName('data_revisao_semente'))
        folhaCol.fields.removeByName('data_revisao_semente')
      if (folhaCol.fields.getByName('reativada_em')) folhaCol.fields.removeByName('reativada_em')
      if (folhaCol.fields.getByName('semente_origem_id'))
        folhaCol.fields.removeByName('semente_origem_id')
      app.save(folhaCol)
    } catch (_) {}
  },
)
