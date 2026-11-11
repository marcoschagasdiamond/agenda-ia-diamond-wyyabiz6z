/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 1762800007 — Regras da coleção `card_pastas_drive`.
 * updateRule passava a exigir criado_por = @request.auth.id, o que impede
 * renomear/reordenar vínculos criados por outro membro da equipe (ou sem
 * criado_por). A partir de agora qualquer usuário autenticado do app pode
 * renomear o apelido e trocar a ordem das pastas do card.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('card_pastas_drive')
    col.updateRule = "@request.auth.id != ''"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('card_pastas_drive')
    col.updateRule = "@request.auth.id != '' && criado_por = @request.auth.id"
    app.save(col)
  },
)
