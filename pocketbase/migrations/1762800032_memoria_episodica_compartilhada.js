/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 3 + 4 — Memória episódica e memória compartilhada entre agentes.
 *
 * - episodios_memoria: UM episódio por usuario+data (linha do tempo), encadeado
 *   via episodio_anterior; pendencias_carregadas herda o a_fazer do dia anterior.
 * - memoria_compartilhada: fatos/aprendizados deduplicados por
 *   (usuario, agente_origem, tipo, chave) — os agentes escrevem e leem aqui.
 *
 * Padrão da 1762800031: criação com fields-array + app.save; a autorrelação
 * (episodio_anterior) e o relation usuario entram em save separado (o validador
 * exige o campo definido antes da regra); índices via app.runCommand APÓS os
 * saves — só referenciam colunas declaradas (created/updated são autodate).
 */

migrate(
  (app) => {
    // ───────────────────── episodios_memoria ─────────────────────
    let episodios = null
    try {
      episodios = app.findCollectionByNameOrId('episodios_memoria')
    } catch (_) {
      episodios = new Collection({
        type: 'base',
        name: 'episodios_memoria',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'data', type: 'text', required: true, max: 10 },
          { name: 'titulo', type: 'text', max: 200 },
          { name: 'resumo', type: 'text' },
          { name: 'feito', type: 'text' },
          { name: 'a_fazer', type: 'text' },
          { name: 'decisoes', type: 'text' },
          { name: 'pendencias_carregadas', type: 'json' },
          { name: 'total_registros', type: 'number', onlyInt: true },
          { name: 'gerado_por', type: 'text', max: 120 },
          { name: 'origem', type: 'text', max: 20 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(episodios)

      // relation usuario + regras escopadas (em save separado, padrão 1762800031)
      if (!episodios.fields.getByName('usuario')) {
        episodios.fields.add(
          new RelationField({
            name: 'usuario',
            required: true,
            maxSelect: 1,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
          }),
        )
      }
      // autorrelação (episódio anterior) — precisa do id da própria coleção
      if (!episodios.fields.getByName('episodio_anterior')) {
        episodios.fields.add(
          new RelationField({
            name: 'episodio_anterior',
            maxSelect: 1,
            collectionId: episodios.id,
            onDelete: 'set null',
          }),
        )
      }
      episodios.listRule = "@request.auth.id != '' && usuario = @request.auth.id"
      episodios.viewRule = "@request.auth.id != '' && usuario = @request.auth.id"
      episodios.createRule = "@request.auth.id != '' && usuario = @request.auth.id"
      episodios.updateRule = "@request.auth.id != '' && usuario = @request.auth.id"
      episodios.deleteRule = "@request.auth.id != '' && usuario = @request.auth.id"
      app.save(episodios)

      try {
        app.runCommand(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_episodios_usuario_data ON episodios_memoria (usuario, data)',
        )
      } catch (_) {}
      try {
        app.runCommand(
          'CREATE INDEX IF NOT EXISTS idx_episodios_usuario_data2 ON episodios_memoria (usuario, data, id)',
        )
      } catch (_) {}
    }

    // ───────────────────── memoria_compartilhada ─────────────────────
    let comp = null
    try {
      comp = app.findCollectionByNameOrId('memoria_compartilhada')
    } catch (_) {
      comp = new Collection({
        type: 'base',
        name: 'memoria_compartilhada',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'agente_origem', type: 'text', required: true, max: 120 },
          { name: 'tipo', type: 'text', required: true, max: 40 },
          { name: 'chave', type: 'text', required: true, max: 160 },
          { name: 'conteudo', type: 'text', required: true },
          { name: 'entidade', type: 'text', max: 200 },
          { name: 'data_origem', type: 'text', max: 10 },
          { name: 'fonte', type: 'text', max: 200 },
          { name: 'ativo', type: 'bool' },
          { name: 'vezes_citada', type: 'number', onlyInt: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(comp)

      if (!comp.fields.getByName('usuario')) {
        comp.fields.add(
          new RelationField({
            name: 'usuario',
            required: true,
            maxSelect: 1,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
          }),
        )
      }
      comp.listRule = "@request.auth.id != '' && usuario = @request.auth.id"
      comp.viewRule = "@request.auth.id != '' && usuario = @request.auth.id"
      comp.createRule = "@request.auth.id != '' && usuario = @request.auth.id"
      comp.updateRule = "@request.auth.id != '' && usuario = @request.auth.id"
      comp.deleteRule = "@request.auth.id != '' && usuario = @request.auth.id"
      app.save(comp)

      // índices — TODA coluna após ON (...) existe nos fields declarados
      // (created é autodate, declarado acima)
      try {
        app.runCommand(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_memcomp_dedupe ON memoria_compartilhada (usuario, agente_origem, tipo, chave)',
        )
      } catch (_) {}
      try {
        app.runCommand(
          'CREATE INDEX IF NOT EXISTS idx_memcomp_usuario ON memoria_compartilhada (usuario, created)',
        )
      } catch (_) {}
    }

    // Analista de Memória: tools de leitura das duas coleções novas (putTools
    // incremental, preserva as existentes) + prompt na ordem dossiês → episódios
    // → memória compartilhada → dados em tempo real.
    $ai.agents.putTools(app, 'diamantina-analista-memoria', [
      { collection: 'episodios_memoria', perms: { list: true, read: true } },
      { collection: 'memoria_compartilhada', perms: { list: true, read: true } },
    ])
    $ai.agents.define(app, {
      slug: 'diamantina-analista-memoria',
      name: 'Diamantina — Analista de Memória',
      description:
        'Segunda funcionária de IA do Agenda IA Diamond: o segundo cérebro conversável. Responde perguntas em português sobre negócios, contatos, projetos, fluxos, cards, conversas, sementes/teses e resumos, sempre com base nos dados reais do sistema e citando a origem de cada informação. Consulta primeiro os dossiês consolidados, depois a linha do tempo episódica, depois a memória compartilhada entre agentes, e cai para a busca em tempo real só quando nada disso cobre.',
      systemPrompt: `Você é a Diamantina, a Analista de Memória do 'Agenda IA Diamond' — o segundo cérebro conversável do usuário e a segunda funcionária de IA do sistema.
Você fala SEMPRE em português do Brasil (pt-BR), com tom executivo, acolhedor e objetivo — nada de jargão em inglês.

Sua missão: responder perguntas sobre o NEGÓCIO e a OPERAÇÃO do usuário usando os DADOS REAIS do sistema.

ORDEM DE CONSULTA OBRIGATÓRIA:
1. PRIMEIRO consulte a coleção dossies_memoria (dossiês consolidados por pessoa/negócio/projeto). Se o dossiê da entidade perguntada existir e cobrir a pergunta, RESPONDA A PARTIR DELE. Cite-o ("conforme o dossiê consolidado de X, atualizado em dd/mm").
2. Depois, consulte a coleção episodios_memoria (linha do tempo episódica: um episódio por dia, com feito/a_fazer/decisões e pendências carregadas do dia anterior) para perguntas de período ("esta semana", "o que rolou ontem").
3. Depois, consulte a coleção memoria_compartilhada (fatos duradouros, preferências e aprendizados que os outros agentes registraram — campo conteudo, tipo, chave, ativo).
4. Por fim, se nada disso cobrir, consulte as coleções de leitura em tempo real (contatos, cards, fluxos_kanban, folha_dia, resumos_dia, teses_sementes, chat_mensagens, demandas, projetos, eventos_calendario, tarefas_card, profiles) e diga que foi além das camadas de memória.
5. SEMPRE cite de onde tirou cada informação (ex.: "no episódio de 12/03", "fato compartilhado pela Organizadora", "no card 'X' do fluxo Y").
6. Você é SOMENTE LEITURA: analise, resuma e recomende, mas NUNCA crie, altere ou apague registros.
7. Se os dados não existirem, diga com franqueza que não encontrou registro e sugira onde procurar. NUNCA invente nomes, datas, valores ou decisões.
8. Perguntas de acompanhamento ("e o projeto Y?") devem ser respondidas com o contexto da conversa anterior.
9. Se a pergunta for ambígua (dois contatos com nome parecido), pergunte qual deles antes de responder — ou apresente as duas opções.

CORRESPONDÊNCIA POR SIGNIFICADO: quando o usuário perguntar "aquela conversa em que desistimos do preço alto", procure pelo SIGNIFICADO — desistir de preço alto pode estar escrito como "mantivemos o ticket premium" ou "não demos desconto". Compare a intenção da pergunta com o conteúdo dos registros, não apenas palavras-chave.`,
    })
  },
  (app) => {
    try {
      app.deleteIndex('idx_episodios_usuario_data')
      app.deleteIndex('idx_episodios_usuario_data2')
      app.deleteIndex('idx_memcomp_dedupe')
      app.deleteIndex('idx_memcomp_usuario')
    } catch (_) {}
    try {
      $ai.agents.deleteTools(app, 'diamantina-analista-memoria', [
        'episodios_memoria',
        'memoria_compartilhada',
      ])
    } catch (_) {}
    try {
      const comp = app.findCollectionByNameOrId('memoria_compartilhada')
      app.delete(comp)
    } catch (_) {}
    try {
      const ep = app.findCollectionByNameOrId('episodios_memoria')
      app.delete(ep)
    } catch (_) {}
  },
)
