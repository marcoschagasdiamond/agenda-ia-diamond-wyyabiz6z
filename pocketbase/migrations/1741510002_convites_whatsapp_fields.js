/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('convites_equipe')

    try {
      collection.fields.add(
        new TextField({
          name: 'telefone',
          required: false,
        }),
      )
    } catch (_) {}

    try {
      collection.fields.add(
        new BoolField({
          name: 'whatsapp_enviado',
          required: false,
        }),
      )
    } catch (_) {}

    try {
      collection.fields.add(
        new TextField({
          name: 'whatsapp_erro',
          required: false,
        }),
      )
    } catch (_) {}

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('convites_equipe')
    try {
      collection.fields.removeByName('telefone')
    } catch (_) {}
    try {
      collection.fields.removeByName('whatsapp_enviado')
    } catch (_) {}
    try {
      collection.fields.removeByName('whatsapp_erro')
    } catch (_) {}
    app.save(collection)
  },
)
