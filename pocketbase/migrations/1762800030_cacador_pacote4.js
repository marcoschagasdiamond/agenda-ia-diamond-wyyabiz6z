/// <reference path="../pb_data/types.d.ts" />

/**
 * Pacote das 4 melhorias do Caçador de Sementes — migration 1762800030.
 *
 * 1) sugestoes_sementes: status_registros (JSON — rastro por sugestão:
 *    germinada / ignorada / madura), total_geradas, total_germinadas,
 *    total_ignoradas, preferencias_cacador (JSON — feedback por tipo de
 *    motivo: pesos germinou/ignorou) e resumo (JSON — caçada interpretada).
 * 2) resumos_dia: cacador (JSON — seção "Oportunidades do Caçador" lida da
 *    caçada do dia: total de sugestões, urgente, textos prontos em pt-BR).
 * 3) folha_dia: contador de aparições do Caçador (selo "insistente" — quantas
 *    caçadas já sugeriram aquela semente).
 *
 * Idempotente: getByName retorna falsy quando o campo já existe; índice único
 * via col.addIndex (app.runCommand não executa DDL na JSVM).
 */
migrate(
  (app) => {
    const colSug = app.findCollectionByNameOrId('sugestoes_sementes')
    const jsonFieldsSug = [
      ['status_registros', 60000],
      ['preferencias_cacador', 60000],
      ['resumo', 20000],
    ]
    for (const [nome, maxSize] of jsonFieldsSug) {
      if (!colSug.fields.getByName(nome)) {
        colSug.fields.add(
          new Field({
            type: 'json',
            name: nome,
            required: false,
            maxSize,
          }),
        )
      }
    }
    const numFieldsSug = ['total_geradas', 'total_germinadas', 'total_ignoradas']
    for (const nome of numFieldsSug) {
      if (!colSug.fields.getByName(nome)) {
        colSug.fields.add(
          new Field({
            type: 'number',
            name: nome,
            required: false,
            onlyInt: true,
          }),
        )
      }
    }
    app.save(colSug)

    const colRes = app.findCollectionByNameOrId('resumos_dia')
    if (!colRes.fields.getByName('cacador')) {
      colRes.fields.add(
        new Field({
          type: 'json',
          name: 'cacador',
          required: false,
          maxSize: 20000,
        }),
      )
    }
    app.save(colRes)

    const colFolha = app.findCollectionByNameOrId('folha_dia')
    if (!colFolha.fields.getByName('cacador_aparicoes')) {
      colFolha.fields.add(
        new Field({
          type: 'number',
          name: 'cacador_aparicoes',
          required: false,
          onlyInt: true,
        }),
      )
    }
    app.save(colFolha)
  },
  (app) => {
    const colSug = app.findCollectionByNameOrId('sugestoes_sementes')
    for (const nome of [
      'status_registros',
      'preferencias_cacador',
      'resumo',
      'total_geradas',
      'total_germinadas',
      'total_ignoradas',
    ]) {
      try {
        colSug.fields.removeByName(nome)
      } catch (_) {}
    }
    app.save(colSug)

    const colRes = app.findCollectionByNameOrId('resumos_dia')
    try {
      colRes.fields.removeByName('cacador')
      app.save(colRes)
    } catch (_) {}

    const colFolha = app.findCollectionByNameOrId('folha_dia')
    try {
      colFolha.fields.removeByName('cacador_aparicoes')
      app.save(colFolha)
    } catch (_) {}
  },
)
