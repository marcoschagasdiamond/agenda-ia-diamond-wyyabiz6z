/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0005: Adiciona suporte a data_hora, ordem, timeline, fluxo em folha_dia
 * e campos de vínculo projeto, contato e prioridade em demandas.
 */
migrate(
  (app) => {
    // 1. Atualizar folha_dia
    const folhaCol = app.findCollectionByNameOrId('folha_dia')

    if (!folhaCol.fields.getByName('data_hora')) {
      folhaCol.fields.add(
        new TextField({
          name: 'data_hora',
        }),
      )
    }

    if (!folhaCol.fields.getByName('ordem')) {
      folhaCol.fields.add(
        new NumberField({
          name: 'ordem',
          onlyInt: true,
        }),
      )
    }

    if (!folhaCol.fields.getByName('fluxo')) {
      folhaCol.fields.add(
        new SelectField({
          name: 'fluxo',
          values: ['novo', 'em_andamento', 'bloqueado', 'concluido'],
          maxSelect: 1,
        }),
      )
    }

    if (!folhaCol.fields.getByName('timeline')) {
      folhaCol.fields.add(
        new TextField({
          name: 'timeline',
        }),
      )
    }

    app.save(folhaCol)

    // 2. Atualizar demandas (permitir vínculos diretos de projeto, contato, prioridade)
    const demandasCol = app.findCollectionByNameOrId('demandas')
    const projetosId = app.findCollectionByNameOrId('projetos').id
    const contatosId = app.findCollectionByNameOrId('contatos').id

    if (!demandasCol.fields.getByName('projeto')) {
      demandasCol.fields.add(
        new RelationField({
          name: 'projeto',
          collectionId: projetosId,
          maxSelect: 1,
        }),
      )
    }

    if (!demandasCol.fields.getByName('contato')) {
      demandasCol.fields.add(
        new RelationField({
          name: 'contato',
          collectionId: contatosId,
          maxSelect: 1,
        }),
      )
    }

    if (!demandasCol.fields.getByName('prioridade')) {
      demandasCol.fields.add(
        new SelectField({
          name: 'prioridade',
          values: ['baixa', 'media', 'alta', 'urgente'],
          maxSelect: 1,
        }),
      )
    }

    if (!demandasCol.fields.getByName('timeline')) {
      demandasCol.fields.add(
        new TextField({
          name: 'timeline',
        }),
      )
    }

    app.save(demandasCol)
  },
  (app) => {
    const folhaCol = app.findCollectionByNameOrId('folha_dia')
    if (folhaCol.fields.getByName('data_hora')) folhaCol.fields.removeByName('data_hora')
    if (folhaCol.fields.getByName('ordem')) folhaCol.fields.removeByName('ordem')
    if (folhaCol.fields.getByName('fluxo')) folhaCol.fields.removeByName('fluxo')
    if (folhaCol.fields.getByName('timeline')) folhaCol.fields.removeByName('timeline')
    app.save(folhaCol)

    const demandasCol = app.findCollectionByNameOrId('demandas')
    if (demandasCol.fields.getByName('projeto')) demandasCol.fields.removeByName('projeto')
    if (demandasCol.fields.getByName('contato')) demandasCol.fields.removeByName('contato')
    if (demandasCol.fields.getByName('prioridade')) demandasCol.fields.removeByName('prioridade')
    if (demandasCol.fields.getByName('timeline')) demandasCol.fields.removeByName('timeline')
    app.save(demandasCol)
  },
)
