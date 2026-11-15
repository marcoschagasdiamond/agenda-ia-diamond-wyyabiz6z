/// <reference path="../pb_data/types.d.ts" />
/**
 * 1762800034_embeddings_memoria.js — coleção embeddings_memoria:
 * cache de vetores (hash → vetor), com fila implícita (dims = 0 → pendente,
 * -1 → órfão/sem conteúdo, >0 → embutido). Vetor guardado como JSON string.
 */
migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('embeddings_memoria')
      return // já existe — idempotente
    } catch (e) {
      // não existe ainda — criar
    }

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
      ],
    })

    app.save(col)

    const colSalva = app.findCollectionByNameOrId('embeddings_memoria')
    colSalva.addIndex('idx_emb_hash_unico', true, 'hash')
    colSalva.addIndex('idx_emb_fila', false, 'dims')
    colSalva.addIndex('idx_emb_busca', false, 'colecao, registro')
    app.save(colSalva)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('embeddings_memoria')
      app.delete(col)
    } catch (e) {
      // já não existe — ok
    }
  },
)
