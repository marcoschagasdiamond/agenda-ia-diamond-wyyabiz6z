/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Coleção config_email (configuração global gerenciada pelo Master no /master)
    try {
      app.findCollectionByNameOrId('config_email')
    } catch (_) {
      const colSistema = new Collection({
        name: 'config_email',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'remetente_nome', type: 'text', required: false },
          { name: 'remetente_email', type: 'text', required: false },
          { name: 'assunto_convite', type: 'text', required: false },
          { name: 'titulo_cabecalho', type: 'text', required: false },
          { name: 'subtitulo_cabecalho', type: 'text', required: false },
          { name: 'texto_apresentacao', type: 'text', required: false },
          { name: 'texto_botao_aceite', type: 'text', required: false },
          { name: 'cor_primaria', type: 'text', required: false },
          { name: 'cor_cabecalho', type: 'text', required: false },
          { name: 'texto_rodape', type: 'text', required: false },
          // Templates para notificações
          { name: 'assunto_notificacao', type: 'text', required: false },
          { name: 'texto_notificacao', type: 'text', required: false },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(colSistema)

      // Semear registro padrão se ainda não existir
      const defaultRecord = new Record(colSistema)
      defaultRecord.set('remetente_nome', 'Agenda IA Diamond')
      defaultRecord.set('remetente_email', 'onboarding@resend.dev')
      defaultRecord.set(
        'assunto_convite',
        'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond',
      )
      defaultRecord.set('titulo_cabecalho', 'AGENDA IA DIAMOND')
      defaultRecord.set('subtitulo_cabecalho', 'Gestão Estratégica & Segundo Cérebro Executivo')
      defaultRecord.set(
        'texto_apresentacao',
        'convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.',
      )
      defaultRecord.set('texto_botao_aceite', 'Aceitar Convite e Acessar')
      defaultRecord.set('cor_primaria', '#0F766E')
      defaultRecord.set('cor_cabecalho', '#1A1D21')
      defaultRecord.set(
        'texto_rodape',
        'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.',
      )
      defaultRecord.set('assunto_notificacao', 'Notificação Diamond: {titulo}')
      defaultRecord.set(
        'texto_notificacao',
        'Você possui uma nova atualização importante no seu workspace Agenda IA Diamond.',
      )
      defaultRecord.set('ativo', true)
      app.save(defaultRecord)
    }

    // 2. Coleção config_email_usuario (configuração por usuário comum em /config)
    try {
      app.findCollectionByNameOrId('config_email_usuario')
    } catch (_) {
      const colUsuario = new Collection({
        name: 'config_email_usuario',
        type: 'base',
        listRule: "@request.auth.id != '' && usuario = @request.auth.id",
        viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
        createRule: "@request.auth.id != '' && @request.body.usuario = @request.auth.id",
        updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
        deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'mensagem_personalizada_convite', type: 'text', required: false },
          { name: 'remetente_nome_preferido', type: 'text', required: false },
          { name: 'usar_resend_proprio', type: 'bool', required: false },
          { name: 'ultimo_teste_em', type: 'text', required: false },
          { name: 'ultimo_status_teste', type: 'text', required: false },
          { name: 'ultimo_erro_teste', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_cfg_email_user ON config_email_usuario (usuario)'],
      })
      app.save(colUsuario)
    }
  },
  (app) => {
    try {
      const col1 = app.findCollectionByNameOrId('config_email_usuario')
      app.delete(col1)
    } catch (_) {}
    try {
      const col2 = app.findCollectionByNameOrId('config_email')
      app.delete(col2)
    } catch (_) {}
  },
)
