/// <reference path="../pb_data/types.d.ts" />

/**
 * Terceiro "funcionário de IA" do Agenda IA Diamond: o Caçador de Sementes.
 * - Define o agente nativo 'diamantina-cacador-sementes' ($ai.agents.define),
 *   no MESMO padrão da Organizadora Diária (0004) e da Analista de Memória
 *   (1762800019): prompt em pt-BR, memória ativa e ferramentas SOMENTE de
 *   leitura (folha_dia, teses_sementes, cards/fluxos, contatos, negócios).
 * - Cria a coleção 'sugestoes_sementes' onde as sugestões de germinação são
 *   gravadas pelo hook pocketbase/hooks/cacador_sementes.js (cron 9h + rota
 *   POST /backend/v1/cacador-sementes/cacar).
 */
migrate(
  (app) => {
    // 1. Coleção sugestoes_sementes (idempotente: cria só se não existir)
    let col
    try {
      col = app.findCollectionByNameOrId('sugestoes_sementes')
    } catch (_) {
      const tesesCol = app.findCollectionByNameOrId('teses_sementes')
      const folhaCol = app.findCollectionByNameOrId('folha_dia')

      col = new Collection({
        name: 'sugestoes_sementes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'semente',
            type: 'relation',
            collectionId: folhaCol.id,
            cascadeDelete: true,
            maxSelect: 1,
            required: true,
          },
          {
            name: 'tese',
            type: 'relation',
            collectionId: tesesCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'parceiro', type: 'text' },
          { name: 'negocio', type: 'text' },
          { name: 'urgencia', type: 'text' },
          { name: 'motivo', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'gerado_por', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sugestoes_sementes_semente ON sugestoes_sementes (semente)',
          'CREATE INDEX idx_sugestoes_sementes_status ON sugestoes_sementes (status)',
        ],
      })
      app.save(col)
    }

    // 2. Agente nativo (linkado pelo slug — nunca recriado fora daqui)
    $ai.agents.define(app, {
      slug: 'diamantina-cacador-sementes',
      name: 'Diamantina — Caçador de Sementes',
      description:
        'Terceiro funcionário de IA do Agenda IA Diamond: caça sementes maduras no Cofre por Tese (folha_dia arquivadas como semente, ainda não germinadas) e sugere germinação, explicando em pt-BR por que cada semente amadureceu. Somente leitura.',
      systemPrompt: `Você é a Diamantina, o Caçador de Sementes do 'Agenda IA Diamond' — o terceiro funcionário de IA do sistema.
Você fala SEMPRE em português do Brasil (pt-BR), com tom executivo, acolhedor e objetivo — nada de jargão em inglês.

Sua missão: revisar o Cofre por Tese (sementes arquivadas da Folha, coleção folha_dia com estado_semente=true e semente_germinada!=true) e identificar SEMENTES MADURAS — aquelas prontas para germinar e virar um card de demanda no Fluxo. Critérios de maturidade:
- a semente está arquivada há muito tempo sem movimento (por exemplo, mais de 30 dias guardada, ou a data_revisao_semente já passou);
- OU o parceiro/negócio da semente apareceu em registros recentes da operação (movimento no relacionamento — há sinal novo de vida naquele assunto).

Regras obrigatórias:
1. Use as ferramentas de leitura (folha_dia, teses_sementes, cards, fluxos_kanban, contatos, negocios, projetos) para confirmar o contexto antes de marcar uma semente como madura. NUNCA invente nomes, datas ou movimentos.
2. Seja conservador: semente recente e sem sinal novo NÃO é madura. Prefira apontar poucas sementes realmente prontas a uma lista inflada.
3. Você é SOMENTE LEITURA: nunca crie, altere ou apague registros — quem germina é o usuário, pelo botão "Germinar" do painel.
4. A justificativa ("motivo") deve ser em pt-BR, curta (1 a 3 frases), citando os critérios observados (há quantos dias está guardada, revisão prevista, movimento do parceiro/negócio).`,
      tier: 'fast',
      tools: [
        { collection: 'folha_dia', perms: { list: true, read: true } },
        { collection: 'teses_sementes', perms: { list: true, read: true } },
        { collection: 'cards', perms: { list: true, read: true } },
        { collection: 'fluxos_kanban', perms: { list: true, read: true } },
        { collection: 'categorias_fluxo', perms: { list: true, read: true } },
        { collection: 'colunas_fluxo', perms: { list: true, read: true } },
        { collection: 'contatos', perms: { list: true, read: true } },
        { collection: 'negocios', perms: { list: true, read: true } },
        { collection: 'projetos', perms: { list: true, read: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Diretrizes Diamantina (Caçador de Sementes): você caça sementes maduras no Cofre por Tese e sugere germinação. Só marca como madura a semente com tempo de arquivo longo OU movimento recente do parceiro/negócio. Justificativa sempre em pt-BR, com os critérios observados. Leitura apenas — nunca escreve no sistema.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'diamantina-cacador-sementes')
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('sugestoes_sementes')
      app.delete(col)
    } catch (_) {}
  },
)
