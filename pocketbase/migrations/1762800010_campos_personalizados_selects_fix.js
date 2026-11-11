// Migração 1762800010 — Correção definitiva dos selects de campos_personalizados.
// As migrações 1762800008/1762800009 mutavam o field via getByName + fields.add()
// e o PocketBase não persistiu os novos valores do select. Aqui o field é mutado
// in-place (sem re-add) e a coleção é salva. Idempotente.
migrate(
  (app) => {
    const campos = app.findCollectionByNameOrId('campos_personalizados')

    const catField = campos.fields.getByName('categoria')
    if (catField && catField.type === 'select') {
      const vals = [...(catField.values || [])]
      const alvo = ['card', 'pessoa', 'empresa', 'projeto', 'fluxo']
      const faltam = alvo.filter((v) => !vals.includes(v))
      if (faltam.length > 0) {
        catField.values = alvo
        app.save(campos)
      }
    }

    const tipoField = campos.fields.getByName('tipo')
    if (tipoField && tipoField.type === 'select') {
      const vals = [...(tipoField.values || [])]
      if (vals.includes('upload')) {
        tipoField.values = vals.filter((v) => v !== 'upload')
        app.save(campos)
      }
    }
  },
  (app) => {
    try {
      const campos = app.findCollectionByNameOrId('campos_personalizados')
      const catField = campos.fields.getByName('categoria')
      if (catField && catField.type === 'select') {
        catField.values = ['card', 'pessoa', 'empresa']
        app.save(campos)
      }
    } catch (_) {}
  },
)
