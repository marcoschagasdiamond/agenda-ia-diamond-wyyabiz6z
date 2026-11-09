/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('convites_equipe')

    try {
      collection.fields.add(
        new BoolField({
          name: 'email_enviado',
          required: false,
        }),
      )
    } catch (_) {}

    try {
      collection.fields.add(
        new TextField({
          name: 'erro_envio',
          required: false,
        }),
      )
    } catch (_) {}

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('convites_equipe')
    try {
      collection.fields.removeByName('email_enviado')
    } catch (_) {}
    try {
      collection.fields.removeByName('erro_envio')
    } catch (_) {}
    app.save(collection)
  },
)
