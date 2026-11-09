/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de convites de equipe e envio de e-mails via Resend (PocketBase v0.23+):
 * Todas as funções auxiliares são declaradas inline dentro do escopo de cada callback
 * para evitar ReferenceError no pool JSVM isolado do PocketBase.
 */

// -------------------------------------------------------------
// 1. Hook automático após criar convite
// -------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  const app = e.app
  const conviteRecord = e.record

  function carregarConfigMaster() {
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

  function carregarConfigUsuario(userId) {
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

  function formatarErro(err) {
    if (!err) return 'Erro desconhecido ao enviar e-mail'
    let msg = ''
    if (typeof err === 'string') msg = err
    else if (err.message) msg = String(err.message)
    else {
      try {
        msg = JSON.stringify(err)
      } catch (_) {
        msg = String(err)
      }
    }

    if (
      msg.includes('connector') &&
      (msg.includes('not connected') || msg.includes('inactive') || msg.includes('disabled'))
    ) {
      return 'Conector Resend não está ativo ou não foi autenticado pelo proprietário/usuário.'
    }
    if (msg.includes('domain is not verified') || msg.includes('validation_error')) {
      return `Resend: ${msg} (Dica: o domínio precisa estar verificado ou usar onboarding@resend.dev)`
    }
    return msg.length > 500 ? msg.substring(0, 500) + '...' : msg
  }

  const conviteEmail = conviteRecord.getString('email')
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

  const configMaster = carregarConfigMaster()
  const configUsuario = carregarConfigUsuario(convidadoPorId)

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

  const baseUrl = $os.getenv('APP_URL') || 'https://agenda-ia-diamond.goskip.app'
  const linkConvite = `${baseUrl}/convite/${token}`

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

  let emailEnviado = false
  let erroEnvioTexto = ''

  try {
    let conectorExecutado = false

    if (convidadorRecord && configUsuario && configUsuario.usar_resend_proprio) {
      try {
        console.log(
          `[convites] Tentando enviar convite via Resend pessoal do usuario ${convidadoPorId}...`,
        )
        $connectors.execute(convidadorRecord, 'resend', 'send-email', {
          from: remetenteCompleto,
          to: conviteEmail,
          subject: assuntoFinal,
          html: html,
        })
        emailEnviado = true
        conectorExecutado = true
      } catch (userErr) {
        console.warn('[convites] Falha no Resend pessoal do usuario:', userErr)
        erroEnvioTexto = `Falha no Resend pessoal (${formatarErro(userErr)}). `
      }
    }

    if (!conectorExecutado) {
      console.log(
        `[convites] Disparando envio via conector Resend centralizado (owner) para ${conviteEmail}...`,
      )
      $connectors.executeAsOwner('resend', 'send-email', {
        from: remetenteCompleto,
        to: conviteEmail,
        subject: assuntoFinal,
        html: html,
      })
      emailEnviado = true
    }
  } catch (err) {
    const errFormatado = formatarErro(err)
    erroEnvioTexto += errFormatado
    console.error(`[convites] Erro no envio via Resend para ${conviteEmail}:`, errFormatado)
  }

  // Persistir o resultado e erro real
  try {
    conviteRecord.set('email_enviado', emailEnviado)
    if (emailEnviado) {
      conviteRecord.set('erro_envio', '')
    } else {
      conviteRecord.set(
        'erro_envio',
        erroEnvioTexto || 'Falha ao conectar ao serviço Resend. Verifique a integração.',
      )
    }
    app.save(conviteRecord)
  } catch (saveErr) {
    console.error('[convites] Erro ao salvar status de envio no registro do convite:', saveErr)
  }

  e.next()
}, 'convites_equipe')

// -------------------------------------------------------------
// 2. Rota para reenvio manual de convite
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/convites/reenviar', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { erro: 'Não autorizado. Faça login para reenviar convites.' })
  }

  const reqInfo = e.requestInfo()
  const body = (reqInfo && reqInfo.body) || {}
  const conviteId = body.convite_id

  if (!conviteId) {
    return e.json(400, { erro: 'ID do convite é obrigatório.' })
  }

  const app = e.app

  function formatarErro(err) {
    if (!err) return 'Erro desconhecido ao enviar e-mail'
    let msg = ''
    if (typeof err === 'string') msg = err
    else if (err.message) msg = String(err.message)
    else {
      try {
        msg = JSON.stringify(err)
      } catch (_) {
        msg = String(err)
      }
    }
    if (
      msg.includes('connector') &&
      (msg.includes('not connected') || msg.includes('inactive') || msg.includes('disabled'))
    ) {
      return 'Conector Resend não está ativo ou não foi autenticado pelo proprietário/usuário.'
    }
    if (msg.includes('domain is not verified') || msg.includes('validation_error')) {
      return `Resend: ${msg} (Dica: o domínio precisa estar verificado ou usar onboarding@resend.dev)`
    }
    return msg.length > 500 ? msg.substring(0, 500) + '...' : msg
  }

  try {
    const conviteRecord = app.findRecordById('convites_equipe', conviteId)
    if (!conviteRecord) {
      return e.json(404, { erro: 'Convite não encontrado.' })
    }

    const conviteEmail = conviteRecord.getString('email')
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
      texto_rodape: 'Enviado automaticamente por Agenda IA Diamond • Não responda a este e-mail.',
    }

    try {
      const records = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
      if (records && records.length > 0) {
        const r = records[0]
        configMaster.remetente_nome = r.getString('remetente_nome') || configMaster.remetente_nome
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
            mensagem_personalizada_convite: ur.getString('mensagem_personalizada_convite') || '',
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

    const baseUrl = $os.getenv('APP_URL') || 'https://agenda-ia-diamond.goskip.app'
    const linkConvite = `${baseUrl}/convite/${token}`

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

    let emailEnviado = false
    let erroEnvioTexto = ''
    let disparadoPor = 'owner'

    try {
      let conectorExecutado = false

      if (convidadorRecord && configUsuario && configUsuario.usar_resend_proprio) {
        try {
          $connectors.execute(convidadorRecord, 'resend', 'send-email', {
            from: remetenteCompleto,
            to: conviteEmail,
            subject: assuntoFinal,
            html: html,
          })
          emailEnviado = true
          disparadoPor = 'usuario_proprio'
          conectorExecutado = true
        } catch (uErr) {
          erroEnvioTexto = `Falha no Resend pessoal (${formatarErro(uErr)}). `
        }
      }

      if (!conectorExecutado) {
        $connectors.executeAsOwner('resend', 'send-email', {
          from: remetenteCompleto,
          to: conviteEmail,
          subject: assuntoFinal,
          html: html,
        })
        emailEnviado = true
        disparadoPor = 'owner'
      }
    } catch (err) {
      erroEnvioTexto += formatarErro(err)
    }

    conviteRecord.set('email_enviado', emailEnviado)
    conviteRecord.set('erro_envio', emailEnviado ? '' : erroEnvioTexto)
    app.save(conviteRecord)

    if (emailEnviado) {
      return e.json(200, {
        sucesso: true,
        email_enviado: true,
        mensagem: `E-mail reenviado com sucesso para ${conviteEmail}`,
        disparado_por: disparadoPor,
        remetente: remetenteCompleto,
      })
    } else {
      return e.json(500, {
        sucesso: false,
        email_enviado: false,
        erro: erroEnvioTexto || 'Falha no envio via Resend.',
        disparado_por: disparadoPor,
      })
    }
  } catch (err) {
    return e.json(500, {
      sucesso: false,
      erro: 'Erro interno ao processar o reenvio: ' + String(err.message || err),
    })
  }
})

// -------------------------------------------------------------
// 3. Rota para teste de envio do próprio usuário em /config
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
    if (!err) return 'Erro desconhecido ao enviar e-mail'
    let msg = ''
    if (typeof err === 'string') msg = err
    else if (err.message) msg = String(err.message)
    else {
      try {
        msg = JSON.stringify(err)
      } catch (_) {
        msg = String(err)
      }
    }
    if (
      msg.includes('connector') &&
      (msg.includes('not connected') || msg.includes('inactive') || msg.includes('disabled'))
    ) {
      return 'Conector Resend não está ativo ou não foi autenticado pelo proprietário/usuário.'
    }
    if (msg.includes('domain is not verified') || msg.includes('validation_error')) {
      return `Resend: ${msg} (Dica: o domínio precisa estar verificado ou usar onboarding@resend.dev)`
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
        <h2 style="font-size: 16px; margin: 0 0 12px 0;">Teste de Envio Bem-Sucedido!</h2>
        <p style="font-size: 13px; color: #4B5563; line-height: 1.5;">
          Olá, <strong>${userName}</strong>.<br />
          Sua configuração de envio de e-mail está funcionando corretamente. Quando você convidar novos membros, os e-mails sairão com este padrão.
        </p>
        <div style="background: #F3F4F6; border-left: 4px solid ${configMaster.cor_primaria || '#0F766E'}; padding: 12px; margin: 16px 0; font-size: 12px;">
          <strong>Prévia da sua mensagem personalizada de convite:</strong><br />
          <em style="color: #374151;">"${mensagemExemplo}"</em>
        </div>
        <p style="font-size: 11px; color: #6B7280; margin: 0;">
          Remetente configurado: <code>${remetenteCompleto}</code>
        </p>
      </div>
      <p style="text-align: center; font-size: 11px; color: #9CA3AF; margin-top: 16px;">
        ${configMaster.texto_rodape || 'Enviado por Agenda IA Diamond'}
      </p>
    </div>
  `

  let enviado = false
  let erroTexto = ''
  let disparadoPor = 'owner'

  try {
    if (configUsuario && configUsuario.usar_resend_proprio) {
      try {
        $connectors.execute(authRecord, 'resend', 'send-email', {
          from: remetenteCompleto,
          to: userEmail,
          subject: 'Teste de Envio: Sua Conta Agenda IA Diamond',
          html: htmlTeste,
        })
        enviado = true
        disparadoPor = 'usuario_proprio'
      } catch (uErr) {
        erroTexto = formatarErro(uErr)
      }
    } else {
      $connectors.executeAsOwner('resend', 'send-email', {
        from: remetenteCompleto,
        to: userEmail,
        subject: 'Teste de Envio: Sua Conta Agenda IA Diamond',
        html: htmlTeste,
      })
      enviado = true
      disparadoPor = 'owner'
    }
  } catch (err) {
    erroTexto = formatarErro(err)
  }

  try {
    let cfgRecord = null
    const lista = app.findRecordsByFilter(
      'config_email_usuario',
      `usuario = '${userId}'`,
      '-created',
      1,
    )
    if (lista && lista.length > 0) {
      cfgRecord = lista[0]
    } else {
      const col = app.findCollectionByNameOrId('config_email_usuario')
      cfgRecord = new Record(col)
      cfgRecord.set('usuario', userId)
    }

    cfgRecord.set('ultimo_teste_em', new Date().toISOString())
    cfgRecord.set('ultimo_status_teste', enviado ? 'sucesso' : 'falha')
    cfgRecord.set('ultimo_erro_teste', enviado ? '' : erroTexto)
    app.save(cfgRecord)
  } catch (sErr) {
    console.warn('[teste-usuario] Erro ao salvar historico de teste:', sErr)
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
      erro: erroTexto || 'Falha ao disparar e-mail de teste pelo Resend.',
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

  return e.json(200, {
    status:
      totalFalhas === 0 && totalEnviados > 0
        ? 'conectado'
        : totalEnviados > 0
          ? 'ativo_com_alertas'
          : 'pendente_teste',
    provedor: 'Resend',
    modo: 'Owner + Usuário Pessoal',
    remetente_padrao: `${remetenteNome} <${remetenteEmail}>`,
    estatisticas: {
      total_convites: totalConvites,
      total_enviados: totalEnviados,
      total_falhas: totalFalhas,
      ultimo_erro: ultimoErro,
    },
    mensagem:
      totalFalhas > 0 && ultimoErro
        ? `Atenção: Houve falha recente de envio: "${ultimoErro}"`
        : 'Sistema pronto para envios via Resend.',
  })
})
