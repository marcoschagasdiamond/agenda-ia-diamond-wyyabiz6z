/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0006:
 * 1. Cria colecao colunas_fluxo para persistir e gerenciar colunas e etapas personalizadas do fluxo.
 * 2. Cria colecao marcos_timeline para persistir e gerenciar marcos nomeados de timeline.
 */
migrate(
  (app) => {
    // 1. Criar colecao colunas_fluxo
    const colunasFluxo = new Collection({
      name: 'colunas_fluxo',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'chave', type: 'text', required: true },
        { name: 'titulo', type: 'text', required: true },
        { name: 'cor', type: 'text' },
        { name: 'ordem', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_colunas_fluxo_chave ON colunas_fluxo (chave)'],
    })
    app.save(colunasFluxo)

    // Seed inicial das colunas padrão de fluxo
    const colunasPadrao = [
      { chave: 'novo', titulo: 'Novo / Triagem', cor: '#5B6470', ordem: 1 },
      { chave: 'em_andamento', titulo: 'Em Andamento', cor: '#0F766E', ordem: 2 },
      { chave: 'bloqueado', titulo: 'Bloqueado', cor: '#DC2626', ordem: 3 },
      { chave: 'concluido', titulo: 'Concluído', cor: '#16A34A', ordem: 4 },
    ]

    for (const c of colunasPadrao) {
      const rec = new Record(colunasFluxo)
      rec.set('chave', c.chave)
      rec.set('titulo', c.titulo)
      rec.set('cor', c.cor)
      rec.set('ordem', c.ordem)
      app.save(rec)
    }

    // 2. Criar colecao marcos_timeline
    const projetosId = app.findCollectionByNameOrId('projetos').id
    const marcosTimeline = new Collection({
      name: 'marcos_timeline',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        {
          name: 'projeto',
          type: 'relation',
          collectionId: projetosId,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_marcos_timeline_nome ON marcos_timeline (nome)'],
    })
    app.save(marcosTimeline)

    // Seed de marcos comuns iniciais
    const marcosIniciais = [
      'Sprint 1 / Kickoff',
      'Fase 1 / Diagnóstico',
      'Fase 2 / Execução',
      'Revisão / Validação',
      'Entrega Final',
    ]
    for (const mNome of marcosIniciais) {
      const rec = new Record(marcosTimeline)
      rec.set('nome', mNome)
      app.save(rec)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('colunas_fluxo')
      app.delete(col)
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('marcos_timeline')
      app.delete(col)
    } catch (_) {}
  },
)
