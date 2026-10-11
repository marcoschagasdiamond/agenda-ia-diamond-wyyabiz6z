/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para resumir arquivos enviados (PDF, DOCX, XLSX, etc.) usando $documents.toMarkdown
 */
routerAdd(
  'POST',
  '/backend/v1/arquivos/resumir',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')

      const files = e.findUploadedFiles('arquivo')
      if (!files || files.length === 0) {
        return e.badRequestError('Nenhum arquivo enviado.')
      }

      const { markdown, truncated } = $documents.toMarkdown({ file: files[0] })

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é o assistente executivo Diamond. Analise e sintetize o documento fornecido em tópicos objetivos, destacando escopo, decisões, prazos e próximos passos.',
          },
          {
            role: 'user',
            content: markdown,
          },
        ],
      })

      return e.json(200, {
        resumo: aiRes.choices[0].message.content,
        truncated,
      })
    } catch (err) {
      if (err.status === 422) {
        return e.json(422, {
          error: err.message || 'O documento requer OCR ou camada de texto selecionável.',
        })
      }
      return e.json(500, { error: err.message || 'Erro ao processar documento.' })
    }
  },
  $apis.requireAuth(),
)
