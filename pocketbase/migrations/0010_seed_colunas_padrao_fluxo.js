/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0010:
 * Seed idempotente do modelo padrão de colunas do Fluxo Kanban:
 * 1. BACKLOG
 * 2. ENCAMINHAR AO TECNICO
 * 3. EM ANALISE
 * 4. EM DESENVOLVIMENTO
 * 5. TERMINO
 *
 * Todas associadas à categoria padrão "Geral" (ou primeira disponível),
 * preservando todas as categorias, colunas e cards existentes.
 * Se uma coluna com esse título/chave já existir, reaproveita.
 */
migrate(
  (app) => {
    // 1. Obter ou criar a categoria padrão "Geral"
    const categoriasCol = app.findCollectionByNameOrId('categorias_fluxo')
    let catGeralId = ''

    try {
      const catGeral = app.findFirstRecordByData('categorias_fluxo', 'nome', 'Geral')
      catGeralId = catGeral.id
    } catch (_) {
      // Se não existir "Geral", busca primeira categoria ou cria
      const todasCats = app.findRecordsByFilter('categorias_fluxo', '', 'ordem', 1, 0)
      if (todasCats.length > 0) {
        catGeralId = todasCats[0].id
      } else {
        const novaCat = new Record(categoriasCol)
        novaCat.set('nome', 'Geral')
        novaCat.set('ordem', 1)
        novaCat.set('cor', '#0F766E')
        novaCat.set('descricao', 'Fluxos gerais de demandas e projetos')
        app.save(novaCat)
        catGeralId = novaCat.id
      }
    }

    // 2. Colunas padrão solicitadas
    const colunasPadrao = [
      {
        chave: 'backlog',
        titulo: 'BACKLOG',
        cor: '#64748B', // Slate elegante
        ordem: 1,
      },
      {
        chave: 'encaminhar_ao_tecnico',
        titulo: 'ENCAMINHAR AO TECNICO',
        cor: '#0EA5E9', // Sky blue
        ordem: 2,
      },
      {
        chave: 'em_analise',
        titulo: 'EM ANALISE',
        cor: '#F59E0B', // Amber
        ordem: 3,
      },
      {
        chave: 'em_desenvolvimento',
        titulo: 'EM DESENVOLVIMENTO',
        cor: '#8B5CF6', // Purple
        ordem: 4,
      },
      {
        chave: 'termino',
        titulo: 'TERMINO',
        cor: '#10B981', // Emerald
        ordem: 5,
      },
    ]

    const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')

    for (const item of colunasPadrao) {
      let recordExistente = null
      try {
        recordExistente = app.findFirstRecordByData('colunas_fluxo', 'chave', item.chave)
      } catch (_) {
        // Tenta também por título exato se a chave for diferente
        try {
          recordExistente = app.findFirstRecordByData('colunas_fluxo', 'titulo', item.titulo)
        } catch (_) {}
      }

      if (recordExistente) {
        // Atualiza título limpo, ordem e garante vínculo à categoria Geral se não tiver
        recordExistente.set('titulo', item.titulo)
        recordExistente.set('ordem', item.ordem)
        if (!recordExistente.getString('cor')) {
          recordExistente.set('cor', item.cor)
        }
        if (!recordExistente.getString('categoria')) {
          recordExistente.set('categoria', catGeralId)
        }
        app.save(recordExistente)
      } else {
        const novo = new Record(colunasCol)
        novo.set('chave', item.chave)
        novo.set('titulo', item.titulo)
        novo.set('cor', item.cor)
        novo.set('ordem', item.ordem)
        novo.set('categoria', catGeralId)
        app.save(novo)
      }
    }
  },
  () => {
    // Reversão não-destrutiva para proteger dados de produção
  },
)
