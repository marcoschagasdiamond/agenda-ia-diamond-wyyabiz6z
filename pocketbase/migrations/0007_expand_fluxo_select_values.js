/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0007:
 * Adiciona novos status/fluxos ao select de folha_dia e cards se aplicável,
 * ou garante compatibilidade ampla.
 */
migrate(
  (app) => {
    // 1. Ampliar select de folha_dia.fluxo
    const folhaCol = app.findCollectionByNameOrId('folha_dia')
    const fluxoField = folhaCol.fields.getByName('fluxo')
    if (fluxoField && fluxoField.values) {
      const novos = [
        'novo',
        'em_andamento',
        'bloqueado',
        'concluido',
        'em_revisao',
        'aprovado',
        'aguardando',
        'prioritario',
        'em_espera',
      ]
      fluxoField.values = Array.from(new Set([...fluxoField.values, ...novos]))
      app.save(folhaCol)
    }

    // 2. Ampliar select de cards.status
    const cardsCol = app.findCollectionByNameOrId('cards')
    const statusField = cardsCol.fields.getByName('status')
    if (statusField && statusField.values) {
      const novosStatus = [
        'novo',
        'em_andamento',
        'bloqueado',
        'concluido',
        'em_revisao',
        'aprovado',
        'aguardando',
        'prioritario',
        'em_espera',
      ]
      statusField.values = Array.from(new Set([...statusField.values, ...novosStatus]))
      app.save(cardsCol)
    }
  },
  () => {},
)
