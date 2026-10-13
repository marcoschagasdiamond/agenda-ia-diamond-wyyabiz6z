/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0011:
 * Converte `cards.status` e `folha_dia.fluxo` de select restrito para text livre.
 * Isso permite que qualquer fluxo/coluna personalizada criada pelo usuário
 * (ex: 'combustivel', 'em_analise', ou novos fluxos) possa ser atribuída aos cards
 * e registros da folha sem erros de validação de valor de select.
 */
migrate(
  (app) => {
    // 1. Atualizar cards.status para text
    const cardsCol = app.findCollectionByNameOrId('cards')
    if (cardsCol.fields.getByName('status')) {
      cardsCol.fields.removeByName('status')
    }
    cardsCol.fields.add(
      new TextField({
        name: 'status',
        required: false,
      }),
    )
    app.save(cardsCol)

    // 2. Atualizar folha_dia.fluxo para text
    const folhaCol = app.findCollectionByNameOrId('folha_dia')
    if (folhaCol.fields.getByName('fluxo')) {
      folhaCol.fields.removeByName('fluxo')
    }
    folhaCol.fields.add(
      new TextField({
        name: 'fluxo',
        required: false,
      }),
    )
    app.save(folhaCol)
  },
  () => {
    // Reversão defensiva
  },
)
