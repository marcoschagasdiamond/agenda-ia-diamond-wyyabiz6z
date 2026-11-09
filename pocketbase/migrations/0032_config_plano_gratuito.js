/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0032: Coleção 'config_plano_gratuito' (Configuração Global do Plano Gratuito / Prova Viva)
 *
 * Permite ao Administrador Master configurar os limites do plano gratuito concedido aos novos usuários:
 * - max_dias_folha (padrão: 2)
 * - max_projetos (padrão: 2)
 * - permite_convites (padrão: false)
 * - modulos_inclusos (json array de códigos de módulos: padrão ['nucleo', 'folha_dia', 'projetos'])
 * - permite_whatsapp (padrão: false)
 * - permite_ia (padrão: false)
 * - permite_financas (padrão: false)
 * - nome_exibicao (padrão: 'Prova Viva (Gratuito)')
 * - descricao (padrão explicativo)
 */

migrate(
  (app) => {
    let configCol = null
    try {
      configCol = app.findCollectionByNameOrId('config_plano_gratuito')
    } catch (_) {}

    if (!configCol) {
      configCol = new Collection({
        name: 'config_plano_gratuito',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          { name: 'max_dias_folha', type: 'number', required: false },
          { name: 'max_projetos', type: 'number', required: false },
          { name: 'permite_convites', type: 'bool', required: false },
          { name: 'permite_whatsapp', type: 'bool', required: false },
          { name: 'permite_ia', type: 'bool', required: false },
          { name: 'permite_financas', type: 'bool', required: false },
          { name: 'modulos_inclusos', type: 'json', required: false },
          { name: 'nome_exibicao', type: 'text', required: false },
          { name: 'descricao', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(configCol)
    }

    // Seed idempotente do registro padrão
    try {
      const existentes = app.findRecordsByFilter('config_plano_gratuito', '1 = 1', 'created', 1, 0)
      if (!existentes || existentes.length === 0) {
        const configRecord = new Record(configCol)
        configRecord.set('max_dias_folha', 2)
        configRecord.set('max_projetos', 2)
        configRecord.set('permite_convites', false)
        configRecord.set('permite_whatsapp', false)
        configRecord.set('permite_ia', false)
        configRecord.set('permite_financas', false)
        configRecord.set('modulos_inclusos', JSON.stringify(['nucleo', 'folha_dia', 'projetos']))
        configRecord.set('nome_exibicao', 'Prova Viva')
        configRecord.set(
          'descricao',
          'Plano gratuito inicial com limite de 2 dias de folha, 2 projetos e módulos nucleo/projetos/folha.',
        )
        app.save(configRecord)
      }
    } catch (seedErr) {
      console.log('[0032] Aviso ao semear config_plano_gratuito:', seedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('config_plano_gratuito')
      app.delete(col)
    } catch (_) {}
  },
)
