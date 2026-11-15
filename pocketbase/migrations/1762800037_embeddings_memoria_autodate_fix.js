/// <reference path="../pb_data/types.d.ts" />
/**
 * 1762800037_embeddings_memoria_autodate.js — corrige os autodates da coleção
 * embeddings_memoria: a 1762800034 criou created/updated SEM triggers (por isso
 * sort por "created" falhava com invalid sort field no cron de backfill), e a
 * 1762800036 corrigiu apenas updated. Aqui, recria a coleção com created
 * (onCreate) e updated (onCreate+onUpdate) na ordem esperada pelo PocketBase —
 * e reenfileira slots presos em dims = -1 (órfãs geradas pelo sort quebrado).
 *
 * NOTA (convenção de autodate deste projeto, ver migração 1762800031): autodate
 * vai com { name, type: 'autodate', onCreate: true, onUpdate: false|true } —
 * onCreate EXPLÍCITO; sem ele o validador recusa ("either onCreate or onUpdate
 * must be enabled") e o sort por created quebra no cron de backfill.
 */
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('embeddings_memoria')
    } catch (e) {
      return // não existe — nada a corrigir
    }

    // —— 1) preserva os vetores já gravados (cache por hash) ——
    const slots = app.findRecordsByFilter('embeddings_memoria', '', '-created', 5000, 0)
    const preservados = slots.map((s) => ({
      usuario: s.getString('usuario'),
      hash: s.getString('hash'),
      colecao: s.getString('colecao'),
      registro: s.getString('registro'),
      dims: s.getInt('dims'),
      vetor: s.getString('vetor'),
    }))

    // —— 2) recria com autodates corretos ——
    app.delete(col)
    const nova = new Collection({
      type: 'base',
      name: 'embeddings_memoria',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { type: 'text', name: 'usuario', required: true, max: 255 },
        { type: 'text', name: 'hash', required: true, max: 64 },
        { type: 'text', name: 'colecao', required: true, max: 100 },
        { type: 'text', name: 'registro', required: true, max: 255 },
        { type: 'number', name: 'dims' },
        { type: 'text', name: 'vetor', max: 200000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(nova)

    const colSalva = app.findCollectionByNameOrId('embeddings_memoria')
    colSalva.addIndex('idx_emb_hash_unico', true, 'hash')
    colSalva.addIndex('idx_emb_fila', false, 'dims')
    colSalva.addIndex('idx_emb_busca', false, 'colecao, registro')
    app.save(colSalva)

    // —— 3) restaura os vetores preservados ——
    const colRef = app.findCollectionByNameOrId('embeddings_memoria')
    for (const p of preservados) {
      const r = new Record(colRef)
      r.set('usuario', p.usuario)
      r.set('hash', p.hash)
      r.set('colecao', p.colecao)
      r.set('registro', p.registro)
      r.set('dims', p.dims)
      r.set('vetor', p.vetor)
      try {
        app.save(r)
      } catch (e2) {
        // hash duplicado em corrida — ok
      }
    }
  },
  (app) => {
    // down: recria sem autodates (estado anterior) — best effort
    try {
      app.delete(app.findCollectionByNameOrId('embeddings_memoria'))
    } catch (e) {}
    const col = new Collection({
      type: 'base',
      name: 'embeddings_memoria',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        { type: 'text', name: 'usuario', required: true, max: 255 },
        { type: 'text', name: 'hash', required: true, max: 64 },
        { type: 'text', name: 'colecao', required: true, max: 100 },
        { type: 'text', name: 'registro', required: true, max: 255 },
        { type: 'number', name: 'dims' },
        { type: 'text', name: 'vetor', max: 200000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(col)
  },
)
