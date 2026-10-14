/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0015:
 * 1. Cria a coleção `fluxos_kanban` (nome, cor, ordem, categoria relation -> categorias_fluxo, titulo_fases text, template_origem text).
 * 2. Adiciona o campo `fluxo_id` (relation -> fluxos_kanban) em `colunas_fluxo` (para associar as fases/colunas diretamente ao fluxo dono).
 * 3. Adiciona o campo `fluxo_id` (relation -> fluxos_kanban) em `cards` (para associar cards diretamente ao fluxo).
 * 4. Remove ou reatribui fases criadas soltas na árvore de categorias da 0.0.20:
 *    - Limpa colunas que eram tratadas como fluxos na árvore lateral se necessário.
 *    - Cria fluxos legítimos nas categorias (ex: "Fluxo Operacional", "Financeiro") e vincula as fases adequadas a eles.
 */
migrate(
  (app) => {
    const categoriasCol = app.findCollectionByNameOrId('categorias_fluxo')
    const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
    const cardsCol = app.findCollectionByNameOrId('cards')

    // 1. Criar colecao fluxos_kanban se não existir
    let fluxosCol
    try {
      fluxosCol = app.findCollectionByNameOrId('fluxos_kanban')
    } catch (_) {
      fluxosCol = new Collection({
        name: 'fluxos_kanban',
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
            name: 'categoria',
            type: 'relation',
            collectionId: categoriasCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'titulo_fases', type: 'text' },
          { name: 'template_origem', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_fluxos_kanban_ordem ON fluxos_kanban (ordem)'],
      })
      app.save(fluxosCol)
    }

    const fluxoColId = fluxosCol.id

    // 2. Adicionar campo `fluxo_id` em colunas_fluxo
    if (!colunasCol.fields.getByName('fluxo_id')) {
      colunasCol.fields.add(
        new RelationField({
          name: 'fluxo_id',
          collectionId: fluxoColId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(colunasCol)
    }

    // 3. Adicionar campo `fluxo_id` em cards
    if (!cardsCol.fields.getByName('fluxo_id')) {
      cardsCol.fields.add(
        new RelationField({
          name: 'fluxo_id',
          collectionId: fluxoColId,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
      app.save(cardsCol)
    }

    // 4. Seeding inicial de fluxos nas categorias e associação das fases existentes
    try {
      const categorias = app.findRecordsByFilter('categorias_fluxo', '', 'ordem', 10, 0)

      for (const cat of categorias) {
        // Verifica se a categoria já tem fluxos
        const fluxosExistentes = app.findRecordsByFilter(
          'fluxos_kanban',
          `categoria = "${cat.id}"`,
          'ordem',
          1,
          0,
        )

        let fluxoPrincipal = fluxosExistentes[0]

        if (!fluxoPrincipal) {
          // Cria o fluxo padrão para esta categoria
          const nomeFluxo = cat.getString('nome').toLowerCase().includes('finance')
            ? 'Operação Financeira'
            : 'Fluxo Operacional Diamond'

          fluxoPrincipal = new Record(fluxosCol)
          fluxoPrincipal.set('nome', nomeFluxo)
          fluxoPrincipal.set('categoria', cat.id)
          fluxoPrincipal.set('cor', cat.getString('cor') || '#0F766E')
          fluxoPrincipal.set('ordem', 1)
          fluxoPrincipal.set('template_origem', 'diamond_padrao')
          fluxoPrincipal.set('titulo_fases', 'Fases Operacionais')
          app.save(fluxoPrincipal)
        }

        // Associa todas as fases (colunas_fluxo) dessa categoria ao fluxo principal
        const colunasDaCat = app.findRecordsByFilter(
          'colunas_fluxo',
          `categoria = "${cat.id}"`,
          'ordem',
          0,
          0,
        )

        for (const col of colunasDaCat) {
          if (!col.getString('fluxo_id')) {
            col.set('fluxo_id', fluxoPrincipal.id)
            app.save(col)
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao semear fluxos e associar fases:', err)
    }
  },
  (app) => {
    try {
      const cardsCol = app.findCollectionByNameOrId('cards')
      if (cardsCol.fields.getByName('fluxo_id')) {
        cardsCol.fields.removeByName('fluxo_id')
        app.save(cardsCol)
      }
    } catch (_) {}

    try {
      const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
      if (colunasCol.fields.getByName('fluxo_id')) {
        colunasCol.fields.removeByName('fluxo_id')
        app.save(colunasCol)
      }
    } catch (_) {}

    try {
      const fluxosCol = app.findCollectionByNameOrId('fluxos_kanban')
      app.delete(fluxosCol)
    } catch (_) {}
  },
)
