/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para disparo de e-mails transacionais de convite de equipe
 * utilizando prioritariamente a conta Resend do proprietário (owner mode via $connectors.executeAsOwner)
 * com fallback gracioso para o mailer nativo do PocketBase ($app.newMailClient()).
 *
 * NOTA DE ESCOPO DO JSVM:
 * Todas as funções/helpers devem ficar estritamente INLINE dentro de cada callback de hook/route.
 */

// 1. Hook disparado após criação de novo convite na coleção
onRecordCreate((e) => {
  e.next()

  const record = e.record
  const app = e.app

  const emailDestino = record.getString('email')
  if (!emailDestino) return

  const token = record.getString('token')
  const escopoTipo = record.getString('escopo_tipo') || 'geral'
  const escopoNome = record.getString('escopo_nome') || 'Workspace'
  const nivelAcesso = record.getString('nivel_acesso') || 'leitura'
  const mensagem = record.getString('mensagem') || ''

  // Buscar nome do convidador se houver relation
  let nomeConvidador = 'Marcos Chagas Diamond'
  try {
    const convId = record.getString('convidado_por')
    if (convId) {
      const u = app.findRecordById('_pb_users_auth_', convId)
      nomeConvidador = u.getString('name') || u.getString('email') || nomeConvidador
    }
  } catch (_) {}

  // Determinar URL base do frontend
  const siteUrl = $os.getenv('SITE_URL') || ''
  let linkAceite = '/convite/' + token
  if (siteUrl && siteUrl.startsWith('http')) {
    linkAceite = siteUrl.replace(/\/+$/, '') + '/convite/' + token
  }

  const rotulosEscopoMap = {
    geral: 'Workspace Geral Diamond',
    projeto: 'Projeto: ' + escopoNome,
    fluxo: 'Fluxo Kanban: ' + escopoNome,
    categoria: 'Categoria de Fluxos: ' + escopoNome,
    cliente: 'Cliente & Entregas: ' + escopoNome,
    demanda: 'Tarefa/Demanda: ' + escopoNome,
  }
  const rotuloEscopo = rotulosEscopoMap[escopoTipo] || 'Escopo: ' + (escopoNome || escopoTipo)

  const rotulosNivelMap = {
    leitura: 'Somente Leitura (Visualizador)',
    edicao: 'Pode Editar (Colaborador)',
    admin: 'Administrador',
  }
  const rotuloNivel = rotulosNivelMap[nivelAcesso] || nivelAcesso

  let msgOpcionalHtml = ''
  if (mensagem) {
    const safeMsg = mensagem.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    msgOpcionalHtml =
      '<div style="margin: 20px 0; padding: 14px 16px; background-color: #F4F2EE; border-left: 4px solid #0F766E; border-radius: 4px; font-style: italic; color: #374151; font-size: 14px;">"' +
      safeMsg +
      '"</div>'
  }

  const assuntoEmail =
    'Convite de Equipe: ' + nomeConvidador + ' convidou você para o Agenda IA Diamond'

  const html =
    '<!DOCTYPE html>' +
    '<html lang="pt-BR">' +
    '<head><meta charset="utf-8"><title>Convite de Equipe - Agenda IA Diamond</title></head>' +
    '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F2EE; margin: 0; padding: 24px; color: #1A1D21;">' +
    '  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E1D8; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">' +
    '    <div style="background-color: #1A1D21; padding: 24px; text-align: center; border-bottom: 3px solid #0F766E;">' +
    '      <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">AGENDA IA DIAMOND</h1>' +
    '      <p style="color: #9CA3AF; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Gestão Estratégica & Segundo Cérebro Executivo</p>' +
    '    </div>' +
    '    <div style="padding: 32px 28px;">' +
    '      <p style="font-size: 16px; line-height: 1.5; margin-top: 0; color: #1A1D21;">Olá,</p>' +
    '      <p style="font-size: 15px; line-height: 1.6; color: #4B5563;"><strong>' +
    nomeConvidador +
    '</strong> convidou você para colaborar na plataforma <strong>Agenda IA Diamond</strong> com acesso dedicado.</p>' +
    '      <div style="margin: 24px 0; padding: 18px 20px; background-color: #FAFAF9; border: 1px solid #E5E1D8; border-radius: 8px;">' +
    '        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0F766E; letter-spacing: 0.5px; margin-bottom: 6px;">Escopo Compartilhado Concedido</div>' +
    '        <div style="font-size: 16px; font-weight: 700; color: #1A1D21; margin-bottom: 8px;">' +
    rotuloEscopo +
    '</div>' +
    '        <div style="display: inline-block; font-size: 12px; background-color: #E6F4F1; color: #0F766E; padding: 4px 10px; border-radius: 999px; font-weight: 600;">Nível: ' +
    rotuloNivel +
    '</div>' +
    '      </div>' +
    msgOpcionalHtml +
    '      <p style="font-size: 14px; line-height: 1.5; color: #4B5563;">Se você já possui uma conta com este e-mail, basta acessar para ver o escopo liberado. Caso ainda não tenha cadastro, você poderá definir sua senha e entrar imediatamente pelo link abaixo:</p>' +
    '      <div style="text-align: center; margin: 32px 0 24px 0;">' +
    '        <a href="' +
    linkAceite +
    '" style="background-color: #0F766E; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);">Aceitar Convite e Acessar</a>' +
    '      </div>' +
    '      <p style="font-size: 12px; line-height: 1.4; color: #9CA3AF; text-align: center; margin-bottom: 0;">Este convite é válido por 7 dias. Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="' +
    linkAceite +
    '" style="color: #0F766E; word-break: break-all;">' +
    linkAceite +
    '</a></p>' +
    '    </div>' +
    '    <div style="background-color: #F4F2EE; padding: 16px 24px; text-align: center; border-top: 1px solid #E5E1D8; font-size: 11px; color: #6B7280;">Enviado automaticamente por Agenda IA Diamond &bull; Não responda a este e-mail.</div>' +
    '  </div>' +
    '</body>' +
    '</html>'

  let enviado = false
  let ultimoErro = ''

  // 1. Tentar disparo via Resend conectado como dono ($connectors.executeAsOwner)
  try {
    const remetenteResend = 'Agenda IA Diamond <onboarding@resend.dev>'
    const resendResult = $connectors.executeAsOwner('resend', 'RESEND_SEND_EMAIL', {
      from: remetenteResend,
      to: [emailDestino],
      subject: assuntoEmail,
      html: html,
    })

    if (resendResult && resendResult.successful) {
      enviado = true
      console.log('[Convite] E-mail enviado com sucesso via Resend para ' + emailDestino)
    } else {
      ultimoErro =
        resendResult && resendResult.error
          ? String(resendResult.error)
          : 'Falha na resposta do Resend'
      console.log('[Convite] Resend retornou erro:', ultimoErro)
    }
  } catch (errResend) {
    ultimoErro = errResend && errResend.message ? errResend.message : String(errResend)
    console.log('[Convite] Exceção ao tentar envio via Resend:', ultimoErro)
  }

  // 2. Se Resend falhou ou não conectou, tentar mailer interno como fallback
  if (!enviado) {
    try {
      const senderAddress = app.settings().meta.senderAddress || 'noreply@agendadiamond.com'
      const senderName = 'Agenda IA Diamond'
      const mailMessage = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: emailDestino }],
        subject: assuntoEmail,
        html: html,
      })
      app.newMailClient().send(mailMessage)
      enviado = true
      ultimoErro = ''
      console.log('[Convite] E-mail enviado via mailer nativo para ' + emailDestino)
    } catch (errMailer) {
      const mailerMsg = errMailer && errMailer.message ? errMailer.message : String(errMailer)
      ultimoErro = ultimoErro ? ultimoErro + ' | Falha fallback mailer: ' + mailerMsg : mailerMsg
      console.log('[Convite] Falha também no fallback nativo:', mailerMsg)
    }
  }

  // 3. Atualizar status no convite (o convite continua criado com token funcional!)
  try {
    if (enviado) {
      record.set('email_enviado', true)
      record.set('enviado_em', new Date().toISOString())
      record.set('erro_envio', '')
    } else {
      record.set('email_enviado', false)
      record.set('erro_envio', ultimoErro || 'E-mail não pôde ser entregue')
    }
    app.save(record)
  } catch (saveErr) {
    console.log('[Convite] Erro ao atualizar status de envio no convite:', saveErr)
  }
}, 'convites_equipe')

// 2. Endpoint para reenviar convite existente
routerAdd(
  'POST',
  '/backend/v1/equipe/reenviar-convite',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Autenticação necessária')

      const body = e.requestInfo().body || {}
      const conviteId = body.convite_id
      if (!conviteId) return e.badRequestError('ID do convite obrigatório')

      const record = $app.findRecordById('convites_equipe', conviteId)
      if (!record) return e.notFoundError('Convite não encontrado')

      // Renovar expiração para mais 7 dias se estava expirado
      const expira = new Date()
      expira.setDate(expira.getDate() + 7)
      record.set('expira_em', expira.toISOString())
      if (record.getString('status') === 'expirado') {
        record.set('status', 'pendente')
      }

      const emailDestino = record.getString('email')
      if (!emailDestino) {
        return e.badRequestError('Convite sem e-mail de destino válido')
      }

      const token = record.getString('token')
      const escopoTipo = record.getString('escopo_tipo') || 'geral'
      const escopoNome = record.getString('escopo_nome') || 'Workspace'
      const nivelAcesso = record.getString('nivel_acesso') || 'leitura'
      const mensagem = record.getString('mensagem') || ''

      let nomeConvidador = 'Marcos Chagas Diamond'
      try {
        const convId = record.getString('convidado_por')
        if (convId) {
          const u = $app.findRecordById('_pb_users_auth_', convId)
          nomeConvidador = u.getString('name') || u.getString('email') || nomeConvidador
        }
      } catch (_) {}

      const siteUrl = $os.getenv('SITE_URL') || ''
      let linkAceite = '/convite/' + token
      if (siteUrl && siteUrl.startsWith('http')) {
        linkAceite = siteUrl.replace(/\/+$/, '') + '/convite/' + token
      }

      const rotulosEscopoMap = {
        geral: 'Workspace Geral Diamond',
        projeto: 'Projeto: ' + escopoNome,
        fluxo: 'Fluxo Kanban: ' + escopoNome,
        categoria: 'Categoria de Fluxos: ' + escopoNome,
        cliente: 'Cliente & Entregas: ' + escopoNome,
        demanda: 'Tarefa/Demanda: ' + escopoNome,
      }
      const rotuloEscopo = rotulosEscopoMap[escopoTipo] || 'Escopo: ' + (escopoNome || escopoTipo)

      const rotulosNivelMap = {
        leitura: 'Somente Leitura (Visualizador)',
        edicao: 'Pode Editar (Colaborador)',
        admin: 'Administrador',
      }
      const rotuloNivel = rotulosNivelMap[nivelAcesso] || nivelAcesso

      let msgOpcionalHtml = ''
      if (mensagem) {
        const safeMsg = mensagem.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        msgOpcionalHtml =
          '<div style="margin: 20px 0; padding: 14px 16px; background-color: #F4F2EE; border-left: 4px solid #0F766E; border-radius: 4px; font-style: italic; color: #374151; font-size: 14px;">"' +
          safeMsg +
          '"</div>'
      }

      const assuntoEmail =
        'Reenvio de Convite: ' + nomeConvidador + ' convidou você para o Agenda IA Diamond'

      const html =
        '<!DOCTYPE html>' +
        '<html lang="pt-BR">' +
        '<head><meta charset="utf-8"><title>Convite de Equipe - Agenda IA Diamond</title></head>' +
        '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F2EE; margin: 0; padding: 24px; color: #1A1D21;">' +
        '  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E1D8; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">' +
        '    <div style="background-color: #1A1D21; padding: 24px; text-align: center; border-bottom: 3px solid #0F766E;">' +
        '      <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">AGENDA IA DIAMOND</h1>' +
        '      <p style="color: #9CA3AF; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Gestão Estratégica & Segundo Cérebro Executivo</p>' +
        '    </div>' +
        '    <div style="padding: 32px 28px;">' +
        '      <p style="font-size: 16px; line-height: 1.5; margin-top: 0; color: #1A1D21;">Olá,</p>' +
        '      <p style="font-size: 15px; line-height: 1.6; color: #4B5563;"><strong>' +
        nomeConvidador +
        '</strong> reenviou o convite para você colaborar na plataforma <strong>Agenda IA Diamond</strong> com acesso dedicado.</p>' +
        '      <div style="margin: 24px 0; padding: 18px 20px; background-color: #FAFAF9; border: 1px solid #E5E1D8; border-radius: 8px;">' +
        '        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0F766E; letter-spacing: 0.5px; margin-bottom: 6px;">Escopo Compartilhado Concedido</div>' +
        '        <div style="font-size: 16px; font-weight: 700; color: #1A1D21; margin-bottom: 8px;">' +
        rotuloEscopo +
        '</div>' +
        '        <div style="display: inline-block; font-size: 12px; background-color: #E6F4F1; color: #0F766E; padding: 4px 10px; border-radius: 999px; font-weight: 600;">Nível: ' +
        rotuloNivel +
        '</div>' +
        '      </div>' +
        msgOpcionalHtml +
        '      <p style="font-size: 14px; line-height: 1.5; color: #4B5563;">Se você já possui uma conta com este e-mail, basta acessar para ver o escopo liberado. Caso ainda não tenha cadastro, você poderá definir sua senha e entrar imediatamente pelo link abaixo:</p>' +
        '      <div style="text-align: center; margin: 32px 0 24px 0;">' +
        '        <a href="' +
        linkAceite +
        '" style="background-color: #0F766E; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);">Aceitar Convite e Acessar</a>' +
        '      </div>' +
        '      <p style="font-size: 12px; line-height: 1.4; color: #9CA3AF; text-align: center; margin-bottom: 0;">Este convite é válido por 7 dias. Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="' +
        linkAceite +
        '" style="color: #0F766E; word-break: break-all;">' +
        linkAceite +
        '</a></p>' +
        '    </div>' +
        '    <div style="background-color: #F4F2EE; padding: 16px 24px; text-align: center; border-top: 1px solid #E5E1D8; font-size: 11px; color: #6B7280;">Enviado automaticamente por Agenda IA Diamond &bull; Não responda a este e-mail.</div>' +
        '  </div>' +
        '</body>' +
        '</html>'

      let enviado = false
      let ultimoErro = ''

      // 1. Envio via Resend owner mode
      try {
        const remetenteResend = 'Agenda IA Diamond <onboarding@resend.dev>'
        const resendResult = $connectors.executeAsOwner('resend', 'RESEND_SEND_EMAIL', {
          from: remetenteResend,
          to: [emailDestino],
          subject: assuntoEmail,
          html: html,
        })
        if (resendResult && resendResult.successful) {
          enviado = true
        } else {
          ultimoErro =
            resendResult && resendResult.error
              ? String(resendResult.error)
              : 'Falha na resposta do Resend'
        }
      } catch (errResend) {
        ultimoErro = errResend && errResend.message ? errResend.message : String(errResend)
      }

      // 2. Fallback nativo
      if (!enviado) {
        try {
          const senderAddress = $app.settings().meta.senderAddress || 'noreply@agendadiamond.com'
          const senderName = 'Agenda IA Diamond'
          const mailMessage = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: emailDestino }],
            subject: assuntoEmail,
            html: html,
          })
          $app.newMailClient().send(mailMessage)
          enviado = true
          ultimoErro = ''
        } catch (mErr) {
          const fallbackErr = mErr && mErr.message ? mErr.message : String(mErr)
          ultimoErro = ultimoErro ? ultimoErro + ' | Falha fallback: ' + fallbackErr : fallbackErr
        }
      }

      if (enviado) {
        record.set('email_enviado', true)
        record.set('enviado_em', new Date().toISOString())
        record.set('erro_envio', '')
      } else {
        record.set('email_enviado', false)
        record.set('erro_envio', ultimoErro || 'Erro no reenvio de e-mail')
      }

      $app.save(record)

      if (!enviado) {
        return e.json(200, {
          sucesso: false,
          email_enviado: false,
          mensagem:
            'O convite foi renovado, mas o envio de e-mail falhou (' +
            (ultimoErro || 'verifique o Resend') +
            '). Você pode reenviar novamente.',
          erro: ultimoErro,
        })
      }

      return e.json(200, {
        sucesso: true,
        email_enviado: true,
        mensagem: 'Convite reenviado por e-mail com sucesso para ' + emailDestino + '.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao reenviar convite' })
    }
  },
  $apis.requireAuth(),
)

// 3. Endpoint para o Master checar o status da conexão Resend
routerAdd(
  'GET',
  '/backend/v1/master/status-resend',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('Autenticação necessária')

      // Verificar se o usuário solicitante é Master
      let isMaster = false
      try {
        const membro = $app.findFirstRecordByData('membros_equipe', 'usuario', userId)
        if (membro && membro.getBool('is_master')) {
          isMaster = true
        }
      } catch (_) {}

      if (!isMaster) {
        try {
          const licenca = $app.findFirstRecordByData(
            'licencas_conta',
            'titular_email',
            e.auth.email,
          )
          if (licenca && licenca.getString('plano') === 'diamond_executive') {
            isMaster = true
          }
        } catch (_) {}
      }

      // Testar conector Resend chamando uma consulta leve (RESEND_GET_USAGE ou RESEND_LIST_EMAILS)
      let conectado = false
      let detalhe = ''
      let usageInfo = null

      try {
        const usageRes = $connectors.executeAsOwner('resend', 'RESEND_GET_USAGE', {})
        if (usageRes && usageRes.successful) {
          conectado = true
          usageInfo = usageRes.data || null
          detalhe = 'Conexão Resend (owner) ativa e respondendo com sucesso.'
        } else {
          conectado = false
          detalhe =
            usageRes?.error ||
            'A conta Resend do proprietário ainda não está autenticada ou conectada no painel.'
        }
      } catch (callErr) {
        conectado = false
        detalhe = callErr && callErr.message ? callErr.message : String(callErr)
      }

      return e.json(200, {
        sucesso: true,
        conectado: conectado,
        detalhe: detalhe,
        remetente_padrao: 'Agenda IA Diamond <onboarding@resend.dev>',
        uso: usageInfo,
        testado_em: new Date().toISOString(),
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao verificar conexão Resend' })
    }
  },
  $apis.requireAuth(),
)

// 4. Endpoint público/autenticado para verificar e aceitar convite por token
routerAdd('POST', '/backend/v1/equipe/aceitar-convite', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const token = body.token
    if (!token) return e.badRequestError('Token obrigatório')

    // Buscar convite
    const convite = $app.findFirstRecordByData('convites_equipe', 'token', token)
    if (!convite) return e.notFoundError('Convite não encontrado ou inválido')

    if (convite.getString('status') === 'revogado') {
      return e.badRequestError('Este convite foi revogado pelo administrador.')
    }

    if (convite.getString('status') === 'aceito') {
      return e.json(200, {
        sucesso: true,
        ja_aceito: true,
        mensagem: 'Este convite já foi aceito.',
      })
    }

    // Checar expiração
    const expiraEm = convite.getString('expira_em')
    if (expiraEm && new Date(expiraEm) < new Date()) {
      convite.set('status', 'expirado')
      $app.save(convite)
      return e.badRequestError('Este convite expirou. Solicite um novo envio ao administrador.')
    }

    const email = convite.getString('email')
    const escopoTipo = convite.getString('escopo_tipo') || 'geral'
    const escopoId = convite.getString('escopo_id') || ''
    const escopoNome = convite.getString('escopo_nome') || 'Workspace'
    const nivelAcesso = convite.getString('nivel_acesso') || 'leitura'

    // Se usuário já estiver logado, ou autenticado na chamada
    let usuarioId = e.auth?.id || body.usuario_id || ''

    // Se ainda não temos usuarioId, tentar achar user pelo email
    if (!usuarioId) {
      try {
        const userRec = $app.findAuthRecordByEmail('_pb_users_auth_', email)
        usuarioId = userRec.id
      } catch (_) {}
    }

    // Atualizar ou criar registro em membros_equipe
    const membrosCol = $app.findCollectionByNameOrId('membros_equipe')
    let membroRec = null
    try {
      membroRec = $app.findFirstRecordByData('membros_equipe', 'email', email)
    } catch (_) {}

    const novoEscopo = {
      tipo: escopoTipo,
      id: escopoId,
      nome: escopoNome,
      nivel: nivelAcesso,
    }

    if (membroRec) {
      let escopos = []
      try {
        escopos = JSON.parse(membroRec.getString('escopos') || '[]')
      } catch (_) {
        escopos = []
      }
      const jaExiste = escopos.some((es) => es.tipo === escopoTipo && es.id === escopoId)
      if (!jaExiste) {
        escopos.push(novoEscopo)
        membroRec.set('escopos', JSON.stringify(escopos))
      }
      if (usuarioId && !membroRec.getString('usuario')) {
        membroRec.set('usuario', usuarioId)
      }
      membroRec.set('status', 'ativo')
      membroRec.set('ultimo_acesso', new Date().toISOString())
      $app.save(membroRec)
    } else {
      const novoMembro = new Record(membrosCol)
      if (usuarioId) novoMembro.set('usuario', usuarioId)
      novoMembro.set('email', email)
      novoMembro.set('nome', body.nome || email.split('@')[0])
      novoMembro.set('funcao', nivelAcesso === 'admin' ? 'admin' : 'membro')
      novoMembro.set('nivel_acesso', nivelAcesso)
      novoMembro.set('status', 'ativo')
      novoMembro.set('escopos', JSON.stringify([novoEscopo]))
      novoMembro.set('ultimo_acesso', new Date().toISOString())
      if (convite.getString('convidado_por')) {
        novoMembro.set('adicionado_por', convite.getString('convidado_por'))
      }
      $app.save(novoMembro)
    }

    // Marcar convite como aceito
    convite.set('status', 'aceito')
    convite.set('aceito_em', new Date().toISOString())
    if (usuarioId) convite.set('usuario_aceitou', usuarioId)
    $app.save(convite)

    return e.json(200, {
      sucesso: true,
      mensagem: 'Convite aceito com sucesso! Bem-vindo à equipe.',
      email: email,
      escopo: novoEscopo,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Erro ao aceitar convite' })
  }
})
