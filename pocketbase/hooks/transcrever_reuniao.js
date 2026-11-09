/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoint para processamento e estruturação de reuniões gravadas na Folha do Dia.
 *
 * Rota: POST /backend/v1/transcrever-reuniao
 *
 * Modelo de execução:
 * 1. Prioriza a conta OpenAI conectada pelo próprio usuário ($connectors.execute com
 *    OPENAI_CREATE_AUDIO_TRANSCRIPTION e OPENAI_CREATE_CHAT_COMPLETION).
 * 2. Se o usuário NÃO tiver OpenAI conectada, verifica se possui o conector Google Gemini conectado
 *    ($connectors.execute com GEMINI_GENERATE_CONTENT).
 * 3. Se nenhuma IA estiver conectada, retorna erro amigável com código 'IA_NAO_CONECTADA'
 *    instruindo a conectar OpenAI ou Gemini em Configurações.
 * 4. Processa áudio/transcrição e extrai:
 *    - titulo_sugerido
 *    - data_inicio (ISO no fuso ou YYYY-MM-DDTHH:mm)
 *    - data_fim
 *    - data_detectada (boolean)
 *    - data_texto_original (ex: "quinta às 15h")
 *    - participantes (array de strings)
 *    - resumo (texto conciso)
 *    - decisoes (array de strings)
 *    - proximos_passos (array de strings de ação)
 *    - link_reuniao_sugerido (Jitsi único)
 *    - cliente_ou_projeto_detectado (opcional)
 */

routerAdd('POST', '/backend/v1/transcrever-reuniao', (c) => {
  try {
    const authRecord = c.auth
    if (!authRecord || !authRecord.id) {
      return c.json(401, {
        sucesso: false,
        codigo: 'NAO_AUTORIZADO',
        mensagem: 'Usuário não autenticado. Faça login para continuar.',
      })
    }

    const reqInfo = c.requestInfo()
    const body = reqInfo.body || {}
    const audioBase64 = body.audio_base64 || ''
    const audioMimeType = body.mime_type || 'audio/webm'
    const textoTranscritoFornecido = (body.texto_transcrito || '').trim()
    const dataHojeReferencia = body.data_referencia || new Date().toISOString()
    const fusoHorario = body.fuso_horario || 'America/Sao_Paulo'

    if (!audioBase64 && !textoTranscritoFornecido) {
      return c.json(400, {
        sucesso: false,
        codigo: 'AUDIO_OU_TEXTO_OBRIGATORIO',
        mensagem: 'É necessário fornecer a gravação de áudio ou um texto de transcrição.',
      })
    }

    // Helper para verificar se um erro é de conector não conectado
    const isNotConnectedError = (errStr) => {
      const s = String(errStr || '').toLowerCase()
      return (
        s.includes('not connected') ||
        s.includes('no active connection') ||
        s.includes('not configured') ||
        s.includes('connection not found') ||
        s.includes('account not connected') ||
        s.includes('is not connected')
      )
    }

    let textoFinal = textoTranscritoFornecido
    let iaUtilizada = null // 'openai' | 'gemini' | 'nenhuma'
    let openaiDisponivel = true
    let geminiDisponivel = true

    // 1. Transcrição de áudio caso haja áudio e não haja texto direto
    if (!textoFinal && audioBase64) {
      const audioFileName = body.nome_arquivo || 'reuniao.webm'

      // Tentativa 1: Whisper via conector OpenAI do usuário
      try {
        const resTrans = $connectors.execute(authRecord, 'OPENAI_CREATE_AUDIO_TRANSCRIPTION', {
          model: 'whisper-1',
          raw_content: audioBase64,
          raw_filename: audioFileName,
          raw_mimetype: audioMimeType,
          language: 'pt',
          temperature: 0.2,
        })

        if (resTrans && resTrans.successful) {
          const transData = resTrans.data || {}
          textoFinal = transData.text || transData.transcript || ''
          if (!textoFinal && typeof transData === 'string') {
            textoFinal = transData
          }
          if (textoFinal && textoFinal.trim()) {
            iaUtilizada = 'openai'
          }
        } else {
          const errStr = String(resTrans?.error || '')
          if (isNotConnectedError(errStr)) {
            openaiDisponivel = false
          } else {
            console.log('Aviso ao transcrever com OpenAI Whisper:', errStr)
          }
        }
      } catch (whisperErr) {
        const msg = String(whisperErr?.message || whisperErr || '')
        if (isNotConnectedError(msg)) {
          openaiDisponivel = false
        } else {
          console.log('Erro de execução OpenAI Whisper:', whisperErr)
        }
      }

      // Tentativa 2: Se OpenAI não conectada ou sem texto, tentar Gemini via GEMINI_GENERATE_CONTENT
      if (!textoFinal) {
        try {
          // Gemini 1.5/2.0 aceita áudio ou prompt multivariado; enviamos o prompt instruindo transcrição
          const promptAudioGemini =
            'TRANSCRIÇÃO DE ÁUDIO DE REUNIÃO DE TRABALHO.\n' +
            'Você é um transcritor e assistente executivo sênior. O áudio a seguir foi gravado em formato ' +
            audioMimeType +
            ' codificado em base64. ' +
            'Por favor, transcreva integralmente a fala em português do Brasil com fidelidade e correção gramatical. ' +
            'Retorne apenas a transcrição do conteúdo falado.\n\n' +
            '[AUDIO_BASE64_MIME:' +
            audioMimeType +
            ']\n' +
            audioBase64.substring(0, 150000)

          const resGemini = $connectors.execute(authRecord, 'GEMINI_GENERATE_CONTENT', {
            prompt: promptAudioGemini,
            temperature: 0.2,
          })

          if (resGemini && resGemini.successful) {
            const gData = resGemini.data || {}
            let gText = ''
            if (typeof gData === 'string') {
              gText = gData
            } else if (gData.text) {
              gText = gData.text
            } else if (gData.candidates && gData.candidates[0]?.content?.parts?.[0]?.text) {
              gText = gData.candidates[0].content.parts[0].text
            } else if (gData.response) {
              gText = String(gData.response)
            }
            if (gText && gText.trim()) {
              textoFinal = gText.trim()
              iaUtilizada = 'gemini'
            }
          } else {
            const errStr = String(resGemini?.error || '')
            if (isNotConnectedError(errStr)) {
              geminiDisponivel = false
            } else {
              console.log('Aviso ao transcrever com Gemini:', errStr)
            }
          }
        } catch (geminiErr) {
          const msg = String(geminiErr?.message || geminiErr || '')
          if (isNotConnectedError(msg)) {
            geminiDisponivel = false
          } else {
            console.log('Erro de execução Gemini transcrição:', geminiErr)
          }
        }
      }

      // Se ambas as IAs não estiverem conectadas
      if (!openaiDisponivel && !geminiDisponivel && !textoFinal) {
        return c.json(400, {
          sucesso: false,
          codigo: 'IA_NAO_CONECTADA',
          mensagem:
            'Nenhuma IA está conectada. Conecte sua conta OpenAI ou Google Gemini (chave gratuita em aistudio.google.com) em Configurações → Memória Estratégica & Conectores para habilitar a gravação e transcrição.',
        })
      }

      if (!textoFinal && !openaiDisponivel && geminiDisponivel) {
        return c.json(400, {
          sucesso: false,
          codigo: 'ERRO_TRANSCRICAO_GEMINI',
          mensagem:
            'A conta OpenAI não está conectada e a transcrição via Gemini não pôde processar o formato de áudio. Digite as notas da reunião diretamente no campo de texto ou conecte a OpenAI em Configurações.',
        })
      }

      if (!textoFinal && openaiDisponivel && !geminiDisponivel) {
        return c.json(400, {
          sucesso: false,
          codigo: 'OPENAI_NAO_CONECTADA',
          mensagem:
            'Sua conta OpenAI não está conectada. Acesse Configurações para conectar sua chave OpenAI ou Google Gemini.',
        })
      }
    }

    if (!textoFinal || !textoFinal.trim()) {
      return c.json(422, {
        sucesso: false,
        codigo: 'TRANSCRICAO_VAZIA',
        mensagem:
          'O áudio gravado não gerou texto legível. Fale mais próximo ao microfone e tente novamente.',
      })
    }

    // 2. Extração e estruturação com IA (Projetos e Contatos do sistema para vínculo)
    let projetosNomes = []
    let contatosNomes = []
    try {
      const projs = $app.findRecordsByFilter('projetos', 'status != "arquivado"', '-created', 30)
      projetosNomes = projs.map((p) => ({ id: p.id, nome: p.get('nome') }))
    } catch (eProjs) {
      console.log('Aviso ao listar projetos:', eProjs)
    }

    try {
      const conts = $app.findRecordsByFilter('contatos', 'id != ""', '-created', 40)
      contatosNomes = conts.map((ct) => ({ id: ct.id, nome: ct.get('nome') }))
    } catch (eConts) {
      console.log('Aviso ao listar contatos:', eConts)
    }

    const promptSistema = `Você é o assistente executivo e motor de IA da plataforma Agenda IA Diamond.
Sua missão é analisar transcrições de reuniões gravadas e extrair um plano de ação estruturado em JSON rigoroso.

Hoje é: ${dataHojeReferencia} (Fuso horário de referência: ${fusoHorario}).

RESOLUÇÃO DE DATAS E HORAS:
- Resolva datas relativas contra a data de hoje (${dataHojeReferencia}).
  Exemplos:
  - "quinta às 15h": descubra qual a data da próxima quinta-feira relativa a hoje e defina o horário 15:00.
  - "amanhã 10h30": calcule o dia seguinte às 10:30.
  - "sexta-feira que vem": próxima sexta-feira.
  - Se NENHUMA data ou hora for mencionada para a realização/agendamento da reunião ou evento, marque "data_detectada": false, "data_inicio": null, "data_fim": null.
  - Se uma data for detectada, retorne "data_inicio" no formato "YYYY-MM-DDTHH:mm:ss" e "data_fim" (assuma duração de 1 hora se não falado o fim, ex. 15h -> 16h).
  - Indique "data_texto_original" com o trecho exato falado (ex: "quinta às 15h").

PROJETOS E CONTATOS CONHECIDOS NO SISTEMA:
Projetos cadastrados: ${JSON.stringify(projetosNomes)}
Contatos cadastrados: ${JSON.stringify(contatosNomes)}

Se a transcrição mencionar algum desses nomes ou clientes/projetos, identifique o ID correspondente nos campos projeto_id ou contato_id.

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown, sem blocos \`\`\`json) no seguinte formato:
{
  "titulo_sugerido": "Título conciso e executivo da reunião",
  "data_detectada": true ou false,
  "data_texto_original": "trecho de data falado ou null",
  "data_inicio": "YYYY-MM-DDTHH:mm:00" ou null,
  "data_fim": "YYYY-MM-DDTHH:mm:00" ou null,
  "participantes": ["Nome 1", "Nome 2"],
  "resumo": "Resumo executivo em 2 a 4 frases do que foi tratado e alinhado",
  "decisoes": ["Decisão 1 tomada", "Decisão 2 tomada"],
  "proximos_passos": [
    "Ação clara e objetiva para o Kanban 1",
    "Ação clara e objetiva para o Kanban 2"
  ],
  "projeto_id": "id se identificado ou null",
  "contato_id": "id se identificado ou null",
  "urgencia": "baixa" | "media" | "alta" | "urgente"
}`

    let extracaoJson = null
    let salaJitsiId =
      'diamond-' +
      Math.random().toString(36).substring(2, 10) +
      '-' +
      Date.now().toString().slice(-4)

    // Tentativa A: OpenAI Chat Completion (caso OpenAI esteja disponível)
    if (openaiDisponivel) {
      try {
        const resChat = $connectors.execute(authRecord, 'OPENAI_CREATE_CHAT_COMPLETION', {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: promptSistema },
            {
              role: 'user',
              content: 'TRANSCRIÇÃO DA REUNIÃO:\n' + textoFinal,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        })

        if (resChat && resChat.successful) {
          const chatData = resChat.data || {}
          let contentStr = ''
          if (chatData.choices && chatData.choices[0] && chatData.choices[0].message) {
            contentStr = chatData.choices[0].message.content || ''
          } else if (typeof chatData === 'string') {
            contentStr = chatData
          }

          if (contentStr) {
            try {
              const cleaned = contentStr
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim()
              extracaoJson = JSON.parse(cleaned)
              iaUtilizada = 'openai'
            } catch (pErr) {
              console.log('Erro ao fazer parse do JSON retornado pela OpenAI:', pErr, contentStr)
            }
          }
        } else {
          const errStr = String(resChat?.error || '')
          if (isNotConnectedError(errStr)) {
            openaiDisponivel = false
          } else {
            console.log('Aviso OPENAI_CREATE_CHAT_COMPLETION:', errStr)
          }
        }
      } catch (chatErr) {
        const errMsg = String(chatErr?.message || chatErr || '')
        if (isNotConnectedError(errMsg)) {
          openaiDisponivel = false
        } else {
          console.log('Erro ao chamar chat completion OpenAI:', chatErr)
        }
      }
    }

    // Tentativa B: Google Gemini GEMINI_GENERATE_CONTENT (se OpenAI não gerou JSON ou não conectada)
    if (!extracaoJson && geminiDisponivel) {
      try {
        const promptGemini =
          promptSistema +
          '\n\nTRANSCRIÇÃO DA REUNIÃO A ANALISAR:\n' +
          textoFinal +
          '\n\nLembrete importante: retorne EXCLUSIVAMENTE o objeto JSON puro sem marcação de código ou markdown.'

        const resGeminiContent = $connectors.execute(authRecord, 'GEMINI_GENERATE_CONTENT', {
          prompt: promptGemini,
          temperature: 0.2,
        })

        if (resGeminiContent && resGeminiContent.successful) {
          const gData = resGeminiContent.data || {}
          let contentStr = ''
          if (typeof gData === 'string') {
            contentStr = gData
          } else if (gData.text) {
            contentStr = gData.text
          } else if (gData.candidates && gData.candidates[0]?.content?.parts?.[0]?.text) {
            contentStr = gData.candidates[0].content.parts[0].text
          } else if (gData.response) {
            contentStr = String(gData.response)
          }

          if (contentStr) {
            try {
              // Limpeza rigorosa de markdown e crases
              const cleaned = contentStr
                .replace(/```json/gi, '')
                .replace(/```/g, '')
                .trim()
              // Localiza o primeiro { e o último }
              const inicioJson = cleaned.indexOf('{')
              const fimJson = cleaned.lastIndexOf('}')
              if (inicioJson !== -1 && fimJson !== -1 && fimJson > inicioJson) {
                const subJson = cleaned.substring(inicioJson, fimJson + 1)
                extracaoJson = JSON.parse(subJson)
                iaUtilizada = 'gemini'
              } else {
                extracaoJson = JSON.parse(cleaned)
                iaUtilizada = 'gemini'
              }
            } catch (pErr) {
              console.log('Erro ao fazer parse do JSON retornado pelo Gemini:', pErr, contentStr)
            }
          }
        } else {
          const errStr = String(resGeminiContent?.error || '')
          if (isNotConnectedError(errStr)) {
            geminiDisponivel = false
          } else {
            console.log('Aviso GEMINI_GENERATE_CONTENT:', errStr)
          }
        }
      } catch (geminiChatErr) {
        const errMsg = String(geminiChatErr?.message || geminiChatErr || '')
        if (isNotConnectedError(errMsg)) {
          geminiDisponivel = false
        } else {
          console.log('Erro ao chamar Gemini Generate Content:', geminiChatErr)
        }
      }
    }

    // Se nenhuma das IAs estava conectada para a extração
    if (!openaiDisponivel && !geminiDisponivel && !extracaoJson) {
      return c.json(400, {
        sucesso: false,
        codigo: 'IA_NAO_CONECTADA',
        mensagem:
          'Sua conta OpenAI ou Google Gemini não está conectada. Acesse Configurações → Memória Estratégica & Conectores para conectar sua chave OpenAI ou Google Gemini (chave gratuita em aistudio.google.com).',
      })
    }

    // Fallback heurístico inteligente se nenhuma IA estruturou JSON com sucesso
    if (!extracaoJson) {
      const linhas = textoFinal.split('\n').filter((l) => l.trim().length > 0)
      const tituloSugerido = linhas[0]?.substring(0, 70) || 'Reunião capturada na Folha do Dia'
      extracaoJson = {
        titulo_sugerido: tituloSugerido,
        data_detectada: false,
        data_texto_original: null,
        data_inicio: null,
        data_fim: null,
        participantes: [],
        resumo: textoFinal.substring(0, 300),
        decisoes: [],
        proximos_passos: ['Revisar apontamentos da reunião', 'Definir responsáveis no Kanban'],
        projeto_id: null,
        contato_id: null,
        urgencia: 'media',
      }
    }

    const linkReuniaoJitsi = `https://meet.jit.si/${salaJitsiId}`

    return c.json(200, {
      sucesso: true,
      transcricao: textoFinal,
      ia_utilizada: iaUtilizada || (openaiDisponivel ? 'openai' : 'gemini'),
      analise: {
        ...extracaoJson,
        link_reuniao_sugerido: linkReuniaoJitsi,
        sala_jitsi: salaJitsiId,
      },
    })
  } catch (err) {
    console.log('Erro geral em /backend/v1/transcrever-reuniao:', err)
    return c.json(500, {
      sucesso: false,
      codigo: 'ERRO_INTERNO',
      mensagem: 'Erro interno ao processar reunião: ' + (err?.message || String(err)),
    })
  }
})
