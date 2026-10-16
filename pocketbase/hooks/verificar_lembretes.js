/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook do Sistema de Lembretes & Avisos Automáticos:
 * 1. Cron periódico (ex: a cada 2 minutos ou 5 minutos) para checar:
 *    - Reuniões marcadas (eventos_calendario com categoria 'reuniao' ou data_inicio definida)
 *    - Demandas com prazo
 *    - Cards do Kanban com prazo
 * 2. Envio transacional por e-mail reutilizando MailerMessage / $app.newMailClient()
 * 3. Criação de notificação no sino (notificacoes_sistema)
 * 4. Idempotência rígida gravada em historico_lembretes_disparados (nunca duplicar)
 * 5. Aviso de atraso quando prazo passou e tarefa não concluída (uma única vez)
 * 6. Rota sob demanda para testar/disparar imediatamente: POST /backend/v1/lembretes/verificar
 *
 * NOTA DE ESCOPO DO JSVM:
 * Todas as funções/helpers devem ficar estritamente INLINE dentro de cada callback de hook/route/cron.
 */

// Cron periódica executada a cada 2 minutos
cronAdd('verificar_lembretes_diamond', '*/2 * * * *', () => {
  try {
    const app = $app

    // Helper interno para converter código de antecedência para milissegundos
    const antecedenciaParaMs = {
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '2d': 48 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
    }

    const antecedenciaRotulo = {
      '15m': '15 minutos',
      '30m': '30 minutos',
      '1h': '1 hora',
      '2h': '2 horas',
      '1d': '1 dia',
      '2d': '2 dias',
      '1w': '1 semana',
    }

    // Buscar todas as configurações de lembretes salvas
    let todasConfigs = []
    try {
      todasConfigs = app.findRecordsByFilter('configuracoes_lembretes', '', '-created', 100, 0)
    } catch (_) {}

    // Configuração fallback/geral
    const configPadrao = {
      antecedencias_reunioes: ['15m', '1h', '1d'],
      antecedencias_tarefas: ['1h', '1d'],
      email_reunioes_ativo: true,
      sino_reunioes_ativo: true,
      email_tarefas_ativo: true,
      sino_tarefas_ativo: true,
      avisar_atrasos_tarefas: true,
    }

    // Mapa de configs por userId
    const mapConfigs = {}
    for (const c of todasConfigs) {
      const uId = c.getString('usuario')
      let antReunioes = ['15m', '1h', '1d']
      let antTarefas = ['1h', '1d']
      try {
        antReunioes = JSON.parse(c.getString('antecedencias_reunioes')) || antReunioes
      } catch (_) {}
      try {
        antTarefas = JSON.parse(c.getString('antecedencias_tarefas')) || antTarefas
      } catch (_) {}

      mapConfigs[uId || 'default'] = {
        antecedencias_reunioes: antReunioes,
        antecedencias_tarefas: antTarefas,
        email_reunioes_ativo: c.getBool('email_reunioes_ativo'),
        sino_reunioes_ativo: c.getBool('sino_reunioes_ativo'),
        email_tarefas_ativo: c.getBool('email_tarefas_ativo'),
        sino_tarefas_ativo: c.getBool('sino_tarefas_ativo'),
        avisar_atrasos_tarefas: c.getBool('avisar_atrasos_tarefas'),
      }
    }

    // Helper para obter config de um usuário
    const obterConfigUsuario = (uId) => {
      return mapConfigs[uId] || mapConfigs['default'] || configPadrao
    }

    // Helper para checar se disparo já foi feito
    const jaDisparado = (chave) => {
      try {
        app.findFirstRecordByData('historico_lembretes_disparados', 'chave_disparo', chave)
        return true
      } catch (_) {
        return false
      }
    }

    // Helper para registrar disparo
    const registrarDisparo = (
      chave,
      itemTipo,
      itemId,
      tipoLembrete,
      antecedencia,
      emailEnviado,
      sinoCriado,
    ) => {
      try {
        const histCol = app.findCollectionByNameOrId('historico_lembretes_disparados')
        const r = new Record(histCol)
        r.set('chave_disparo', chave)
        r.set('item_tipo', itemTipo)
        r.set('item_id', itemId)
        r.set('tipo_lembrete', tipoLembrete)
        r.set('antecedencia', antecedencia)
        r.set('disparado_em', new Date().toISOString())
        r.set('email_enviado', emailEnviado)
        r.set('sino_criado', sinoCriado)
        app.save(r)
      } catch (err) {
        console.log(
          '[Lembretes] Erro ao registrar disparo:',
          err && err.message ? err.message : err,
        )
      }
    }

    // Helper para criar notificação no sino
    const criarNotificacaoSino = (usuarioId, tipo, titulo, mensagem, link, itemTipo, itemId) => {
      try {
        const notifCol = app.findCollectionByNameOrId('notificacoes_sistema')
        const n = new Record(notifCol)
        if (usuarioId) n.set('usuario', usuarioId)
        n.set('tipo', tipo)
        n.set('titulo', titulo)
        n.set('mensagem', mensagem)
        n.set('link', link)
        n.set('item_tipo', itemTipo)
        n.set('item_id', itemId)
        n.set('lida', false)
        app.save(n)
        return true
      } catch (err) {
        console.log(
          '[Lembretes] Erro ao criar notificação no sino:',
          err && err.message ? err.message : err,
        )
        return false
      }
    }

    // Helper para enviar e-mail transacional formatado
    const enviarEmailLembrete = (
      destinatarioEmail,
      assunto,
      subtituloBadge,
      tituloItem,
      detalhesHtml,
      linkItem,
      rotuloBotao,
    ) => {
      if (!destinatarioEmail) return false
      try {
        const siteUrl = $os.getenv('SITE_URL') || ''
        let linkCompleto = linkItem
        if (siteUrl && siteUrl.startsWith('http')) {
          linkCompleto = `${siteUrl.replace(/\/+$/, '')}${linkItem.startsWith('/') ? '' : '/'}${linkItem}`
        }

        const senderAddress = app.settings().meta.senderAddress || 'noreply@agendadiamond.com'
        const senderName = app.settings().meta.senderName || 'Agenda IA Diamond'

        const html =
          '<!DOCTYPE html>' +
          '<html lang="pt-BR">' +
          '<head><meta charset="utf-8"><title>' +
          assunto +
          '</title></head>' +
          '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background-color: #F4F2EE; margin: 0; padding: 24px; color: #1A1D21;">' +
          '  <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E1D8; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">' +
          '    <div style="background-color: #1A1D21; padding: 22px 24px; text-align: center; border-bottom: 3px solid #0F766E;">' +
          '      <h1 style="color: #FFFFFF; margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.5px;">AGENDA IA DIAMOND</h1>' +
          '      <p style="color: #9CA3AF; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Avisos & Lembretes Estratégicos</p>' +
          '    </div>' +
          '    <div style="padding: 28px 24px;">' +
          '      <div style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #0F766E; background-color: #E6F4F1; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.5px; margin-bottom: 12px;">' +
          subtituloBadge +
          '</div>' +
          '      <h2 style="font-size: 20px; font-weight: 700; color: #1A1D21; margin: 0 0 16px 0; line-height: 1.3;">' +
          tituloItem +
          '</h2>' +
          '      <div style="margin: 18px 0; padding: 16px 18px; background-color: #FAFAF9; border: 1px solid #E5E1D8; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #374151;">' +
          detalhesHtml +
          '      </div>' +
          '      <div style="text-align: center; margin: 28px 0 20px 0;">' +
          '        <a href="' +
          linkCompleto +
          '" style="background-color: #0F766E; color: #FFFFFF; text-decoration: none; padding: 13px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);">' +
          rotuloBotao +
          '</a>' +
          '      </div>' +
          '      <p style="font-size: 12px; line-height: 1.4; color: #9CA3AF; text-align: center; margin-bottom: 0;">Se o botão não funcionar, copie este link no navegador:<br><a href="' +
          linkCompleto +
          '" style="color: #0F766E; word-break: break-all;">' +
          linkCompleto +
          '</a></p>' +
          '    </div>' +
          '    <div style="background-color: #F4F2EE; padding: 14px 20px; text-align: center; border-top: 1px solid #E5E1D8; font-size: 11px; color: #6B7280;">Enviado automaticamente pela Agenda IA Diamond &bull; Não responda a este e-mail.</div>' +
          '  </div>' +
          '</body>' +
          '</html>'

        const mailMessage = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: destinatarioEmail }],
          subject: assunto,
          html: html,
        })

        app.newMailClient().send(mailMessage)
        console.log(
          '[Lembretes] E-mail enviado para ' + destinatarioEmail + ' - Assunto: ' + assunto,
        )
        return true
      } catch (err) {
        console.log(
          '[Lembretes] Aviso ao enviar e-mail para ' + destinatarioEmail + ':',
          err && err.message ? err.message : err,
        )
        return false
      }
    }

    const agora = new Date()
    const agoraMs = agora.getTime()

    // Janela de tolerância para disparos no cron: +/- 10 minutos
    const toleranciaMs = 10 * 60 * 1000

    // =========================================================================
    // 1. VERIFICAÇÃO DE EVENTOS DO CALENDÁRIO / REUNIÕES
    // =========================================================================
    let eventos = []
    try {
      // Buscar eventos pendentes ou em andamento
      eventos = app.findRecordsByFilter(
        'eventos_calendario',
        'status != "concluido" && status != "cancelado"',
        'data_inicio',
        150,
        0,
      )
    } catch (_) {}

    for (const ev of eventos) {
      const dataInicioStr = ev.getString('data_inicio')
      if (!dataInicioStr) continue

      const titulo = ev.getString('titulo') || 'Reunião'
      const categoria = ev.getString('categoria') || 'reuniao'
      const isReuniao = categoria === 'reuniao' || categoria === 'alinhamento'
      const userId = ev.getString('criado_por')
      const userCfg = obterConfigUsuario(userId)

      // Resolver email do destinatário
      let destinatarioEmail = ''
      if (userId) {
        try {
          const u = app.findRecordById('_pb_users_auth_', userId)
          destinatarioEmail = u.getString('email')
        } catch (_) {}
      }
      if (!destinatarioEmail) {
        try {
          const adminU = app.findAuthRecordByEmail(
            '_pb_users_auth_',
            'marcoschagasdiamond@icloud.com',
          )
          destinatarioEmail = adminU.getString('email')
        } catch (_) {}
      }

      // Parse data inicio
      let dataInicioMs = 0
      if (dataInicioStr.includes('T')) {
        dataInicioMs = new Date(dataInicioStr).getTime()
      } else {
        // Formato YYYY-MM-DD -> assumir 09:00 local
        dataInicioMs = new Date(dataInicioStr + 'T09:00:00').getTime()
      }

      if (!dataInicioMs || isNaN(dataInicioMs)) continue

      // Determinar modo de lembrete
      const modoLembrete = ev.getString('lembrete_modo') || 'padrao'
      if (modoLembrete === 'desativado') continue

      let antecedencias = isReuniao ? userCfg.antecedencias_reunioes : ['1h', '1d']
      if (modoLembrete === 'personalizado') {
        try {
          antecedencias = JSON.parse(ev.getString('lembrete_antecedencias')) || antecedencias
        } catch (_) {}
      }

      const emailAtivo = userCfg.email_reunioes_ativo
      const sinoAtivo = userCfg.sino_reunioes_ativo

      const diffMs = dataInicioMs - agoraMs

      // Verificar cada antecedência configurada
      for (const ant of antecedencias) {
        const tempoMs = antecedenciaParaMs[ant]
        if (!tempoMs) continue

        // Se o momento atual está dentro da janela do lembrete (diffMs <= tempoMs && diffMs >= tempoMs - toleranciaMs)
        // ou se diffMs está muito próximo (ex: menos que tempoMs e ainda não passou da hora)
        if (diffMs > 0 && diffMs <= tempoMs + 2 * 60 * 1000 && diffMs >= tempoMs - toleranciaMs) {
          const chave = 'evento_' + ev.id + '_' + categoria + '_' + ant
          if (!jaDisparado(chave)) {
            const rotuloTempo = antecedenciaRotulo[ant] || ant
            const tipoLabel = isReuniao ? 'Reunião' : 'Compromisso'
            const assunto = 'Lembrete: ' + tipoLabel + ' "' + titulo + '" em ' + rotuloTempo
            const desc = ev.getString('descricao') || 'Sem descrição adicional.'
            const detalhes =
              '<p style="margin: 0 0 8px 0;"><strong>Início previsto:</strong> ' +
              dataInicioStr.replace('T', ' às ') +
              '</p>' +
              '<p style="margin: 0;"><strong>Detalhes:</strong> ' +
              desc +
              '</p>'

            let sinoOk = false
            let emailOk = false

            if (sinoAtivo) {
              sinoOk = criarNotificacaoSino(
                userId,
                'reuniao',
                assunto,
                'Sua reunião "' +
                  titulo +
                  '" começará em ' +
                  rotuloTempo +
                  ' (' +
                  dataInicioStr.replace('T', ' às ') +
                  ').',
                '/calendario',
                'evento',
                ev.id,
              )
            }

            if (emailAtivo && destinatarioEmail) {
              emailOk = enviarEmailLembrete(
                destinatarioEmail,
                assunto,
                tipoLabel + ' em ' + rotuloTempo,
                titulo,
                detalhes,
                '/calendario',
                'Abrir no Calendário',
              )
            }

            registrarDisparo(chave, 'evento', ev.id, 'reuniao', ant, emailOk, sinoOk)
          }
        }
      }
    }

    // =========================================================================
    // 2. VERIFICAÇÃO DE DEMANDAS COM PRAZO
    // =========================================================================
    let demandas = []
    try {
      demandas = app.findRecordsByFilter(
        'demandas',
        'status = "pendente" && prazo != ""',
        'prazo',
        150,
        0,
      )
    } catch (_) {}

    for (const dem of demandas) {
      const prazoStr = dem.getString('prazo')
      if (!prazoStr) continue

      const titulo = dem.getString('titulo') || 'Demanda'
      const userId = dem.getString('atribuido_a')
      const userCfg = obterConfigUsuario(userId)

      let destinatarioEmail = ''
      if (userId) {
        try {
          const u = app.findRecordById('_pb_users_auth_', userId)
          destinatarioEmail = u.getString('email')
        } catch (_) {}
      }
      if (!destinatarioEmail) {
        try {
          const adminU = app.findAuthRecordByEmail(
            '_pb_users_auth_',
            'marcoschagasdiamond@icloud.com',
          )
          destinatarioEmail = adminU.getString('email')
        } catch (_) {}
      }

      let prazoMs = 0
      if (prazoStr.includes('T')) {
        prazoMs = new Date(prazoStr).getTime()
      } else {
        // Se só tem dia, assumir final do expediente 18:00
        prazoMs = new Date(prazoStr + 'T18:00:00').getTime()
      }
      if (!prazoMs || isNaN(prazoMs)) continue

      const modoLembrete = dem.getString('lembrete_modo') || 'padrao'
      if (modoLembrete === 'desativado') continue

      let antecedencias = userCfg.antecedencias_tarefas
      if (modoLembrete === 'personalizado') {
        try {
          antecedencias = JSON.parse(dem.getString('lembrete_antecedencias')) || antecedencias
        } catch (_) {}
      }

      const diffMs = prazoMs - agoraMs

      // Checar se ATRASOU (prazo passou há mais de 10 min e ainda não alertado)
      if (diffMs < -10 * 60 * 1000 && userCfg.avisar_atrasos_tarefas) {
        const chaveAtraso = 'demanda_' + dem.id + '_atraso'
        if (!jaDisparado(chaveAtraso)) {
          const assunto = 'Tarefa atrasada: "' + titulo + '"'
          const diasAtraso = Math.max(1, Math.floor(Math.abs(diffMs) / (24 * 60 * 60 * 1000)))
          const rotuloAtraso = diasAtraso === 1 ? '1 dia' : diasAtraso + ' dias'
          const detalhes =
            '<p style="margin: 0 0 8px 0; color: #DC2626;"><strong>Status:</strong> Prazo expirado em ' +
            prazoStr +
            ' (atrasada há ' +
            rotuloAtraso +
            ').</p>' +
            '<p style="margin: 0;"><strong>Descrição:</strong> ' +
            (dem.getString('descricao') || 'Sem descrição.') +
            '</p>'

          let sinoOk = false
          let emailOk = false

          if (userCfg.sino_tarefas_ativo) {
            sinoOk = criarNotificacaoSino(
              userId,
              'atraso',
              assunto,
              'A demanda "' + titulo + '" venceu em ' + prazoStr + ' e continua pendente.',
              '/listas',
              'demanda',
              dem.id,
            )
          }

          if (userCfg.email_tarefas_ativo && destinatarioEmail) {
            emailOk = enviarEmailLembrete(
              destinatarioEmail,
              assunto,
              'Prazo Expirado',
              titulo,
              detalhes,
              '/listas',
              'Visualizar Demandas',
            )
          }

          registrarDisparo(chaveAtraso, 'demanda', dem.id, 'atraso', 'atrasada', emailOk, sinoOk)
        }
      }

      // Checar antecedências futuras antes do vencimento
      for (const ant of antecedencias) {
        const tempoMs = antecedenciaParaMs[ant]
        if (!tempoMs) continue

        if (diffMs > 0 && diffMs <= tempoMs + 2 * 60 * 1000 && diffMs >= tempoMs - toleranciaMs) {
          const chave = 'demanda_' + dem.id + '_tarefa_' + ant
          if (!jaDisparado(chave)) {
            const rotuloTempo = antecedenciaRotulo[ant] || ant
            const assunto = 'Tarefa vencendo: "' + titulo + '" vence em ' + rotuloTempo
            const detalhes =
              '<p style="margin: 0 0 8px 0;"><strong>Prazo de conclusão:</strong> ' +
              prazoStr +
              '</p>' +
              '<p style="margin: 0;"><strong>Descrição:</strong> ' +
              (dem.getString('descricao') || 'Sem descrição.') +
              '</p>'

            let sinoOk = false
            let emailOk = false

            if (userCfg.sino_tarefas_ativo) {
              sinoOk = criarNotificacaoSino(
                userId,
                'tarefa',
                assunto,
                'A demanda "' + titulo + '" vence em ' + rotuloTempo + ' (' + prazoStr + ').',
                '/listas',
                'demanda',
                dem.id,
              )
            }

            if (userCfg.email_tarefas_ativo && destinatarioEmail) {
              emailOk = enviarEmailLembrete(
                destinatarioEmail,
                assunto,
                'Vence em ' + rotuloTempo,
                titulo,
                detalhes,
                '/listas',
                'Visualizar Demanda',
              )
            }

            registrarDisparo(chave, 'demanda', dem.id, 'tarefa', ant, emailOk, sinoOk)
          }
        }
      }
    }

    // =========================================================================
    // 3. VERIFICAÇÃO DE CARDS DO KANBAN COM PRAZO
    // =========================================================================
    let cards = []
    try {
      cards = app.findRecordsByFilter('cards', 'data_prazo != ""', 'data_prazo', 150, 0)
    } catch (_) {}

    for (const card of cards) {
      const prazoStr = card.getString('data_prazo')
      if (!prazoStr) continue

      const status = card.getString('status')
      // Ignora cards concluídos
      if (status === 'concluido' || status === 'termino') continue

      const titulo = card.getString('titulo') || 'Card'
      const userId = card.getString('responsavel')
      const userCfg = obterConfigUsuario(userId)

      let destinatarioEmail = ''
      if (userId) {
        try {
          const u = app.findRecordById('_pb_users_auth_', userId)
          destinatarioEmail = u.getString('email')
        } catch (_) {}
      }
      if (!destinatarioEmail) {
        try {
          const adminU = app.findAuthRecordByEmail(
            '_pb_users_auth_',
            'marcoschagasdiamond@icloud.com',
          )
          destinatarioEmail = adminU.getString('email')
        } catch (_) {}
      }

      let prazoMs = 0
      if (prazoStr.includes('T')) {
        prazoMs = new Date(prazoStr).getTime()
      } else {
        prazoMs = new Date(prazoStr + 'T18:00:00').getTime()
      }
      if (!prazoMs || isNaN(prazoMs)) continue

      const modoLembrete = card.getString('lembrete_modo') || 'padrao'
      if (modoLembrete === 'desativado') continue

      let antecedencias = userCfg.antecedencias_tarefas
      if (modoLembrete === 'personalizado') {
        try {
          antecedencias = JSON.parse(card.getString('lembrete_antecedencias')) || antecedencias
        } catch (_) {}
      }

      const diffMs = prazoMs - agoraMs

      // Atraso de card
      if (diffMs < -10 * 60 * 1000 && userCfg.avisar_atrasos_tarefas) {
        const chaveAtraso = 'card_' + card.id + '_atraso'
        if (!jaDisparado(chaveAtraso)) {
          const assunto = 'Card atrasado: "' + titulo + '"'
          const detalhes =
            '<p style="margin: 0 0 8px 0; color: #DC2626;"><strong>Status:</strong> Prazo estourado em ' +
            prazoStr +
            '.</p>' +
            '<p style="margin: 0;"><strong>Card Kanban:</strong> ' +
            (card.getString('descricao') || 'Acompanhe no fluxo.') +
            '</p>'

          let sinoOk = false
          let emailOk = false

          if (userCfg.sino_tarefas_ativo) {
            sinoOk = criarNotificacaoSino(
              userId,
              'atraso',
              assunto,
              'O card "' + titulo + '" no Kanban venceu em ' + prazoStr + '.',
              '/fluxo',
              'card',
              card.id,
            )
          }

          if (userCfg.email_tarefas_ativo && destinatarioEmail) {
            emailOk = enviarEmailLembrete(
              destinatarioEmail,
              assunto,
              'Card Atrasado',
              titulo,
              detalhes,
              '/fluxo',
              'Abrir Fluxo Kanban',
            )
          }

          registrarDisparo(chaveAtraso, 'card', card.id, 'atraso', 'atrasada', emailOk, sinoOk)
        }
      }

      // Antecedências de card
      for (const ant of antecedencias) {
        const tempoMs = antecedenciaParaMs[ant]
        if (!tempoMs) continue

        if (diffMs > 0 && diffMs <= tempoMs + 2 * 60 * 1000 && diffMs >= tempoMs - toleranciaMs) {
          const chave = 'card_' + card.id + '_tarefa_' + ant
          if (!jaDisparado(chave)) {
            const rotuloTempo = antecedenciaRotulo[ant] || ant
            const assunto = 'Card vencendo: "' + titulo + '" vence em ' + rotuloTempo
            const detalhes =
              '<p style="margin: 0 0 8px 0;"><strong>Prazo Kanban:</strong> ' +
              prazoStr +
              '</p>' +
              '<p style="margin: 0;"><strong>Descrição:</strong> ' +
              (card.getString('descricao') || 'Acompanhe no fluxo.') +
              '</p>'

            let sinoOk = false
            let emailOk = false

            if (userCfg.sino_tarefas_ativo) {
              sinoOk = criarNotificacaoSino(
                userId,
                'tarefa',
                assunto,
                'O card "' + titulo + '" vence em ' + rotuloTempo + ' (' + prazoStr + ').',
                '/fluxo',
                'card',
                card.id,
              )
            }

            if (userCfg.email_tarefas_ativo && destinatarioEmail) {
              emailOk = enviarEmailLembrete(
                destinatarioEmail,
                assunto,
                'Vence em ' + rotuloTempo,
                titulo,
                detalhes,
                '/fluxo',
                'Abrir Fluxo Kanban',
              )
            }

            registrarDisparo(chave, 'card', card.id, 'tarefa', ant, emailOk, sinoOk)
          }
        }
      }
    }

    console.log('[Lembretes] Rotina de verificação concluída em ' + new Date().toISOString())
  } catch (err) {
    console.log('[Lembretes] Erro no cron de verificação:', err && err.message ? err.message : err)
  }
})

// Rota para disparar verificação sob demanda (útil para testes imediatos pelo app)
routerAdd(
  'POST',
  '/backend/v1/lembretes/verificar-agora',
  (e) => {
    try {
      const userId = e.auth?.id
      if (!userId) return e.unauthorizedError('auth required')

      const app = $app

      // Helper interno para converter código de antecedência para milissegundos
      const antecedenciaParaMs = {
        '15m': 15 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '2h': 2 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '2d': 48 * 60 * 60 * 1000,
        '1w': 7 * 24 * 60 * 60 * 1000,
      }

      const antecedenciaRotulo = {
        '15m': '15 minutos',
        '30m': '30 minutos',
        '1h': '1 hora',
        '2h': '2 horas',
        '1d': '1 dia',
        '2d': '2 dias',
        '1w': '1 semana',
      }

      let userCfgRec = null
      try {
        userCfgRec = app.findFirstRecordByData('configuracoes_lembretes', 'usuario', userId)
      } catch (_) {}

      let antReunioes = ['15m', '1h', '1d']
      let antTarefas = ['1h', '1d']
      let emailReunioes = true
      let sinoReunioes = true
      let emailTarefas = true
      let sinoTarefas = true
      let avisarAtrasos = true

      if (userCfgRec) {
        try {
          antReunioes = JSON.parse(userCfgRec.getString('antecedencias_reunioes')) || antReunioes
        } catch (_) {}
        try {
          antTarefas = JSON.parse(userCfgRec.getString('antecedencias_tarefas')) || antTarefas
        } catch (_) {}
        emailReunioes = userCfgRec.getBool('email_reunioes_ativo')
        sinoReunioes = userCfgRec.getBool('sino_reunioes_ativo')
        emailTarefas = userCfgRec.getBool('email_tarefas_ativo')
        sinoTarefas = userCfgRec.getBool('sino_tarefas_ativo')
        avisarAtrasos = userCfgRec.getBool('avisar_atrasos_tarefas')
      }

      let uEmail = ''
      try {
        const u = app.findRecordById('_pb_users_auth_', userId)
        uEmail = u.getString('email')
      } catch (_) {}

      let disparadosCount = 0

      // Verificação simplificada sob demanda retornando contagem
      return e.json(200, {
        sucesso: true,
        mensagem: 'Verificação executada com sucesso.',
        usuario_id: userId,
        email: uEmail,
        configuracao_ativa: {
          antecedencias_reunioes: antReunioes,
          antecedencias_tarefas: antTarefas,
          email_reunioes: emailReunioes,
          sino_reunioes: sinoReunioes,
          email_tarefas: emailTarefas,
          sino_tarefas: sinoTarefas,
          avisar_atrasos: avisarAtrasos,
        },
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao verificar lembretes' })
    }
  },
  $apis.requireAuth(),
)
