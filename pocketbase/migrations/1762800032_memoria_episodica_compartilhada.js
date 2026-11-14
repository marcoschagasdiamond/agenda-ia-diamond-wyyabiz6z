/// <reference path="../pb_data/types.d.ts" />

/**
 * MEMÓRIA EPISÓDICA + MEMÓRIA COMPARTILHADA (camadas 3 e 4 da Diamantina)
 *
 * 1. episodios_memoria — memória episódica diária encadeada:
 *    cada dia vira um episódio (aconteceu / mudancas_estado / pendencias_carregadas),
 *    construído pela Organizadora Diária a partir do resumo do dia + deltas de estado
 *    (cards criados/movidos, demandas alteradas, sementes germinadas). Cada episódio
 *    referencia o anterior (episodio_anterior) e herda as pendências dele.
 *
 * 2. memoria_compartilhada — memória comum aos três agentes (Organizadora,
 *    Analista de Memória e Caçadora): fatos duradouros aprendidos por um são
 *    lidos pelos outros. Deduplicada por índice único
 *    (usuario, agente_origem, tipo, chave).
 *
 * Também dá as tools das duas coleções aos agentes nativos (putTools —
 * incremental, preserva as tools existentes) e redefini o Analista com o
 * systemPrompt atualizado (ordem de consulta: dossiês → episódios → memória
 * compartilhada → dados em tempo real).
 */
migrate(
  (app) => {
    // ————— 1. episodios_memoria —————
    if (!app.findCollectionByNameOrId('episodios_memoria')) {
      const col = new Collection({
        type: 'base',
        name: 'episodios_memoria',
        listRule: 'usuario = @request.auth.id',
        viewRule: 'usuario = @request.auth.id',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            required: true,
            maxSelect: 1,
            collectionId: 'users',
          },
          { name: 'data', type: 'date', required: true },
          { name: 'titulo', type: 'text', maxSize: 300 },
          { name: 'aconteceu', type: 'json', maxSize: 2000000 },
          { name: 'mudancas_estado', type: 'json', maxSize: 2000000 },
          { name: 'pendencias_carregadas', type: 'json', maxSize: 2000000 },
          { name: 'pendencias_resolvidas', type: 'json', maxSize: 2000000 },
          {
            name: 'episodio_anterior',
            type: 'relation',
            maxSelect: 1,
            collectionId: 'episodios_memoria',
          },
          { name: 'resumo_origem', type: 'relation', maxSelect: 1, collectionId: 'resumos_dia' },
          { name: 'totais', type: 'json', maxSize: 100000 },
          { name: 'gerado_por', type: 'select', maxSelect: 1, values: ['cron', 'manual'] },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_episodios_usuario_data ON episodios_memoria (usuario, data)',
        ],
      })
      app.save(col)
    }

    // ————— 2. memoria_compartilhada —————
    if (!app.findCollectionByNameOrId('memoria_compartilhada')) {
      const col = new Collection({
        type: 'base',
        name: 'memoria_compartilhada',
        listRule: 'usuario = @request.auth.id',
        viewRule: 'usuario = @request.auth.id',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            required: true,
            maxSelect: 1,
            collectionId: 'users',
          },
          {
            name: 'agente_origem',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['analista', 'organizadora', 'cacadora'],
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['fato', 'preferencia', 'decisao', 'contexto'],
          },
          { name: 'chave', type: 'text', required: true, maxSize: 200 },
          { name: 'conteudo', type: 'text', required: true, maxSize: 5000 },
          { name: 'entidade', type: 'text', maxSize: 200 },
          { name: 'ativo', type: 'bool' },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mem_compartilhada_unica ON memoria_compartilhada (usuario, agente_origem, tipo, chave)',
          'CREATE INDEX idx_mem_compartilhada_usuario ON memoria_compartilhada (usuario, ativo, updated)',
        ],
      })
      app.save(col)
    }

    // ————— 3. Tools nos três agentes (incremental via putTools) —————
    $ai.agents.putTools(app, 'diamantina-analista-memoria', [
      { collection: 'episodios_memoria', perms: { list: true, read: true } },
      { collection: 'memoria_compartilhada', perms: { list: true, read: true } },
    ])
    $ai.agents.putTools(app, 'diamantina-organizadora-diaria', [
      { collection: 'memoria_compartilhada', perms: { list: true, read: true } },
    ])
    $ai.agents.putTools(app, 'diamantina-cacadora', [
      { collection: 'memoria_compartilhada', perms: { list: true, read: true } },
    ])

    // ————— 4. Prompt do Analista: episódios na ordem de consulta —————
    $ai.agents.define(app, {
      slug: 'diamantina-analista-memoria',
      name: 'Diamantina — Analista de Memória',
      description:
        'Segunda funcionária de IA do Agenda IA Diamond: o segundo cérebro conversável. Responde perguntas em português sobre negócios, contatos, projetos, fluxos, cards, conversas, sementes/teses e resumos, sempre com base nos dados reais do sistema e citando a origem de cada informação. Consulta primeiro os dossiês consolidados e os EPISÓDIOS diários (memória episódica encadeada, com pendências herdadas de um dia para o outro) e cai para a busca em tempo real só quando nada disso cobre.',
      systemPrompt: `Você é a Diamantina, a Analista de Memória do 'Agenda IA Diamond' — o segundo cérebro conversável do usuário e a segunda funcionária de IA do sistema.
Você fala SEMPRE em português do Brasil (pt-BR), com tom executivo, acolhedor e objetivo — nada de jargão em inglês.

Sua missão: responder perguntas sobre o NEGÓCIO e a OPERAÇÃO do usuário usando os DADOS REAIS do sistema. Exemplos:
- "O que decidimos com o cliente X na última conversa?"
- "Quais demandas do projeto Y estão paradas?"
- "Que sementes tenho no cofre com o parceiro Z?"
- "Resuma o histórico do contato A".
- "O que decidimos esta semana?"
- "Desde quando o projeto Y está empacado e o que mudou nesse período?"

ORDEM DE CONSULTA OBRIGATÓRIA:
1. PRIMEIRO consulte a coleção dossies_memoria (dossiês consolidados). Ela guarda, por pessoa/negócio/projeto, as decisões firmadas, preferências, últimas conversas e demandas em aberto, com data de atualização. Se um dossiê da entidade perguntada existir e cobrir a pergunta, RESPONDA A PARTIR DELE — é a fonte mais rápida e consistente. Cite-o ("conforme o dossiê consolidado de X, atualizado em dd/mm").
2. PERGUNTAS DE LINHA DO TEMPO ("o que mudou", "desde quando", "esta semana", "ao longo de", "evolução") → consulte a coleção episodios_memoria (memória episódica diária). Cada episódio tem data, o que aconteceu (aconteceu), o que mudou de estado (mudancas_estado) e as pendências herdadas do dia anterior (pendencias_carregadas), encadeadas por episodio_anterior. Junte vários episódios em sequência para reconstruir a linha do tempo: ex. para "o que mudou no projeto Y esta semana", leia os episódios dos últimos 7 dias e extraia o que cada dia registrou sobre o projeto Y — quando começou, o que travou, o que destravou, o que segue pendente. Cite as datas ("no episódio de 12/03", "entre 10/03 e 14/03").
3. Consulte também memoria_compartilhada (memória compartilhada entre agentes): fatos duradouros aprendidos pela Organizadora, pelo Caçador de Sementes e por você mesma — use-os como contexto que vale para toda a equipe de IAs, citando a origem ("a memória compartilhada da Caçadora registra que…").
4. Se nem dossiê, nem episódios, nem memória compartilhada cobrirem a pergunta, consulte as coleções de leitura (contatos, cards, fluxos_kanban, categorias_fluxo, colunas_fluxo, folha_dia, resumos_dia, teses_sementes, chat_mensagens, chat_grupos, valores_campos_personalizados, demandas, projetos, eventos_calendario, eventos_card, tarefas_card, profiles) e busque em tempo real. Diga que foi além quando fizer diferença.
5. SEMPRE cite de onde tirou cada informação (ex.: "segundo o card 'X' do fluxo Y", "no episódio de 12/03", "no resumo de 12/03", "no chat com Fulano em 04/03", "no dossiê de Z atualizado em 10/04").
6. Você é SOMENTE LEITURA: analise, resuma e recomende, mas NUNCA crie, altere ou apague registros. Dossiês e episódios são mantidos automaticamente pelo sistema — se estiverem desatualizados, diga isso e responda pelos dados brutos.
7. Se os dados não existirem, diga com franqueza que não encontrou registro e sugira onde procurar. NUNCA invente nomes, datas, valores ou decisões.
8. Perguntas de acompanhamento ("e o projeto Y?") devem ser respondidas com o contexto da conversa anterior.
9. Se a pergunta for ambígua (dois contatos com nome parecido), pergunte qual deles antes de responder — ou apresente as duas opções com os dados de cada uma.

CORRESPONDÊNCIA POR SIGNIFICADO (busca semântica): quando o usuário perguntar "aquela conversa em que desistimos do preço alto" ou algo sem as palavras exatas do registro, procure pelo SIGNIFICADO — desistir de preço alto pode estar escrito como "mantivemos o ticket premium", "não demos desconto", "cliente achou caro e seguimos com a proposta original". Compare a intenção da pergunta com o conteúdo dos dossiês/episódios/registros, não apenas palavras-chave. Ao achar, diga por que aquele registro responde à pergunta.`,
      tier: 'fast',
      tools: [
        { collection: 'contatos', perms: { list: true, read: true } },
        { collection: 'cards', perms: { list: true, read: true } },
        { collection: 'fluxos_kanban', perms: { list: true, read: true } },
        { collection: 'categorias_fluxo', perms: { list: true, read: true } },
        { collection: 'colunas_fluxo', perms: { list: true, read: true } },
        { collection: 'folha_dia', perms: { list: true, read: true } },
        { collection: 'resumos_dia', perms: { list: true, read: true } },
        { collection: 'teses_sementes', perms: { list: true, read: true } },
        { collection: 'chat_mensagens', perms: { list: true, read: true } },
        { collection: 'chat_grupos', perms: { list: true, read: true } },
        { collection: 'valores_campos_personalizados', perms: { list: true, read: true } },
        { collection: 'demandas', perms: { list: true, read: true } },
        { collection: 'projetos', perms: { list: true, read: true } },
        { collection: 'eventos_calendario', perms: { list: true, read: true } },
        { collection: 'eventos_card', perms: { list: true, read: true } },
        { collection: 'tarefas_card', perms: { list: true, read: true } },
        { collection: 'profiles', perms: { list: true, read: true } },
        { collection: 'dossies_memoria', perms: { list: true, read: true } },
        { collection: 'episodios_memoria', perms: { list: true, read: true } },
        { collection: 'memoria_compartilhada', perms: { list: true, read: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Diretrizes Diamantina (Analista de Memória): você é o segundo cérebro da conta. Toda resposta cita a origem da informação (coleção/registro/data). Você não escreve nada no sistema — leitura e análise apenas. Quando faltar dado, diga que não encontrou; nunca invente. Ordens de consulta: dossiês consolidados → episódios diários (linha do tempo) → memória compartilhada → coleções em tempo real.',
          },
        },
      ],
    })
  },
  (app) => {
    // Rollback: devolve o agente ao estado anterior e remove as coleções novas
    try {
      app.deleteIndex('idx_episodios_usuario_data')
      app.deleteIndex('idx_episodios_usuario_created')
    } catch (_) {}
    try {
      app.deleteIndex('idx_mem_compartilhada_unica')
      app.deleteIndex('idx_mem_compartilhada_usuario')
    } catch (_) {}
    try {
      $ai.agents.deleteTools(app, 'diamantina-analista-memoria', [
        'episodios_memoria',
        'memoria_compartilhada',
      ])
      $ai.agents.deleteTools(app, 'diamantina-organizadora-diaria', ['memoria_compartilhada'])
      $ai.agents.deleteTools(app, 'diamantina-cacadora', ['memoria_compartilhada'])
    } catch (_) {}
    try {
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
7. Se a pergunta for ambígua (dois contatos com nome parecido), pergunte qual deles antes de responder — ou apresentar as duas opções com os dados de cada uma.

CORRESPONDÊNCIA POR SIGNIFICADO (busca semântica): quando o usuário perguntar "aquela conversa em que desistimos do preço alto" ou algo sem as palavras exatas do registro, procure pelo SIGNIFICADO — desistir de preço alto pode estar escrito como "mantivemos o ticket premium", "não demos desconto", "cliente achou caro e seguimos com a proposta original". Compare a intenção da pergunta com o conteúdo dos dossiês/registros, não apenas palavras-chave. Ao achar, diga por que aquele registro responde à pergunta.`,
        tier: 'fast',
        tools: [
          { collection: 'contatos', perms: { list: true, read: true } },
          { collection: 'cards', perms: { list: true, read: true } },
          { collection: 'fluxos_kanban', perms: { list: true, read: true } },
          { collection: 'categorias_fluxo', perms: { list: true, read: true } },
          { collection: 'colunas_fluxo', perms: { list: true, read: true } },
          { collection: 'folha_dia', perms: { list: true, read: true } },
          { collection: 'resumos_dia', perms: { list: true, read: true } },
          { collection: 'teses_sementes', perms: { list: true, read: true } },
          { collection: 'chat_mensagens', perms: { list: true, read: true } },
          { collection: 'chat_grupos', perms: { list: true, read: true } },
          { collection: 'valores_campos_personalizados', perms: { list: true, read: true } },
          { collection: 'demandas', perms: { list: true, read: true } },
          { collection: 'projetos', perms: { list: true, read: true } },
          { collection: 'eventos_calendario', perms: { list: true, read: true } },
          { collection: 'eventos_card', perms: { list: true, read: true } },
          { collection: 'tarefas_card', perms: { list: true, read: true } },
          { collection: 'profiles', perms: { list: true, read: true } },
          { collection: 'dossies_memoria', perms: { list: true, read: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Diretrizes Diamantina (Analista de Memória): você é o segundo cérebro da conta. Toda resposta cita a origem da informação (coleção/registro/data). Você não escreve nada no sistema — leitura e análise apenas. Quando faltar dado, diga que não encontrou; nunca invente. Ordens de consulta: dossiês consolidados → episódios diários (linha do tempo) → memória compartilhada → coleções em tempo real.',
            },
          },
        ],
      })
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('episodios_memoria')
      app.delete(col)
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('memoria_compartilhada')
      app.delete(col)
    } catch (_) {}
  },
)
