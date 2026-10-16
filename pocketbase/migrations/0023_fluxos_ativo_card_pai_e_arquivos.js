/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0023:
 * 1. Adiciona o campo `ativo` (bool, default true) na coleção `fluxos_kanban`.
 *    - Permite inativar fluxos, ocultando-os de listagens de vínculo mas preservando histórico.
 * 2. Adiciona o campo `card_pai` (relation -> cards) na coleção `cards`.
 *    - Suporte a hierarquia de subtarefas / cards filhos e vínculo com card pai.
 * 3. Cria a coleção `card_arquivos`:
 *    - card (relation -> cards, obrigatório, cascadeDelete: true)
 *    - nome (text, obrigatório)
 *    - arquivo (file)
 *    - tamanho (number)
 *    - tipo (text)
 *    - criado_por (relation -> users)
 *    - created / updated (autodate)
 * 4. Backfill idempotente: garante que fluxos existentes fiquem com `ativo = true`.
 */
migrate(
  (app) => {
    const cardsCol = app.findCollectionByNameOrId('cards')
    const fluxosCol = app.findCollectionByNameOrId('fluxos_kanban')
    const usersColId = '_pb_users_auth_'

    // 1. Adicionar campo `ativo` em `fluxos_kanban`
    if (!fluxosCol.fields.getByName('ativo')) {
      fluxosCol.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
      app.save(fluxosCol)
    }

    // 2. Adicionar campo `card_pai` em `cards`
    if (!cardsCol.fields.getByName('card_pai')) {
      cardsCol.fields.add(
        new RelationField({
          name: 'card_pai',
          collectionId: cardsCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(cardsCol)
    }

    // 3. Criar coleção `card_arquivos` se não existir
    let cardArquivosCol
    try {
      cardArquivosCol = app.findCollectionByNameOrId('card_arquivos')
    } catch (_) {
      cardArquivosCol = new Collection({
        name: 'card_arquivos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'card',
            type: 'relation',
            collectionId: cardsCol.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'nome', type: 'text', required: true },
          {
            name: 'arquivo',
            type: 'file',
            maxSelect: 1,
            maxSize: 52428800, // 50MB
          },
          { name: 'tamanho', type: 'number' },
          { name: 'tipo', type: 'text' },
          {
            name: 'criado_por',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_card_arquivos_card ON card_arquivos (card)',
          'CREATE INDEX idx_card_arquivos_created ON card_arquivos (created DESC)',
        ],
      })
      app.save(cardArquivosCol)
    }

    // 4. Backfill: garantir que todos os fluxos_kanban existentes tenham `ativo = true`
    try {
      app
        .db()
        .newQuery("UPDATE fluxos_kanban SET ativo = 1 WHERE ativo IS NULL OR ativo = ''")
        .execute()
    } catch (e) {
      console.log('Aviso ao aplicar backfill em fluxos_kanban:', e)
    }
  },
  (app) => {
    try {
      const cardArquivosCol = app.findCollectionByNameOrId('card_arquivos')
      app.delete(cardArquivosCol)
    } catch (_) {}

    try {
      const cardsCol = app.findCollectionByNameOrId('cards')
      if (cardsCol.fields.getByName('card_pai')) {
        cardsCol.fields.removeByName('card_pai')
        app.save(cardsCol)
      }
    } catch (_) {}

    try {
      const fluxosCol = app.findCollectionByNameOrId('fluxos_kanban')
      if (fluxosCol.fields.getByName('ativo')) {
        fluxosCol.fields.removeByName('ativo')
        app.save(fluxosCol)
      }
    } catch (_) {}
  },
)
