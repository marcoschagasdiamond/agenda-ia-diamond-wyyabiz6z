/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0013:
 * Adiciona o campo `titulo_fases` (text) em `colunas_fluxo` e em `categorias_fluxo`.
 * Permite que cada fluxo (coluna) e categoria defina um "nome das fases" próprio e
 * independente do título do fluxo ou nome da categoria.
 */
migrate(
  (app) => {
    // 1. Adicionar `titulo_fases` em `colunas_fluxo`
    const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
    if (!colunasCol.fields.getByName('titulo_fases')) {
      colunasCol.fields.add(
        new TextField({
          name: 'titulo_fases',
          required: false,
        }),
      )
      app.save(colunasCol)
    }

    // 2. Adicionar `titulo_fases` em `categorias_fluxo`
    const categoriasCol = app.findCollectionByNameOrId('categorias_fluxo')
    if (!categoriasCol.fields.getByName('titulo_fases')) {
      categoriasCol.fields.add(
        new TextField({
          name: 'titulo_fases',
          required: false,
        }),
      )
      app.save(categoriasCol)
    }
  },
  (app) => {
    try {
      const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
      const campo = colunasCol.fields.getByName('titulo_fases')
      if (campo) {
        colunasCol.fields.removeByName('titulo_fases')
        app.save(colunasCol)
      }
    } catch (_) {}

    try {
      const categoriasCol = app.findCollectionByNameOrId('categorias_fluxo')
      const campo = categoriasCol.fields.getByName('titulo_fases')
      if (campo) {
        categoriasCol.fields.removeByName('titulo_fases')
        app.save(categoriasCol)
      }
    } catch (_) {}
  },
)
