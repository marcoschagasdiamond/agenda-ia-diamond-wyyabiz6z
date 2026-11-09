/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const eventosCol = app.findCollectionByNameOrId('eventos_calendario')
      let saveEventos = false

      if (!eventosCol.fields.getByName('link_reuniao')) {
        eventosCol.fields.add(
          new TextField({
            name: 'link_reuniao',
            required: false,
          }),
        )
        saveEventos = true
      }

      if (!eventosCol.fields.getByName('transcricao')) {
        eventosCol.fields.add(
          new TextField({
            name: 'transcricao',
            required: false,
          }),
        )
        saveEventos = true
      }

      if (!eventosCol.fields.getByName('resumo')) {
        eventosCol.fields.add(
          new TextField({
            name: 'resumo',
            required: false,
          }),
        )
        saveEventos = true
      }

      if (!eventosCol.fields.getByName('decisoes')) {
        eventosCol.fields.add(
          new JSONField({
            name: 'decisoes',
            required: false,
          }),
        )
        saveEventos = true
      }

      if (!eventosCol.fields.getByName('proximos_passos')) {
        eventosCol.fields.add(
          new JSONField({
            name: 'proximos_passos',
            required: false,
          }),
        )
        saveEventos = true
      }

      if (!eventosCol.fields.getByName('folha_origem')) {
        try {
          const folhaCol = app.findCollectionByNameOrId('folha_dia')
          if (folhaCol) {
            eventosCol.fields.add(
              new RelationField({
                name: 'folha_origem',
                collectionId: folhaCol.id,
                cascadeDelete: false,
                maxSelect: 1,
                required: false,
              }),
            )
            saveEventos = true
          }
        } catch (colErr) {
          console.log('Coleção folha_dia não encontrada para relation:', colErr)
        }
      }

      if (saveEventos) {
        app.save(eventosCol)
        console.log('Campos de reunião adicionados com sucesso à coleção eventos_calendario')
      }
    } catch (e) {
      console.log('Erro ou coleção não encontrada para campos de reunião:', e)
    }
  },
  (app) => {
    try {
      const eventosCol = app.findCollectionByNameOrId('eventos_calendario')
      let saveEventos = false

      const campos = [
        'link_reuniao',
        'transcricao',
        'resumo',
        'decisoes',
        'proximos_passos',
        'folha_origem',
      ]
      for (const campo of campos) {
        const f = eventosCol.fields.getByName(campo)
        if (f) {
          eventosCol.fields.removeByName(campo)
          saveEventos = true
        }
      }

      if (saveEventos) {
        app.save(eventosCol)
      }
    } catch (e) {
      console.log('Erro ao reverter campos de reunião:', e)
    }
  },
)
