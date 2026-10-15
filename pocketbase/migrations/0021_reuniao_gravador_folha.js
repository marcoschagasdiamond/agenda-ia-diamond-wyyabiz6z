/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0021: Adiciona campos de gravação e reunião na coleção folha_dia
 * - is_reuniao (bool): identifica que o assunto se originou de uma gravação de reunião
 * - audio_gravacao (file): arquivo de áudio gravado no navegador (.webm / .mp4 / .ogg / .wav)
 * - duracao_gravacao (number): duração da gravação em segundos
 * - status_transcricao (select): 'aguardando' | 'processado' | 'sem_transcricao'
 * - ata_organizada (json): tópicos organizados pela IA (assuntos, decisões, próximos passos, demandas sugeridas)
 */
migrate(
  (app) => {
    const folhaCol = app.findCollectionByNameOrId('folha_dia')

    if (!folhaCol.fields.getByName('is_reuniao')) {
      folhaCol.fields.add(
        new BoolField({
          name: 'is_reuniao',
        }),
      )
    }

    if (!folhaCol.fields.getByName('audio_gravacao')) {
      folhaCol.fields.add(
        new FileField({
          name: 'audio_gravacao',
          maxSelect: 1,
          maxSize: 104857600, // até 100MB
          mimeTypes: [
            'audio/webm',
            'audio/ogg',
            'audio/wav',
            'audio/mp3',
            'audio/mpeg',
            'audio/mp4',
            'audio/x-m4a',
            'audio/aac',
            'video/webm',
          ],
        }),
      )
    }

    if (!folhaCol.fields.getByName('duracao_gravacao')) {
      folhaCol.fields.add(
        new NumberField({
          name: 'duracao_gravacao',
        }),
      )
    }

    if (!folhaCol.fields.getByName('status_transcricao')) {
      folhaCol.fields.add(
        new SelectField({
          name: 'status_transcricao',
          values: ['aguardando', 'processado', 'sem_transcricao'],
          maxSelect: 1,
        }),
      )
    }

    if (!folhaCol.fields.getByName('ata_organizada')) {
      folhaCol.fields.add(
        new JSONField({
          name: 'ata_organizada',
          maxSize: 1048576,
        }),
      )
    }

    app.save(folhaCol)
  },
  (app) => {
    try {
      const folhaCol = app.findCollectionByNameOrId('folha_dia')
      if (folhaCol.fields.getByName('is_reuniao')) folhaCol.fields.removeByName('is_reuniao')
      if (folhaCol.fields.getByName('audio_gravacao'))
        folhaCol.fields.removeByName('audio_gravacao')
      if (folhaCol.fields.getByName('duracao_gravacao'))
        folhaCol.fields.removeByName('duracao_gravacao')
      if (folhaCol.fields.getByName('status_transcricao'))
        folhaCol.fields.removeByName('status_transcricao')
      if (folhaCol.fields.getByName('ata_organizada'))
        folhaCol.fields.removeByName('ata_organizada')
      app.save(folhaCol)
    } catch (_) {}
  },
)
