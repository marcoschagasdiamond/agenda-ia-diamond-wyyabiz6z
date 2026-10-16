/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0022: Sistema de Lembretes & Avisos Automáticos
 * 1. Coleção 'configuracoes_lembretes': preferências do usuário para reuniões e tarefas/demandas
 *    - antecedencias_reunioes (json array, ex: ["15m", "30m", "1h", "2h", "1d", "1w"])
 *    - antecedencias_tarefas (json array, ex: ["1h", "1d", "2d", "1w"])
 *    - email_reunioes_ativo (bool)
 *    - sino_reunioes_ativo (bool)
 *    - email_tarefas_ativo (bool)
 *    - sino_tarefas_ativo (bool)
 *    - avisar_atrasos_tarefas (bool)
 * 2. Coleção 'notificacoes_sistema': histórico de avisos para a central do sino
 *    - usuario (relation users)
 *    - tipo (select: reuniao, tarefa, atraso, sistema)
 *    - titulo (text)
 *    - mensagem (text)
 *    - link (text)
 *    - item_tipo (text: evento, demanda, card)
 *    - item_id (text)
 *    - lida (bool)
 *    - lida_em (text)
 * 3. Coleção 'historico_lembretes_disparados': chave de idempotência para nunca duplicar envios
 *    - chave_disparo (text único: ex. evento_123_reuniao_1h, demanda_456_tarefa_1d, demanda_456_atraso)
 *    - item_tipo (text)
 *    - item_id (text)
 *    - tipo_lembrete (text)
 *    - antecedencia (text)
 *    - disparado_em (text)
 *    - email_enviado (bool)
 *    - sino_criado (bool)
 * 4. Adiciona campos de antecedência individual em eventos_calendario, demandas e cards:
 *    - lembrete_modo (select: "padrao" | "personalizado" | "desativado")
 *    - lembrete_antecedencias (json array de strings de antecedência customizada)
 * 5. Seed inicial de configuração padrão para o usuário administrador
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'

    // 1. Coleção configuracoes_lembretes
    let cfgCol
    try {
      cfgCol = app.findCollectionByNameOrId('configuracoes_lembretes')
    } catch (_) {
      cfgCol = new Collection({
        name: 'configuracoes_lembretes',
        type: 'base',
        listRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        viewRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        deleteRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'antecedencias_reunioes', type: 'json' },
          { name: 'antecedencias_tarefas', type: 'json' },
          { name: 'email_reunioes_ativo', type: 'bool' },
          { name: 'sino_reunioes_ativo', type: 'bool' },
          { name: 'email_tarefas_ativo', type: 'bool' },
          { name: 'sino_tarefas_ativo', type: 'bool' },
          { name: 'avisar_atrasos_tarefas', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_cfg_lembretes_user ON configuracoes_lembretes (usuario)'],
      })
      app.save(cfgCol)
    }

    // 2. Coleção notificacoes_sistema
    let notifCol
    try {
      notifCol = app.findCollectionByNameOrId('notificacoes_sistema')
    } catch (_) {
      notifCol = new Collection({
        name: 'notificacoes_sistema',
        type: 'base',
        listRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        viewRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        deleteRule: "@request.auth.id != '' && (usuario = @request.auth.id || usuario = '')",
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'tipo',
            type: 'select',
            values: ['reuniao', 'tarefa', 'atraso', 'sistema'],
            maxSelect: 1,
          },
          { name: 'titulo', type: 'text', required: true },
          { name: 'mensagem', type: 'text' },
          { name: 'link', type: 'text' },
          { name: 'item_tipo', type: 'text' },
          { name: 'item_id', type: 'text' },
          { name: 'lida', type: 'bool' },
          { name: 'lida_em', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_notif_user ON notificacoes_sistema (usuario)',
          'CREATE INDEX idx_notif_lida ON notificacoes_sistema (lida)',
          'CREATE INDEX idx_notif_created ON notificacoes_sistema (created DESC)',
        ],
      })
      app.save(notifCol)
    }

    // 3. Coleção historico_lembretes_disparados
    let histCol
    try {
      histCol = app.findCollectionByNameOrId('historico_lembretes_disparados')
    } catch (_) {
      histCol = new Collection({
        name: 'historico_lembretes_disparados',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'chave_disparo', type: 'text', required: true },
          { name: 'item_tipo', type: 'text' },
          { name: 'item_id', type: 'text' },
          { name: 'tipo_lembrete', type: 'text' },
          { name: 'antecedencia', type: 'text' },
          { name: 'disparado_em', type: 'text' },
          { name: 'email_enviado', type: 'bool' },
          { name: 'sino_criado', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_hist_lembrete_chave ON historico_lembretes_disparados (chave_disparo)',
        ],
      })
      app.save(histCol)
    }

    // 4. Campos opcionais em eventos_calendario para lembrete individual
    try {
      const eventosCol = app.findCollectionByNameOrId('eventos_calendario')
      let saveEventos = false
      if (!eventosCol.fields.getByName('lembrete_modo')) {
        eventosCol.fields.add(
          new SelectField({
            name: 'lembrete_modo',
            values: ['padrao', 'personalizado', 'desativado'],
            maxSelect: 1,
          }),
        )
        saveEventos = true
      }
      if (!eventosCol.fields.getByName('lembrete_antecedencias')) {
        eventosCol.fields.add(
          new JSONField({
            name: 'lembrete_antecedencias',
          }),
        )
        saveEventos = true
      }
      if (saveEventos) {
        app.save(eventosCol)
      }
    } catch (e) {
      console.log('Aviso ao adicionar campos em eventos_calendario:', e)
    }

    // 5. Campos opcionais em demandas para lembrete individual
    try {
      const demandasCol = app.findCollectionByNameOrId('demandas')
      let saveDemandas = false
      if (!demandasCol.fields.getByName('lembrete_modo')) {
        demandasCol.fields.add(
          new SelectField({
            name: 'lembrete_modo',
            values: ['padrao', 'personalizado', 'desativado'],
            maxSelect: 1,
          }),
        )
        saveDemandas = true
      }
      if (!demandasCol.fields.getByName('lembrete_antecedencias')) {
        demandasCol.fields.add(
          new JSONField({
            name: 'lembrete_antecedencias',
          }),
        )
        saveDemandas = true
      }
      if (saveDemandas) {
        app.save(demandasCol)
      }
    } catch (e) {
      console.log('Aviso ao adicionar campos em demandas:', e)
    }

    // 6. Campos opcionais em cards para lembrete individual
    try {
      const cardsCol = app.findCollectionByNameOrId('cards')
      let saveCards = false
      if (!cardsCol.fields.getByName('lembrete_modo')) {
        cardsCol.fields.add(
          new SelectField({
            name: 'lembrete_modo',
            values: ['padrao', 'personalizado', 'desativado'],
            maxSelect: 1,
          }),
        )
        saveCards = true
      }
      if (!cardsCol.fields.getByName('lembrete_antecedencias')) {
        cardsCol.fields.add(
          new JSONField({
            name: 'lembrete_antecedencias',
          }),
        )
        saveCards = true
      }
      if (saveCards) {
        app.save(cardsCol)
      }
    } catch (e) {
      console.log('Aviso ao adicionar campos em cards:', e)
    }

    // 7. Seed inicial de configuração padrão para o administrador (e geral)
    try {
      let adminId = ''
      try {
        const adminUser = app.findAuthRecordByEmail(
          '_pb_users_auth_',
          'marcoschagasdiamond@icloud.com',
        )
        adminId = adminUser.id
      } catch (_) {}

      const cfgColRef = app.findCollectionByNameOrId('configuracoes_lembretes')
      let existe = false
      if (adminId) {
        try {
          app.findFirstRecordByData('configuracoes_lembretes', 'usuario', adminId)
          existe = true
        } catch (_) {}
      }

      if (!existe) {
        const seedRec = new Record(cfgColRef)
        if (adminId) {
          seedRec.set('usuario', adminId)
        }
        // Antecedências padrão do usuário: 15min, 1h, 1d para reuniões; 1d, 2d para tarefas
        seedRec.set('antecedencias_reunioes', JSON.stringify(['15m', '1h', '1d']))
        seedRec.set('antecedencias_tarefas', JSON.stringify(['1h', '1d']))
        seedRec.set('email_reunioes_ativo', true)
        seedRec.set('sino_reunioes_ativo', true)
        seedRec.set('email_tarefas_ativo', true)
        seedRec.set('sino_tarefas_ativo', true)
        seedRec.set('avisar_atrasos_tarefas', true)
        app.save(seedRec)
      }

      // Seed de 2 notificações demonstrativas no sino
      const notifColRef = app.findCollectionByNameOrId('notificacoes_sistema')
      const count = app.countRecords('notificacoes_sistema')
      if (count === 0) {
        const n1 = new Record(notifColRef)
        if (adminId) n1.set('usuario', adminId)
        n1.set('tipo', 'reuniao')
        n1.set('titulo', 'Lembrete de Reunião: Alinhamento de Estratégia')
        n1.set('mensagem', 'Sua reunião está agendada para hoje. Verifique a pauta no calendário.')
        n1.set('link', '/calendario')
        n1.set('item_tipo', 'evento')
        n1.set('lida', false)
        app.save(n1)

        const n2 = new Record(notifColRef)
        if (adminId) n2.set('usuario', adminId)
        n2.set('tipo', 'tarefa')
        n2.set('titulo', 'Demanda vencendo: Entrega da Proposta')
        n2.set('mensagem', 'O prazo de conclusão é hoje. Acompanhe pelo fluxo Kanban ou listas.')
        n2.set('link', '/listas')
        n2.set('item_tipo', 'demanda')
        n2.set('lida', false)
        app.save(n2)
      }
    } catch (e) {
      console.log('Aviso ao semear configuracoes_lembretes:', e)
    }
  },
  (app) => {
    try {
      const hist = app.findCollectionByNameOrId('historico_lembretes_disparados')
      app.delete(hist)
    } catch (_) {}
    try {
      const notif = app.findCollectionByNameOrId('notificacoes_sistema')
      app.delete(notif)
    } catch (_) {}
    try {
      const cfg = app.findCollectionByNameOrId('configuracoes_lembretes')
      app.delete(cfg)
    } catch (_) {}
  },
)
