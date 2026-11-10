/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0035 — Integração Google Drive (conectores de app, toolkit googledrive):
 * 1. `card_arquivos` ganha campos de vínculo com o Drive:
 *    - tipo_origem (select: local | drive, default 'local')
 *    - drive_file_id (text) — id do arquivo no Drive do usuário
 *    - drive_url (url) — link de abertura (webViewLink) do arquivo
 * 2. `arquivos` (Área de Arquivos) ganha os mesmos campos.
 *
 * Idempotente: cada campo só é adicionado se ainda não existir.
 * Anexos existentes continuam com tipo_origem vazio (renderizado como 'local').
 */
migrate(
  (app) => {
    const camposDrive = [
      {
        name: 'tipo_origem',
        type: 'select',
        values: ['local', 'drive'],
        maxSelect: 1,
      },
      { name: 'drive_file_id', type: 'text' },
      { name: 'drive_url', type: 'url' },
    ]

    const aplicar = (nomeColecao) => {
      let col
      try {
        col = app.findCollectionByNameOrId(nomeColecao)
      } catch (_) {
        console.log('Coleção não encontrada, pulando:', nomeColecao)
        return
      }
      let mudou = false
      for (const campo of camposDrive) {
        if (col.fields.getByName(campo.name)) continue
        if (campo.type === 'select') {
          col.fields.add(
            new SelectField({
              name: campo.name,
              values: campo.values,
              maxSelect: campo.maxSelect,
            }),
          )
        } else {
          col.fields.add(new TextField({ name: campo.name }))
        }
        mudou = true
      }
      if (mudou) app.save(col)
    }

    aplicar('card_arquivos')
    aplicar('arquivos')
  },
  (app) => {
    for (const nome of ['card_arquivos', 'arquivos']) {
      try {
        const col = app.findCollectionByNameOrId(nome)
        let mudou = false
        for (const nomeCampo of ['tipo_origem', 'drive_file_id', 'drive_url']) {
          if (col.fields.getByName(nomeCampo)) {
            col.fields.removeByName(nomeCampo)
            mudou = true
          }
        }
        if (mudou) app.save(col)
      } catch (_) {}
    }
  },
)
