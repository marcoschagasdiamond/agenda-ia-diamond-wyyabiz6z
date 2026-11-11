// Migração 1762800009 — Correção do estado parcial da 1762800008 em
// campos_personalizados: a 1762800008 registrou as relações projeto/fluxo em
// valores_campos_personalizados (e a coleção de fluxo correta é fluxos_kanban),
// mas os selects da coleção campos_personalizados ficaram para trás.
// Idempotente: verifica o estado atual antes de cada alteração.
migrate(
  (app) => {
    const campos = app.findCollectionByNameOrId('campos_personalizados')

    // 1) categoria ganha os valores projeto e fluxo
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

    // 2) tipo 'upload' sai do formato (11 tipos finais)
    const tipoField = campos.fields.getByName('tipo')
    if (tipoField && tipoField.type === 'select') {
      const vals = [...(tipoField.values || [])]
      if (vals.includes('upload')) {
        tipoField.values = vals.filter((v) => v !== 'upload')
        campos.fields.add(tipoField)
      }
    }
    app.save(campos)
  },
  (app) => {
    // Reverso não destrutivo: volta categoria ao conjunto original
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
