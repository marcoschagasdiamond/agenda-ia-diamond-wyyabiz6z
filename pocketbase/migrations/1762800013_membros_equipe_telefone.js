/**
 * Campo telefone em membros_equipe — número WhatsApp do colaborador,
 * usado pelo Chat interno para envio real pelo conector WhatsApp.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('membros_equipe')
    if (col.fields.getByName('telefone')) return
    col.fields.add(new TextField({ name: 'telefone' }))
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('membros_equipe')
      if (col.fields.getByName('telefone')) {
        col.fields.removeByName('telefone')
        app.save(col)
      }
    } catch (_) {}
  },
)
