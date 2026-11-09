/**
 * Migração 0033: Adicionar campo conta_teste na coleção licencas_conta
 * Permite que o Master marque uma conta como "Conta de Teste"
 * para liberar os recursos do sistema sem cobrar, exibindo os botões
 * de pagamento de forma desabilitada com aviso de teste.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('licencas_conta')
    if (!col.fields.getByName('conta_teste')) {
      col.fields.add(
        new BoolField({
          name: 'conta_teste',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('licencas_conta')
      const field = col.fields.getByName('conta_teste')
      if (field) {
        col.fields.removeByName('conta_teste')
        app.save(col)
      }
    } catch (_) {}
  },
)
