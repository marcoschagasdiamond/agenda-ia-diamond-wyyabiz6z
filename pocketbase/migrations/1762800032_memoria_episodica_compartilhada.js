/// <reference path="../pb_data/types.d.ts" />

/**
 * CAMADA 3 + 4 — Memória episódica e memória compartilhada entre agentes.
 *
 * - episodios_memoria: UM episódio por usuario+data (linha do tempo), encadeado
 *   via episodio_anterior; pendencias_carregadas herda o a_fazer do dia anterior.
 * - memoria_compartilhada: fatos/aprendizados deduplicados por
 *   (usuario, agente_origem, tipo, chave) — os agentes escrevem e leem aqui.
 *
 * Padrão de migração: criação com fields-array + app.save; a autorrelação
 * (episodio_anterior) só pode apontar para a própria coleção DEPOIS do
 * primeiro save (que gera o id) — por isso é adicionada em um segundo passo.
 */

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // ───────────────────── episodios_memoria ─────────────────────
    let episodios = null
    try {
      episodios = app.findCollectionByNameOrId('episodios_memoria')
    } catch (_) {
      episodios = new Collection({
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
            collectionId: users.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
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
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_episodios_usuario_data ON episodios_memoria (usuario, data)',
          'CREATE INDEX idx_episodios_usuario_data_desc ON episodios_memoria (usuario, data DESC)',
        ],
      })
      app.save(episodios)

      // autorrelação (episódio anterior) — precisa do id da própria coleção
      episodios.fields.add(
        new Field({
          name: 'episodio_anterior',
          type: 'relation',
          collectionId: episodios.id,
          maxSelect: 1,
          onDelete: 'set null',
        }),
      )
      app.save(episodios)
    }

    // ───────────────────── memoria_compartilhada ─────────────────────
    try {
      app.findCollectionByNameOrId('memoria_compartilhada')
    } catch (_) {
      const compartilhada = new Collection({
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
            collectionId: users.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'agente_origem', type: 'text', required: true, max: 120 },
          { name: 'tipo', type: 'text', required: true, max: 40 },
          { name: 'chave', type: 'text', required: true, max: 160 },
          { name: 'conteudo', type: 'text', required: true },
          { name: 'data_origem', type: 'text', max: 10 },
          { name: 'fonte', type: 'text', max: 200 },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_memcomp_dedupe ON memoria_compartilhada (usuario, agente_origem, tipo, chave)',
          'CREATE INDEX idx_memcomp_usuario ON memoria_compartilhada (usuario, created)',
        ],
      })
      app.save(compartilhada)
    }
  },
  (app) => {
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
