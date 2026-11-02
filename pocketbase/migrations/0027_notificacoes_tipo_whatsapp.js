migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('notificacoes_sistema')
    const tipoField = col.fields.getByName('tipo')
    if (tipoField) {
      tipoField.values = ['reuniao', 'tarefa', 'atraso', 'sistema', 'whatsapp']
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('notificacoes_sistema')
      const tipoField = col.fields.getByName('tipo')
      if (tipoField) {
        tipoField.values = ['reuniao', 'tarefa', 'atraso', 'sistema']
        app.save(col)
      }
    } catch (_) {}
  },
)
