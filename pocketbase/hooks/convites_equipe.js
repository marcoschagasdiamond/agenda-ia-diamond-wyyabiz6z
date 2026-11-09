/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de convites de equipe e despacho multicanal (Resend e WhatsApp):
 * - Canal E-mail: Dispara via Resend (usuário ou owner)
 * - Canal WhatsApp: Dispara via WhatsApp pessoal do usuário que convida ($connectors.execute(convidadorRecord, ...))
 * - Rota de Reenvio: POST /backend/v1/convites/reenviar (canal: 'ambos' | 'email' | 'whatsapp')
 * - Rota de Diagnóstico Master Resend: GET /backend/v1/master/status-resend
 * - Rota de Diagnóstico Master WhatsApp: GET /backend/v1/master/status-whatsapp
 * - Rota de Teste de E-mail de Usuário: POST /backend/v1/email/teste-usuario
 *
 * NOTA DE ESCOPO DO JSVM (PocketBase v0.23+):
 * Todas as funções auxiliares são declaradas inline dentro do escopo de cada callback
 * para evitar ReferenceError no pool JSVM isolado.
 */

// -------------------------------------------------------------
// 1. Hook automático após criar convite
// -------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  const app = e.app
  const conviteRecord = e.record

  function formatarErro(err, canal) {
    const isEmail = canal === 'email'
    const msgPadraoDesconectado = isEmail
      ? 'Conta de e-mail (Resend) não conectada — conecte em Configurações → E-mail & Convites'
      : 'WhatsApp não conectado — conecte em Configurações → WhatsApp'

    if (!err) return msgPadraoDesconectado

    let raw = ''
    if (typeof err === 'string') {
      raw = err
    } else if (err.message) {
      raw = String(err.message)
    } else if (err.error) {
      raw = String(err.error)
    } else {
      try {
        raw = JSON.stringify(err)
      } catch (_) {
        raw = String(err)
      }
    }

    if (!raw || raw === '{}' || raw === 'null' || raw === 'undefined') {
      return msgPadraoDesconectado
    }

    const lower = raw.toLowerCase()
    if (
      lower.includes('connector') ||
      lower.includes('not connected') ||
      lower.includes('not configured') ||
      lower.includes('inactive') ||
      lower.includes('disabled') ||
      lower.includes('unauthorized') ||
      lower.includes('no connection') ||
      lower.includes('not found') ||
      lower.includes('missing token') ||
      lower.includes('invalid credentials') ||
      lower.includes('failed to find connector') ||
      lower.includes('tool not found')
    ) {
      return msgPadraoDesconectado
    }

    if (lower.includes('domain is not verified') || lower.includes('validation_error')) {
      return `Resend: ${raw} (Dica: o domínio precisa estar verificado no Resend ou usar remetente verificado)`
    }

    return raw.length > 500 ? raw.substring(0, 500) + '...' : raw
  }

  function sanitizarTelefone(tel) {
    if (!tel) return ''
    let limpo = String(tel).replace(/[^\d+]/g, '')
    if (limpo.startsWith('+')) {
      limpo = limpo.substring(1)
    }
    // Se for formato brasileiro sem DDI (ex: 11999998888 ou 1188887777), adiciona 55
    if (limpo.length >= 10 && limpo.length <= 11 && !limpo.startsWith('55')) {
      limpo = '55' + limpo
    }
    return limpo
  }

  function montarTextoWhatsApp(dados) {
    const escopoFormatado =
      dados.escopoTipo === 'geral'
        ? 'Workspace Geral'
        : `${dados.escopoTipo.toUpperCase()}: ${dados.escopoNome}`

    const nivelFormatado =
      dados.nivelAcesso === 'admin'
        ? 'Administrador'
        : dados.nivelAcesso === 'edicao'
          ? 'Editor / Membro Ativo'
          : 'Visualizador'

    let texto = `*Convite Agenda IA Diamond*\n\n`
    texto += `Olá! *${dados.convidadorNome}* convidou você para colaborar no *Agenda IA Diamond*.\n\n`
    texto += `📌 *Acesso:* ${escopoFormatado}\n`
    texto += `🔑 *Permissão:* ${nivelFormatado}\n`

    if (dados.mensagem) {
      texto += `💬 *Mensagem:* "${dados.mensagem}"\n`
    }

    texto += `\n👉 *Aceite seu convite no link:* ${dados.linkConvite}\n\n`
    texto += `_Este convite expira em 7 dias._`
    return texto
  }

  function carregarConfigMasterEmail() {
    try {
      const records = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
      if (records && records.length > 0) {
        const r = records[0]
        return {
          remetente_nome: r.getString('remetente_nome') || 'Agenda IA Diamond',
          remetente_email: r.getString('remetente_email') || 'onboarding@resend.dev',
          assunto_convite:
            r.getString('assunto_convite') ||
            'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond',
          titulo_cabecalho: r.getString('titulo_cabecalho') || 'AGENDA IA DIAMOND',
          subtitulo_cabecalho:
            r.getString('subtitulo_cabecalho') || 'Gestão Estratégica & Segundo Cérebro Executivo',
          texto_apresentacao:
            r.getString('texto_apresentacao') ||
            'convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.',
          texto_botao_aceite: r.getString('texto_botao_aceite') || 'Aceitar Convite e Acessar',
          cor_primaria: r.getString('cor_primaria') || '#0F766E',
          cor_cabecalho: r.getString('cor_cabecalho') || '#1A1D21',
          texto_rodape:
            r.getString('texto_rodape') ||
            'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.',
        }
      }
    } catch (_) {}

    return {
      remetente_nome: 'Agenda IA Diamond',
      remetente_email: 'onboarding@resend.dev',
      assunto_convite: 'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond',
      titulo_cabecalho: 'AGENDA IA DIAMOND',
      subtitulo_cabecalho: 'Gestão Estratégica & Segundo Cérebro Executivo',
      texto_apresentacao:
        'convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.',
      texto_botao_aceite: 'Aceitar Convite e Acessar',
      cor_primaria: '#0F766E',
      cor_cabecalho: '#1A1D21',
      texto_rodape: 'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.',
    }
  }

  function carregarConfigUsuarioEmail(userId) {
    if (!userId) return null
    try {
      const records = app.findRecordsByFilter(
        'config_email_usuario',
        `usuario = '${userId}'`,
        '-created',
        1,
      )
      if (records && records.length > 0) {
        const r = records[0]
        return {
          mensagem_personalizada_convite: r.getString('mensagem_personalizada_convite') || '',
          remetente_nome_preferido: r.getString('remetente_nome_preferido') || '',
          usar_resend_proprio: r.getBool('usar_resend_proprio'),
        }
      }
    } catch (_) {}
    return null
  }

  const conviteEmail = (conviteRecord.getString('email') || '').trim()
  const conviteTelefone = (conviteRecord.getString('telefone') || '').trim()
  const token = conviteRecord.getString('token')
  const escopoTipo = conviteRecord.getString('escopo_tipo') || 'geral'
  const escopoNome = conviteRecord.getString('escopo_nome') || 'Workspace Geral'
  const nivelAcesso = conviteRecord.getString('nivel_acesso') || 'leitura'
  const mensagemConvite = conviteRecord.getString('mensagem') || ''
  const convidadoPorId = conviteRecord.getString('convidado_por')

  let convidadorNome = 'Um administrador'
  let convidadorRecord = null
  if (convidadoPorId) {
    try {
      convidadorRecord = app.findRecordById('users', convidadoPorId)
      if (convidadorRecord) {
        convidadorNome =
          convidadorRecord.getString('name') ||
          convidadorRecord.getString('email') ||
          'Um administrador'
      }
    } catch (_) {}
  }

  const baseUrl = $os.getenv('APP_URL') || 'https://agenda-ia-diamond.goskip.app'
  const linkConvite = `${baseUrl}/aceitar-convite?token=${token}`

  // -------------------------------------------------------------
  // DESPACHO DO CANAL: E-MAIL (Resend)
  // -------------------------------------------------------------
  let emailEnviado = false
  let erroEmailTexto = ''

  if (!conviteEmail) {
    emailEnviado = false
    erroEmailTexto = 'Sem e-mail cadastrado'
  } else {
    const configMaster = carregarConfigMasterEmail()
    const configUsuario = carregarConfigUsuarioEmail(convidadoPorId)

    let mensagemFinal = mensagemConvite
    if (!mensagemFinal && configUsuario && configUsuario.mensagem_personalizada_convite) {
      mensagemFinal = configUsuario.mensagem_personalizada_convite
    }

    let remetenteNomeFinal = configMaster.remetente_nome || 'Agenda IA Diamond'
    if (configUsuario && configUsuario.remetente_nome_preferido) {
      remetenteNomeFinal = configUsuario.remetente_nome_preferido
    }
    const remetenteEmailFinal = configMaster.remetente_email || 'onboarding@resend.dev'
    const remetenteCompleto = `${remetenteNomeFinal} <${remetenteEmailFinal}>`

    const escopoDescricao =
      escopoTipo === 'geral'
        ? 'Acesso Geral ao Workspace'
        : `${escopoTipo.charAt(0).toUpperCase() + escopoTipo.slice(1)}: ${escopoNome}`

    const nivelAcessoFormatado =
      nivelAcesso === 'admin'
        ? 'Administrador'
        : nivelAcesso === 'edicao'
          ? 'Editor / Membro Ativo'
          : 'Visualizador (Somente Leitura)'

    const assuntoFinal = (
      configMaster.assunto_convite ||
      'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond'
    )
      .replace('{convidador}', convidadorNome)
      .replace('{escopo}', escopoNome)

    const corPrimaria = configMaster.cor_primaria || '#0F766E'
    const corCabecalho = configMaster.cor_cabecalho || '#1A1D21'
    const tituloCabecalho = configMaster.titulo_cabecalho || 'AGENDA IA DIAMOND'
    const subtituloCabecalho =
      configMaster.subtitulo_cabecalho || 'Gestão Estratégica & Segundo Cérebro Executivo'
    const textoApresentacao =
      configMaster.texto_apresentacao ||
      'convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.'
    const textoBotao = configMaster.texto_botao_aceite || 'Aceitar Convite e Acessar'
    const textoRodape =
      configMaster.texto_rodape ||
      'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.'

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FAFAF9; padding: 24px; border-radius: 16px; color: #1A1D21;">
        <div style="background-color: ${corCabecalho}; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFFFFF; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">${tituloCabecalho}</h1>
          <p style="color: #9CA3AF; font-size: 12px; margin: 6px 0 0 0;">${subtituloCabecalho}</p>
        </div>
        <div style="background-color: #FFFFFF; padding: 28px; border-radius: 12px; border: 1px solid #E5E1D8; margin-bottom: 20px;">
          <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #1A1D21;">Você recebeu um convite de equipe</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 20px 0;">
            Olá, <strong>${conviteEmail}</strong>.<br />
            <strong>${convidadorNome}</strong> ${textoApresentacao}
          </p>
          <div style="background-color: #F3F4F6; border-left: 4px solid ${corPrimaria}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #1F2937;"><strong>Acesso atribuído:</strong> ${escopoDescricao}</p>
            <p style="margin: 0; font-size: 13px; color: #1F2937;"><strong>Nível de permissão:</strong> ${nivelAcessoFormatado}</p>
          </div>
          ${
            mensagemFinal
              ? `
          <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; padding: 14px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B;">Mensagem de ${convidadorNome}:</p>
            <p style="margin: 0; font-size: 13px; color: #334155; font-style: italic; white-space: pre-wrap;">"${mensagemFinal}"</p>
          </div>`
              : ''
          }
          <div style="text-align: center; margin: 32px 0;">
            <a href="${linkConvite}" style="background-color: ${corPrimaria}; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 8px; display: inline-block;">${textoBotao}</a>
          </div>
          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
            Ou copie e cole o link direto no seu navegador:<br />
            <a href="${linkConvite}" style="color: ${corPrimaria}; word-break: break-all; font-size: 11px;">${linkConvite}</a>
          </p>
        </div>
        <div style="text-align: center; font-size: 11px; color: #9CA3AF;">
          <p style="margin: 0 0 4px 0;">${textoRodape}</p>
          <p style="margin: 0;">Este convite expira em 7 dias a partir do envio.</p>
        </div>
      </div>
    `

    let conectorExecutadoComSucesso = false
    let erroDisparo = ''

    // 1. Tenta via conector pessoal do convidador se ele configurou Resend próprio
    if (convidadorRecord && configUsuario && configUsuario.usar_resend_proprio) {
      try {
        let resUser = $connectors.execute(convidadorRecord, 'RESEND_SEND_EMAIL', {
          from: remetenteCompleto,
          to: conviteEmail,
          subject: assuntoFinal,
          html: html,
        })
        if (resUser && resUser.successful === false) {
          // Fallback de compatibilidade
          try {
            const resUser2 = $connectors.execute(convidadorRecord, 'resend', 'send-email', {
              from: remetenteCompleto,
              to: conviteEmail,
              subject: assuntoFinal,
              html: html,
            })
            if (resUser2 && resUser2.successful) {
              resUser = resUser2
            }
          } catch (_) {}
        }
        if (resUser && resUser.successful === false) {
          erroDisparo = formatarErro(resUser.error, 'email')
        } else if (resUser && resUser.successful) {
          emailEnviado = true
          conectorExecutadoComSucesso = true
        }
      } catch (userErr) {
        erroDisparo = formatarErro(userErr, 'email')
      }
    }

    // 2. Fallback: disparo via Resend do Master (executeAsOwner se configurado)
    if (!conectorExecutadoComSucesso) {
      try {
        let resOwner = null
        try {
          resOwner = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
            from: remetenteCompleto,
            to: conviteEmail,
            subject: assuntoFinal,
            html: html,
          })
        } catch (_) {
          resOwner = $connectors.executeAsOwner('resend', 'send-email', {
            from: remetenteCompleto,
            to: conviteEmail,
            subject: assuntoFinal,
            html: html,
          })
        }
        if (resOwner && resOwner.successful === false) {
          erroEmailTexto = formatarErro(resOwner.error, 'email')
        } else if (resOwner && resOwner.successful) {
          emailEnviado = true
          erroEmailTexto = ''
        }
      } catch (ownerErr) {
        erroEmailTexto = formatarErro(ownerErr, 'email')
      }
    }

    if (!emailEnviado && !erroEmailTexto) {
      erroEmailTexto = erroDisparo || formatarErro(null, 'email')
    }
  }

  // -------------------------------------------------------------
  // DESPACHO DO CANAL: WHATSAPP (Pessoal do Usuário que Convida)
  // -------------------------------------------------------------
  let whatsappEnviado = false
  let erroWhatsAppTexto = ''

  const telFormatado = sanitizarTelefone(conviteTelefone)
  if (!conviteTelefone) {
    whatsappEnviado = false
    erroWhatsAppTexto = 'Sem telefone cadastrado'
  } else if (!telFormatado) {
    whatsappEnviado = false
    erroWhatsAppTexto = 'Telefone cadastrado inválido para WhatsApp'
  } else if (!convidadorRecord) {
    whatsappEnviado = false
    erroWhatsAppTexto = 'Usuário que convidou não foi localizado para envio do WhatsApp'
  } else {
    try {
      const textoMsg = montarTextoWhatsApp({
        convidadorNome,
        escopoTipo,
        escopoNome,
        nivelAcesso,
        mensagem: mensagemConvite,
        linkConvite,
      })

      // Obter ou inicializar configuracoes_whatsapp do usuário que convida
      let configRec = null
      try {
        configRec = app.findFirstRecordByData(
          'configuracoes_whatsapp',
          'usuario',
          convidadorRecord.id,
        )
      } catch (_) {
        try {
          const colZap = app.findCollectionByNameOrId('configuracoes_whatsapp')
          const recZap = new Record(colZap)
          recZap.set('usuario', convidadorRecord.id)
          recZap.set('modo_selecao', 'todos_exceto')
          recZap.set('contatos_escolhidos', '[]')
          recZap.set('contatos_ignorados', '[]')
          recZap.set('grupos_escolhidos', '[]')
          recZap.set('ultima_sincronizacao', '')
          app.save(recZap)
          configRec = recZap
        } catch (_) {}
      }

      let phoneNumberId = configRec ? configRec.getString('phone_number_id') : ''

      // Se phone_number_id não estiver gravado na config, busca via WHATSAPP_GET_PHONE_NUMBERS e salva
      if (!phoneNumberId) {
        try {
          const resPhones = $connectors.execute(convidadorRecord, 'WHATSAPP_GET_PHONE_NUMBERS', {})
          if (resPhones && resPhones.successful && resPhones.data) {
            const raw = resPhones.data
            let list = []
            if (Array.isArray(raw)) list = raw
            else if (raw && Array.isArray(raw.data)) list = raw.data
            else if (raw && Array.isArray(raw.phone_numbers)) list = raw.phone_numbers

            if (list.length > 0 && list[0]?.id) {
              phoneNumberId = String(list[0].id)
              if (configRec) {
                configRec.set('phone_number_id', phoneNumberId)
                app.save(configRec)
              }
            }
          } else if (resPhones && !resPhones.successful && resPhones.error) {
            erroWhatsAppTexto = formatarErro(resPhones.error, 'whatsapp')
          }
        } catch (errPhones) {
          erroWhatsAppTexto = formatarErro(errPhones, 'whatsapp')
        }
      }

      // Se ainda não tivermos phone_number_id, não adianta tentar WHATSAPP_SEND_MESSAGE sem o identificador
      if (!phoneNumberId) {
        if (!erroWhatsAppTexto) {
          erroWhatsAppTexto = formatarErro(
            'Número WhatsApp Business não configurado ou sem phone_number_id. Conecte sua conta em Configurações → WhatsApp.',
            'whatsapp',
          )
        }
      }

      // Tenta enviar mensagem de texto pelo WhatsApp pessoal com o formato exato esperado:
      // WHATSAPP_SEND_MESSAGE({ text: string, to_number: string, phone_number_id: string })
      let envioZapOk = false
      let erroZapCapturado = ''

      if (phoneNumberId) {
        try {
          const payloadZap = {
            to_number: telFormatado,
            phone_number_id: phoneNumberId,
            text: textoMsg,
          }

          const resZap = $connectors.execute(convidadorRecord, 'WHATSAPP_SEND_MESSAGE', payloadZap)
          if (resZap && resZap.successful) {
            envioZapOk = true
          } else if (resZap && (resZap.error || resZap.successful === false)) {
            erroZapCapturado = formatarErro(
              resZap.error || 'Falha no conector WhatsApp',
              'whatsapp',
            )
          }
        } catch (zErr1) {
          erroZapCapturado = formatarErro(zErr1, 'whatsapp')
        }
      }

      if (envioZapOk) {
        whatsappEnviado = true
        erroWhatsAppTexto = ''
      } else {
        erroWhatsAppTexto = erroZapCapturado || formatarErro(null, 'whatsapp')
      }
    } catch (zapErrGeral) {
      erroWhatsAppTexto = formatarErro(zapErrGeral, 'whatsapp')
    }
  }

  // -------------------------------------------------------------
  // Persistir status multicanal no convite
  // -------------------------------------------------------------
  try {
    const agoraIso = new Date().toISOString()
    conviteRecord.set('enviado_em', agoraIso)
    conviteRecord.set('email_enviado', emailEnviado)
    conviteRecord.set('erro_envio', emailEnviado ? '' : erroEmailTexto)

    conviteRecord.set('whatsapp_enviado', whatsappEnviado)
    conviteRecord.set('whatsapp_erro', whatsappEnviado ? '' : erroWhatsAppTexto)

    app.save(conviteRecord)
  } catch (saveErr) {
    console.error('[convites] Erro ao salvar status de envio no convite:', saveErr)
  }

  e.next()
}, 'convites_equipe')

// -------------------------------------------------------------
// 2. Rota para reenvio manual de convite (E-mail, WhatsApp ou Ambos)
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/convites/reenviar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { erro: 'Não autorizado. Faça login para reenviar convites.' })
  }

  const reqInfo = e.requestInfo()
  const body = (reqInfo && reqInfo.body) || {}
  const conviteId = body.convite_id
  const canal = body.canal || 'ambos' // 'email' | 'whatsapp' | 'ambos'

  if (!conviteId) {
    return e.json(400, { erro: 'ID do convite é obrigatório.' })
  }

  const app = e.app

  function formatarErro(err, canalTipo) {
    const isEmail = canalTipo === 'email'
    const msgPadraoDesconectado = isEmail
      ? 'Conta de e-mail (Resend) não conectada — conecte em Configurações → E-mail & Convites'
      : 'WhatsApp não conectado — conecte em Configurações → WhatsApp'

    if (!err) return msgPadraoDesconectado

    let raw = ''
    if (typeof err === 'string') {
      raw = err
    } else if (err.message) {
      raw = String(err.message)
    } else if (err.error) {
      raw = String(err.error)
    } else {
      try {
        raw = JSON.stringify(err)
      } catch (_) {
        raw = String(err)
      }
    }

    if (!raw || raw === '{}' || raw === 'null' || raw === 'undefined') {
      return msgPadraoDesconectado
    }

    const lower = raw.toLowerCase()
    if (
      lower.includes('connector') ||
      lower.includes('not connected') ||
      lower.includes('not configured') ||
      lower.includes('inactive') ||
      lower.includes('disabled') ||
      lower.includes('unauthorized') ||
      lower.includes('no connection') ||
      lower.includes('not found') ||
      lower.includes('missing token') ||
      lower.includes('invalid credentials') ||
      lower.includes('failed to find connector') ||
      lower.includes('tool not found')
    ) {
      return msgPadraoDesconectado
    }

    if (lower.includes('domain is not verified') || lower.includes('validation_error')) {
      return `Resend: ${raw} (Dica: o domínio precisa estar verificado no Resend ou usar remetente verificado)`
    }

    return raw.length > 500 ? raw.substring(0, 500) + '...' : raw
  }

  function sanitizarTelefone(tel) {
    if (!tel) return ''
    let limpo = String(tel).replace(/[^\d+]/g, '')
    if (limpo.startsWith('+')) {
      limpo = limpo.substring(1)
    }
    if (limpo.length >= 10 && limpo.length <= 11 && !limpo.startsWith('55')) {
      limpo = '55' + limpo
    }
    return limpo
  }

  function montarTextoWhatsApp(dados) {
    const escopoFormatado =
      dados.escopoTipo === 'geral'
        ? 'Workspace Geral'
        : `${dados.escopoTipo.toUpperCase()}: ${dados.escopoNome}`

    const nivelFormatado =
      dados.nivelAcesso === 'admin'
        ? 'Administrador'
        : dados.nivelAcesso === 'edicao'
          ? 'Editor / Membro Ativo'
          : 'Visualizador'

    let texto = `*Convite Agenda IA Diamond*\n\n`
    texto += `Olá! *${dados.convidadorNome}* convidou você para colaborar no *Agenda IA Diamond*.\n\n`
    texto += `📌 *Acesso:* ${escopoFormatado}\n`
    texto += `🔑 *Permissão:* ${nivelFormatado}\n`

    if (dados.mensagem) {
      texto += `💬 *Mensagem:* "${dados.mensagem}"\n`
    }

    texto += `\n👉 *Aceite seu convite no link:* ${dados.linkConvite}\n\n`
    texto += `_Este convite expira em 7 dias._`
    return texto
  }

  try {
    const conviteRecord = app.findRecordById('convites_equipe', conviteId)
    if (!conviteRecord) {
      return e.json(404, { erro: 'Convite não encontrado.' })
    }

    const conviteEmail = (conviteRecord.getString('email') || '').trim()
    const conviteTelefone = (conviteRecord.getString('telefone') || '').trim()
    const token = conviteRecord.getString('token')
    const escopoTipo = conviteRecord.getString('escopo_tipo') || 'geral'
    const escopoNome = conviteRecord.getString('escopo_nome') || 'Workspace Geral'
    const nivelAcesso = conviteRecord.getString('nivel_acesso') || 'leitura'
    const mensagemConvite = conviteRecord.getString('mensagem') || ''
    const convidadoPorId = conviteRecord.getString('convidado_por')

    let convidadorNome = 'Um administrador'
    let convidadorRecord = null
    if (convidadoPorId) {
      try {
        convidadorRecord = app.findRecordById('users', convidadoPorId)
        if (convidadorRecord) {
          convidadorNome =
            convidadorRecord.getString('name') ||
            convidadorRecord.getString('email') ||
            'Um administrador'
        }
      } catch (_) {}
    }

    const baseUrl = $os.getenv('APP_URL') || 'https://agenda-ia-diamond.goskip.app'
    const linkConvite = `${baseUrl}/aceitar-convite?token=${token}`

    let emailProcessado = false
    let emailEnviado = conviteRecord.getBool('email_enviado')
    let erroEmailTexto = conviteRecord.getString('erro_envio')

    let whatsappProcessado = false
    let whatsappEnviado = conviteRecord.getBool('whatsapp_enviado')
    let erroWhatsAppTexto = conviteRecord.getString('whatsapp_erro')

    const agoraIso = new Date().toISOString()

    // 1. REENVIAR E-MAIL SE SOLICITADO
    if (canal === 'email' || canal === 'ambos') {
      emailProcessado = true

      if (!conviteEmail) {
        emailEnviado = false
        erroEmailTexto = 'Sem e-mail cadastrado'
      } else {
        let configMaster = {
          remetente_nome: 'Agenda IA Diamond',
          remetente_email: 'onboarding@resend.dev',
          assunto_convite: 'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond',
          titulo_cabecalho: 'AGENDA IA DIAMOND',
          subtitulo_cabecalho: 'Gestão Estratégica & Segundo Cérebro Executivo',
          texto_apresentacao:
            'convidou você para colaborar na plataforma Agenda IA Diamond com acesso dedicado.',
          texto_botao_aceite: 'Aceitar Convite e Acessar',
          cor_primaria: '#0F766E',
          cor_cabecalho: '#1A1D21',
          texto_rodape:
            'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.',
        }

        try {
          const records = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
          if (records && records.length > 0) {
            const r = records[0]
            configMaster.remetente_nome =
              r.getString('remetente_nome') || configMaster.remetente_nome
            configMaster.remetente_email =
              r.getString('remetente_email') || configMaster.remetente_email
            configMaster.assunto_convite =
              r.getString('assunto_convite') || configMaster.assunto_convite
            configMaster.titulo_cabecalho =
              r.getString('titulo_cabecalho') || configMaster.titulo_cabecalho
            configMaster.subtitulo_cabecalho =
              r.getString('subtitulo_cabecalho') || configMaster.subtitulo_cabecalho
            configMaster.texto_apresentacao =
              r.getString('texto_apresentacao') || configMaster.texto_apresentacao
            configMaster.texto_botao_aceite =
              r.getString('texto_botao_aceite') || configMaster.texto_botao_aceite
            configMaster.cor_primaria = r.getString('cor_primaria') || configMaster.cor_primaria
            configMaster.cor_cabecalho = r.getString('cor_cabecalho') || configMaster.cor_cabecalho
            configMaster.texto_rodape = r.getString('texto_rodape') || configMaster.texto_rodape
          }
        } catch (_) {}

        let configUsuario = null
        if (convidadoPorId) {
          try {
            const uList = app.findRecordsByFilter(
              'config_email_usuario',
              `usuario = '${convidadoPorId}'`,
              '-created',
              1,
            )
            if (uList && uList.length > 0) {
              const ur = uList[0]
              configUsuario = {
                mensagem_personalizada_convite:
                  ur.getString('mensagem_personalizada_convite') || '',
                remetente_nome_preferido: ur.getString('remetente_nome_preferido') || '',
                usar_resend_proprio: ur.getBool('usar_resend_proprio'),
              }
            }
          } catch (_) {}
        }

        let mensagemFinal = mensagemConvite
        if (!mensagemFinal && configUsuario && configUsuario.mensagem_personalizada_convite) {
          mensagemFinal = configUsuario.mensagem_personalizada_convite
        }

        let remetenteNomeFinal = configMaster.remetente_nome || 'Agenda IA Diamond'
        if (configUsuario && configUsuario.remetente_nome_preferido) {
          remetenteNomeFinal = configUsuario.remetente_nome_preferido
        }
        const remetenteEmailFinal = configMaster.remetente_email || 'onboarding@resend.dev'
        const remetenteCompleto = `${remetenteNomeFinal} <${remetenteEmailFinal}>`

        const escopoDescricao =
          escopoTipo === 'geral'
            ? 'Acesso Geral ao Workspace'
            : `${escopoTipo.charAt(0).toUpperCase() + escopoTipo.slice(1)}: ${escopoNome}`

        const nivelAcessoFormatado =
          nivelAcesso === 'admin'
            ? 'Administrador'
            : nivelAcesso === 'edicao'
              ? 'Editor / Membro Ativo'
              : 'Visualizador (Somente Leitura)'

        const assuntoFinal = (
          configMaster.assunto_convite ||
          'Convite de Equipe: {convidador} convidou você para o Agenda IA Diamond'
        )
          .replace('{convidador}', convidadorNome)
          .replace('{escopo}', escopoNome)

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FAFAF9; padding: 24px; border-radius: 16px; color: #1A1D21;">
            <div style="background-color: ${configMaster.cor_cabecalho}; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: #FFFFFF; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">${configMaster.titulo_cabecalho}</h1>
              <p style="color: #9CA3AF; font-size: 12px; margin: 6px 0 0 0;">${configMaster.subtitulo_cabecalho}</p>
            </div>
            <div style="background-color: #FFFFFF; padding: 28px; border-radius: 12px; border: 1px solid #E5E1D8; margin-bottom: 20px;">
              <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #1A1D21;">Você recebeu um convite de equipe</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 20px 0;">
                Olá, <strong>${conviteEmail}</strong>.<br />
                <strong>${convidadorNome}</strong> ${configMaster.texto_apresentacao}
              </p>
              <div style="background-color: #F3F4F6; border-left: 4px solid ${configMaster.cor_primaria}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #1F2937;"><strong>Acesso atribuído:</strong> ${escopoDescricao}</p>
                <p style="margin: 0; font-size: 13px; color: #1F2937;"><strong>Nível de permissão:</strong> ${nivelAcessoFormatado}</p>
              </div>
              ${
                mensagemFinal
                  ? `
              <div style="background-color: #F8FAFC; border: 1px dashed #CBD5E1; padding: 14px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B;">Mensagem de ${convidadorNome}:</p>
                <p style="margin: 0; font-size: 13px; color: #334155; font-style: italic; white-space: pre-wrap;">"${mensagemFinal}"</p>
              </div>`
                  : ''
              }
              <div style="text-align: center; margin: 32px 0;">
                <a href="${linkConvite}" style="background-color: ${configMaster.cor_primaria}; color: #FFFFFF; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 8px; display: inline-block;">${configMaster.texto_botao_aceite}</a>
              </div>
              <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
                Ou copie e cole o link direto no seu navegador:<br />
                <a href="${linkConvite}" style="color: ${configMaster.cor_primaria}; word-break: break-all; font-size: 11px;">${linkConvite}</a>
              </p>
            </div>
            <div style="text-align: center; font-size: 11px; color: #9CA3AF;">
              <p style="margin: 0 0 4px 0;">${configMaster.texto_rodape}</p>
              <p style="margin: 0;">Este convite expira em 7 dias a partir do envio.</p>
            </div>
          </div>
        `

        emailEnviado = false
        erroEmailTexto = ''
        let conectorExecutadoComSucesso = false
        let erroDisparo = ''

        if (convidadorRecord && configUsuario && configUsuario.usar_resend_proprio) {
          try {
            let resUser = $connectors.execute(convidadorRecord, 'RESEND_SEND_EMAIL', {
              from: remetenteCompleto,
              to: conviteEmail,
              subject: assuntoFinal,
              html: html,
            })
            if (resUser && resUser.successful === false) {
              try {
                const resUser2 = $connectors.execute(convidadorRecord, 'resend', 'send-email', {
                  from: remetenteCompleto,
                  to: conviteEmail,
                  subject: assuntoFinal,
                  html: html,
                })
                if (resUser2 && resUser2.successful) {
                  resUser = resUser2
                }
              } catch (_) {}
            }
            if (resUser && resUser.successful === false) {
              erroDisparo = formatarErro(resUser.error, 'email')
            } else if (resUser && resUser.successful) {
              emailEnviado = true
              conectorExecutadoComSucesso = true
            }
          } catch (uErr) {
            erroDisparo = formatarErro(uErr, 'email')
          }
        }

        if (!conectorExecutadoComSucesso) {
          try {
            let resOwner = null
            try {
              resOwner = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
                from: remetenteCompleto,
                to: conviteEmail,
                subject: assuntoFinal,
                html: html,
              })
            } catch (_) {
              resOwner = $connectors.executeAsOwner('resend', 'send-email', {
                from: remetenteCompleto,
                to: conviteEmail,
                subject: assuntoFinal,
                html: html,
              })
            }
            if (resOwner && resOwner.successful === false) {
              erroEmailTexto = formatarErro(resOwner.error, 'email')
            } else if (resOwner && resOwner.successful) {
              emailEnviado = true
              erroEmailTexto = ''
            }
          } catch (ownerErr) {
            erroEmailTexto = formatarErro(ownerErr, 'email')
          }
        }

        if (!emailEnviado && !erroEmailTexto) {
          erroEmailTexto = erroDisparo || formatarErro(null, 'email')
        }
      }

      conviteRecord.set('email_enviado', emailEnviado)
      conviteRecord.set('erro_envio', emailEnviado ? '' : erroEmailTexto)
    }

    // 2. REENVIAR WHATSAPP SE SOLICITADO
    if (canal === 'whatsapp' || canal === 'ambos') {
      whatsappProcessado = true
      const telFormatado = sanitizarTelefone(conviteTelefone)

      if (!conviteTelefone) {
        whatsappEnviado = false
        erroWhatsAppTexto = 'Sem telefone cadastrado'
      } else if (!telFormatado) {
        whatsappEnviado = false
        erroWhatsAppTexto = 'Telefone cadastrado inválido para WhatsApp'
      } else if (!convidadorRecord) {
        whatsappEnviado = false
        erroWhatsAppTexto = 'Usuário que convidou não foi localizado para envio do WhatsApp'
      } else {
        whatsappEnviado = false
        erroWhatsAppTexto = ''

        try {
          const textoMsg = montarTextoWhatsApp({
            convidadorNome,
            escopoTipo,
            escopoNome,
            nivelAcesso,
            mensagem: mensagemConvite,
            linkConvite,
          })

          // Obter ou inicializar configuracoes_whatsapp do usuário que convida
          let configRec = null
          try {
            configRec = app.findFirstRecordByData(
              'configuracoes_whatsapp',
              'usuario',
              convidadorRecord.id,
            )
          } catch (_) {
            try {
              const colZap = app.findCollectionByNameOrId('configuracoes_whatsapp')
              const recZap = new Record(colZap)
              recZap.set('usuario', convidadorRecord.id)
              recZap.set('modo_selecao', 'todos_exceto')
              recZap.set('contatos_escolhidos', '[]')
              recZap.set('contatos_ignorados', '[]')
              recZap.set('grupos_escolhidos', '[]')
              recZap.set('ultima_sincronizacao', '')
              app.save(recZap)
              configRec = recZap
            } catch (_) {}
          }

          let phoneNumberId = configRec ? configRec.getString('phone_number_id') : ''

          // Se phone_number_id não estiver gravado na config, busca via WHATSAPP_GET_PHONE_NUMBERS e salva
          if (!phoneNumberId) {
            try {
              const resPhones = $connectors.execute(
                convidadorRecord,
                'WHATSAPP_GET_PHONE_NUMBERS',
                {},
              )
              if (resPhones && resPhones.successful && resPhones.data) {
                const raw = resPhones.data
                let list = []
                if (Array.isArray(raw)) list = raw
                else if (raw && Array.isArray(raw.data)) list = raw.data
                else if (raw && Array.isArray(raw.phone_numbers)) list = raw.phone_numbers

                if (list.length > 0 && list[0]?.id) {
                  phoneNumberId = String(list[0].id)
                  if (configRec) {
                    configRec.set('phone_number_id', phoneNumberId)
                    app.save(configRec)
                  }
                }
              } else if (resPhones && !resPhones.successful && resPhones.error) {
                erroWhatsAppTexto = formatarErro(resPhones.error, 'whatsapp')
              }
            } catch (errPhones) {
              erroWhatsAppTexto = formatarErro(errPhones, 'whatsapp')
            }
          }

          if (!phoneNumberId && !erroWhatsAppTexto) {
            erroWhatsAppTexto = formatarErro(
              'Número WhatsApp Business não configurado ou sem phone_number_id. Conecte sua conta em Configurações → WhatsApp.',
              'whatsapp',
            )
          }

          let envioZapOk = false
          let erroZapCapturado = ''

          if (phoneNumberId) {
            try {
              const payloadZap = {
                to_number: telFormatado,
                phone_number_id: phoneNumberId,
                text: textoMsg,
              }

              const resZap = $connectors.execute(
                convidadorRecord,
                'WHATSAPP_SEND_MESSAGE',
                payloadZap,
              )
              if (resZap && resZap.successful) {
                envioZapOk = true
              } else if (resZap && (resZap.error || resZap.successful === false)) {
                erroZapCapturado = formatarErro(
                  resZap.error || 'Falha no conector WhatsApp',
                  'whatsapp',
                )
              }
            } catch (zErr1) {
              erroZapCapturado = formatarErro(zErr1, 'whatsapp')
            }
          }

          if (envioZapOk) {
            whatsappEnviado = true
            erroWhatsAppTexto = ''
          } else {
            erroWhatsAppTexto = erroZapCapturado || formatarErro(null, 'whatsapp')
          }
        } catch (zapGeralErr) {
          erroWhatsAppTexto = formatarErro(zapGeralErr, 'whatsapp')
        }
      }

      conviteRecord.set('whatsapp_enviado', whatsappEnviado)
      conviteRecord.set('whatsapp_erro', whatsappEnviado ? '' : erroWhatsAppTexto)
    }

    conviteRecord.set('enviado_em', agoraIso)
    app.save(conviteRecord)

    return e.json(200, {
      sucesso: true,
      canal,
      enviado_em: agoraIso,
      email_processado: emailProcessado,
      email_enviado: emailEnviado,
      email_erro: erroEmailTexto,
      whatsapp_processado: whatsappProcessado,
      whatsapp_enviado: whatsappEnviado,
      whatsapp_erro: erroWhatsAppTexto,
      mensagem:
        canal === 'whatsapp'
          ? whatsappEnviado
            ? 'Convite reenviado com sucesso via WhatsApp!'
            : `Aviso WhatsApp: ${erroWhatsAppTexto || 'Falha no envio.'}`
          : canal === 'email'
            ? emailEnviado
              ? 'Convite reenviado com sucesso via E-mail!'
              : `Aviso E-mail: ${erroEmailTexto || 'Falha no envio.'}`
            : 'Reenvio processado para os canais selecionados.',
    })
  } catch (err) {
    return e.json(500, {
      sucesso: false,
      erro: 'Erro interno ao processar o reenvio: ' + String(err.message || err),
    })
  }
})

// -------------------------------------------------------------
// 3. Rota para teste de envio de e-mail do próprio usuário em /config
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/email/teste-usuario', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { erro: 'Não autorizado. Faça login para testar o envio.' })
  }

  const userId = authRecord.id
  const userEmail = authRecord.getString('email')
  const userName = authRecord.getString('name') || userEmail
  const app = e.app

  function formatarErro(err) {
    if (!err)
      return 'Conta de e-mail (Resend) não conectada — conecte em Configurações → E-mail & Convites'
    let msg = ''
    if (typeof err === 'string') msg = err
    else if (err.message) msg = String(err.message)
    else if (err.error) msg = String(err.error)
    else {
      try {
        msg = JSON.stringify(err)
      } catch (_) {
        msg = String(err)
      }
    }
    if (!msg || msg === '{}' || msg === 'null' || msg === 'undefined') {
      return 'Conta de e-mail (Resend) não conectada — conecte em Configurações → E-mail & Convites'
    }
    const lower = msg.toLowerCase()
    if (
      lower.includes('connector') ||
      lower.includes('not connected') ||
      lower.includes('not configured') ||
      lower.includes('inactive') ||
      lower.includes('disabled') ||
      lower.includes('unauthorized') ||
      lower.includes('no connection') ||
      lower.includes('not found') ||
      lower.includes('tool not found')
    ) {
      return 'Conta de e-mail (Resend) não conectada — conecte em Configurações → E-mail & Convites'
    }
    if (msg.includes('domain is not verified') || msg.includes('validation_error')) {
      return `Resend: ${msg} (Dica: o domínio precisa estar verificado no Resend ou usar remetente verificado)`
    }
    return msg.length > 500 ? msg.substring(0, 500) + '...' : msg
  }

  let configMaster = {
    remetente_nome: 'Agenda IA Diamond',
    remetente_email: 'onboarding@resend.dev',
    cor_cabecalho: '#1A1D21',
    titulo_cabecalho: 'AGENDA IA DIAMOND',
    cor_primaria: '#0F766E',
    texto_rodape: 'Enviado por Agenda IA Diamond',
  }

  try {
    const records = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
    if (records && records.length > 0) {
      const r = records[0]
      configMaster.remetente_nome = r.getString('remetente_nome') || configMaster.remetente_nome
      configMaster.remetente_email = r.getString('remetente_email') || configMaster.remetente_email
      configMaster.cor_cabecalho = r.getString('cor_cabecalho') || configMaster.cor_cabecalho
      configMaster.titulo_cabecalho =
        r.getString('titulo_cabecalho') || configMaster.titulo_cabecalho
      configMaster.cor_primaria = r.getString('cor_primaria') || configMaster.cor_primaria
      configMaster.texto_rodape = r.getString('texto_rodape') || configMaster.texto_rodape
    }
  } catch (_) {}

  let configUsuario = null
  try {
    const uList = app.findRecordsByFilter(
      'config_email_usuario',
      `usuario = '${userId}'`,
      '-created',
      1,
    )
    if (uList && uList.length > 0) {
      const ur = uList[0]
      configUsuario = {
        mensagem_personalizada_convite: ur.getString('mensagem_personalizada_convite') || '',
        remetente_nome_preferido: ur.getString('remetente_nome_preferido') || '',
        usar_resend_proprio: ur.getBool('usar_resend_proprio'),
      }
    }
  } catch (_) {}

  let remetenteNomeFinal = configMaster.remetente_nome || 'Agenda IA Diamond'
  if (configUsuario && configUsuario.remetente_nome_preferido) {
    remetenteNomeFinal = configUsuario.remetente_nome_preferido
  }
  const remetenteEmailFinal = configMaster.remetente_email || 'onboarding@resend.dev'
  const remetenteCompleto = `${remetenteNomeFinal} <${remetenteEmailFinal}>`

  const mensagemExemplo =
    (configUsuario && configUsuario.mensagem_personalizada_convite) ||
    'Esta é uma mensagem de teste do seu e-mail de convites no Agenda IA Diamond.'

  const htmlTeste = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #FAFAF9; padding: 24px; border-radius: 12px; color: #1A1D21;">
      <div style="background: ${configMaster.cor_cabecalho || '#1A1D21'}; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: #FFF; font-size: 18px; margin: 0;">${configMaster.titulo_cabecalho || 'AGENDA IA DIAMOND'}</h1>
        <p style="color: #9CA3AF; font-size: 11px; margin: 4px 0 0 0;">Teste de Conexão de E-mail</p>
      </div>
      <div style="background: #FFF; padding: 24px; border-radius: 8px; border: 1px solid #E5E1D8;">
        <p style="font-size: 14px; margin: 0 0 16px 0;">Olá, <strong>${userName}</strong>!</p>
        <p style="font-size: 13px; color: #4B5563; margin: 0 0 16px 0;">
          Sua configuração de envio de e-mails para convites e notificações está operando corretamente.
        </p>
        <div style="background: #F3F4F6; border-left: 4px solid ${configMaster.cor_primaria || '#0F766E'}; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 12px; color: #1F2937;"><strong>Remetente configurado:</strong> ${remetenteCompleto}</p>
        </div>
        <p style="font-size: 12px; color: #64748B; font-style: italic; margin: 0 0 16px 0;">"${mensagemExemplo}"</p>
        <p style="font-size: 11px; color: #9CA3AF; margin: 0;">Data/hora do teste: ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  `

  let enviado = false
  let erroTexto = ''
  let disparadoPor = 'owner'

  try {
    let conectorExecutado = false
    if (configUsuario && configUsuario.usar_resend_proprio) {
      try {
        let resUser = $connectors.execute(authRecord, 'RESEND_SEND_EMAIL', {
          from: remetenteCompleto,
          to: userEmail,
          subject: 'Teste de Envio de E-mail • Agenda IA Diamond',
          html: htmlTeste,
        })
        if (resUser && resUser.successful === false) {
          try {
            const resUser2 = $connectors.execute(authRecord, 'resend', 'send-email', {
              from: remetenteCompleto,
              to: userEmail,
              subject: 'Teste de Envio de E-mail • Agenda IA Diamond',
              html: htmlTeste,
            })
            if (resUser2 && resUser2.successful) {
              resUser = resUser2
            }
          } catch (_) {}
        }
        if (resUser && resUser.successful === false) {
          erroTexto = formatarErro(resUser.error)
        } else if (resUser && resUser.successful) {
          enviado = true
          disparadoPor = 'usuario_proprio'
          conectorExecutado = true
        }
      } catch (uErr) {
        erroTexto = formatarErro(uErr)
      }
    }

    if (!conectorExecutado) {
      try {
        let resOwner = null
        try {
          resOwner = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
            from: remetenteCompleto,
            to: userEmail,
            subject: 'Teste de Envio de E-mail (Master) • Agenda IA Diamond',
            html: htmlTeste,
          })
        } catch (_) {
          resOwner = $connectors.executeAsOwner('resend', 'send-email', {
            from: remetenteCompleto,
            to: userEmail,
            subject: 'Teste de Envio de E-mail (Master) • Agenda IA Diamond',
            html: htmlTeste,
          })
        }
        if (resOwner && resOwner.successful === false) {
          erroTexto = formatarErro(resOwner.error)
        } else if (resOwner && resOwner.successful) {
          enviado = true
          disparadoPor = 'owner'
        }
      } catch (ownerErr) {
        erroTexto = formatarErro(ownerErr)
      }
    }
  } catch (err) {
    erroTexto = formatarErro(err)
  }

  if (enviado) {
    return e.json(200, {
      sucesso: true,
      mensagem: `E-mail de teste enviado com sucesso para ${userEmail}`,
      disparado_por: disparadoPor,
      remetente: remetenteCompleto,
    })
  } else {
    return e.json(500, {
      sucesso: false,
      erro:
        erroTexto ||
        'Conta de e-mail (Resend) não conectada — conecte em Configurações → E-mail & Convites',
      disparado_por: disparadoPor,
    })
  }
})

// -------------------------------------------------------------
// 4. Rota de diagnóstico de status do Resend (Master)
// -------------------------------------------------------------
routerAdd('GET', '/backend/v1/master/status-resend', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { status: 'desconectado', erro: 'Não autenticado' })
  }

  const app = e.app
  let totalConvites = 0
  let totalEnviados = 0
  let totalFalhas = 0
  let ultimoErro = ''

  try {
    const ultimosConvites = app.findRecordsByFilter('convites_equipe', '1 = 1', '-created', 50)
    totalConvites = ultimosConvites.length
    ultimosConvites.forEach((item) => {
      if (item.getBool('email_enviado')) {
        totalEnviados++
      } else {
        totalFalhas++
        if (!ultimoErro && item.getString('erro_envio')) {
          ultimoErro = item.getString('erro_envio')
        }
      }
    })
  } catch (err) {
    console.warn('[status-resend] Erro ao ler histórico de convites:', err)
  }

  let remetenteNome = 'Agenda IA Diamond'
  let remetenteEmail = 'onboarding@resend.dev'

  try {
    const records = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
    if (records && records.length > 0) {
      remetenteNome = records[0].getString('remetente_nome') || remetenteNome
      remetenteEmail = records[0].getString('remetente_email') || remetenteEmail
    }
  } catch (_) {}

  // Testa se a conta do usuário master autenticado possui conector Resend ativo
  let masterResendConectado = false
  let detalheResendMaster = ''
  try {
    const resTest = $connectors.execute(authRecord, 'RESEND_LIST_DOMAINS', {})
    if (resTest && resTest.successful) {
      masterResendConectado = true
      detalheResendMaster = 'Conta Resend pessoal do Master conectada e operacional'
    } else if (resTest && resTest.error) {
      detalheResendMaster = String(resTest.error)
    }
  } catch (errResendTest) {
    detalheResendMaster = String(errResendTest.message || errResendTest)
  }

  const statusCalculado = masterResendConectado
    ? totalFalhas === 0 && totalEnviados > 0
      ? 'conectado'
      : totalFalhas > 0
        ? 'ativo_com_alertas'
        : 'conectado'
    : totalFalhas === 0 && totalEnviados > 0
      ? 'conectado'
      : totalEnviados > 0
        ? 'ativo_com_alertas'
        : 'pendente_teste'

  const conectadoBool = masterResendConectado || (totalEnviados > 0 && totalFalhas === 0)

  return e.json(200, {
    sucesso: true,
    conectado: conectadoBool,
    status: statusCalculado,
    provedor: 'Resend',
    modo: 'Usuário Pessoal (Cada usuário conecta sua conta)',
    master_conectado: masterResendConectado,
    remetente_padrao: `${remetenteNome} <${remetenteEmail}>`,
    detalhe: masterResendConectado
      ? 'Conexão Resend verificada e ativa.'
      : totalEnviados > 0 && totalFalhas === 0
        ? 'Envios anteriores realizados com sucesso.'
        : ultimoErro
          ? `Alerta: ${ultimoErro}`
          : 'Aguardando conexão Resend nas Configurações.',
    testado_em: new Date().toISOString(),
    estatisticas: {
      total_convites: totalConvites,
      total_enviados: totalEnviados,
      total_falhas: totalFalhas,
      ultimo_erro: ultimoErro,
    },
    mensagem:
      totalFalhas > 0 && ultimoErro
        ? `Atenção: Houve falha recente de envio: "${ultimoErro}"`
        : masterResendConectado
          ? 'Conta Resend do Master conectada e pronta para envio.'
          : 'Sistema pronto para envios via Resend.',
  })
})

// -------------------------------------------------------------
// 5. Rota de diagnóstico de status do WhatsApp (Master)
// -------------------------------------------------------------
routerAdd('GET', '/backend/v1/master/status-whatsapp', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { status: 'desconectado', erro: 'Não autenticado' })
  }

  const app = e.app
  let totalConvites = 0
  let totalEnviados = 0
  let totalFalhas = 0
  let totalComTelefone = 0
  let ultimoErro = ''

  try {
    const ultimosConvites = app.findRecordsByFilter('convites_equipe', '1 = 1', '-created', 50)
    totalConvites = ultimosConvites.length
    ultimosConvites.forEach((item) => {
      const tel = item.getString('telefone')
      if (tel && tel.trim().length > 0) {
        totalComTelefone++
        if (item.getBool('whatsapp_enviado')) {
          totalEnviados++
        } else {
          totalFalhas++
          if (!ultimoErro && item.getString('whatsapp_erro')) {
            ultimoErro = item.getString('whatsapp_erro')
          }
        }
      }
    })
  } catch (err) {
    console.warn('[status-whatsapp] Erro ao ler histórico de convites:', err)
  }

  // Verifica status da conexão WhatsApp do Master
  let masterConectado = false
  let numeroTelefoneMaster = ''
  let erroConexaoMaster = ''

  try {
    const resPhones = $connectors.execute(authRecord, 'WHATSAPP_GET_PHONE_NUMBERS', {})
    if (resPhones && resPhones.successful && resPhones.data) {
      const raw = resPhones.data
      let list = []
      if (Array.isArray(raw)) list = raw
      else if (raw && Array.isArray(raw.data)) list = raw.data
      else if (raw && Array.isArray(raw.phone_numbers)) list = raw.phone_numbers

      if (list.length > 0) {
        masterConectado = true
        numeroTelefoneMaster = list[0].display_phone_number || list[0].id || 'WhatsApp Conectado'
      }
    } else if (resPhones && !resPhones.successful) {
      erroConexaoMaster = String(resPhones.error || '')
    }
  } catch (errZapMaster) {
    erroConexaoMaster = String(errZapMaster.message || errZapMaster)
  }

  const statusCalculado = masterConectado
    ? totalFalhas === 0 && totalEnviados > 0
      ? 'conectado'
      : totalFalhas > 0
        ? 'ativo_com_alertas'
        : 'conectado'
    : 'desconectado'

  return e.json(200, {
    status: statusCalculado,
    provedor: 'WhatsApp Cloud API',
    modo: 'Cada usuário conecta a própria conta (Pessoal)',
    master_conectado: masterConectado,
    numero_master: numeroTelefoneMaster,
    erro_master: erroConexaoMaster,
    estatisticas: {
      total_convites: totalConvites,
      total_com_telefone: totalComTelefone,
      total_enviados: totalEnviados,
      total_falhas: totalFalhas,
      ultimo_erro: ultimoErro,
    },
    mensagem: masterConectado
      ? totalFalhas > 0 && ultimoErro
        ? `WhatsApp do Master conectado (${numeroTelefoneMaster}), mas houve falhas recentes de envio: "${ultimoErro}"`
        : `WhatsApp pessoal conectado com sucesso (${numeroTelefoneMaster}). Convites serão enviados pelos números de quem convidar.`
      : 'A conta de WhatsApp do Master ainda não foi conectada. Cada usuário deve conectar seu WhatsApp em Configurações > WhatsApp para disparar convites.',
  })
})
