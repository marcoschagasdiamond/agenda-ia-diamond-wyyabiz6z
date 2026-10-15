/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0020:
 * Central de Gestão & Construtor de Formulários:
 * 1. Coleção 'tags_sistema' (gestão global de tags)
 * 2. Coleção 'pastas_formularios' (pastas e categorias para organizar formulários)
 * 3. Coleção 'formularios' (construtor de formulários com campos JSON, publicação, slug, etc.)
 * 4. Coleção 'formulario_respostas' (respostas públicas com dados JSON vinculadas ao formulário)
 * 5. Seeds iniciais de tags e formulário modelo Diamond
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'

    // 1. Coleção tags_sistema
    let tagsCol
    try {
      tagsCol = app.findCollectionByNameOrId('tags_sistema')
    } catch (_) {
      tagsCol = new Collection({
        name: 'tags_sistema',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'cor', type: 'text' },
          { name: 'descricao', type: 'text' },
          { name: 'categoria', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_tags_sistema_nome ON tags_sistema (nome)'],
      })
      app.save(tagsCol)
    }

    // 2. Coleção pastas_formularios
    let pastasFormCol
    try {
      pastasFormCol = app.findCollectionByNameOrId('pastas_formularios')
    } catch (_) {
      pastasFormCol = new Collection({
        name: 'pastas_formularios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'cor', type: 'text' },
          { name: 'descricao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_pastas_form_nome ON pastas_formularios (nome)'],
      })
      app.save(pastasFormCol)
    }

    // 3. Coleção formularios
    let formCol
    try {
      formCol = app.findCollectionByNameOrId('formularios')
    } catch (_) {
      formCol = new Collection({
        name: 'formularios',
        type: 'base',
        // Leitura pública permitida para formulários publicados ou usuários autenticados
        listRule: "@request.auth.id != '' || publicado = true",
        viewRule: "@request.auth.id != '' || publicado = true",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'titulo', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'slug', type: 'text', required: true },
          { name: 'publicado', type: 'bool' },
          { name: 'pasta_grupo', type: 'text' },
          { name: 'campos', type: 'json' },
          {
            name: 'criado_por',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'mensagem_sucesso', type: 'text' },
          { name: 'cor_tema', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_form_slug ON formularios (slug)',
          'CREATE INDEX idx_form_publicado ON formularios (publicado)',
        ],
      })
      app.save(formCol)
    }

    // 4. Coleção formulario_respostas
    const formColId = app.findCollectionByNameOrId('formularios').id
    try {
      app.findCollectionByNameOrId('formulario_respostas')
    } catch (_) {
      const respCol = new Collection({
        name: 'formulario_respostas',
        type: 'base',
        // Respostas são privadas para usuários autenticados; qualquer pessoa pública pode submeter (createRule: "")
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: '',
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'formulario',
            type: 'relation',
            required: true,
            collectionId: formColId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'dados', type: 'json' },
          { name: 'respondente_identificacao', type: 'text' },
          { name: 'respondente_email', type: 'text' },
          { name: 'ip_origem', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_form_resp_form ON formulario_respostas (formulario)'],
      })
      app.save(respCol)
    }

    // 5. Seeds iniciais de tags
    try {
      const tagsIniciais = [
        { nome: 'Estratégia', cor: '#0F766E', descricao: 'Decisões e direcionamentos' },
        { nome: 'VIP', cor: '#8B5CF6', descricao: 'Clientes e parceiros de alto valor' },
        { nome: 'Urgente', cor: '#DC2626', descricao: 'Demanda prioritária' },
        { nome: 'Follow-up', cor: '#F59E0B', descricao: 'Acompanhamento pendente' },
        { nome: 'Comercial', cor: '#10B981', descricao: 'Vendas e propostas' },
        { nome: 'Financeiro', cor: '#0284C7', descricao: 'Custos, aportes e recebimentos' },
        { nome: 'Tecnologia', cor: '#6366F1', descricao: 'Desenvolvimento e automação' },
      ]

      const tCol = app.findCollectionByNameOrId('tags_sistema')
      for (const t of tagsIniciais) {
        try {
          app.findFirstRecordByData('tags_sistema', 'nome', t.nome)
        } catch (_) {
          const r = new Record(tCol)
          r.set('nome', t.nome)
          r.set('cor', t.cor)
          r.set('descricao', t.descricao)
          app.save(r)
        }
      }
    } catch (e) {
      console.log('Aviso ao semear tags_sistema:', e)
    }

    // 6. Seeds iniciais de pastas de formulários
    try {
      const pCol = app.findCollectionByNameOrId('pastas_formularios')
      const pastasIniciais = [
        { nome: 'Geral', cor: '#64748B', descricao: 'Formulários gerais' },
        { nome: 'Qualificação & Leads', cor: '#0F766E', descricao: 'Entrada de novos contatos' },
        { nome: 'Pesquisas & Feedback', cor: '#8B5CF6', descricao: 'Satisfação e avaliações' },
      ]
      for (const p of pastasIniciais) {
        try {
          app.findFirstRecordByData('pastas_formularios', 'nome', p.nome)
        } catch (_) {
          const r = new Record(pCol)
          r.set('nome', p.nome)
          r.set('cor', p.cor)
          r.set('descricao', p.descricao)
          app.save(r)
        }
      }
    } catch (e) {
      console.log('Aviso ao semear pastas_formularios:', e)
    }

    // 7. Seed inicial de formulário modelo Diamond
    try {
      const fCol = app.findCollectionByNameOrId('formularios')
      try {
        app.findFirstRecordByData('formularios', 'slug', 'diagnostico-estrategico-diamond')
      } catch (_) {
        const adminUser = app.findFirstRecordByData(
          'users',
          'email',
          'marcoschagasdiamond@icloud.com',
        )
        const formRec = new Record(fCol)
        formRec.set('titulo', 'Diagnóstico Estratégico & Briefing Diamond')
        formRec.set(
          'descricao',
          'Preencha este formulário para que nossa equipe avalie a viabilidade técnica e financeira do seu projeto.',
        )
        formRec.set('slug', 'diagnostico-estrategico-diamond')
        formRec.set('publicado', true)
        formRec.set('pasta_grupo', 'Qualificação & Leads')
        formRec.set('cor_tema', '#0F766E')
        formRec.set(
          'mensagem_sucesso',
          'Agradecemos as informações! O estrategista executivo da Diamond Group entrará em contato em até 24 horas.',
        )
        if (adminUser) {
          formRec.set('criado_por', adminUser.id)
        }
        formRec.set(
          'campos',
          JSON.stringify([
            {
              id: 'campo_1',
              label: 'Nome Completo',
              tipo: 'texto',
              obrigatorio: true,
              placeholder: 'Ex: Dr. Roberto Guimarães',
            },
            {
              id: 'campo_2',
              label: 'E-mail Corporativo',
              tipo: 'email',
              obrigatorio: true,
              placeholder: 'roberto@empresa.com.br',
            },
            {
              id: 'campo_3',
              label: 'WhatsApp / Telefone para contato',
              tipo: 'telefone',
              obrigatorio: true,
              placeholder: '(11) 99999-8888',
            },
            {
              id: 'campo_4',
              label: 'Qual é o tipo da sua iniciativa?',
              tipo: 'escolha_unica',
              obrigatorio: true,
              opcoes: [
                'Negócio Próprio / Startup',
                'E-commerce / Varejo',
                'Expansão Corporativa',
                'Consultoria / Posicionamento',
              ],
            },
            {
              id: 'campo_5',
              label: 'Descreva os principais desafios e objetivos',
              tipo: 'texto_longo',
              obrigatorio: false,
              placeholder: 'Conte brevemente sobre sua operação atual e onde quer chegar...',
            },
            {
              id: 'campo_6',
              label: 'Data prevista para início das atividades',
              tipo: 'data',
              obrigatorio: false,
            },
            {
              id: 'campo_7',
              label: 'Áreas de maior interesse na assessoria',
              tipo: 'escolha_multipla',
              obrigatorio: false,
              opcoes: [
                'Gestão Estratégica & Kanban',
                'Captação de Investidores',
                'Governança & Equipe',
                'Automação & IA',
              ],
            },
          ]),
        )
        app.save(formRec)

        // Seed de uma resposta de exemplo
        const respCol = app.findCollectionByNameOrId('formulario_respostas')
        const respRec = new Record(respCol)
        respRec.set('formulario', formRec.id)
        respRec.set('respondente_identificacao', 'Dra. Camila Vasconcelos')
        respRec.set('respondente_email', 'camila.vasconcelos@hospitalvip.com.br')
        respRec.set(
          'dados',
          JSON.stringify({
            campo_1: 'Dra. Camila Vasconcelos',
            campo_2: 'camila.vasconcelos@hospitalvip.com.br',
            campo_3: '(11) 98765-4321',
            campo_4: 'Expansão Corporativa',
            campo_5:
              'Precisamos estruturar os fluxos operacionais da nova unidade em Alphaville e conectar à agenda central com IA.',
            campo_6: '2026-11-01',
            campo_7: ['Gestão Estratégica & Kanban', 'Automação & IA'],
          }),
        )
        app.save(respRec)
      }
    } catch (e) {
      console.log('Aviso ao semear formulario inicial:', e)
    }
  },
  (app) => {
    try {
      const respCol = app.findCollectionByNameOrId('formulario_respostas')
      app.delete(respCol)
    } catch (_) {}

    try {
      const formCol = app.findCollectionByNameOrId('formularios')
      app.delete(formCol)
    } catch (_) {}

    try {
      const pCol = app.findCollectionByNameOrId('pastas_formularios')
      app.delete(pCol)
    } catch (_) {}

    try {
      const tCol = app.findCollectionByNameOrId('tags_sistema')
      app.delete(tCol)
    } catch (_) {}
  },
)
