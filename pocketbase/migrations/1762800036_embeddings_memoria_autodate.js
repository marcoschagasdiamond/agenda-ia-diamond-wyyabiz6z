/// <reference path="../pb_data/types.d.ts" />
/**
 * 1762800036_embeddings_memoria_autodate.js — adiciona os campos autodate
 * created/updated à coleção embeddings_memoria (a migração 1762800034 os
 * omitiu): sem eles, qualquer filtro ou sort por "created" falha com
 * GoError: invalid sort field "created" — que quebrava o cron
 * embMemoriaBackfill (passos 1 e 2) e a coleta de candidatos na busca
 * semântica. Idempotente: só adiciona quando o campo não existe.
 */
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('embeddings_memoria')
    } catch (e) {
      return // coleção não existe — nada a fazer
    }

    let temCreated = false
    let temUpdated = false
    try {
      col.fields.forEach((f) => {
        if (f.name === 'created') temCreated = true
        if (f.name === 'updated') temUpdated = true
      })
    } catch (e2) {}

    let mudou = false
    if (!temCreated) {
      col.fields.add(
        new Field({ name: 'created', type: 'autodate', onCreate: true, onUpdate: false }),
      )
      mudou = true
    }
    if (!temUpdated) {
      col.fields.add(
        new Field({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }),
      )
      mudou = true
    }
    if (mudou) {
      app.save(col)
      console.log('[migração 1762800036] embeddings_memoria: created/updated adicionados.')
    }
  },
  (app) => {
    // down: nada — remover autodate de registros existentes destruiria dados
  },
)
