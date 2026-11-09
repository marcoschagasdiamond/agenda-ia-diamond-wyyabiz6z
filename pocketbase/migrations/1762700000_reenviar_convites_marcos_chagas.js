/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration vazia de manutenção preventiva.
 */
migrate((app) => {
  // $connectors só existe dentro do ambiente de pb_hooks, não durante o ciclo de migrações DDL.
})
