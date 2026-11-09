/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoint para processamento e estruturação de reuniões gravadas na Folha do Dia.
 *
 * Rota: POST /backend/v1/transcrever-reuniao
 *
 * Modelo de execução:
 * 1. Usa a conta OpenAI conectada pelo próprio usuário ($connectors.execute com OPENAI_CREATE_AUDIO_TRANSCRIPTION e OPENAI_CREATE_CHAT_COMPLETION).
 * 2. Se o usuário NÃO tiver a conta OpenAI conectada, retorna erro amigável em pt-BR instruindo a conectar em Configurações.
 * 3. Transcreve o áudio (ou aceita transcrição direta caso o áudio já venha transcrito / texto de teste) e extrai:
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

    let textoFinal = textoTranscritoFornecido

    // 1. Transcrição via conector OpenAI do usuário (caso haja áudio)
    if (!textoFinal && audioBase64) {
      try {
        const audioFileName = body.nome_arquivo || 'reuniao.webm'
        const resTrans = $connectors.execute(authRecord, 'OPENAI_CREATE_AUDIO_TRANSCRIPTION', {
          model: 'whisper-1',
          raw_content: audioBase64,
          raw_filename: audioFileName,
          raw_mimetype: audioMimeType,
          language: 'pt',
          temperature: 0.2,
        })

        if (!resTrans || !resTrans.successful) {
          const errStr = String(resTrans?.error || '')
          if (
            errStr.includes('not connected') ||
            errStr.includes('No active connection') ||
            errStr.includes('not configured') ||
            errStr.includes('connection not found')
          ) {
            return c.json(400, {
              sucesso: false,
              codigo: 'OPENAI_NAO_CONECTADA',
              mensagem:
                'Sua conta OpenAI não está conectada. Acesse Configurações → Memória Estratégica & Conectores para conectar sua chave OpenAI.',
            })
          }

          return c.json(500, {
            sucesso: false,
            codigo: 'ERRO_TRANSCRICAO',
            mensagem:
              'Não foi possível transcrever o áudio com a sua conta OpenAI: ' +
              (resTrans?.error || 'Erro desconhecido'),
          })
        }

        const transData = resTrans.data || {}
        textoFinal = transData.text || transData.transcript || ''
        if (!textoFinal && typeof transData === 'string') {
          textoFinal = transData
        }
      } catch (connErr) {
        const errMsg = String(connErr?.message || connErr || '')
        if (
          errMsg.includes('not connected') ||
          errMsg.includes('No active connection') ||
          errMsg.includes('not configured')
        ) {
          return c.json(400, {
            sucesso: false,
            codigo: 'OPENAI_NAO_CONECTADA',
            mensagem:
              'Sua conta OpenAI não está conectada. Acesse Configurações → Memória Estratégica & Conectores para conectar sua chave OpenAI.',
          })
        }
        throw connErr
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

    // 2. Extração e estruturação com IA via conector OpenAI do usuário (OPENAI_CREATE_CHAT_COMPLETION)
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

      if (!resChat || !resChat.successful) {
        const errStr = String(resChat?.error || '')
        if (
          errStr.includes('not connected') ||
          errStr.includes('No active connection') ||
          errStr.includes('not configured') ||
          errStr.includes('connection not found')
        ) {
          return c.json(400, {
            sucesso: false,
            codigo: 'OPENAI_NAO_CONECTADA',
            mensagem:
              'Sua conta OpenAI não está conectada. Acesse Configurações → Memória Estratégica & Conectores para conectar sua chave OpenAI.',
          })
        }

        console.log(
          'Aviso: OPENAI_CREATE_CHAT_COMPLETION retornou erro, fallback heurístico:',
          resChat?.error,
        )
      } else {
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
          } catch (pErr) {
            console.log('Erro ao fazer parse do JSON retornado pela OpenAI:', pErr, contentStr)
          }
        }
      }
    } catch (chatErr) {
      const errMsg = String(chatErr?.message || chatErr || '')
      if (
        errMsg.includes('not connected') ||
        errMsg.includes('No active connection') ||
        errMsg.includes('not configured')
      ) {
        return c.json(400, {
          sucesso: false,
          codigo: 'OPENAI_NAO_CONECTADA',
          mensagem:
            'Sua conta OpenAI não está conectada. Acesse Configurações → Memória Estratégica & Conectores para conectar sua chave OpenAI.',
        })
      }
      console.log('Erro ao chamar chat completion OpenAI:', chatErr)
    }

    // Fallback heurístico inteligente se o chat completion não gerou JSON
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
