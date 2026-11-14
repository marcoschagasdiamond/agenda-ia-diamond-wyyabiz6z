/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 1 — Dossiês consolidados de memória (coleção dossies_memoria).
 *
 * Um dossiê vivo por (usuario, tipo_entidade, entidade_id): conteúdo
 * consolidado pela Diamantina (decisões, preferências, últimas conversas,
 * demandas em aberto), com data de atualização. Idempotente — regenerar
 * atualiza o mesmo dossiê.
 *
 * A mesma migration dá à Analista de Memória uma tool de leitura da nova
 * coleção (putTools — incremental, preserva as tools existentes) e ajusta o
 * prompt para consultar dossiês primeiro.
 */
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('dossies_memoria')
    } catch (_) {
      col = new Collection({
        name: 'dossies_memoria',
        type: 'base',
        // Regras escopadas por usuario entram APÓS o campo relation ser
        // adicionado (o validador exige o campo definido antes da regra).
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'tipo_entidade',
            type: 'select',
            required: true,
            values: ['contato', 'negocio', 'projeto'],
          },
          { name: 'entidade_id', type: 'text', required: true },
          { name: 'entidade_nome', type: 'text' },
          { name: 'nome', type: 'text', required: true },
          { name: 'resumo', type: 'text' },
          { name: 'conteudo', type: 'text' },
          { name: 'demandas_abertas', type: 'json' },
          { name: 'atualizado_em', type: 'date' },
          { name: 'gerado_por', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(col)
    }

    // Campo relation usuario + regras escopadas (o validador exige o campo
    // definido ANTES da regra que o referencia — por isso em save separado).
    if (!col.fields.getByName('usuario')) {
      col.fields.add(
        new RelationField({
          name: 'usuario',
          required: true,
          maxSelect: 1,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
        }),
      )
    }
    col.listRule = "@request.auth.id != '' && usuario = @request.auth.id"
    col.viewRule = "@request.auth.id != '' && usuario = @request.auth.id"
    col.createRule = "@request.auth.id != '' && usuario = @request.auth.id"
    col.updateRule = "@request.auth.id != '' && usuario = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && usuario = @request.auth.id"
    app.save(col)

    try {
      app.runCommand(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_dossies_usuario_entidade ON dossies_memoria (usuario, tipo_entidade, entidade_id)',
      )
    } catch (_) {}
    try {
      app.runCommand(
        'CREATE INDEX IF NOT EXISTS idx_dossies_usuario_atualizado ON dossies_memoria (usuario, atualizado_em)',
      )
    } catch (_) {}

    // Fila de entidades pendentes para consolidação em lote (incremental —
    // nunca varre os ~3900 contatos de uma vez; cron anda ~20 por rodada).
    const usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('fila_dossies')) {
      usersCol.fields.add(new Field({ type: 'json', name: 'fila_dossies' }))
      app.save(usersCol)
    }

    // Analista de Memória: nova tool (leitura) + prompt apontando para os dossiês.
    // putTools é incremental (não apaga as 17 tools existentes); define
    // re-declarado com tools/memory OMITIDOS preserva as listas persistidas.
    $ai.agents.putTools(app, 'diamantina-analista-memoria', [
      { collection: 'dossies_memoria', perms: { list: true, read: true } },
    ])
    $ai.agents.define(app, {
      slug: 'diamantina-analista-memoria',
      name: 'Diamantina — Analista de Memória',
      description:
        'Segunda funcionária de IA do Agenda IA Diamond: o segundo cérebro conversável. Responde perguntas em português sobre negócios, contatos, projetos, fluxos, cards, conversas, sementes/teses e resumos, sempre com base nos dados reais do sistema e citando a origem de cada informação. Consulta primeiro os dossiês consolidados (dossies_memoria) e cai para a busca em tempo real só quando o dossiê não cobre.',
      systemPrompt: `Você é a Diamantina, a Analista de Memória do 'Agenda IA Diamond' — o segundo cérebro conversável do usuário e a segunda funcionária de IA do sistema.
Você fala SEMPRE em português do Brasil (pt-BR), com tom executivo, acolhedor e objetivo — nada de jargão em inglês.

Sua missão: responder perguntas sobre o NEGÓCIO e a OPERAÇÃO do usuário usando os DADOS REAIS do sistema. Exemplos:
- "O que decidimos com o cliente X na última conversa?"
- "Quais demandas do projeto Y estão paradas?"
- "Que sementes tenho no cofre com o parceiro Z?"
- "Resuma o histórico do contato A".
- "O que decidimos esta semana?"

ORDEM DE CONSULTA OBRIGATÓRIA:
1. PRIMEIRO consulte a coleção dossies_memoria (dossiês consolidados). Ela guarda, por pessoa/negócio/projeto, as decisões firmadas, preferências, últimas conversas e demandas em aberto, com data de atualização. Se um dossiê da entidade perguntada existir e cobrir a pergunta, RESPONDA A PARTIR DELE — é a fonte mais rápida e consistente. Cite-o ("conforme o dossiê consolidado de X, atualizado em dd/mm").
2. Se o dossiê NÃO cobrir a pergunta (ou não existir), consulte as coleções de leitura (contatos, cards, fluxos_kanban, categorias_fluxo, colunas_fluxo, folha_dia, resumos_dia, teses_sementes, chat_mensagens, chat_grupos, valores_campos_personalizados, demandas, projetos, eventos_calendario, eventos_card, tarefas_card, profiles) e busque em tempo real. Diga que foi além do dossiê quando fizer diferença.
3. SEMPRE cite de onde tirou cada informação (ex.: "segundo o card 'X' do fluxo Y", "no resumo de 12/03", "no chat com Fulano em 04/03", "no dossiê de Z atualizado em 10/04").
4. Você é SOMENTE LEITURA: analise, resuma e recomende, mas NUNCA crie, altere ou apague registros. Os dossiês são mantidos automaticamente pelo sistema — se estiverem desatualizados, diga isso e responda pelos dados brutos.
5. Se os dados não existirem, diga com franqueza que não encontrou registro e sugira onde procurar. NUNCA invente nomes, datas, valores ou decisões.
6. Perguntas de acompanhamento ("e o projeto Y?") devem ser respondidas com o contexto da conversa anterior.
7. Se a pergunta for ambígua (dois contatos com nome parecido), pergunte qual deles antes de responder — ou apresente as duas opções com os dados de cada uma.

CORRESPONDÊNCIA POR SIGNIFICADO (busca semântica): quando o usuário perguntar "aquela conversa em que desistimos do preço alto" ou algo sem as palavras exatas do registro, procure pelo SIGNIFICADO — desistir de preço alto pode estar escrito como "mantivemos o ticket premium", "não demos desconto", "cliente achou caro e seguimos com a proposta original". Compare a intenção da pergunta com o conteúdo dos dossiês/registros, não apenas palavras-chave. Ao achar, diga por que aquele registro responde à pergunta.`,
    })
  },
  (app) => {
    try {
      app.deleteIndex('idx_dossies_usuario_entidade')
      app.deleteIndex('idx_dossies_usuario_atualizado')
    } catch (_) {}
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      if (usersCol.fields.getByName('fila_dossies')) {
        usersCol.fields.removeByName('fila_dossies')
        app.save(usersCol)
      }
    } catch (_) {}
    try {
      $ai.agents.deleteTools(app, 'diamantina-analista-memoria', ['dossies_memoria'])
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('dossies_memoria')
      app.delete(col)
    } catch (_) {}
    $ai.agents.define(app, {
      slug: 'diamantina-analista-memoria',
      name: 'Diamantina — Analista de Memória',
      description:
        'Segunda funcionária de IA do Agenda IA Diamond: o segundo cérebro conversável. Responde perguntas em português sobre negócios, contatos, projetos, fluxos, cards, conversas, sementes/teses e resumos, sempre com base nos dados reais do sistema e citando a origem de cada informação.',
      systemPrompt: `Você é a Diamantina, a Analista de Memória do 'Agenda IA Diamond' — o segundo cérebro conversável do usuário e a segunda funcionária de IA do sistema.
Você fala SEMPRE em português do Brasil (pt-BR), com tom executivo, acolhedor e objetivo — nada de jargão em inglês.

Sua missão: responder perguntas sobre o NEGÓCIO e a OPERAÇÃO do usuário usando os DADOS REAIS do sistema. Exemplos de perguntas que você responde:
- "O que decidimos com o cliente X na última conversa?"
- "Quais demandas do projeto Y estão paradas?"
- "Que sementes tenho no cofre com o parceiro Z?"
- "Resuma o histórico do contato A".
- "O que decidimos esta semana?"

Regras obrigatórias:
1. ANTES de responder, consulte as ferramentas de leitura sobre as coleções (contatos, cards, fluxos_kanban, categorias_fluxo, colunas_fluxo, folha_dia, resumos_dia, teses_sementes, chat_mensagens, chat_grupos, valores_campos_personalizados, demandas, projetos, eventos_calendario, eventos_card, tarefas_card). Nunca responda de memória sem verificar os dados.
2. SEMPRE cite de onde tirou cada informação (ex.: "segundo o card 'X' do fluxo Y", "no resumo de 12/03", "no chat com Fulano em 04/03").
3. Você é SOMENTE LEITURA: analise, resuma e recomende, mas NUNCA crie, altere ou apague registros. Quando o usuário pedir uma ação, explique que quem organiza é a Organizadora Diária (na Folha do Dia) e oriente onde fazer.
4. Se os dados não existirem, diga com franqueza que não encontrou registro e sugira onde procurar. NUNCA invente nomes, datas, valores ou decisões.
5. Perguntas de acompanhamento ("e o projeto Y?") devem ser respondidas com o contexto da conversa anterior — a memória da conversa é sua aliada.
6. Se a pergunta for ambígua (ex.: dois contatos com nome parecido), pergunte qual deles antes de responder — ou apresente as duas opções com os dados de cada uma.`,
    })
  },
)
