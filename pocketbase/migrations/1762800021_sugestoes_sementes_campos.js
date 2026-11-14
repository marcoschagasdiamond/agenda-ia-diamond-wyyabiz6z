/// <reference path="../pb_data/types.d.ts" />

/**
 * Painel "Sugestões do Caçador de Sementes 🌱🔍" (aba Sementes do Cofre por
 * Tese, na /folha) precisa de:
 * - usuario: dono das sugestões (filtro do painel e idempotência diária);
 * - data_geracao: data da caçada (dd/mm no formato local — mesmo padrão do
 *   campo `data` de resumos_dia), com índice único usuario+data_geracao para
 *   o dia ter uma única leva de sugestões (regenerar = atualizar);
 * - sugestoes: JSON array de sugestões do agente 'diamantina-cacador-sementes'
 *   (cada uma: folha_id, tese, motivo, titulo_card_sugerido, prioridade);
 * - mensagem_vazia: mensagem educada em pt-BR quando não há sementes ativas
 *   ou quando nada está maduro;
 * - total_sementes / total_maduras: contagens para o painel.
 *
 * A migration 1762800020 já criou a coleção (idempotente) com semente, tese,
 * parceiro, negocio, urgencia, motivo, status, gerado_por — campos que o painel
 * de sugestões agrupadas NÃO usa (as sugestões ficam no JSON); eles ficam para
 * um futuro rastreio por semente. Aqui só estendemos, nunca recriamos.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('sugestoes_sementes')

    // Mesmo padrão da 0004b: getByName retorna falsy quando o campo não existe
    if (!col.fields.getByName('usuario')) {
      col.fields.add(new Field({ type: 'relation', name: 'usuario', maxSelect: 1 }))
    }
    if (!col.fields.getByName('data_geracao')) {
      col.fields.add(new Field({ type: 'text', name: 'data_geracao' }))
    }
    if (!col.fields.getByName('sugestoes')) {
      col.fields.add(new Field({ type: 'json', name: 'sugestoes' }))
    }
    if (!col.fields.getByName('mensagem_vazia')) {
      col.fields.add(new Field({ type: 'text', name: 'mensagem_vazia' }))
    }
    if (!col.fields.getByName('total_sementes')) {
      col.fields.add(new Field({ type: 'number', name: 'total_sementes' }))
    }
    if (!col.fields.getByName('total_maduras')) {
      col.fields.add(new Field({ type: 'number', name: 'total_maduras' }))
    }

    // Índice único usuario+data_geracao (idempotente: IF NOT EXISTS, mesmo padrão da 0004b)
    try {
      app.runCommand(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_sugestoes_sementes_usuario_dia ON sugestoes_sementes (usuario, data_geracao)',
      )
    } catch (_) {}

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('sugestoes_sementes')
    for (const nome of [
      'usuario',
      'data_geracao',
      'sugestoes',
      'mensagem_vazia',
      'total_sementes',
      'total_maduras',
    ]) {
      try {
        col.fields.removeByName(nome)
      } catch (_) {}
    }
    app.save(col)
    try {
      app.deleteIndex('idx_sugestoes_sementes_usuario_dia')
    } catch (_) {}
  },
)
