/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0008:
 * Hierarquia de 3 níveis para o Fluxo Kanban:
 * 1. Cria coleção `categorias_fluxo` (nome, ordem, cor)
 * 2. Adiciona relação `categoria` em `colunas_fluxo` -> `categorias_fluxo`
 * 3. Cria coleção `grupos_familia` (nome, ordem, cor, coluna, categoria)
 * 4. Adiciona relação `grupo_familia` em `cards` -> `grupos_familia`
 * 5. Seed: cria categoria padrão "Padrão / Geral" e vincula colunas existentes a ela
 */
migrate(
  (app) => {
    // 1. Criar colecao categorias_fluxo
    const categoriasCol = new Collection({
      name: 'categorias_fluxo',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'ordem', type: 'number', onlyInt: true },
        { name: 'cor', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_categorias_fluxo_ordem ON categorias_fluxo (ordem)'],
    })
    app.save(categoriasCol)

    const catId = categoriasCol.id

    // Seed: categoria inicial padrão
    const catPadrao = new Record(categoriasCol)
    catPadrao.set('nome', 'Geral')
    catPadrao.set('ordem', 1)
    catPadrao.set('cor', '#0F766E')
    catPadrao.set('descricao', 'Fluxos gerais de demandas e projetos')
    app.save(catPadrao)

    // 2. Adicionar relação `categoria` em colunas_fluxo
    const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
    if (!colunasCol.fields.getByName('categoria')) {
      colunasCol.fields.add(
        new RelationField({
          name: 'categoria',
          collectionId: catId,
          maxSelect: 1,
        }),
      )
      app.save(colunasCol)
    }

    // Vincular colunas existentes à categoria padrão
    const todasColunas = app.findRecordsByFilter('colunas_fluxo', '', 'ordem', 0, 0)
    for (const c of todasColunas) {
      if (!c.getString('categoria')) {
        c.set('categoria', catPadrao.id)
        app.save(c)
      }
    }

    // 3. Criar colecao grupos_familia
    const gruposFamiliaCol = new Collection({
      name: 'grupos_familia',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'ordem', type: 'number', onlyInt: true },
        { name: 'cor', type: 'text' },
        {
          name: 'coluna',
          type: 'relation',
          collectionId: colunasCol.id,
          maxSelect: 1,
        },
        {
          name: 'categoria',
          type: 'relation',
          collectionId: catId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_grupos_familia_coluna ON grupos_familia (coluna)',
        'CREATE INDEX idx_grupos_familia_categoria ON grupos_familia (categoria)',
      ],
    })
    app.save(gruposFamiliaCol)

    // 4. Adicionar relação `grupo_familia` em cards
    const cardsCol = app.findCollectionByNameOrId('cards')
    if (!cardsCol.fields.getByName('grupo_familia')) {
      cardsCol.fields.add(
        new RelationField({
          name: 'grupo_familia',
          collectionId: gruposFamiliaCol.id,
          maxSelect: 1,
        }),
      )
      app.save(cardsCol)
    }
  },
  (app) => {
    // Reverter adições
    try {
      const cardsCol = app.findCollectionByNameOrId('cards')
      const gf = cardsCol.fields.getByName('grupo_familia')
      if (gf) {
        cardsCol.fields.removeByName('grupo_familia')
        app.save(cardsCol)
      }
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('grupos_familia')
      app.delete(col)
    } catch (_) {}

    try {
      const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
      const catField = colunasCol.fields.getByName('categoria')
      if (catField) {
        colunasCol.fields.removeByName('categoria')
        app.save(colunasCol)
      }
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('categorias_fluxo')
      app.delete(col)
    } catch (_) {}
  },
)
