// Cofre por Tese: campos Parceiro, Negócio e Germinação na semente.
// semente_parceiro / semente_negocio: texto livre (preenchidos no modal de
// arquivar, com sugestões de contatos/negócios existentes no app).
// semente_germinada + card_germinado_id: marcados pelo botão "Germinar" —
// a semente sai do cofre ativo e guarda o id do card criado (link /card/:id).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('folha_dia')
    if (!col.fields.getByName('semente_parceiro')) {
      col.fields.add(new TextField({ name: 'semente_parceiro', max: 200 }))
    }
    if (!col.fields.getByName('semente_negocio')) {
      col.fields.add(new TextField({ name: 'semente_negocio', max: 200 }))
    }
    if (!col.fields.getByName('semente_germinada')) {
      col.fields.add(new BoolField({ name: 'semente_germinada' }))
    }
    if (!col.fields.getByName('card_germinado_id')) {
      col.fields.add(new TextField({ name: 'card_germinado_id', max: 30 }))
    }
    col.addIndex('idx_folha_dia_germinada', false, 'semente_germinada', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('folha_dia')
    try {
      col.removeIndex('idx_folha_dia_germinada')
    } catch (_) {
      // índice pode não existir em bases antigas
    }
    ;['semente_parceiro', 'semente_negocio', 'semente_germinada', 'card_germinado_id'].forEach(
      (nome) => {
        try {
          const campo = col.fields.getByName(nome)
          if (campo) col.fields.remove(campo)
        } catch (_) {
          // campo já ausente — down idempotente
        }
      },
    )
    app.save(col)
  },
)
