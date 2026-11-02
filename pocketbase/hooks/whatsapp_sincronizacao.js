/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Integração WhatsApp Diamond:
 * 1. GET /backend/v1/whatsapp/status -> status de conexão, config e números
 * 2. POST /backend/v1/whatsapp/config -> salvar modo de seleção e listas (escolhidos/ignorados)
 * 3. GET /backend/v1/whatsapp/contatos-grupos -> lista contatos e grupos com base na conta e contatos do sistema
 * 4. POST /backend/v1/whatsapp/sincronizar -> busca mensagens novas do WhatsApp e cria na folha_dia
 * 5. POST /backend/v1/whatsapp/ignorar-remetente -> adiciona remetente à lista de ignorados (usado ao arquivar/descartar)
 * 6. CRON sincronizar_whatsapp_diamond a cada 5 minutos -> roda sincronização automática
 *
 * NOTA DE ESCOPO DO JSVM:
 * Todas as funções/helpers devem ficar estritamente INLINE dentro de cada callback de hook/route/cron.
 */

// 1. Rota de Status e Configuração Atual
routerAdd(
  'GET',
  '/backend/v1/whatsapp/status',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) return e.unauthorizedError('Autenticação necessária')

      const app = $app

      // Obter ou criar config do usuário
      let configRec = null
      try {
        configRec = app.findFirstRecordByData('configuracoes_whatsapp', 'usuario', authUser.id)
      } catch (_) {
        try {
          const col = app.findCollectionByNameOrId('configuracoes_whatsapp')
          const rec = new Record(col)
          rec.set('usuario', authUser.id)
          rec.set('modo_selecao', 'todos_exceto')
          rec.set('contatos_escolhidos', '[]')
          rec.set('contatos_ignorados', '[]')
          rec.set('grupos_escolhidos', '[]')
          rec.set('ultima_sincronizacao', '')
          app.save(rec)
          configRec = rec
        } catch (err) {
          console.log(
            '[WhatsApp] Erro ao criar config padrão:',
            err && err.message ? err.message : err,
          )
        }
      }

      let contatosEscolhidos = []
      let contatosIgnorados = []
      let gruposEscolhidos = []

      if (configRec) {
        try {
          contatosEscolhidos = JSON.parse(configRec.getString('contatos_escolhidos')) || []
        } catch (_) {}
        try {
          contatosIgnorados = JSON.parse(configRec.getString('contatos_ignorados')) || []
        } catch (_) {}
        try {
          gruposEscolhidos = JSON.parse(configRec.getString('grupos_escolhidos')) || []
        } catch (_) {}
      }

      // Tentar obter informações de números de telefone registrados na conta conectada do usuário
      let phoneNumbers = []
      let phoneFetchError = null
      try {
        const resPhones = $connectors.execute(authUser, 'WHATSAPP_GET_PHONE_NUMBERS', {})
        if (resPhones.successful && resPhones.data) {
          const raw = resPhones.data
          if (Array.isArray(raw)) {
            phoneNumbers = raw
          } else if (raw && Array.isArray(raw.data)) {
            phoneNumbers = raw.data
          } else if (raw && Array.isArray(raw.phone_numbers)) {
            phoneNumbers = raw.phone_numbers
          }
        } else if (!resPhones.successful) {
          phoneFetchError = resPhones.error || 'Conta de WhatsApp não conectada'
        }
      } catch (err) {
        phoneFetchError = err && err.message ? err.message : String(err)
      }

      return e.json(200, {
        conectado: !phoneFetchError,
        phone_fetch_error: phoneFetchError,
        phone_numbers: phoneNumbers,
        config: {
          modo_selecao: configRec
            ? configRec.getString('modo_selecao') || 'todos_exceto'
            : 'todos_exceto',
          contatos_escolhidos: contatosEscolhidos,
          contatos_ignorados: contatosIgnorados,
          grupos_escolhidos: gruposEscolhidos,
          ultima_sincronizacao: configRec ? configRec.getString('ultima_sincronizacao') : '',
          phone_number_id: configRec ? configRec.getString('phone_number_id') : '',
        },
      })
    } catch (err) {
      return e.json(500, {
        error: err && err.message ? err.message : 'Erro ao buscar status do WhatsApp',
      })
    }
  },
  $apis.requireAuth(),
)

// 2. Rota para Salvar Configurações (modo de seleção, contatos/grupos escolhidos/ignorados)
routerAdd(
  'POST',
  '/backend/v1/whatsapp/config',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) return e.unauthorizedError('Autenticação necessária')

      const app = $app

      let configRec = null
      try {
        configRec = app.findFirstRecordByData('configuracoes_whatsapp', 'usuario', authUser.id)
      } catch (_) {
        try {
          const col = app.findCollectionByNameOrId('configuracoes_whatsapp')
          const rec = new Record(col)
          rec.set('usuario', authUser.id)
          rec.set('modo_selecao', 'todos_exceto')
          rec.set('contatos_escolhidos', '[]')
          rec.set('contatos_ignorados', '[]')
          rec.set('grupos_escolhidos', '[]')
          rec.set('ultima_sincronizacao', '')
          app.save(rec)
          configRec = rec
        } catch (_) {}
      }

      if (!configRec) return e.json(500, { error: 'Não foi possível carregar a configuração' })

      const body = e.requestInfo().body || {}

      if (body.modo_selecao !== undefined) {
        configRec.set('modo_selecao', body.modo_selecao)
      }
      if (body.contatos_escolhidos !== undefined) {
        configRec.set('contatos_escolhidos', JSON.stringify(body.contatos_escolhidos))
      }
      if (body.contatos_ignorados !== undefined) {
        configRec.set('contatos_ignorados', JSON.stringify(body.contatos_ignorados))
      }
      if (body.grupos_escolhidos !== undefined) {
        configRec.set('grupos_escolhidos', JSON.stringify(body.grupos_escolhidos))
      }
      if (body.phone_number_id !== undefined) {
        configRec.set('phone_number_id', body.phone_number_id)
      }

      app.save(configRec)

      return e.json(200, {
        sucesso: true,
        mensagem: 'Configurações de WhatsApp salvas com sucesso',
      })
    } catch (err) {
      return e.json(500, {
        error: err && err.message ? err.message : 'Erro ao salvar configuração',
      })
    }
  },
  $apis.requireAuth(),
)

// 3. Rota para Listar Contatos e Grupos Detectados
routerAdd(
  'GET',
  '/backend/v1/whatsapp/contatos-grupos',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) return e.unauthorizedError('Autenticação necessária')

      const app = $app

      let configRec = null
      try {
        configRec = app.findFirstRecordByData('configuracoes_whatsapp', 'usuario', authUser.id)
      } catch (_) {
        try {
          const col = app.findCollectionByNameOrId('configuracoes_whatsapp')
          const rec = new Record(col)
          rec.set('usuario', authUser.id)
          rec.set('modo_selecao', 'todos_exceto')
          rec.set('contatos_escolhidos', '[]')
          rec.set('contatos_ignorados', '[]')
          rec.set('grupos_escolhidos', '[]')
          rec.set('ultima_sincronizacao', '')
          app.save(rec)
          configRec = rec
        } catch (_) {}
      }

      let phoneId = configRec ? configRec.getString('phone_number_id') : ''

      // Se phoneId não estiver salvo, tenta obter via WHATSAPP_GET_PHONE_NUMBERS
      if (!phoneId) {
        try {
          const resPhones = $connectors.execute(authUser, 'WHATSAPP_GET_PHONE_NUMBERS', {})
          if (resPhones.successful && resPhones.data) {
            const raw = resPhones.data
            let lista = []
            if (Array.isArray(raw)) lista = raw
            else if (raw && Array.isArray(raw.data)) lista = raw.data
            else if (raw && Array.isArray(raw.phone_numbers)) lista = raw.phone_numbers

            if (lista.length > 0 && lista[0].id) {
              phoneId = String(lista[0].id)
              if (configRec) {
                configRec.set('phone_number_id', phoneId)
                app.save(configRec)
              }
            }
          }
        } catch (_) {}
      }

      // Buscar grupos via WHATSAPP_LIST_GROUPS se phoneId estiver disponível
      let gruposWhatsApp = []
      let gruposAviso = null
      if (phoneId) {
        try {
          const resGrupos = $connectors.execute(authUser, 'WHATSAPP_LIST_GROUPS', {
            phone_number_id: phoneId,
            limit: 50,
          })
          if (resGrupos.successful && resGrupos.data) {
            const d = resGrupos.data
            if (Array.isArray(d)) {
              gruposWhatsApp = d
            } else if (d && Array.isArray(d.data)) {
              gruposWhatsApp = d.data
            } else if (d && Array.isArray(d.groups)) {
              gruposWhatsApp = d.groups
            }
          } else if (!resGrupos.successful) {
            gruposAviso = resGrupos.error || 'Não foi possível listar grupos da conta'
          }
        } catch (err) {
          gruposAviso = err && err.message ? err.message : String(err)
        }
      }

      // Buscar mensagens já sincronizadas anteriormente para montar histórico de remetentes
      let sincronizadas = []
      try {
        sincronizadas = app.findRecordsByFilter(
          'mensagens_whatsapp_sincronizadas',
          `usuario = "${authUser.id}"`,
          '-created',
          200,
          0,
        )
      } catch (_) {}

      // Buscar contatos cadastrados no sistema em páginas (lotes de 200 até esgotar)
      let contatosCadastrados = []
      try {
        const batchSize = 200
        let offset = 0
        while (true) {
          const batch = app.findRecordsByFilter('contatos', '', 'nome', batchSize, offset)
          if (!batch || batch.length === 0) break
          contatosCadastrados = contatosCadastrados.concat(batch)
          if (batch.length < batchSize) break
          offset += batchSize
        }
      } catch (errContatos) {
        console.log(
          '[WhatsApp] Erro ao buscar contatos cadastrados paginados:',
          errContatos && errContatos.message ? errContatos.message : errContatos,
        )
      }

      // Agrupar contatos / remetentes conhecidos
      const remetentesMap = {}

      // 1. Contatos do sistema que possuem telefone
      for (const c of contatosCadastrados) {
        const tel = (c.getString('telefone') || '').replace(/\D/g, '')
        if (tel) {
          remetentesMap[tel] = {
            identificador: tel,
            nome: c.getString('nome'),
            empresa: c.getString('empresa') || '',
            telefone: c.getString('telefone'),
            contato_id: c.id,
            is_grupo: false,
            mensagens_count: 0,
            origem: 'sistema',
          }
        }
      }

      // 2. Remetentes que já mandaram mensagem sincronizada
      for (const s of sincronizadas) {
        const isGrupo = s.getBool('is_grupo')
        if (isGrupo) {
          const gId = s.getString('grupo_id') || s.getString('grupo_nome')
          if (gId) {
            if (!gruposWhatsApp.some((g) => g.id === gId || g.name === gId)) {
              gruposWhatsApp.push({
                id: gId,
                name: s.getString('grupo_nome') || gId,
              })
            }
          }
        } else {
          const num = (s.getString('remetente_numero') || '').replace(/\D/g, '')
          const autor = s.getString('autor_mensagem') || s.getString('remetente_nome') || num
          if (num) {
            if (remetentesMap[num]) {
              remetentesMap[num].mensagens_count = (remetentesMap[num].mensagens_count || 0) + 1
              if (!remetentesMap[num].nome && autor) remetentesMap[num].nome = autor
            } else {
              remetentesMap[num] = {
                identificador: num,
                nome: autor || num,
                empresa: '',
                telefone: s.getString('remetente_numero') || num,
                contato_id: null,
                is_grupo: false,
                mensagens_count: 1,
                origem: 'historico_whatsapp',
              }
            }
          }
        }
      }

      const listaRemetentes = Object.values(remetentesMap)

      return e.json(200, {
        sucesso: true,
        phone_number_id: phoneId,
        contatos: listaRemetentes,
        grupos: gruposWhatsApp.map((g) => ({
          id: String(g.id || g.group_id || g.name || ''),
          nome: String(g.name || g.subject || g.id || 'Grupo WhatsApp'),
        })),
        grupos_aviso: gruposAviso,
      })
    } catch (err) {
      return e.json(500, {
        error: err && err.message ? err.message : 'Erro ao listar contatos e grupos',
      })
    }
  },
  $apis.requireAuth(),
)

// 4. Rota para Sincronizar Mensagens Recebidas e Criar Assuntos na folha_dia (Manual sob demanda)
routerAdd(
  'POST',
  '/backend/v1/whatsapp/sincronizar',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) return e.unauthorizedError('Autenticação necessária')

      const app = $app

      let configRec = null
      try {
        configRec = app.findFirstRecordByData('configuracoes_whatsapp', 'usuario', authUser.id)
      } catch (_) {
        try {
          const col = app.findCollectionByNameOrId('configuracoes_whatsapp')
          const rec = new Record(col)
          rec.set('usuario', authUser.id)
          rec.set('modo_selecao', 'todos_exceto')
          rec.set('contatos_escolhidos', '[]')
          rec.set('contatos_ignorados', '[]')
          rec.set('grupos_escolhidos', '[]')
          rec.set('ultima_sincronizacao', '')
          app.save(rec)
          configRec = rec
        } catch (_) {}
      }

      if (!configRec) return e.json(500, { error: 'Configuração do WhatsApp não encontrada' })

      const modoSelecao = configRec.getString('modo_selecao') || 'todos_exceto'
      if (modoSelecao === 'desligado') {
        return e.json(200, {
          sucesso: true,
          mensagens_novas: 0,
          mensagem: 'Sincronização desligada nas configurações. Nenhuma mensagem importada.',
          detalhes: [],
        })
      }

      let contatosEscolhidos = []
      let contatosIgnorados = []
      let gruposEscolhidos = []
      try {
        contatosEscolhidos = JSON.parse(configRec.getString('contatos_escolhidos')) || []
      } catch (_) {}
      try {
        contatosIgnorados = JSON.parse(configRec.getString('contatos_ignorados')) || []
      } catch (_) {}
      try {
        gruposEscolhidos = JSON.parse(configRec.getString('grupos_escolhidos')) || []
      } catch (_) {}

      // Normalizar identificadores de telefones (apenas números)
      const limpar = (v) => String(v || '').replace(/\D/g, '')
      const setEscolhidos = new Set(contatosEscolhidos.map(limpar).filter(Boolean))
      const setIgnorados = new Set(contatosIgnorados.map(limpar).filter(Boolean))
      const setGruposEscolhidos = new Set(
        gruposEscolhidos.map((g) => String(g).trim()).filter(Boolean),
      )

      let phoneId = configRec.getString('phone_number_id')
      if (!phoneId) {
        const resPhones = $connectors.execute(authUser, 'WHATSAPP_GET_PHONE_NUMBERS', {})
        if (resPhones.successful && resPhones.data) {
          const raw = resPhones.data
          let lista = []
          if (Array.isArray(raw)) lista = raw
          else if (raw && Array.isArray(raw.data)) lista = raw.data
          else if (raw && Array.isArray(raw.phone_numbers)) lista = raw.phone_numbers

          if (lista.length > 0 && lista[0].id) {
            phoneId = String(lista[0].id)
            configRec.set('phone_number_id', phoneId)
            app.save(configRec)
          }
        }
      }

      if (!phoneId) {
        return e.json(400, {
          error: 'Nenhum número de telefone WhatsApp Business vinculado à conta conectada.',
        })
      }

      // Buscar histórico de mensagens
      const resHistory = $connectors.execute(authUser, 'WHATSAPP_GET_MESSAGE_HISTORY', {
        phone_number_id: phoneId,
        limit: 50,
      })

      if (!resHistory.successful) {
        return e.json(400, {
          error: resHistory.error || 'Falha ao buscar histórico de mensagens do WhatsApp',
        })
      }

      let mensagensRaw = []
      const dataResp = resHistory.data
      if (Array.isArray(dataResp)) {
        mensagensRaw = dataResp
      } else if (dataResp && Array.isArray(dataResp.data)) {
        mensagensRaw = dataResp.data
      } else if (dataResp && Array.isArray(dataResp.messages)) {
        mensagensRaw = dataResp.messages
      } else if (dataResp && Array.isArray(dataResp.history)) {
        mensagensRaw = dataResp.history
      }

      // Se a resposta estiver em outro formato de chave, registrar e extrair o que houver
      if (mensagensRaw.length === 0 && dataResp && typeof dataResp === 'object') {
        for (const k of Object.keys(dataResp)) {
          if (Array.isArray(dataResp[k])) {
            mensagensRaw = dataResp[k]
            break
          }
        }
      }

      // Carregar contatos cadastrados para vínculo automático por número em páginas (lotes de 200 até esgotar)
      let contatosCadastrados = []
      try {
        const batchSize = 200
        let offset = 0
        while (true) {
          const batch = app.findRecordsByFilter('contatos', '', '', batchSize, offset)
          if (!batch || batch.length === 0) break
          contatosCadastrados = contatosCadastrados.concat(batch)
          if (batch.length < batchSize) break
          offset += batchSize
        }
      } catch (errContatosSync) {
        console.log(
          '[WhatsApp Sync] Erro ao carregar contatos cadastrados paginados:',
          errContatosSync && errContatosSync.message ? errContatosSync.message : errContatosSync,
        )
      }

      const mapaContatosPorNumero = {}
      for (const c of contatosCadastrados) {
        const rawTel = limpar(c.getString('telefone'))
        if (rawTel) {
          mapaContatosPorNumero[rawTel] = c
          if (rawTel.startsWith('55') && rawTel.length > 2) {
            mapaContatosPorNumero[rawTel.slice(2)] = c
          }
        }
      }

      const folhaCol = app.findCollectionByNameOrId('folha_dia')
      const syncCol = app.findCollectionByNameOrId('mensagens_whatsapp_sincronizadas')
      const notifCol = app.findCollectionByNameOrId('notificacoes_sistema')

      let criadasCount = 0
      const detalhes = []
      const novosRemetentes = []
      let primeiroAssuntoId = ''
      const agoraISO = new Date().toISOString()
      const dataHojeStr = agoraISO.split('T')[0]

      for (const msg of mensagensRaw) {
        const messageId = String(
          msg.id || msg.message_id || msg.wamid || msg.wam_id || msg.key?.id || '',
        )
        if (!messageId) continue

        // Idempotência: já sincronizada para este usuário?
        let jaExiste = false
        try {
          app.findFirstRecordByFilter(
            'mensagens_whatsapp_sincronizadas',
            `usuario = "${authUser.id}" && message_id = "${messageId}"`,
          )
          jaExiste = true
        } catch (_) {}

        if (jaExiste) continue

        const fromRaw = String(
          msg.from || msg.sender || msg.from_number || msg.key?.remoteJid || '',
        )
        const isGrupo = Boolean(
          msg.is_group ||
          msg.group_id ||
          msg.chat_type === 'group' ||
          fromRaw.endsWith('@g.us') ||
          msg.recipient_type === 'group',
        )

        const grupoId = isGrupo
          ? String(msg.group_id || msg.chat_id || fromRaw.replace('@g.us', ''))
          : ''
        const grupoNome = isGrupo
          ? String(msg.group_name || msg.chat_name || msg.subject || grupoId)
          : ''

        const remetenteNum = isGrupo
          ? limpar(msg.participant || msg.author || msg.sender_phone || '')
          : limpar(fromRaw.replace('@s.whatsapp.net', ''))

        const autorNome = String(
          msg.author_name ||
            msg.sender_name ||
            msg.pushName ||
            msg.push_name ||
            msg.contact_name ||
            remetenteNum ||
            'Contato WhatsApp',
        )

        let textoMensagem = ''
        if (typeof msg.text === 'string') {
          textoMensagem = msg.text
        } else if (msg.text && typeof msg.text.body === 'string') {
          textoMensagem = msg.text.body
        } else if (typeof msg.body === 'string') {
          textoMensagem = msg.body
        } else if (msg.message && typeof msg.message.conversation === 'string') {
          textoMensagem = msg.message.conversation
        } else if (msg.message && msg.message.extendedTextMessage?.text) {
          textoMensagem = msg.message.extendedTextMessage.text
        } else if (msg.content) {
          textoMensagem =
            typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }

        if (!textoMensagem.trim()) {
          const recSyncVazio = new Record(syncCol)
          recSyncVazio.set('usuario', authUser.id)
          recSyncVazio.set('message_id', messageId)
          recSyncVazio.set('remetente_numero', remetenteNum)
          recSyncVazio.set('remetente_nome', autorNome)
          recSyncVazio.set('is_grupo', isGrupo)
          recSyncVazio.set('grupo_id', grupoId)
          recSyncVazio.set('grupo_nome', grupoNome)
          recSyncVazio.set('autor_mensagem', autorNome)
          recSyncVazio.set('folha_dia_id', '')
          recSyncVazio.set('timestamp_mensagem', String(msg.timestamp || Date.now()))
          app.save(recSyncVazio)
          continue
        }

        let deveEntrar = false

        if (isGrupo) {
          const chaveGrupo1 = grupoId
          const chaveGrupo2 = grupoNome
          if (setGruposEscolhidos.has(chaveGrupo1) || setGruposEscolhidos.has(chaveGrupo2)) {
            deveEntrar = true
          }
        } else {
          if (modoSelecao === 'apenas_escolhidos') {
            if (setEscolhidos.has(remetenteNum)) {
              deveEntrar = true
            }
          } else if (modoSelecao === 'todos_exceto') {
            if (!setIgnorados.has(remetenteNum)) {
              deveEntrar = true
            }
          }
        }

        let folhaIdGerada = ''

        if (deveEntrar) {
          let contatoVinculado = null
          if (remetenteNum) {
            contatoVinculado =
              mapaContatosPorNumero[remetenteNum] ||
              (remetenteNum.startsWith('55')
                ? mapaContatosPorNumero[remetenteNum.slice(2)]
                : null) ||
              mapaContatosPorNumero['55' + remetenteNum] ||
              null
          }

          let registroTextoCompleto = ''
          if (isGrupo) {
            registroTextoCompleto = `[WhatsApp Grupo: ${grupoNome || 'Grupo'}] ${autorNome}: ${textoMensagem.trim()}`
          } else {
            registroTextoCompleto = `[WhatsApp] ${autorNome} (${remetenteNum || 'WhatsApp'}): ${textoMensagem.trim()}`
          }

          const origemRefFormatada = isGrupo
            ? `Grupo: ${grupoNome || grupoId} • ${autorNome}`
            : `${autorNome} (${remetenteNum})`

          let dataHoraMsg = agoraISO.slice(0, 16)
          if (msg.timestamp) {
            try {
              const tsNum = Number(msg.timestamp)
              const d = tsNum > 10000000000 ? new Date(tsNum) : new Date(tsNum * 1000)
              if (!isNaN(d.getTime())) {
                dataHoraMsg = d.toISOString().slice(0, 16)
              }
            } catch (_) {}
          }

          const novaFolha = new Record(folhaCol)
          novaFolha.set('data', dataHojeStr)
          novaFolha.set('data_hora', dataHoraMsg)
          novaFolha.set('registro', registroTextoCompleto)
          novaFolha.set('tipo_origem', 'whatsapp')
          novaFolha.set('origem_ref', origemRefFormatada)
          novaFolha.set('status', 'pendente')
          novaFolha.set('arquivado', false)
          novaFolha.set('fixado', false)

          if (contatoVinculado) {
            novaFolha.set('contato', contatoVinculado.id)
          }

          app.save(novaFolha)
          folhaIdGerada = novaFolha.id
          criadasCount++
          if (!primeiroAssuntoId) primeiroAssuntoId = folhaIdGerada

          const remetenteRotulo = isGrupo ? `${autorNome} (${grupoNome || 'Grupo'})` : autorNome
          novosRemetentes.push(remetenteRotulo)

          detalhes.push({
            message_id: messageId,
            folha_id: folhaIdGerada,
            remetente: autorNome,
            numero: remetenteNum,
            is_grupo: isGrupo,
            grupo: grupoNome,
            contato_vinculado: contatoVinculado ? contatoVinculado.getString('nome') : null,
          })
        }

        const recSync = new Record(syncCol)
        recSync.set('usuario', authUser.id)
        recSync.set('message_id', messageId)
        recSync.set('remetente_numero', remetenteNum)
        recSync.set('remetente_nome', autorNome)
        recSync.set('is_grupo', isGrupo)
        recSync.set('grupo_id', grupoId)
        recSync.set('grupo_nome', grupoNome)
        recSync.set('autor_mensagem', autorNome)
        recSync.set('folha_dia_id', folhaIdGerada)
        recSync.set('timestamp_mensagem', String(msg.timestamp || Date.now()))
        app.save(recSync)
      }

      // Notificação no sino quando houver novos assuntos criados
      if (criadasCount > 0) {
        try {
          const n = new Record(notifCol)
          n.set('usuario', authUser.id)
          n.set('tipo', 'whatsapp')
          if (criadasCount === 1) {
            const rem = novosRemetentes[0] || 'Contato WhatsApp'
            n.set('titulo', `Nova mensagem de WhatsApp de ${rem}`)
            n.set(
              'mensagem',
              `Uma nova mensagem de ${rem} gerou um novo assunto na sua Folha de trabalho.`,
            )
          } else {
            const remExemplos = novosRemetentes.slice(0, 2).join(', ')
            const resto = criadasCount - 2
            const complemento = resto > 0 ? ` e mais ${resto}` : ''
            n.set('titulo', `${criadasCount} novas mensagens de WhatsApp`)
            n.set(
              'mensagem',
              `${criadasCount} novas mensagens recebidas (${remExemplos}${complemento}) adicionaram assuntos na Folha.`,
            )
          }
          n.set('link', primeiroAssuntoId ? `/folha?destaque=${primeiroAssuntoId}` : '/folha')
          n.set('item_tipo', 'folha')
          n.set('item_id', primeiroAssuntoId || '')
          n.set('lida', false)
          app.save(n)
        } catch (errNotif) {
          console.log(
            '[WhatsApp] Erro ao criar notificação no sino:',
            errNotif && errNotif.message ? errNotif.message : errNotif,
          )
        }
      }

      // Atualizar data/hora da última sincronização
      configRec.set('ultima_sincronizacao', agoraISO)
      app.save(configRec)

      return e.json(200, {
        sucesso: true,
        mensagens_processadas: mensagensRaw.length,
        mensagens_novas: criadasCount,
        detalhes: detalhes,
        ultima_sincronizacao: agoraISO,
      })
    } catch (err) {
      return e.json(500, {
        error: err && err.message ? err.message : 'Erro ao sincronizar mensagens',
      })
    }
  },
  $apis.requireAuth(),
)

// 5. Rota de Pós-Filtro: Ignorar Remetente
routerAdd(
  'POST',
  '/backend/v1/whatsapp/ignorar-remetente',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) return e.unauthorizedError('Autenticação necessária')

      const body = e.requestInfo().body || {}
      const remetente = String(body.remetente || '').trim()
      const folhaId = String(body.folha_id || '').trim()

      const app = $app

      let configRec = null
      try {
        configRec = app.findFirstRecordByData('configuracoes_whatsapp', 'usuario', authUser.id)
      } catch (_) {
        try {
          const col = app.findCollectionByNameOrId('configuracoes_whatsapp')
          const rec = new Record(col)
          rec.set('usuario', authUser.id)
          rec.set('modo_selecao', 'todos_exceto')
          rec.set('contatos_escolhidos', '[]')
          rec.set('contatos_ignorados', '[]')
          rec.set('grupos_escolhidos', '[]')
          rec.set('ultima_sincronizacao', '')
          app.save(rec)
          configRec = rec
        } catch (_) {}
      }

      if (!configRec) return e.json(500, { error: 'Configuração não encontrada' })

      let identificadorAlvo = remetente

      if (!identificadorAlvo && folhaId) {
        try {
          const syncRec = app.findFirstRecordByData(
            'mensagens_whatsapp_sincronizadas',
            'folha_dia_id',
            folhaId,
          )
          identificadorAlvo =
            syncRec.getString('remetente_numero') || syncRec.getString('remetente_nome')
        } catch (_) {
          try {
            const f = app.findRecordById('folha_dia', folhaId)
            const ref = f.getString('origem_ref') || ''
            const m = ref.match(/\(([^)]+)\)/)
            if (m) identificadorAlvo = m[1]
            else identificadorAlvo = ref
          } catch (_) {}
        }
      }

      if (!identificadorAlvo) {
        return e.json(400, { error: 'Identificador do remetente não informado' })
      }

      let contatosIgnorados = []
      try {
        contatosIgnorados = JSON.parse(configRec.getString('contatos_ignorados')) || []
      } catch (_) {}

      const limpo = identificadorAlvo.replace(/\D/g, '') || identificadorAlvo
      if (!contatosIgnorados.includes(limpo)) {
        contatosIgnorados.push(limpo)
        configRec.set('contatos_ignorados', JSON.stringify(contatosIgnorados))
        app.save(configRec)
      }

      return e.json(200, {
        sucesso: true,
        remetente_ignorado: limpo,
        contatos_ignorados: contatosIgnorados,
      })
    } catch (err) {
      return e.json(500, {
        error: err && err.message ? err.message : 'Erro ao adicionar remetente aos ignorados',
      })
    }
  },
  $apis.requireAuth(),
)

// 6. Job Agendado: Sincronização Automática a cada 5 minutos
cronAdd('sincronizar_whatsapp_diamond', '*/5 * * * *', () => {
  try {
    const app = $app
    const folhaCol = app.findCollectionByNameOrId('folha_dia')
    const syncCol = app.findCollectionByNameOrId('mensagens_whatsapp_sincronizadas')
    const notifCol = app.findCollectionByNameOrId('notificacoes_sistema')

    // Carregar todas as configurações de usuários
    let configs = []
    try {
      configs = app.findRecordsByFilter('configuracoes_whatsapp', '', '-created', 100, 0)
    } catch (_) {}

    if (configs.length === 0) {
      console.log('[WhatsApp Cron] Nenhuma configuração de usuário cadastrada.')
      return
    }

    const limpar = (v) => String(v || '').replace(/\D/g, '')

    // Carregar contatos cadastrados para vínculo automático em páginas (lotes de 200 até esgotar)
    let contatosCadastrados = []
    try {
      const batchSize = 200
      let offset = 0
      while (true) {
        const batch = app.findRecordsByFilter('contatos', '', '', batchSize, offset)
        if (!batch || batch.length === 0) break
        contatosCadastrados = contatosCadastrados.concat(batch)
        if (batch.length < batchSize) break
        offset += batchSize
      }
    } catch (errContatos) {
      console.log(
        '[WhatsApp Cron] Erro ao carregar contatos cadastrados:',
        errContatos && errContatos.message ? errContatos.message : errContatos,
      )
    }

    const mapaContatosPorNumero = {}
    for (const c of contatosCadastrados) {
      const rawTel = limpar(c.getString('telefone'))
      if (rawTel) {
        mapaContatosPorNumero[rawTel] = c
        if (rawTel.startsWith('55') && rawTel.length > 2) {
          mapaContatosPorNumero[rawTel.slice(2)] = c
        }
      }
    }

    const agoraISO = new Date().toISOString()
    const dataHojeStr = agoraISO.split('T')[0]

    for (const configRec of configs) {
      const userId = configRec.getString('usuario')
      if (!userId) continue

      const modoSelecao = configRec.getString('modo_selecao') || 'todos_exceto'
      if (modoSelecao === 'desligado') {
        continue
      }

      // Buscar registro do usuário para execução com conectores
      let userRecord = null
      try {
        userRecord = app.findRecordById('_pb_users_auth_', userId)
      } catch (_) {
        continue
      }

      let phoneId = configRec.getString('phone_number_id')
      if (!phoneId) {
        try {
          const resPhones = $connectors.execute(userRecord, 'WHATSAPP_GET_PHONE_NUMBERS', {})
          if (resPhones.successful && resPhones.data) {
            const raw = resPhones.data
            let lista = []
            if (Array.isArray(raw)) lista = raw
            else if (raw && Array.isArray(raw.data)) lista = raw.data
            else if (raw && Array.isArray(raw.phone_numbers)) lista = raw.phone_numbers

            if (lista.length > 0 && lista[0].id) {
              phoneId = String(lista[0].id)
              configRec.set('phone_number_id', phoneId)
              app.save(configRec)
            }
          }
        } catch (_) {}
      }

      if (!phoneId) {
        continue
      }

      let contatosEscolhidos = []
      let contatosIgnorados = []
      let gruposEscolhidos = []
      try {
        contatosEscolhidos = JSON.parse(configRec.getString('contatos_escolhidos')) || []
      } catch (_) {}
      try {
        contatosIgnorados = JSON.parse(configRec.getString('contatos_ignorados')) || []
      } catch (_) {}
      try {
        gruposEscolhidos = JSON.parse(configRec.getString('grupos_escolhidos')) || []
      } catch (_) {}

      const setEscolhidos = new Set(contatosEscolhidos.map(limpar).filter(Boolean))
      const setIgnorados = new Set(contatosIgnorados.map(limpar).filter(Boolean))
      const setGruposEscolhidos = new Set(
        gruposEscolhidos.map((g) => String(g).trim()).filter(Boolean),
      )

      let resHistory = null
      try {
        resHistory = $connectors.execute(userRecord, 'WHATSAPP_GET_MESSAGE_HISTORY', {
          phone_number_id: phoneId,
          limit: 50,
        })
      } catch (errHist) {
        console.log(
          `[WhatsApp Cron] Erro ao buscar histórico para usuário ${userId}:`,
          errHist && errHist.message ? errHist.message : errHist,
        )
        continue
      }

      if (!resHistory || !resHistory.successful) {
        continue
      }

      let mensagensRaw = []
      const dataResp = resHistory.data
      if (Array.isArray(dataResp)) {
        mensagensRaw = dataResp
      } else if (dataResp && Array.isArray(dataResp.data)) {
        mensagensRaw = dataResp.data
      } else if (dataResp && Array.isArray(dataResp.messages)) {
        mensagensRaw = dataResp.messages
      } else if (dataResp && Array.isArray(dataResp.history)) {
        mensagensRaw = dataResp.history
      }

      if (mensagensRaw.length === 0 && dataResp && typeof dataResp === 'object') {
        for (const k of Object.keys(dataResp)) {
          if (Array.isArray(dataResp[k])) {
            mensagensRaw = dataResp[k]
            break
          }
        }
      }

      let criadasCount = 0
      const novosRemetentes = []
      let primeiroAssuntoId = ''

      for (const msg of mensagensRaw) {
        const messageId = String(
          msg.id || msg.message_id || msg.wamid || msg.wam_id || msg.key?.id || '',
        )
        if (!messageId) continue

        let jaExiste = false
        try {
          app.findFirstRecordByFilter(
            'mensagens_whatsapp_sincronizadas',
            `usuario = "${userId}" && message_id = "${messageId}"`,
          )
          jaExiste = true
        } catch (_) {}

        if (jaExiste) continue

        const fromRaw = String(
          msg.from || msg.sender || msg.from_number || msg.key?.remoteJid || '',
        )
        const isGrupo = Boolean(
          msg.is_group ||
          msg.group_id ||
          msg.chat_type === 'group' ||
          fromRaw.endsWith('@g.us') ||
          msg.recipient_type === 'group',
        )

        const grupoId = isGrupo
          ? String(msg.group_id || msg.chat_id || fromRaw.replace('@g.us', ''))
          : ''
        const grupoNome = isGrupo
          ? String(msg.group_name || msg.chat_name || msg.subject || grupoId)
          : ''

        const remetenteNum = isGrupo
          ? limpar(msg.participant || msg.author || msg.sender_phone || '')
          : limpar(fromRaw.replace('@s.whatsapp.net', ''))

        const autorNome = String(
          msg.author_name ||
            msg.sender_name ||
            msg.pushName ||
            msg.push_name ||
            msg.contact_name ||
            remetenteNum ||
            'Contato WhatsApp',
        )

        let textoMensagem = ''
        if (typeof msg.text === 'string') {
          textoMensagem = msg.text
        } else if (msg.text && typeof msg.text.body === 'string') {
          textoMensagem = msg.text.body
        } else if (typeof msg.body === 'string') {
          textoMensagem = msg.body
        } else if (msg.message && typeof msg.message.conversation === 'string') {
          textoMensagem = msg.message.conversation
        } else if (msg.message && msg.message.extendedTextMessage?.text) {
          textoMensagem = msg.message.extendedTextMessage.text
        } else if (msg.content) {
          textoMensagem =
            typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        }

        if (!textoMensagem.trim()) {
          const recSyncVazio = new Record(syncCol)
          recSyncVazio.set('usuario', userId)
          recSyncVazio.set('message_id', messageId)
          recSyncVazio.set('remetente_numero', remetenteNum)
          recSyncVazio.set('remetente_nome', autorNome)
          recSyncVazio.set('is_grupo', isGrupo)
          recSyncVazio.set('grupo_id', grupoId)
          recSyncVazio.set('grupo_nome', grupoNome)
          recSyncVazio.set('autor_mensagem', autorNome)
          recSyncVazio.set('folha_dia_id', '')
          recSyncVazio.set('timestamp_mensagem', String(msg.timestamp || Date.now()))
          app.save(recSyncVazio)
          continue
        }

        let deveEntrar = false

        if (isGrupo) {
          const chaveGrupo1 = grupoId
          const chaveGrupo2 = grupoNome
          if (setGruposEscolhidos.has(chaveGrupo1) || setGruposEscolhidos.has(chaveGrupo2)) {
            deveEntrar = true
          }
        } else {
          if (modoSelecao === 'apenas_escolhidos') {
            if (setEscolhidos.has(remetenteNum)) {
              deveEntrar = true
            }
          } else if (modoSelecao === 'todos_exceto') {
            if (!setIgnorados.has(remetenteNum)) {
              deveEntrar = true
            }
          }
        }

        let folhaIdGerada = ''

        if (deveEntrar) {
          let contatoVinculado = null
          if (remetenteNum) {
            contatoVinculado =
              mapaContatosPorNumero[remetenteNum] ||
              (remetenteNum.startsWith('55')
                ? mapaContatosPorNumero[remetenteNum.slice(2)]
                : null) ||
              mapaContatosPorNumero['55' + remetenteNum] ||
              null
          }

          let registroTextoCompleto = ''
          if (isGrupo) {
            registroTextoCompleto = `[WhatsApp Grupo: ${grupoNome || 'Grupo'}] ${autorNome}: ${textoMensagem.trim()}`
          } else {
            registroTextoCompleto = `[WhatsApp] ${autorNome} (${remetenteNum || 'WhatsApp'}): ${textoMensagem.trim()}`
          }

          const origemRefFormatada = isGrupo
            ? `Grupo: ${grupoNome || grupoId} • ${autorNome}`
            : `${autorNome} (${remetenteNum})`

          let dataHoraMsg = agoraISO.slice(0, 16)
          if (msg.timestamp) {
            try {
              const tsNum = Number(msg.timestamp)
              const d = tsNum > 10000000000 ? new Date(tsNum) : new Date(tsNum * 1000)
              if (!isNaN(d.getTime())) {
                dataHoraMsg = d.toISOString().slice(0, 16)
              }
            } catch (_) {}
          }

          const novaFolha = new Record(folhaCol)
          novaFolha.set('data', dataHojeStr)
          novaFolha.set('data_hora', dataHoraMsg)
          novaFolha.set('registro', registroTextoCompleto)
          novaFolha.set('tipo_origem', 'whatsapp')
          novaFolha.set('origem_ref', origemRefFormatada)
          novaFolha.set('status', 'pendente')
          novaFolha.set('arquivado', false)
          novaFolha.set('fixado', false)

          if (contatoVinculado) {
            novaFolha.set('contato', contatoVinculado.id)
          }

          app.save(novaFolha)
          folhaIdGerada = novaFolha.id
          criadasCount++
          if (!primeiroAssuntoId) primeiroAssuntoId = folhaIdGerada

          const remetenteRotulo = isGrupo ? `${autorNome} (${grupoNome || 'Grupo'})` : autorNome
          novosRemetentes.push(remetenteRotulo)
        }

        const recSync = new Record(syncCol)
        recSync.set('usuario', userId)
        recSync.set('message_id', messageId)
        recSync.set('remetente_numero', remetenteNum)
        recSync.set('remetente_nome', autorNome)
        recSync.set('is_grupo', isGrupo)
        recSync.set('grupo_id', grupoId)
        recSync.set('grupo_nome', grupoNome)
        recSync.set('autor_mensagem', autorNome)
        recSync.set('folha_dia_id', folhaIdGerada)
        recSync.set('timestamp_mensagem', String(msg.timestamp || Date.now()))
        app.save(recSync)
      }

      if (criadasCount > 0) {
        try {
          const n = new Record(notifCol)
          n.set('usuario', userId)
          n.set('tipo', 'whatsapp')
          if (criadasCount === 1) {
            const rem = novosRemetentes[0] || 'Contato WhatsApp'
            n.set('titulo', `Nova mensagem de WhatsApp de ${rem}`)
            n.set(
              'mensagem',
              `Uma nova mensagem de ${rem} gerou um novo assunto na sua Folha de trabalho.`,
            )
          } else {
            const remExemplos = novosRemetentes.slice(0, 2).join(', ')
            const resto = criadasCount - 2
            const complemento = resto > 0 ? ` e mais ${resto}` : ''
            n.set('titulo', `${criadasCount} novas mensagens de WhatsApp`)
            n.set(
              'mensagem',
              `${criadasCount} novas mensagens recebidas (${remExemplos}${complemento}) adicionaram assuntos na Folha.`,
            )
          }
          n.set('link', primeiroAssuntoId ? `/folha?destaque=${primeiroAssuntoId}` : '/folha')
          n.set('item_tipo', 'folha')
          n.set('item_id', primeiroAssuntoId || '')
          n.set('lida', false)
          app.save(n)
        } catch (errNotif) {
          console.log(
            `[WhatsApp Cron] Erro ao criar notificação no sino para ${userId}:`,
            errNotif && errNotif.message ? errNotif.message : errNotif,
          )
        }
      }

      configRec.set('ultima_sincronizacao', agoraISO)
      app.save(configRec)

      console.log(
        `[WhatsApp Cron] Usuário ${userId}: ${mensagensRaw.length} mensagens processadas, ${criadasCount} novos assuntos criados na Folha.`,
      )
    }
  } catch (err) {
    console.log('[WhatsApp Cron] Erro no job agendado:', err && err.message ? err.message : err)
  }
})
