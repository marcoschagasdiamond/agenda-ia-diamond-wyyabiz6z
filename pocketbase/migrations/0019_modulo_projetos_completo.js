/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0019:
 * Módulo Completo de Projetos no Agenda IA Diamond:
 * 1. Expande a coleção 'projetos' com:
 *    - cliente (relation -> clientes)
 *    - data_inicio (date)
 *    - data_fim (date)
 *    - orcamento_total (number)
 *    - cor (text)
 *    - responsavel (relation -> users)
 * 2. Cria 'projeto_fases' (etapas/fases físicas, ordem, cor, datas, % conclusão)
 * 3. Cria 'projeto_equipe' (membro/usuário, função/cargo no projeto, projeto)
 * 4. Cria 'projeto_investidores' (nome/contato, valor investido, % participação, projeto)
 * 5. Cria 'projeto_financeiro' (tipo entrada/desembolso, valor, data, descrição, fase, projeto)
 */
migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const projetosCol = app.findCollectionByNameOrId('projetos')
    const projetosId = projetosCol.id
    const clientesId = app.findCollectionByNameOrId('clientes').id

    // 1. Atualizar campos da coleção existente 'projetos'
    if (!projetosCol.fields.getByName('cliente')) {
      projetosCol.fields.add(
        new RelationField({
          name: 'cliente',
          collectionId: clientesId,
          maxSelect: 1,
        }),
      )
    }

    if (!projetosCol.fields.getByName('data_inicio')) {
      projetosCol.fields.add(new DateField({ name: 'data_inicio' }))
    }

    if (!projetosCol.fields.getByName('data_fim')) {
      projetosCol.fields.add(new DateField({ name: 'data_fim' }))
    }

    if (!projetosCol.fields.getByName('orcamento_total')) {
      projetosCol.fields.add(new NumberField({ name: 'orcamento_total' }))
    }

    if (!projetosCol.fields.getByName('cor')) {
      projetosCol.fields.add(new TextField({ name: 'cor' }))
    }

    if (!projetosCol.fields.getByName('responsavel')) {
      projetosCol.fields.add(
        new RelationField({
          name: 'responsavel',
          collectionId: usersColId,
          maxSelect: 1,
        }),
      )
    }

    app.save(projetosCol)

    // 2. Coleção projeto_fases (Cronograma físico e fases do projeto)
    try {
      app.findCollectionByNameOrId('projeto_fases')
    } catch (_) {
      const fasesCol = new Collection({
        name: 'projeto_fases',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'projeto',
            type: 'relation',
            required: true,
            collectionId: projetosId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'ordem', type: 'number' },
          { name: 'cor', type: 'text' },
          { name: 'data_inicio', type: 'date' },
          { name: 'data_fim', type: 'date' },
          { name: 'progresso', type: 'number' }, // 0 a 100
          {
            name: 'status',
            type: 'select',
            values: ['nao_iniciada', 'em_andamento', 'bloqueada', 'concluida'],
            maxSelect: 1,
          },
          { name: 'is_conclusao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_proj_fases_projeto ON projeto_fases (projeto)',
          'CREATE INDEX idx_proj_fases_ordem ON projeto_fases (projeto, ordem)',
        ],
      })
      app.save(fasesCol)
    }

    // 3. Coleção projeto_equipe (Membros com função/cargo no projeto)
    try {
      app.findCollectionByNameOrId('projeto_equipe')
    } catch (_) {
      const equipeCol = new Collection({
        name: 'projeto_equipe',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'projeto',
            type: 'relation',
            required: true,
            collectionId: projetosId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'usuario',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'nome', type: 'text' },
          { name: 'email', type: 'email' },
          { name: 'funcao', type: 'text' }, // Ex: coordenador, técnico, financeiro, designer, desenvolvedor
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
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_proj_equipe_proj ON projeto_equipe (projeto)',
          'CREATE INDEX idx_proj_equipe_user ON projeto_equipe (usuario)',
          'CREATE INDEX idx_proj_equipe_email ON projeto_equipe (email)',
        ],
      })
      app.save(equipeCol)
    }

    // 4. Coleção projeto_investidores
    try {
      app.findCollectionByNameOrId('projeto_investidores')
    } catch (_) {
      const investidoresCol = new Collection({
        name: 'projeto_investidores',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'projeto',
            type: 'relation',
            required: true,
            collectionId: projetosId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'nome', type: 'text', required: true },
          { name: 'email', type: 'email' },
          { name: 'telefone', type: 'text' },
          { name: 'valor_investido', type: 'number' },
          { name: 'participacao_percentual', type: 'number' }, // 0 a 100
          { name: 'data_aporte', type: 'date' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_proj_invest_proj ON projeto_investidores (projeto)'],
      })
      app.save(investidoresCol)
    }

    // 5. Coleção projeto_financeiro (Entradas e desembolsos por fase e projeto)
    try {
      app.findCollectionByNameOrId('projeto_financeiro')
    } catch (_) {
      const fasesId = app.findCollectionByNameOrId('projeto_fases').id

      const financeiroCol = new Collection({
        name: 'projeto_financeiro',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'projeto',
            type: 'relation',
            required: true,
            collectionId: projetosId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            values: ['entrada', 'desembolso'],
            required: true,
            maxSelect: 1,
          },
          { name: 'valor', type: 'number', required: true },
          { name: 'data', type: 'date', required: true },
          { name: 'descricao', type: 'text', required: true },
          {
            name: 'fase',
            type: 'relation',
            collectionId: fasesId,
            maxSelect: 1,
          },
          { name: 'categoria_custo', type: 'text' }, // Ex: equipe, fornecedor, infra, licenca, marketing
          {
            name: 'status',
            type: 'select',
            values: ['previsto', 'realizado', 'cancelado'],
            maxSelect: 1,
          },
          { name: 'comprovante_ref', type: 'text' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_proj_fin_proj ON projeto_financeiro (projeto)',
          'CREATE INDEX idx_proj_fin_tipo ON projeto_financeiro (tipo)',
          'CREATE INDEX idx_proj_fin_data ON projeto_financeiro (data)',
        ],
      })
      app.save(financeiroCol)
    }

    // 6. Semear fases e dados de exemplo no projeto existente da Loja Y caso ainda não tenha
    try {
      const projLojaY = app.findFirstRecordByData(
        'projetos',
        'nome',
        'Loja Y - E-commerce e Expansão',
      )
      if (projLojaY) {
        // Atualiza campos de projeto
        if (!projLojaY.getString('data_inicio')) {
          projLojaY.set('data_inicio', '2026-10-01 00:00:00.000Z')
          projLojaY.set('data_fim', '2026-12-20 00:00:00.000Z')
          projLojaY.set('orcamento_total', 45000)
          projLojaY.set('cor', '#0F766E')
          try {
            const cli = app.findFirstRecordByData('clientes', 'nome', 'Helena Martins')
            if (cli) projLojaY.set('cliente', cli.id)
          } catch (_) {}
          app.save(projLojaY)
        }

        // Criar fases do modelo padrão DiamondGroup para a Loja Y se não existirem
        const fasesCol = app.findCollectionByNameOrId('projeto_fases')
        const fasesExistentes = app.findRecordsByFilter(
          'projeto_fases',
          `projeto = "${projLojaY.id}"`,
          'ordem',
          10,
          0,
        )
        if (fasesExistentes.length === 0) {
          const modelosFases = [
            {
              nome: 'Backlog e Alinhamento',
              ordem: 1,
              cor: '#64748B',
              data_inicio: '2026-10-01 00:00:00.000Z',
              data_fim: '2026-10-10 00:00:00.000Z',
              progresso: 100,
              status: 'concluida',
              is_conclusao: false,
            },
            {
              nome: 'Arquitetura & Especificação',
              ordem: 2,
              cor: '#0EA5E9',
              data_inicio: '2026-10-11 00:00:00.000Z',
              data_fim: '2026-10-25 00:00:00.000Z',
              progresso: 100,
              status: 'concluida',
              is_conclusao: false,
            },
            {
              nome: 'Desenvolvimento e Catálogo',
              ordem: 3,
              cor: '#F59E0B',
              data_inicio: '2026-10-26 00:00:00.000Z',
              data_fim: '2026-11-20 00:00:00.000Z',
              progresso: 65,
              status: 'em_andamento',
              is_conclusao: false,
            },
            {
              nome: 'Conferência e Testes de Carga',
              ordem: 4,
              cor: '#8B5CF6',
              data_inicio: '2026-11-21 00:00:00.000Z',
              data_fim: '2026-12-05 00:00:00.000Z',
              progresso: 0,
              status: 'nao_iniciada',
              is_conclusao: false,
            },
            {
              nome: 'Go-Live e Encerramento',
              ordem: 5,
              cor: '#10B981',
              data_inicio: '2026-12-06 00:00:00.000Z',
              data_fim: '2026-12-20 00:00:00.000Z',
              progresso: 0,
              status: 'nao_iniciada',
              is_conclusao: true,
            },
          ]

          const fasesCriadas = []
          for (const m of modelosFases) {
            const rec = new Record(fasesCol)
            rec.set('projeto', projLojaY.id)
            rec.set('nome', m.nome)
            rec.set('ordem', m.ordem)
            rec.set('cor', m.cor)
            rec.set('data_inicio', m.data_inicio)
            rec.set('data_fim', m.data_fim)
            rec.set('progresso', m.progresso)
            rec.set('status', m.status)
            rec.set('is_conclusao', m.is_conclusao)
            app.save(rec)
            fasesCriadas.push(rec)
          }

          // Semear equipe do projeto
          const equipeCol = app.findCollectionByNameOrId('projeto_equipe')
          try {
            const admin = app.findAuthRecordByEmail(
              '_pb_users_auth_',
              'marcoschagasdiamond@icloud.com',
            )
            const mem1 = new Record(equipeCol)
            mem1.set('projeto', projLojaY.id)
            mem1.set('usuario', admin.id)
            mem1.set('nome', 'Marcos Chagas Diamond')
            mem1.set('email', 'marcoschagasdiamond@icloud.com')
            mem1.set('funcao', 'Coordenador Geral & Estrategista')
            mem1.set('nivel_acesso', 'admin')
            mem1.set('status', 'ativo')
            app.save(mem1)

            const mem2 = new Record(equipeCol)
            mem2.set('projeto', projLojaY.id)
            mem2.set('nome', 'Eng. Roberto Silva')
            mem2.set('email', 'roberto.silva@diamondgroup.com.br')
            mem2.set('funcao', 'Líder Técnico & Integrações')
            mem2.set('nivel_acesso', 'edicao')
            mem2.set('status', 'ativo')
            app.save(mem2)

            const mem3 = new Record(equipeCol)
            mem3.set('projeto', projLojaY.id)
            mem3.set('nome', 'Carla Mendonça')
            mem3.set('email', 'carla.mendonca@diamondfinance.com.br')
            mem3.set('funcao', 'Controller Financeiro')
            mem3.set('nivel_acesso', 'edicao')
            mem3.set('status', 'ativo')
            app.save(mem3)
          } catch (_) {}

          // Semear investidores do projeto
          const investCol = app.findCollectionByNameOrId('projeto_investidores')
          const inv1 = new Record(investCol)
          inv1.set('projeto', projLojaY.id)
          inv1.set('nome', 'Diamond Venture Partners')
          inv1.set('email', 'invest@diamondgroup.com.br')
          inv1.set('valor_investido', 30000)
          inv1.set('participacao_percentual', 15)
          inv1.set('data_aporte', '2026-10-01 00:00:00.000Z')
          inv1.set('observacoes', 'Aporte Seed para aceleração tecnológica')
          app.save(inv1)

          // Semear lançamentos financeiros
          const finCol = app.findCollectionByNameOrId('projeto_financeiro')
          const lancamentos = [
            {
              tipo: 'entrada',
              valor: 25000,
              data: '2026-10-02 00:00:00.000Z',
              descricao: 'Primeiro aporte de contrato / Sinal',
              categoria_custo: 'receita',
              status: 'realizado',
              fase: fasesCriadas[0]?.id,
            },
            {
              tipo: 'entrada',
              valor: 10000,
              data: '2026-10-20 00:00:00.000Z',
              descricao: 'Segunda parcela por entrega da especificação',
              categoria_custo: 'receita',
              status: 'realizado',
              fase: fasesCriadas[1]?.id,
            },
            {
              tipo: 'desembolso',
              valor: 8500,
              data: '2026-10-12 00:00:00.000Z',
              descricao: 'Licenças de Nuvem e Servidor Headless',
              categoria_custo: 'infra',
              status: 'realizado',
              fase: fasesCriadas[1]?.id,
            },
            {
              tipo: 'desembolso',
              valor: 12000,
              data: '2026-11-05 00:00:00.000Z',
              descricao: 'Horas de desenvolvimento frontend & APIs',
              categoria_custo: 'equipe',
              status: 'realizado',
              fase: fasesCriadas[2]?.id,
            },
            {
              tipo: 'desembolso',
              valor: 4500,
              data: '2026-11-25 00:00:00.000Z',
              descricao: 'Ambiente de testes e automação QA',
              categoria_custo: 'infra',
              status: 'previsto',
              fase: fasesCriadas[3]?.id,
            },
          ]

          for (const l of lancamentos) {
            const rf = new Record(finCol)
            rf.set('projeto', projLojaY.id)
            rf.set('tipo', l.tipo)
            rf.set('valor', l.valor)
            rf.set('data', l.data)
            rf.set('descricao', l.descricao)
            rf.set('categoria_custo', l.categoria_custo)
            rf.set('status', l.status)
            if (l.fase) rf.set('fase', l.fase)
            app.save(rf)
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao semear dados iniciais de projetos:', err)
    }
  },
  (app) => {
    try {
      const finCol = app.findCollectionByNameOrId('projeto_financeiro')
      app.delete(finCol)
    } catch (_) {}

    try {
      const invCol = app.findCollectionByNameOrId('projeto_investidores')
      app.delete(invCol)
    } catch (_) {}

    try {
      const eqCol = app.findCollectionByNameOrId('projeto_equipe')
      app.delete(eqCol)
    } catch (_) {}

    try {
      const fasCol = app.findCollectionByNameOrId('projeto_fases')
      app.delete(fasCol)
    } catch (_) {}
  },
)
