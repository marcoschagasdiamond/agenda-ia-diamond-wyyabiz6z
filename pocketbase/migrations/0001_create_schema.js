/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. pastast: needed early by projetos and arquivos
    const pastas = new Collection({
      name: 'pastas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pastas)

    // 2. negocios
    const negocios = new Collection({
      name: 'negocios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'tipo', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(negocios)

    // 3. projetos
    const pastasId = app.findCollectionByNameOrId('pastas').id
    const projetos = new Collection({
      name: 'projetos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [
        'CREATE INDEX idx_projetos_tipo ON projetos (tipo)',
        'CREATE INDEX idx_projetos_status ON projetos (status)',
      ],
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'negocio',
            'cliente',
            'posicionamento',
            'precos',
            'devices',
            'estudo',
            'freelance',
          ],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'pausado', 'concluido'],
          maxSelect: 1,
        },
        {
          name: 'pasta_raiz',
          type: 'relation',
          collectionId: pastasId,
          maxSelect: 1,
        },
        { name: 'contexto_resumido', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(projetos)

    // Now back-link pasta_pai and projeto to pastas
    const projetosId = app.findCollectionByNameOrId('projetos').id
    const colPastas = app.findCollectionByNameOrId('pastas')
    colPastas.fields.add(
      new RelationField({
        name: 'pasta_pai',
        collectionId: pastasId,
        maxSelect: 1,
      }),
    )
    colPastas.fields.add(
      new RelationField({
        name: 'projeto',
        collectionId: projetosId,
        maxSelect: 1,
      }),
    )
    app.save(colPastas)

    // 4. profiles
    const profiles = new Collection({
      name: 'profiles',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'respostas_onboarding', type: 'json' },
        { name: 'objetivos', type: 'text' },
        { name: 'posicionamento', type: 'text' },
        { name: 'precos', type: 'text' },
        { name: 'preferencias', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(profiles)

    // 5. contatos
    const negociosId = app.findCollectionByNameOrId('negocios').id
    const contatos = new Collection({
      name: 'contatos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [
        'CREATE INDEX idx_contatos_email ON contatos (email)',
        'CREATE INDEX idx_contatos_origem ON contatos (origem)',
      ],
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'empresa', type: 'text' },
        { name: 'email', type: 'text' },
        { name: 'telefone', type: 'text' },
        { name: 'cargo', type: 'text' },
        { name: 'tags', type: 'json' },
        {
          name: 'projetos',
          type: 'relation',
          collectionId: projetosId,
          maxSelect: 20,
        },
        {
          name: 'negocios',
          type: 'relation',
          collectionId: negociosId,
          maxSelect: 20,
        },
        {
          name: 'origem',
          type: 'select',
          values: ['manual', 'email', 'whatsapp', 'importado'],
          maxSelect: 1,
        },
        { name: 'contexto_resumido', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(contatos)

    // 6. folha_dia
    const contatosId = app.findCollectionByNameOrId('contatos').id
    const folhaDia = new Collection({
      name: 'folha_dia',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [
        'CREATE INDEX idx_folha_dia_data ON folha_dia (data)',
        'CREATE INDEX idx_folha_dia_status ON folha_dia (status)',
      ],
      fields: [
        { name: 'data', type: 'date' },
        { name: 'registro', type: 'text', required: true },
        {
          name: 'tipo_origem',
          type: 'select',
          values: ['manual', 'email', 'whatsapp', 'importado'],
          maxSelect: 1,
        },
        { name: 'origem_ref', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'processado', 'ignorado'],
          maxSelect: 1,
        },
        {
          name: 'projeto',
          type: 'relation',
          collectionId: projetosId,
          maxSelect: 1,
        },
        {
          name: 'negocio',
          type: 'relation',
          collectionId: negociosId,
          maxSelect: 1,
        },
        {
          name: 'contato',
          type: 'relation',
          collectionId: contatosId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(folhaDia)

    // 7. cards
    const cards = new Collection({
      name: 'cards',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [
        'CREATE INDEX idx_cards_status ON cards (status)',
        'CREATE INDEX idx_cards_prioridade ON cards (prioridade)',
        'CREATE INDEX idx_cards_projeto ON cards (projeto)',
      ],
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'projeto',
          type: 'relation',
          collectionId: projetosId,
          maxSelect: 1,
        },
        {
          name: 'negocio',
          type: 'relation',
          collectionId: negociosId,
          maxSelect: 1,
        },
        {
          name: 'contato',
          type: 'relation',
          collectionId: contatosId,
          maxSelect: 1,
        },
        { name: 'tags', type: 'json' },
        {
          name: 'prioridade',
          type: 'select',
          values: ['baixa', 'media', 'alta', 'urgente'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['novo', 'em_andamento', 'bloqueado', 'concluido'],
          maxSelect: 1,
        },
        { name: 'proximo_passo', type: 'text' },
        {
          name: 'responsavel',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'criado_por_ia', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(cards)

    // 8. demandas
    const cardsId = app.findCollectionByNameOrId('cards').id
    const demandas = new Collection({
      name: 'demandas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: [
        'CREATE INDEX idx_demandas_status ON demandas (status)',
        'CREATE INDEX idx_demandas_atribuido_a ON demandas (atribuido_a)',
      ],
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'card_origem',
          type: 'relation',
          collectionId: cardsId,
          maxSelect: 1,
        },
        {
          name: 'atribuido_a',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['pendente', 'concluido'],
          maxSelect: 1,
        },
        { name: 'prazo', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(demandas)

    // 9. listas
    const demandasId = app.findCollectionByNameOrId('demandas').id
    const listas = new Collection({
      name: 'listas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: ['contatos', 'demandas', 'cadastros'],
          maxSelect: 1,
        },
        {
          name: 'itens_contatos',
          type: 'relation',
          collectionId: contatosId,
          maxSelect: 100,
        },
        {
          name: 'itens_demandas',
          type: 'relation',
          collectionId: demandasId,
          maxSelect: 100,
        },
        {
          name: 'compartilhada_com',
          type: 'select',
          values: ['interno', 'clientes', 'publica'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(listas)

    // 10. arquivos
    const arquivos = new Collection({
      name: 'arquivos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: ['CREATE INDEX idx_arquivos_pasta ON arquivos (pasta)'],
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'arquivo',
          type: 'file',
          maxSelect: 1,
          maxSize: 26214400, // 25MB
        },
        {
          name: 'pasta',
          type: 'relation',
          collectionId: pastasId,
          maxSelect: 1,
        },
        {
          name: 'projeto',
          type: 'relation',
          collectionId: projetosId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(arquivos)

    // 11. resumos_dia
    const resumosDia = new Collection({
      name: 'resumos_dia',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'data', type: 'date' },
        { name: 'feito', type: 'text' },
        { name: 'a_fazer', type: 'text' },
        { name: 'prioridades', type: 'text' },
        { name: 'decisoes', type: 'text' },
        { name: 'proximos_passos', type: 'text' },
        { name: 'contagem_cards_criados', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(resumosDia)

    // 12. clientes
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != '' && cadastrado_por = @request.auth.id",
      indexes: [
        'CREATE INDEX idx_clientes_email ON clientes (email)',
        'CREATE INDEX idx_clientes_cadastrado_por ON clientes (cadastrado_por)',
      ],
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'empresa', type: 'text' },
        {
          name: 'cadastrado_por',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'tags', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(clientes)

    // 13. clientes_projetos
    const clientesId = app.findCollectionByNameOrId('clientes').id
    const clientesProjetos = new Collection({
      name: 'clientes_projetos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente',
          type: 'relation',
          required: true,
          collectionId: clientesId,
          maxSelect: 1,
        },
        {
          name: 'projeto',
          type: 'relation',
          required: true,
          collectionId: projetosId,
          maxSelect: 1,
        },
        { name: 'acesso_ativado', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(clientesProjetos)

    // 14. respostas_templates
    const respostasTemplates = new Collection({
      name: 'respostas_templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'template_slug', type: 'text', required: true },
        { name: 'respostas', type: 'json' },
        {
          name: 'projeto',
          type: 'relation',
          collectionId: projetosId,
          maxSelect: 1,
        },
        {
          name: 'contato',
          type: 'relation',
          collectionId: contatosId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(respostasTemplates)
  },
  (app) => {
    const toDelete = [
      'respostas_templates',
      'clientes_projetos',
      'clientes',
      'resumos_dia',
      'arquivos',
      'listas',
      'demandas',
      'cards',
      'folha_dia',
      'contatos',
      'profiles',
      'projetos',
      'negocios',
      'pastas',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
