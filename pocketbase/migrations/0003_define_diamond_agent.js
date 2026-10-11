/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'agenda-diamond-assistant',
      name: 'Assistente Agenda IA Diamond',
      description:
        'Segundo Cérebro e copiloto de negócios, clientes, posicionamento, preços e projetos.',
      systemPrompt: `Você é a IA operacional e estrategista do sistema 'Agenda IA Diamond' — o Segundo Cérebro do usuário.
Sua missão:
1. Lembrar e honrar sempre o histórico e contexto dos projetos, negócios, contatos e perfil do usuário.
2. Auxiliar a planejar o dia, estruturar demandas, sintetizar decisões e apontar os próximos passos com clareza executiva.
3. Se perguntado sobre dados ou tarefas, consulte as ferramentas disponíveis (projetos, cards, contatos, resumos_dia, folha_dia).
4. Mantenha tom refinado, objetivo, proativo e acolhedor (padrão executivo 'Diamond').
5. Sempre responda em português do Brasil (pt-BR).
6. Nunca faça perguntas repetidas de onboarding básico — use o histórico e as informações já armazenadas.`,
      tier: 'fast',
      tools: [
        { collection: 'projetos', perms: { list: true, read: true, create: true, update: true } },
        { collection: 'negocios', perms: { list: true, read: true, create: true, update: true } },
        { collection: 'contatos', perms: { list: true, read: true, create: true, update: true } },
        { collection: 'cards', perms: { list: true, read: true, create: true, update: true } },
        { collection: 'folha_dia', perms: { list: true, read: true, create: true, update: true } },
        { collection: 'demandas', perms: { list: true, read: true, create: true, update: true } },
        {
          collection: 'resumos_dia',
          perms: { list: true, read: true, create: true, update: true },
        },
        { collection: 'profiles', perms: { list: true, read: true } },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Diretrizes Agenda Diamond: Foco em execução rápida, clareza em prioridades diárias, acompanhamento rigoroso de clientes e preservação do contexto histórico por meses.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'agenda-diamond-assistant')
    } catch (_) {}
  },
)
