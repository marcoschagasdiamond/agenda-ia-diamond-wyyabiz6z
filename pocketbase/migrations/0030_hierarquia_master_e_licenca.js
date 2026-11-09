/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0030: Hierarquia de Administrador Master e Licenciamento Comercial da Conta
 * - Coleção 'licencas_conta': plano atual ('gratuito' / 'pro' / 'diamond_executive'), limites (max_dias_folha, max_projetos, permite_convites), status ('ativo', 'trial', 'suspenso'), vigência e dados do titular
 * - Coleção 'modulos_licenca': módulos opcionais ativáveis (núcleo + módulos adicionais reutilizáveis em outros produtos)
 * - Campos em 'membros_equipe': is_master (bool) para marcar o Administrador Master da conta
 * - Seed idempotente: promove o primeiro usuário (ou marcoschagasdiamond@icloud.com) como Master e cria a licença padrão da conta
 */
migrate(
  (app) => {
    // 1. Coleção licencas_conta
    let licencasCol
    try {
      licencasCol = app.findCollectionByNameOrId('licencas_conta')
    } catch (_) {
      licencasCol = new Collection({
        name: 'licencas_conta',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome_conta', type: 'text', required: true },
          {
            name: 'plano',
            type: 'select',
            required: true,
            values: ['gratuito', 'pro', 'diamond_executive'],
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ativo', 'trial', 'suspenso', 'cancelado'],
          },
          { name: 'max_dias_folha', type: 'number', required: true },
          { name: 'max_projetos', type: 'number', required: true },
          { name: 'permite_convites', type: 'bool' },
          { name: 'permite_whatsapp', type: 'bool' },
          { name: 'permite_relatorios_avancados', type: 'bool' },
          { name: 'titular_email', type: 'email' },
          { name: 'titular_nome', type: 'text' },
          { name: 'observacoes', type: 'text' },
          { name: 'data_inicio', type: 'date' },
          { name: 'data_expiracao', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_licencas_plano ON licencas_conta (plano)',
          'CREATE INDEX idx_licencas_status ON licencas_conta (status)',
        ],
      })
      app.save(licencasCol)
    }

    // 2. Coleção modulos_licenca (módulos ativáveis da conta)
    let modulosCol
    try {
      modulosCol = app.findCollectionByNameOrId('modulos_licenca')
    } catch (_) {
      modulosCol = new Collection({
        name: 'modulos_licenca',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'licenca',
            type: 'relation',
            collectionId: licencasCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_modulos_licenca_ref ON modulos_licenca (licenca)',
          'CREATE INDEX idx_modulos_licenca_cod ON modulos_licenca (codigo)',
        ],
      })
      app.save(modulosCol)
    }

    // 3. Adicionar campo 'is_master' em 'membros_equipe'
    try {
      const membrosCol = app.findCollectionByNameOrId('membros_equipe')
      if (!membrosCol.fields.getByName('is_master')) {
        membrosCol.fields.add(
          new BoolField({
            name: 'is_master',
          }),
        )
        membrosCol.addIndex('idx_membros_is_master', false, 'is_master', '')
        app.save(membrosCol)
      }
    } catch (err) {
      console.log('Aviso ao adicionar is_master em membros_equipe:', err)
    }

    // 4. Seed / Promoção idempotente do primeiro usuário como Administrador Master
    try {
      // Buscar o primeiro usuário do sistema (ordenado por created ASC)
      let primeiroUsuario = null
      try {
        const users = app.findRecordsByFilter('_pb_users_auth_', '1 = 1', 'created', 1, 0)
        if (users && users.length > 0) {
          primeiroUsuario = users[0]
        }
      } catch (_) {}

      // Se não achar por query genérica, busca pelo e-mail padrão
      if (!primeiroUsuario) {
        try {
          primeiroUsuario = app.findAuthRecordByEmail(
            '_pb_users_auth_',
            'marcoschagasdiamond@icloud.com',
          )
        } catch (_) {}
      }

      if (primeiroUsuario) {
        const membrosCol = app.findCollectionByNameOrId('membros_equipe')
        const emailPrimeiro = primeiroUsuario.getString('email') || 'marcoschagasdiamond@icloud.com'

        let membroRecord = null
        try {
          membroRecord = app.findFirstRecordByData('membros_equipe', 'email', emailPrimeiro)
        } catch (_) {}

        if (!membroRecord) {
          // Criar registro do Master
          membroRecord = new Record(membrosCol)
          membroRecord.set('usuario', primeiroUsuario.id)
          membroRecord.set('email', emailPrimeiro)
          membroRecord.set('nome', primeiroUsuario.getString('name') || 'Administrador Master')
          membroRecord.set('funcao', 'admin')
          membroRecord.set('nivel_acesso', 'admin')
          membroRecord.set('status', 'ativo')
          membroRecord.set('is_master', true)
          membroRecord.set('adicionado_por', primeiroUsuario.id)
          membroRecord.set('observacoes', 'Administrador Master e Fundador da Conta')
          membroRecord.set(
            'escopos',
            JSON.stringify([{ tipo: 'geral', nome: 'Workspace Completo Diamond', nivel: 'admin' }]),
          )
          app.save(membroRecord)
        } else {
          // Atualizar garantindo is_master = true e nivel_acesso/funcao admin
          membroRecord.set('is_master', true)
          membroRecord.set('funcao', 'admin')
          membroRecord.set('nivel_acesso', 'admin')
          if (!membroRecord.getString('usuario')) {
            membroRecord.set('usuario', primeiroUsuario.id)
          }
          app.save(membroRecord)
        }

        // 5. Garantir existência de uma licença da conta (Plano Prova Viva / Gratuito com limites de entrada)
        let licencaExistente = null
        try {
          const licencas = app.findRecordsByFilter('licencas_conta', '1 = 1', 'created', 1, 0)
          if (licencas && licencas.length > 0) {
            licencaExistente = licencas[0]
          }
        } catch (_) {}

        if (!licencaExistente) {
          const novaLicenca = new Record(licencasCol)
          novaLicenca.set('nome_conta', 'Conta Diamond Principal')
          novaLicenca.set('plano', 'gratuito') // Plano Prova Viva inicial
          novaLicenca.set('status', 'ativo')
          novaLicenca.set('max_dias_folha', 2) // Limite: 2 dias de Folha
          novaLicenca.set('max_projetos', 2) // Limite: 2 projetos
          novaLicenca.set('permite_convites', false) // Convites bloqueados até plano pago
          novaLicenca.set('permite_whatsapp', false)
          novaLicenca.set('permite_relatorios_avancados', false)
          novaLicenca.set('titular_email', emailPrimeiro)
          novaLicenca.set(
            'titular_nome',
            primeiroUsuario.getString('name') || 'Administrador Master',
          )
          novaLicenca.set(
            'observacoes',
            'Plano Gratuito Prova Viva: 2 dias de folha, 2 projetos e convites bloqueados',
          )
          app.save(novaLicenca)

          // Criar módulos básicos do ecossistema
          const modulosBase = [
            {
              codigo: 'folha_dia',
              nome: 'Folha do Dia',
              descricao: 'Registro e rascunho de demandas diárias',
              ativo: true,
            },
            {
              codigo: 'projetos',
              nome: 'Gestão de Projetos',
              descricao: 'Controle de projetos, marcos e equipe',
              ativo: true,
            },
            {
              codigo: 'equipe_convites',
              nome: 'Convites de Equipe',
              descricao: 'Envio de convites com escopo granular',
              ativo: false,
            },
            {
              codigo: 'whatsapp_radar',
              nome: 'Radar WhatsApp & Sementes',
              descricao: 'Reativação automática de negócios via WhatsApp',
              ativo: false,
            },
            {
              codigo: 'contabilidade_5_0',
              nome: 'Módulo Contabilidade 5.0',
              descricao: 'Integração com portfólio contábil e financeiro',
              ativo: false,
            },
          ]

          for (const m of modulosBase) {
            const modRec = new Record(modulosCol)
            modRec.set('licenca', novaLicenca.id)
            modRec.set('codigo', m.codigo)
            modRec.set('nome', m.nome)
            modRec.set('descricao', m.descricao)
            modRec.set('ativo', m.ativo)
            app.save(modRec)
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao semear Master e Licença:', err)
    }
  },
  (app) => {
    try {
      const modulosCol = app.findCollectionByNameOrId('modulos_licenca')
      app.delete(modulosCol)
    } catch (_) {}

    try {
      const licencasCol = app.findCollectionByNameOrId('licencas_conta')
      app.delete(licencasCol)
    } catch (_) {}

    try {
      const membrosCol = app.findCollectionByNameOrId('membros_equipe')
      membrosCol.removeIndex('idx_membros_is_master')
      if (membrosCol.fields.getByName('is_master')) {
        membrosCol.fields.removeByName('is_master')
      }
      app.save(membrosCol)
    } catch (_) {}
  },
)
