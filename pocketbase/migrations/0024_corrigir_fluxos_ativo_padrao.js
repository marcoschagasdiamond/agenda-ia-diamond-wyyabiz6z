/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0024:
 * Garante que todos os fluxos_kanban existentes e sem ativo definido explicitamente fiquem com `ativo = true`.
 * A migração 0023 utilizou `WHERE ativo IS NULL`, mas o PocketBase inicializa colunas booleanas como 0 (false),
 * deixando indevidamente os fluxos existentes marcados como inativos.
 */
migrate(
  (app) => {
    try {
      app.db().newQuery('UPDATE fluxos_kanban SET ativo = 1').execute()
    } catch (e) {
      console.log('Erro ao atualizar ativo em fluxos_kanban:', e)
    }
  },
  () => {},
)
