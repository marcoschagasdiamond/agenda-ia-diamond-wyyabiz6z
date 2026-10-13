/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0014:
 * 1. Adiciona o campo `is_conclusao` (bool) em `colunas_fluxo` para marcar fases de conclusão (ex: Finalizado).
 * 2. Adiciona o campo `template_origem` (text) em `colunas_fluxo` (opcional).
 * 3. Seed idempotente: caso não existam as colunas do modelo da imagem (Backlog, A Fazer, Fazendo, Conferir, Finalizado)
 *    na categoria padrão, cria-as garantindo que o usuário encontre o board pronto e funcional.
 */
migrate(
  (app) => {
    const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')

    // 1. Campo `is_conclusao` (booleano opcional)
    if (!colunasCol.fields.getByName('is_conclusao')) {
      colunasCol.fields.add(
        new BoolField({
          name: 'is_conclusao',
          required: false,
        }),
      )
    }

    // 2. Campo `template_origem` (texto opcional)
    if (!colunasCol.fields.getByName('template_origem')) {
      colunasCol.fields.add(
        new TextField({
          name: 'template_origem',
          required: false,
        }),
      )
    }

    app.save(colunasCol)

    // 3. Seed inicial do modelo de fases padrão se a categoria DIAMOND BUSINESS (ou primeira disponível) não tiver essas colunas
    try {
      const categorias = app.findRecordsByFilter('categorias_fluxo', '', 'ordem', 1, 0)
      if (categorias.length > 0) {
        const catPadrao = categorias[0]
        const colunasExistentes = app.findRecordsByFilter(
          'colunas_fluxo',
          `categoria = "${catPadrao.id}"`,
          'ordem',
          0,
          0,
        )

        // Se a categoria padrão tiver menos de 2 colunas ou nenhuma coluna das fases, criamos as 5 fases solicitadas
        const temFases = colunasExistentes.some((c) => {
          const tit = c.getString('titulo').toLowerCase()
          return tit.includes('backlog') || tit.includes('finalizado') || tit.includes('fazendo')
        })

        if (!temFases) {
          const fasesPadrao = [
            {
              chave: `backlog_${Date.now()}_1`,
              titulo: 'Backlog',
              cor: '#64748B',
              ordem: 1,
              is_conclusao: false,
            },
            {
              chave: `afazer_${Date.now()}_2`,
              titulo: 'A Fazer',
              cor: '#0EA5E9',
              ordem: 2,
              is_conclusao: false,
            },
            {
              chave: `fazendo_${Date.now()}_3`,
              titulo: 'Fazendo',
              cor: '#F59E0B',
              ordem: 3,
              is_conclusao: false,
            },
            {
              chave: `conferir_${Date.now()}_4`,
              titulo: 'Conferir',
              cor: '#8B5CF6',
              ordem: 4,
              is_conclusao: false,
            },
            {
              chave: `finalizado_${Date.now()}_5`,
              titulo: 'Finalizado',
              cor: '#10B981',
              ordem: 5,
              is_conclusao: true,
            },
          ]

          let idx = colunasExistentes.length + 1
          for (const f of fasesPadrao) {
            const rec = new Record(colunasCol)
            rec.set('chave', f.chave)
            rec.set('titulo', f.titulo)
            rec.set('cor', f.cor)
            rec.set('ordem', idx++)
            rec.set('categoria', catPadrao.id)
            rec.set('is_conclusao', f.is_conclusao)
            rec.set('template_origem', 'padrao_diamond')
            app.save(rec)
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao semear fases padrão:', err)
    }
  },
  (app) => {
    try {
      const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
      if (colunasCol.fields.getByName('is_conclusao')) {
        colunasCol.fields.removeByName('is_conclusao')
      }
      if (colunasCol.fields.getByName('template_origem')) {
        colunasCol.fields.removeByName('template_origem')
      }
      app.save(colunasCol)
    } catch (_) {}
  },
)
