/**
 * Migração 0034: Coleção feedback_teste
 * Permite que usuários e testadores enviem feedbacks (bugs, sugestões, ideias)
 * diretamente de dentro do aplicativo, com captura automática da tela de origem,
 * autor, licença da conta associada e gestão do ciclo de vida pelo Administrador Master.
 */
migrate(
  (app) => {
    let feedbackCol
    try {
      feedbackCol = app.findCollectionByNameOrId('feedback_teste')
    } catch (_) {
      let licencaColId = ''
      try {
        licencaColId = app.findCollectionByNameOrId('licencas_conta').id
      } catch (_) {}

      const fields = [
        { name: 'texto', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['bug', 'sugestao', 'ideia', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['novo', 'em_analise', 'resolvido'],
          maxSelect: 1,
        },
        {
          name: 'usuario',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'tela_origem', type: 'text' },
        { name: 'usuario_nome', type: 'text' },
        { name: 'usuario_email', type: 'email' },
        { name: 'resolvido_em', type: 'date' },
        { name: 'resolvido_por', type: 'text' },
        { name: 'resposta_master', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ]

      if (licencaColId) {
        fields.splice(4, 0, {
          name: 'conta',
          type: 'relation',
          collectionId: licencaColId,
          maxSelect: 1,
          cascadeDelete: false,
        })
      }

      feedbackCol = new Collection({
        name: 'feedback_teste',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: fields,
        indexes: ['CREATE INDEX idx_feedback_created ON feedback_teste (created DESC)'],
      })

      app.save(feedbackCol)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('feedback_teste')
      app.delete(col)
    } catch (_) {}
  },
)
