/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0004b: estende a coleção existente resumos_dia com os campos do
 * Resumo Automático do Dia da Diamantina (sugestões de conversão em card,
 * auditoria de geração e mensagem de dia em branco). Idempotente.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('resumos_dia')

    if (!col.fields.getByName('sugestoes_cards')) {
      col.fields.add(
        new JSONField({
          name: 'sugestoes_cards',
          maxSize: 2000000,
        }),
      )
    }

    if (!col.fields.getByName('gerado_por')) {
      col.fields.add(
        new TextField({
          name: 'gerado_por',
        }),
      )
    }

    if (!col.fields.getByName('total_registros')) {
      col.fields.add(
        new NumberField({
          name: 'total_registros',
          onlyInt: true,
        }),
      )
    }

    if (!col.fields.getByName('mensagem_sem_registros')) {
      col.fields.add(
        new TextField({
          name: 'mensagem_sem_registros',
        }),
      )
    }

    if (!col.fields.getByName('updated_manual')) {
      col.fields.add(
        new TextField({
          name: 'updated_manual',
        }),
      )
    }

    // Índice único por data: garante idempotência (um resumo por dia)
    const idxUnicoData =
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_resumos_dia_data ON resumos_dia (data)'
    try {
      app.runCommand(idxUnicoData)
    } catch (_) {}

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('resumos_dia')
    for (const nome of [
      'sugestoes_cards',
      'gerado_por',
      'total_registros',
      'mensagem_sem_registros',
      'updated_manual',
    ]) {
      if (col.fields.getByName(nome)) col.fields.removeByName(nome)
    }
    app.save(col)
  },
)
