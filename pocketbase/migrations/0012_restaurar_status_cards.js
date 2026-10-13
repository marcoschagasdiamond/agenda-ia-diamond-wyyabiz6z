/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0012:
 * Atualiza os cards existentes que estavam em 'novo' e 'em_andamento'
 * para associá-los ao fluxo correto de trabalho.
 */
migrate(
  (app) => {
    // Restaura status dos 3 cards de demonstração
    try {
      const card1 = app.findFirstRecordByData(
        'cards',
        'titulo',
        'Validar protótipo de checkout Loja Y',
      )
      card1.set('status', 'em_andamento')
      app.save(card1)
    } catch (_) {}

    try {
      const card2 = app.findFirstRecordByData(
        'cards',
        'titulo',
        'Definição de tabela de precificação para coleção de inverno',
      )
      card2.set('status', 'novo')
      app.save(card2)
    } catch (_) {}

    try {
      const card3 = app.findFirstRecordByData('cards', 'titulo', 'reforma apt')
      card3.set('status', 'novo')
      app.save(card3)
    } catch (_) {}
  },
  () => {},
)
