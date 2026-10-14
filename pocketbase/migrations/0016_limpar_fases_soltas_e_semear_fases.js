/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0016:
 * 1. Limpa qualquer registro incorreto de coluna que tenha sido tratado como fase solta ou inconsistente:
 *    - Remove a coluna de teste órfã 'combustivel' (chave: combustivel) que não possui cards vinculados.
 * 2. Garante que os fluxos legítimos existentes em `fluxos_kanban` tenham as 5 fases modelo DiamondGroup
 *    (Backlog, A Fazer, Fazendo, Conferir, Finalizado) vinculadas a eles via `fluxo_id`.
 * 3. Garante que para cada fluxo em `fluxos_kanban`, suas fases estejam criadas de modo limpo e consistente.
 */
migrate(
  (app) => {
    const colunasCol = app.findCollectionByNameOrId('colunas_fluxo')
    const fluxosCol = app.findCollectionByNameOrId('fluxos_kanban')
    const cardsCol = app.findCollectionByNameOrId('cards')

    // 1. Remover coluna órfã 'combustivel' se não tiver nenhum card associado
    try {
      const colunasCombustivel = app.findRecordsByFilter(
        'colunas_fluxo',
        'chave = "combustivel"',
        '',
        10,
        0,
      )
      for (const col of colunasCombustivel) {
        const cardsComEsseStatus = app.findRecordsByFilter(
          'cards',
          `status = "${col.getString('chave')}"`,
          '',
          1,
          0,
        )
        if (cardsComEsseStatus.length === 0) {
          app.delete(col)
        }
      }
    } catch (err) {
      console.log('Aviso ao limpar coluna combustivel:', err)
    }

    // 2. Para todos os fluxos cadastrados em fluxos_kanban, garantir que possuam as 5 fases padrão se ainda não tiverem
    try {
      const todosFluxos = app.findRecordsByFilter('fluxos_kanban', '', 'ordem,created', 50, 0)

      for (const fluxo of todosFluxos) {
        const fasesDoFluxo = app.findRecordsByFilter(
          'colunas_fluxo',
          `fluxo_id = "${fluxo.id}"`,
          'ordem',
          20,
          0,
        )

        // Se o fluxo ainda não tiver fases (ex: Operação Financeira), cria as 5 fases padrão do DiamondGroup
        if (fasesDoFluxo.length === 0) {
          const timestamp = Date.now()
          const fasesPadrao = [
            {
              titulo: 'Backlog',
              cor: '#64748B',
              is_conclusao: false,
              chave: `backlog_${fluxo.id.slice(0, 5)}_${timestamp}_1`,
            },
            {
              titulo: 'A Fazer',
              cor: '#0EA5E9',
              is_conclusao: false,
              chave: `afazer_${fluxo.id.slice(0, 5)}_${timestamp}_2`,
            },
            {
              titulo: 'Fazendo',
              cor: '#F59E0B',
              is_conclusao: false,
              chave: `fazendo_${fluxo.id.slice(0, 5)}_${timestamp}_3`,
            },
            {
              titulo: 'Conferir',
              cor: '#8B5CF6',
              is_conclusao: false,
              chave: `conferir_${fluxo.id.slice(0, 5)}_${timestamp}_4`,
            },
            {
              titulo: 'Finalizado',
              cor: '#10B981',
              is_conclusao: true,
              chave: `finalizado_${fluxo.id.slice(0, 5)}_${timestamp}_5`,
            },
          ]

          let idx = 1
          for (const f of fasesPadrao) {
            const rec = new Record(colunasCol)
            rec.set('chave', f.chave)
            rec.set('titulo', f.titulo)
            rec.set('cor', f.cor)
            rec.set('ordem', idx++)
            rec.set('categoria', fluxo.getString('categoria'))
            rec.set('fluxo_id', fluxo.id)
            rec.set('is_conclusao', f.is_conclusao)
            rec.set('template_origem', 'padrao_diamond')
            app.save(rec)
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao semear fases para fluxos vazios:', err)
    }

    // 3. Vincular cards órfãos (que não possuem fluxo_id preenchido) ao primeiro fluxo da categoria ou pelo status correspondente
    try {
      const cardsSemFluxo = app.findRecordsByFilter(
        'cards',
        'fluxo_id = "" || fluxo_id = null',
        '',
        100,
        0,
      )
      const fluxos = app.findRecordsByFilter('fluxos_kanban', '', 'ordem', 1, 0)
      if (fluxos.length > 0) {
        const fluxoPadrao = fluxos[0]
        for (const card of cardsSemFluxo) {
          card.set('fluxo_id', fluxoPadrao.id)
          app.save(card)
        }
      }
    } catch (err) {
      console.log('Aviso ao atualizar cards órfãos:', err)
    }
  },
  (app) => {
    // Reversão segura sem perda de dados essenciais
  },
)
