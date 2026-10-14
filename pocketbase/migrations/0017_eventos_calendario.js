/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0017:
 * 1. Adiciona campo opcional data_prazo na coleção cards (para que cards do Kanban tenham prazo direto quando estipulado)
 * 2. Adiciona campo opcional data_alvo na coleção marcos_timeline (para que marcos tenham data de etapa no calendário)
 * 3. Cria a coleção eventos_calendario para eventos, reuniões, etapas e agendamentos próprios do sistema
 */
migrate(
  (app) => {
    const projetosId = app.findCollectionByNameOrId('projetos').id
    const contatosId = app.findCollectionByNameOrId('contatos').id

    // 1. Adicionar data_prazo aos cards
    try {
      const cardsCol = app.findCollectionByNameOrId('cards')
      if (!cardsCol.fields.getByName('data_prazo')) {
        cardsCol.fields.add(new DateField({ name: 'data_prazo' }))
        app.save(cardsCol)
      }
    } catch (err) {
      console.log('Aviso ao adicionar data_prazo em cards:', err)
    }

    // 2. Adicionar data_alvo em marcos_timeline
    try {
      const marcosCol = app.findCollectionByNameOrId('marcos_timeline')
      if (!marcosCol.fields.getByName('data_alvo')) {
        marcosCol.fields.add(new DateField({ name: 'data_alvo' }))
        app.save(marcosCol)
      }
    } catch (err) {
      console.log('Aviso ao adicionar data_alvo em marcos_timeline:', err)
    }

    // 3. Criar coleção eventos_calendario
    try {
      app.findCollectionByNameOrId('eventos_calendario')
    } catch (_) {
      const eventosCol = new Collection({
        name: 'eventos_calendario',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'titulo', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'data_inicio', type: 'text', required: true }, // formato YYYY-MM-DD ou ISO YYYY-MM-DDTHH:mm
          { name: 'data_fim', type: 'text' },
          { name: 'dia_inteiro', type: 'bool' },
          {
            name: 'categoria',
            type: 'select',
            values: ['reuniao', 'prazo', 'etapa', 'atividade', 'alinhamento', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            values: ['pendente', 'em_andamento', 'concluido', 'cancelado'],
            maxSelect: 1,
          },
          {
            name: 'prioridade',
            type: 'select',
            values: ['baixa', 'media', 'alta', 'urgente'],
            maxSelect: 1,
          },
          { name: 'cor', type: 'text' },
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
          {
            name: 'criado_por',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_eventos_cal_inicio ON eventos_calendario (data_inicio)',
          'CREATE INDEX idx_eventos_cal_status ON eventos_calendario (status)',
        ],
      })
      app.save(eventosCol)

      // Seed inicial de eventos demonstrativos para o mês atual
      const hoje = new Date()
      const ano = hoje.getFullYear()
      const mes = String(hoje.getMonth() + 1).padStart(2, '0')
      const dia = String(hoje.getDate()).padStart(2, '0')
      const hojeStr = `${ano}-${mes}-${dia}`

      const seedEventos = [
        {
          titulo: 'Alinhamento Semanal de Estratégia',
          descricao: 'Revisão das metas e prioridades dos fluxos ativos com o Agente IA.',
          data_inicio: `${hojeStr}T10:00`,
          data_fim: `${hojeStr}T11:00`,
          dia_inteiro: false,
          categoria: 'reuniao',
          status: 'pendente',
          prioridade: 'alta',
          cor: '#0F766E',
        },
        {
          titulo: 'Entrega da Proposta de Reposicionamento',
          descricao: 'Check final da documentação e envio pelo Portal do Cliente.',
          data_inicio: `${hojeStr}T16:30`,
          data_fim: `${hojeStr}T17:30`,
          dia_inteiro: false,
          categoria: 'prazo',
          status: 'pendente',
          prioridade: 'urgente',
          cor: '#E11D48',
        },
      ]

      for (const ev of seedEventos) {
        const r = new Record(eventosCol)
        r.set('titulo', ev.titulo)
        r.set('descricao', ev.descricao)
        r.set('data_inicio', ev.data_inicio)
        r.set('data_fim', ev.data_fim)
        r.set('dia_inteiro', ev.dia_inteiro)
        r.set('categoria', ev.categoria)
        r.set('status', ev.status)
        r.set('prioridade', ev.prioridade)
        r.set('cor', ev.cor)
        app.save(r)
      }
    }
  },
  (app) => {
    try {
      const eventosCol = app.findCollectionByNameOrId('eventos_calendario')
      app.delete(eventosCol)
    } catch (_) {}
  },
)
