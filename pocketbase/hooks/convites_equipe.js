/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook para disparo de e-mails transacionais de convite de equipe
 * utilizando o cliente nativo de e-mail do PocketBase ($app.newMailClient()).
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
  let linkAceite = `/convite/${token}`
  if (siteUrl && siteUrl.startsWith('http')) {
    linkAceite = `${siteUrl.replace(/\/+$/, '')}/convite/${token}`
  }

  const rotulosEscopoMap = {
    geral: 'Workspace Geral Diamond',
    projeto: 'Projeto: ' + escopoNome,
    fluxo: 'Fluxo Kanban: ' + escopoNome,
    categoria: 'Categoria de Fluxos: ' + escopoNome,
    cliente: 'Cliente & Entregas: ' + escopoNome,
    demanda: 'Demanda Específica: ' + escopoNome,
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

  try {
    const senderAddress = app.settings().meta.senderAddress || 'noreply@agendadiamond.com'
    const senderName = app.settings().meta.senderName || 'Agenda IA Diamond'

    const mailMessage = new MailerMessage({
      from: {
        address: senderAddress,
        name: senderName,
      },
      to: [{ address: emailDestino }],
      subject: 'Convite de Equipe: ' + nomeConvidador + ' convidou você para o Agenda IA Diamond',
      html: html,
    })

    app.newMailClient().send(mailMessage)
    record.set('enviado_em', new Date().toISOString())
    app.save(record)
    console.log('[Convite] E-mail de convite enviado para ' + emailDestino)
  } catch (err) {
    console.log(
      '[Convite] Aviso ao enviar e-mail para ' + emailDestino + ':',
      err && err.message ? err.message : err,
    )
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

      // Reenvio inline
      const emailDestino = record.getString('email')
      if (emailDestino) {
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
          demanda: 'Demanda Específica: ' + escopoNome,
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

        try {
          const senderAddress = $app.settings().meta.senderAddress || 'noreply@agendadiamond.com'
          const senderName = $app.settings().meta.senderName || 'Agenda IA Diamond'
          const mailMessage = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: emailDestino }],
            subject:
              'Reenvio de Convite: ' + nomeConvidador + ' convidou você para o Agenda IA Diamond',
            html: html,
          })
          $app.newMailClient().send(mailMessage)
          record.set('enviado_em', new Date().toISOString())
        } catch (mErr) {
          console.log('[Convite] Aviso ao reenviar:', mErr)
        }
      }

      $app.save(record)

      return e.json(200, { sucesso: true, mensagem: 'Convite reenviado por e-mail com sucesso.' })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao reenviar convite' })
    }
  },
  $apis.requireAuth(),
)

// 3. Endpoint público/autenticado para verificar e aceitar convite por token
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
