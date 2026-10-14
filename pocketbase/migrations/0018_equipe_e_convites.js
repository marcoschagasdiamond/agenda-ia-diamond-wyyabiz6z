/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0018:
 * Cria as coleções 'membros_equipe' e 'convites_equipe' para colaboração
 * multi-escopo (projeto, demanda, fluxo kanban, categoria, cliente, geral).
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const projetosId = app.findCollectionByNameOrId('projetos').id
    const clientesId = app.findCollectionByNameOrId('clientes').id
    const fluxosId = app.findCollectionByNameOrId('fluxos_kanban').id
    const categoriasId = app.findCollectionByNameOrId('categorias_fluxo').id
    const demandasId = app.findCollectionByNameOrId('demandas').id

    // 1. Coleção membros_equipe
    try {
      app.findCollectionByNameOrId('membros_equipe')
    } catch (_) {
      const membrosCol = new Collection({
        name: 'membros_equipe',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'email', type: 'email', required: true },
          { name: 'nome', type: 'text' },
          {
            name: 'funcao',
            type: 'select',
            values: ['admin', 'membro', 'visualizador'],
            maxSelect: 1,
          },
          {
            name: 'nivel_acesso',
            type: 'select',
            values: ['leitura', 'edicao', 'admin'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['ativo', 'pendente', 'suspenso'],
            maxSelect: 1,
          },
          // Permissões / escopos concedidos gravados em formato flexível JSON:
          // Array de { tipo: 'geral'|'projeto'|'fluxo'|'categoria'|'cliente'|'demanda', id?: string, nome?: string, nivel: 'leitura'|'edicao'|'admin' }
          { name: 'escopos', type: 'json' },
          {
            name: 'adicionado_por',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'ultimo_acesso', type: 'text' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_membros_email ON membros_equipe (email)',
          'CREATE INDEX idx_membros_status ON membros_equipe (status)',
          'CREATE INDEX idx_membros_usuario ON membros_equipe (usuario)',
        ],
      })
      app.save(membrosCol)
    }

    // 2. Coleção convites_equipe
    try {
      app.findCollectionByNameOrId('convites_equipe')
    } catch (_) {
      const convitesCol = new Collection({
        name: 'convites_equipe',
        type: 'base',
        // O dono gerencia, e pessoas públicas podem consultar por token único para aceitar
        listRule: "@request.auth.id != '' || token != ''",
        viewRule: "@request.auth.id != '' || token != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' || token != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'token', type: 'text', required: true },
          {
            name: 'escopo_tipo',
            type: 'select',
            values: ['geral', 'projeto', 'fluxo', 'categoria', 'cliente', 'demanda'],
            maxSelect: 1,
          },
          { name: 'escopo_id', type: 'text' },
          { name: 'escopo_nome', type: 'text' },
          {
            name: 'nivel_acesso',
            type: 'select',
            values: ['leitura', 'edicao', 'admin'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['pendente', 'aceito', 'revogado', 'expirado'],
            maxSelect: 1,
          },
          { name: 'mensagem', type: 'text' },
          { name: 'expira_em', type: 'text' }, // ISO string (ex: 7 dias)
          { name: 'enviado_em', type: 'text' },
          { name: 'aceito_em', type: 'text' },
          {
            name: 'convidado_por',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          {
            name: 'usuario_aceitou',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          {
            name: 'projeto_ref',
            type: 'relation',
            collectionId: projetosId,
            maxSelect: 1,
          },
          {
            name: 'cliente_ref',
            type: 'relation',
            collectionId: clientesId,
            maxSelect: 1,
          },
          {
            name: 'fluxo_ref',
            type: 'relation',
            collectionId: fluxosId,
            maxSelect: 1,
          },
          {
            name: 'categoria_ref',
            type: 'relation',
            collectionId: categoriasId,
            maxSelect: 1,
          },
          {
            name: 'demanda_ref',
            type: 'relation',
            collectionId: demandasId,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_convites_token ON convites_equipe (token)',
          'CREATE INDEX idx_convites_email ON convites_equipe (email)',
          'CREATE INDEX idx_convites_status ON convites_equipe (status)',
          'CREATE INDEX idx_convites_escopo ON convites_equipe (escopo_tipo, escopo_id)',
        ],
      })
      app.save(convitesCol)
    }

    // 3. Seed inicial do Marcos Chagas Diamond como membro fundador/admin
    try {
      const adminUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'marcoschagasdiamond@icloud.com',
      )
      const membrosCol = app.findCollectionByNameOrId('membros_equipe')

      try {
        app.findFirstRecordByData('membros_equipe', 'email', 'marcoschagasdiamond@icloud.com')
      } catch (_) {
        const fundador = new Record(membrosCol)
        fundador.set('usuario', adminUser.id)
        fundador.set('email', 'marcoschagasdiamond@icloud.com')
        fundador.set('nome', adminUser.getString('name') || 'Marcos Chagas Diamond')
        fundador.set('funcao', 'admin')
        fundador.set('nivel_acesso', 'admin')
        fundador.set('status', 'ativo')
        fundador.set(
          'escopos',
          JSON.stringify([{ tipo: 'geral', nome: 'Workspace Completo Diamond', nivel: 'admin' }]),
        )
        fundador.set('adicionado_por', adminUser.id)
        fundador.set('observacoes', 'Proprietário & Estrategista Diamond')
        app.save(fundador)
      }
    } catch (err) {
      console.log('Aviso ao semear fundador na equipe:', err)
    }
  },
  (app) => {
    try {
      const convitesCol = app.findCollectionByNameOrId('convites_equipe')
      app.delete(convitesCol)
    } catch (_) {}

    try {
      const membrosCol = app.findCollectionByNameOrId('membros_equipe')
      app.delete(membrosCol)
    } catch (_) {}
  },
)
