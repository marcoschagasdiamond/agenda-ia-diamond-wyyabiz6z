/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 1762800001 — Lembretes automáticos por evento da agenda.
 * Adiciona à coleção eventos_calendario:
 *  - lembrete_minutos_antes (number, vazio/0 = sem lembrete)
 *  - lembrete_enviado (bool, marca que o lembrete já foi despachado uma única vez)
 */
migrate(
  (app) => {
    try {
      const eventosCol = app.findCollectionByNameOrId('eventos_calendario')
      let saveEventos = false

      if (!eventosCol.fields.getByName('lembrete_minutos_antes')) {
        eventosCol.fields.add(
          new NumberField({
            name: 'lembrete_minutos_antes',
            required: false,
          }),
        )
        saveEventos = true
      }

      if (!eventosCol.fields.getByName('lembrete_enviado')) {
        eventosCol.fields.add(
          new BoolField({
            name: 'lembrete_enviado',
            required: false,
          }),
        )
        saveEventos = true
      }

      if (saveEventos) {
        app.save(eventosCol)
        console.log(
          'Campos de lembrete (lembrete_minutos_antes, lembrete_enviado) adicionados a eventos_calendario',
        )
      }
    } catch (e) {
      console.log('Erro ao adicionar campos de lembrete em eventos_calendario:', e)
    }
  },
  (app) => {
    try {
      const eventosCol = app.findCollectionByNameOrId('eventos_calendario')
      let saveEventos = false

      if (eventosCol.fields.getByName('lembrete_minutos_antes')) {
        eventosCol.fields.removeByName('lembrete_minutos_antes')
        saveEventos = true
      }
      if (eventosCol.fields.getByName('lembrete_enviado')) {
        eventosCol.fields.removeByName('lembrete_enviado')
        saveEventos = true
      }

      if (saveEventos) {
        app.save(eventosCol)
      }
    } catch (e) {
      console.log('Erro ao reverter campos de lembrete:', e)
    }
  },
)
