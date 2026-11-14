/// <reference path="../pb_data/types.d.ts" />

/**
 * CORREÇÃO da 1762800021_sugestoes_sementes_campos (apply falhou com
 * "fields: (11: (collectionId: cannot be blank.))" — o campo relation
 * 'usuario' foi adicionado sem collectionId). Esta migration segue o MESMO
 * plano de campos da 1762800021, agora com o padrão correto das migrations
 * anteriores (0004b / 1762800018b): cada campo com todos os parâmetros e o
 * relation apontando para a coleção _pb_users_auth_ via id resolvido em runtime.
 *
 * Campos (usados pelo Painel "Sugestões do Caçador de Sementes 🌱🔍" da aba
 * Sementes da /folha):
 * - usuario: relation → users (dono das sugestões; filtro do painel e
 *   idempotência diária);
 * - data_geracao: text com a data da caçada (YYYY-MM-DD, mesmo padrão do
 *   campo `data` de resumos_dia);
 * - sugestoes: JSON array do agente 'diamantina-cacador-sementes' (cada uma:
 *   folha_id, tese, motivo, titulo_card_sugerido, prioridade);
 * - mensagem_vazia: mensagem educada em pt-BR quando não há sementes maduras;
 * - total_sementes / total_maduras: contagens para o painel.
 * - índice único usuario+data_geracao (uma leva por usuário/dia; regenerar =
 *   atualizar o registro existente).
 *
 * Idempotente: getByName retorna falsy quando o campo já existe.
 */
migrate(
  (app) => {
    const usersId = '_pb_users_auth_'
    const col = app.findCollectionByNameOrId('sugestoes_sementes')

    if (!col.fields.getByName('usuario')) {
      col.fields.add(
        new Field({
          type: 'relation',
          name: 'usuario',
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!col.fields.getByName('data_geracao')) {
      col.fields.add(
        new Field({
          type: 'text',
          name: 'data_geracao',
          required: false,
          max: 10,
        }),
      )
    }
    if (!col.fields.getByName('sugestoes')) {
      col.fields.add(
        new Field({
          type: 'json',
          name: 'sugestoes',
          required: false,
          maxSize: 2000000,
        }),
      )
    }
    if (!col.fields.getByName('mensagem_vazia')) {
      col.fields.add(
        new Field({
          type: 'text',
          name: 'mensagem_vazia',
          required: false,
        }),
      )
    }
    if (!col.fields.getByName('total_sementes')) {
      col.fields.add(
        new Field({
          type: 'number',
          name: 'total_sementes',
          required: false,
          onlyInt: true,
        }),
      )
    }
    if (!col.fields.getByName('total_maduras')) {
      col.fields.add(
        new Field({
          type: 'number',
          name: 'total_maduras',
          required: false,
          onlyInt: true,
        }),
      )
    }

    // Índice único usuario+data_geracao (uma leva por usuário/dia) — padrão
    // addIndex da 0025/0028/1762800016 (app.runCommand não executa DDL aqui).
    col.addIndex('idx_sugestoes_sementes_usuario_dia', true, 'usuario, data_geracao', '')

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
    try {
      col.removeIndex('idx_sugestoes_sementes_usuario_dia')
    } catch (_) {}
    app.save(col)
  },
)
