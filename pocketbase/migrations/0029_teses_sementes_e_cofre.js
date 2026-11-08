/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0029: Suporte ao Cofre por Tese para Sementes
 * - Criação da coleção 'teses_sementes' (nome, descricao, cor, ordem, created, updated)
 * - Adição do campo 'tese_semente' (relation -> teses_sementes) na coleção 'folha_dia'
 * - Índices de busca e ordenação
 */
migrate(
  (app) => {
    // 1. Criar coleção teses_sementes se não existir
    let tesesCol
    try {
      tesesCol = app.findCollectionByNameOrId('teses_sementes')
    } catch (_) {
      tesesCol = new Collection({
        name: 'teses_sementes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'cor', type: 'text' },
          { name: 'ordem', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_teses_sementes_nome ON teses_sementes (nome)',
          'CREATE INDEX idx_teses_sementes_ordem ON teses_sementes (ordem)',
        ],
      })
      app.save(tesesCol)
    }

    // 2. Adicionar relation tese_semente na coleção folha_dia
    const folhaCol = app.findCollectionByNameOrId('folha_dia')
    const teseColId = tesesCol.id

    if (!folhaCol.fields.getByName('tese_semente')) {
      folhaCol.fields.add(
        new RelationField({
          name: 'tese_semente',
          collectionId: teseColId,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      folhaCol.addIndex('idx_folha_dia_tese_semente', false, 'tese_semente', '')
      app.save(folhaCol)
    }
  },
  (app) => {
    try {
      const folhaCol = app.findCollectionByNameOrId('folha_dia')
      folhaCol.removeIndex('idx_folha_dia_tese_semente')
      if (folhaCol.fields.getByName('tese_semente')) {
        folhaCol.fields.removeByName('tese_semente')
      }
      app.save(folhaCol)
    } catch (_) {}

    try {
      const tesesCol = app.findCollectionByNameOrId('teses_sementes')
      app.delete(tesesCol)
    } catch (_) {}
  },
)
