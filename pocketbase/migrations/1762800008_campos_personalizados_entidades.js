// Migração 1762800008 — Campos Personalizados: ampliar para projeto/fluxo.
// 1) campos_personalizados.categoria ganha os valores projeto e fluxo (vínculo por
//    instância: cada entidade escolhe seus campos pela caixa de busca, o catálogo
//    nunca é anexado sozinho — entidades novas começam em branco).
// 2) valores_campos_personalizados ganha as relações projeto e fluxo e o índice
//    único passa a cobrir as 4 entidades (campo + card + contato + projeto + fluxo).
// 3) máscara/mascara_outros são aposentadas: máscara é intrínseca ao tipo Números.
// Idempotente: verifica estado atual antes de cada alteração.

migrate(
  (app) => {
    const campos = app.findCollectionByNameOrId('campos_personalizados')

    const catField = campos.fields.getByName('categoria')
    if (catField && catField.type === 'select') {
      const vals = [...(catField.values || [])]
      const alvo = ['card', 'pessoa', 'empresa', 'projeto', 'fluxo']
      const faltam = alvo.filter((v) => !vals.includes(v))
      if (faltam.length > 0) {
        catField.values = [...vals, ...faltam]
        campos.fields.add(catField)
      }
    }

    // Máscara sai do catálogo (intrínseca ao tipo Números/Moeda no frontend)
    if (campos.fields.getByName('mascara')) campos.fields.removeByName('mascara')
    if (campos.fields.getByName('mascara_outros')) campos.fields.removeByName('mascara_outros')

    // Tipo 'upload' sai do formato (11 tipos finais)
    const tipoField = campos.fields.getByName('tipo')
    if (tipoField && tipoField.type === 'select') {
      const vals = [...(tipoField.values || [])]
      if (vals.includes('upload')) {
        tipoField.values = vals.filter((v) => v !== 'upload')
        campos.fields.add(tipoField)
      }
    }
    app.save(campos)

    const valores = app.findCollectionByNameOrId('valores_campos_personalizados')
    const precisaProjeto = !valores.fields.getByName('projeto')
    const precisaFluxo = !valores.fields.getByName('fluxo')
    if (precisaProjeto) {
      valores.fields.add(
        new Field({
          name: 'projeto',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('projetos').id,
          maxSelect: 1,
          cascadeDelete: true,
        }),
      )
    }
    if (precisaFluxo) {
      valores.fields.add(
        new Field({
          name: 'fluxo',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('fluxos_kanban').id,
          maxSelect: 1,
          cascadeDelete: true,
        }),
      )
    }

    // Índice único passa a cobrir as 4 entidades
    const idxAlvo = 'idx_valor_campo_alvo'
    const temIdxAntigo = valores.indexes.some((i) => i.includes(idxAlvo))
    if (temIdxAntigo) {
      valores.indexes = valores.indexes.filter((i) => !i.includes(idxAlvo))
    }
    if (precisaProjeto || precisaFluxo || temIdxAntigo) {
      valores.indexes.push(
        `CREATE UNIQUE INDEX ${idxAlvo} ON valores_campos_personalizados (campo, card, contato, projeto, fluxo)`,
      )
    }
    app.save(valores)
  },
  (app) => {
    // Reverso não destrutivo: restaura o select de categoria original
    try {
      const campos = app.findCollectionByNameOrId('campos_personalizados')
      const catField = campos.fields.getByName('categoria')
      if (catField && catField.type === 'select') {
        catField.values = ['card', 'pessoa', 'empresa']
        campos.fields.add(catField)
      }
      app.save(campos)
    } catch (_) {}
  },
)
