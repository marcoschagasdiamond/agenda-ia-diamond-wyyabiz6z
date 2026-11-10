/// <reference path="../pb_data/types.d.ts" />

/**
 * Lembrete por evento (decisão do usuário):
 * - Canal: E-MAIL (Resend via conector) + WHATSAPP (conta própria do usuário via conector)
 * - Antecedência escolhida POR EVENTO (lembrete_minutos_antes, vazio/0 = sem lembrete)
 * - Idempotência: booleano lembrete_enviado na própria coleção + histórico em historico_lembretes_disparados
 * - Fuso de referência: America/Sao_Paulo (UTC-3, sem horário de verão)
 *
 * NOTA DE ESCOPO DO JSVM: o PocketBase executa callbacks (cron/rota) em um pool de VM
 * separado — funções e variáveis de topo NÃO são acessíveis dentro deles (ReferenceError).
 * TODA a lógica vive inline no corpo de cada callback (padrão de verificar_lembretes.js).
 */

// Cron a cada 2 minutos: processa eventos futuros com antecedência configurada
cronAdd('lembretes_eventos_agenda', '*/2 * * * *', () => {
  try {
    const app = $app

    // ---------- helpers inline (todos dentro deste callback) ----------
    const parseData = (str) => {
      if (!str) return 0
      const s = String(str).trim()
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/)
      if (m && !/Z$/i.test(s)) {
        // Data/hora sem fuso gravada pelo app = horário local de São Paulo (UTC-3)
        return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 3 * 3600 * 1000
      }
      const d = new Date(s.replace(' ', 'T'))
      return isNaN(d.getTime()) ? 0 : d.getTime()
    }

    const formatarMs = (ms) => {
      if (!ms) return ''
      // Converte de volta para o relógio de São Paulo deslocando +3h e lendo os componentes UTC
      const d = new Date(ms + 3 * 3600 * 1000)
      const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
      const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
      const dia = ('0' + d.getUTCDate()).slice(-2)
      const hh = ('0' + d.getUTCHours()).slice(-2)
      const mm = ('0' + d.getUTCMinutes()).slice(-2)
      return (
        dias[d.getUTCDay()] +
        ', ' +
        dia +
        '/' +
        meses[d.getUTCMonth()] +
        '/' +
        d.getUTCFullYear() +
        ' às ' +
        hh +
        ':' +
        mm
      )
    }

    const rotuloAntecedencia = (minutos) => {
      const m = Number(minutos) || 0
      if (m <= 0) return ''
      if (m < 60) return m + ' minutos'
      if (m === 60) return '1 hora'
      if (m < 1440) return m / 60 + ' horas'
      if (m === 1440) return '1 dia'
      if (m < 10080) return m / 1440 + ' dias'
      if (m === 10080) return '1 semana'
      return Math.round(m / 10080) + ' semanas'
    }

    const remetente = () => {
      let rem = 'Agenda IA Diamond <onboarding@resend.dev>'
      try {
        const recs = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
        if (recs && recs.length > 0) {
          const nome = recs[0].getString('remetente_nome') || 'Agenda IA Diamond'
          const email = recs[0].getString('remetente_email') || 'onboarding@resend.dev'
          rem = nome + ' <' + email + '>'
        }
      } catch (_) {}
      return rem
    }

    // E-mail: 1) Resend do dono (executeAsOwner), 2) fallback do mailer do PocketBase
    const enviarEmail = (destinatarioEmail, assunto, html) => {
      if (!destinatarioEmail) return { ok: false, erro: 'sem e-mail do destinatário' }
      const from = remetente()
      try {
        const res = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
          from: from,
          to: destinatarioEmail,
          subject: assunto,
          html: html,
        })
        if (res && res.successful) return { ok: true, via: 'resend_owner' }
      } catch (errOwner) {
        console.log(
          '[Lembrete Evento] executeAsOwner Resend falhou:',
          errOwner && errOwner.message ? errOwner.message : errOwner,
        )
      }
      try {
        const senderAddress = app.settings().meta.senderAddress || 'noreply@agendadiamond.com'
        const senderName = app.settings().meta.senderName || 'Agenda IA Diamond'
        const msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: destinatarioEmail }],
          subject: assunto,
          html: html,
        })
        app.newMailClient().send(msg)
        return { ok: true, via: 'mailer' }
      } catch (errMailer) {
        return {
          ok: false,
          erro: errMailer && errMailer.message ? errMailer.message : String(errMailer),
        }
      }
    }

    // WhatsApp: usa a CONTA PRÓPRIA do usuário (toolkit whatsapp). Destinatário = o próprio
    // número do usuário (lembrete para si mesmo), obtido de WHATSAPP_GET_PHONE_NUMBERS.
    const extrairListaNumeros = (raw) => {
      let lista = []
      if (Array.isArray(raw)) lista = raw
      else if (raw && Array.isArray(raw.data)) lista = raw.data
      else if (raw && Array.isArray(raw.phone_numbers)) lista = raw.phone_numbers
      return lista
    }

    const enviarWhatsApp = (userRecord, texto) => {
      if (!userRecord || !userRecord.id) return { ok: false, erro: 'sem usuário no evento' }
      let phoneNumberId = ''
      try {
        const cfg = app.findFirstRecordByData('configuracoes_whatsapp', 'usuario', userRecord.id)
        if (cfg) phoneNumberId = cfg.getString('phone_number_id') || ''
      } catch (_) {}

      let listaNumeros = []
      if (!phoneNumberId || true) {
        try {
          const resPhones = $connectors.execute(userRecord, 'WHATSAPP_GET_PHONE_NUMBERS', {})
          if (resPhones && resPhones.successful && resPhones.data) {
            listaNumeros = extrairListaNumeros(resPhones.data)
            if (listaNumeros.length > 0 && listaNumeros[0] && listaNumeros[0].id) {
              const idPrimeiro = String(listaNumeros[0].id)
              if (!phoneNumberId) phoneNumberId = idPrimeiro
              try {
                const cfg2 = app.findFirstRecordByData(
                  'configuracoes_whatsapp',
                  'usuario',
                  userRecord.id,
                )
                if (cfg2) {
                  cfg2.set('phone_number_id', idPrimeiro)
                  app.save(cfg2)
                }
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      if (!phoneNumberId) {
        return { ok: false, erro: 'WhatsApp não conectado (sem phone_number_id) — canal pulado' }
      }

      let toNumber = ''
      if (listaNumeros.length > 0) {
        toNumber =
          String(listaNumeros[0].display_phone_number || listaNumeros[0].display_number || '') ||
          (listaNumeros[0].id ? String(listaNumeros[0].id) : '')
      }
      if (!toNumber) {
        try {
          const resP = $connectors.execute(userRecord, 'WHATSAPP_GET_PHONE_NUMBERS', {})
          if (resP && resP.successful && resP.data) {
            const lista = extrairListaNumeros(resP.data)
            if (lista.length > 0) {
              toNumber =
                String(lista[0].display_phone_number || lista[0].display_number || '') ||
                (lista[0].id ? String(lista[0].id) : '')
            }
          }
        } catch (_) {}
      }

      if (!toNumber) {
        return {
          ok: false,
          erro: 'Não foi possível identificar o número do próprio usuário — canal pulado',
        }
      }

      try {
        const res = $connectors.execute(userRecord, 'WHATSAPP_SEND_MESSAGE', {
          text: texto,
          to_number: toNumber,
          phone_number_id: phoneNumberId,
        })
        if (res && res.successful) return { ok: true, via: 'whatsapp_user' }
        return {
          ok: false,
          erro: res && res.error ? String(res.error) : 'Falha no conector WhatsApp',
        }
      } catch (errZap) {
        return {
          ok: false,
          erro: errZap && errZap.message ? errZap.message : String(errZap),
        }
      }
    }

    const registrarHistorico = (ev, minutos, emailOk, zapOk) => {
      try {
        const histCol = app.findCollectionByNameOrId('historico_lembretes_disparados')
        const r = new Record(histCol)
        r.set('chave_disparo', 'evento_agenda_' + ev.id + '_' + minutos)
        r.set('item_tipo', 'evento')
        r.set('item_id', ev.id)
        r.set('tipo_lembrete', 'evento_agenda')
        r.set('antecedencia', rotuloAntecedencia(minutos))
        r.set('disparado_em', new Date().toISOString())
        r.set('email_enviado', !!emailOk)
        r.set('sino_criado', !!zapOk)
        app.save(r)
      } catch (err) {
        console.log(
          '[Lembrete Evento] Erro ao registrar histórico:',
          err && err.message ? err.message : err,
        )
      }
    }

    const montarMensagens = (ev, dataInicioMs, minutos) => {
      const titulo = ev.getString('titulo') || 'Evento'
      const rotulo = rotuloAntecedencia(minutos)
      const quando = formatarMs(dataInicioMs)
      const linkReuniao = ev.getString('link_reuniao') || ''
      const descricao = ev.getString('descricao') || ''

      const textoZap =
        '🔔 *Lembrete de evento — Agenda IA Diamond*\n\n' +
        'Seu evento *' +
        titulo +
        '* começa em ' +
        rotulo +
        '.\n\n' +
        '📅 ' +
        quando +
        (linkReuniao ? '\n🔗 Link da reunião: ' + linkReuniao : '') +
        (descricao ? '\n\n📝 ' + descricao.slice(0, 200) : '')

      const siteUrl = $os.getenv('SITE_URL') || ''
      const linkCalendario = siteUrl ? siteUrl.replace(/\/+$/, '') + '/calendario' : '/calendario'

      const htmlEmail =
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>' +
        '<body style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; background:#F4F2EE; margin:0; padding:24px; color:#1A1D21;">' +
        '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;border:1px solid #E5E1D8;overflow:hidden;">' +
        '<div style="background:#1A1D21;padding:20px 24px;text-align:center;border-bottom:3px solid #0F766E;">' +
        '<h1 style="color:#FFFFFF;margin:0;font-size:18px;font-weight:700;">AGENDA IA DIAMOND</h1>' +
        '<p style="color:#9CA3AF;margin:4px 0 0 0;font-size:11px;">LEMBRETE DE EVENTO</p></div>' +
        '<div style="padding:26px 24px;">' +
        '<p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 16px 0;">' +
        'Seu evento começa em <strong>' +
        rotulo +
        '</strong>.</p>' +
        '<div style="padding:16px 18px;background:#FAFAF9;border:1px solid #E5E1D8;border-radius:8px;font-size:14px;line-height:1.6;color:#374151;margin-bottom:16px;">' +
        '<p style="margin:0 0 8px 0;"><strong>📌 Evento:</strong> ' +
        titulo +
        '</p>' +
        '<p style="margin:0 0 8px 0;"><strong>🕒 Quando:</strong> ' +
        quando +
        '</p>' +
        (linkReuniao
          ? '<p style="margin:0;"><strong>🔗 Link da reunião:</strong> <a href="' +
            linkReuniao +
            '" style="color:#0F766E;word-break:break-all;">' +
            linkReuniao +
            '</a></p>'
          : '') +
        (descricao
          ? '<p style="margin:8px 0 0 0;"><strong>📝 Detalhes:</strong> ' + descricao + '</p>'
          : '') +
        '</div>' +
        '<div style="text-align:center;margin:24px 0 8px 0;">' +
        '<a href="' +
        linkCalendario +
        '" style="background:#0F766E;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Abrir no Calendário</a>' +
        '</div></div>' +
        '<div style="background:#F4F2EE;padding:12px 20px;text-align:center;font-size:11px;color:#6B7280;">Enviado automaticamente pela Agenda IA Diamond &bull; Não responda a este e-mail.</div>' +
        '</div></body></html>'

      const assunto = 'Lembrete: "' + titulo + '" começa em ' + rotulo
      return { textoZap: textoZap, htmlEmail: htmlEmail, assunto: assunto }
    }

    const processar = (maxEventos) => {
      const agoraMs = Date.now()
      let eventos = []
      try {
        eventos = app.findRecordsByFilter(
          'eventos_calendario',
          'lembrete_minutos_antes > 0 && lembrete_enviado != true && status != "concluido" && status != "cancelado"',
          'data_inicio',
          maxEventos,
          0,
        )
      } catch (errFiltro) {
        console.log(
          '[Lembrete Evento] Erro no filtro (campo pode não existir ainda):',
          errFiltro && errFiltro.message ? errFiltro.message : errFiltro,
        )
        return 0
      }

      let enviados = 0
      for (const ev of eventos) {
        try {
          const minutos = ev.getInt('lembrete_minutos_antes')
          if (!minutos || minutos <= 0) continue

          const dataInicioMs = parseData(ev.getString('data_inicio'))
          if (!dataInicioMs) continue

          const lembreteMs = dataInicioMs - minutos * 60 * 1000
          // Dispara quando a hora do lembrete chegou e o evento não começou há mais de 30 min
          const dentroDaJanela = agoraMs >= lembreteMs && dataInicioMs - agoraMs > -30 * 60 * 1000
          const eventoTerminouJanela = dataInicioMs - agoraMs <= -30 * 60 * 1000

          if (eventoTerminouJanela && !dentroDaJanela) {
            // Janela passou sem envio: marca como enviado para não acumular
            ev.set('lembrete_enviado', true)
            app.save(ev)
            continue
          }
          if (!dentroDaJanela) continue

          // Chave de idempotência no histórico (defesa extra além do booleano)
          const chave = 'evento_agenda_' + ev.id + '_' + minutos
          let jaDisparado = false
          try {
            app.findFirstRecordByData('historico_lembretes_disparados', 'chave_disparo', chave)
            jaDisparado = true
          } catch (_) {}

          if (jaDisparado) {
            ev.set('lembrete_enviado', true)
            app.save(ev)
            continue
          }

          const userId = ev.getString('criado_por') || ''
          let userRecord = null
          if (userId) {
            try {
              userRecord = app.findRecordById('_pb_users_auth_', userId)
            } catch (_) {}
          }

          let emailDestino = userRecord ? userRecord.getString('email') : ''
          if (!emailDestino) {
            try {
              const admins = app.findRecordsByFilter('users', '', '-created', 1, 0)
              if (admins && admins.length > 0) emailDestino = admins[0].getString('email')
            } catch (_) {}
          }

          const msgs = montarMensagens(ev, dataInicioMs, minutos)

          // (a) E-MAIL — falha em um canal NÃO impede o outro
          let emailOk = false
          const resEmail = enviarEmail(emailDestino, msgs.assunto, msgs.htmlEmail)
          emailOk = resEmail.ok
          if (!emailOk) {
            console.log('[Lembrete Evento] E-mail não enviado (' + ev.id + '):', resEmail.erro)
          }

          // (b) WHATSAPP — pulado silenciosamente se a conta do usuário não estiver conectada
          const resZap = enviarWhatsApp(userRecord, msgs.textoZap)
          if (!resZap.ok) {
            console.log('[Lembrete Evento] WhatsApp pulado (' + ev.id + '):', resZap.erro)
          }

          // (c) Idempotência: marca o evento como já lembrado
          ev.set('lembrete_enviado', true)
          app.save(ev)
          registrarHistorico(ev, minutos, emailOk, resZap.ok)
          enviados++
          console.log(
            '[Lembrete Evento] Lembrete processado p/ evento "' +
              ev.getString('titulo') +
              '" — email:' +
              (emailOk ? 'ok' : 'falhou') +
              ' zap:' +
              (resZap.ok ? 'ok' : 'pulou'),
          )
        } catch (errEv) {
          console.log(
            '[Lembrete Evento] Erro ao processar evento:',
            errEv && errEv.message ? errEv.message : errEv,
          )
        }
      }
      return enviados
    }

    // ---------- fim dos helpers — execução ----------
    const enviados = processar(200)
    if (enviados) {
      console.log('[Lembrete Evento] Cron concluída — lembretes enviados: ' + enviados)
    }
  } catch (err) {
    console.log('[Lembrete Evento] Erro no cron:', err && err.message ? err.message : err)
  }
})

// GET /backend/v1/lembretes/status-canais — status dos canais do usuário logado
// (toda a lógica inline — sem referências a declarações de topo)
routerAdd(
  'GET',
  '/backend/v1/lembretes/status-canais',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) return e.unauthorizedError('Autenticação necessária')
      const app = $app

      // WhatsApp: sonda a conta PRÓPRIA do usuário (leitura, sem envio)
      let zapConectado = false
      let zapNumero = ''
      try {
        const resP = $connectors.execute(authUser, 'WHATSAPP_GET_PHONE_NUMBERS', {})
        if (resP && resP.successful && resP.data) {
          const raw = resP.data
          let lista = []
          if (Array.isArray(raw)) lista = raw
          else if (raw && Array.isArray(raw.data)) lista = raw.data
          else if (raw && Array.isArray(raw.phone_numbers)) lista = raw.phone_numbers
          if (lista.length > 0) {
            zapConectado = true
            zapNumero = String(
              (lista[0] && (lista[0].display_phone_number || lista[0].display_number)) || '',
            )
          }
        }
      } catch (_) {}

      // E-mail: usa a config master (Resend) + mailer como fallback
      let emailRemetente = 'onboarding@resend.dev'
      try {
        const recs = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
        if (recs && recs.length > 0) {
          emailRemetente = recs[0].getString('remetente_email') || emailRemetente
        }
      } catch (_) {}

      return e.json(200, {
        email: { conectado: true, remetente: emailRemetente },
        whatsapp: { conectado: zapConectado, numero: zapNumero },
      })
    } catch (err) {
      return e.json(500, {
        error: err && err.message ? err.message : 'Erro ao consultar canais de lembrete',
      })
    }
  },
  $apis.requireAuth(),
)

// POST /backend/v1/lembretes/teste — envia um lembrete de teste para o usuário logado
// (toda a lógica inline — sem referências a declarações de topo)
routerAdd(
  'POST',
  '/backend/v1/lembretes/teste',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) return e.unauthorizedError('Autenticação necessária')
      const app = $app

      // ---------- helpers inline deste callback ----------
      const formatarMs = (ms) => {
        if (!ms) return ''
        const d = new Date(ms + 3 * 3600 * 1000)
        const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
        const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
        const dia = ('0' + d.getUTCDate()).slice(-2)
        const hh = ('0' + d.getUTCHours()).slice(-2)
        const mm = ('0' + d.getUTCMinutes()).slice(-2)
        return (
          dias[d.getUTCDay()] +
          ', ' +
          dia +
          '/' +
          meses[d.getUTCMonth()] +
          '/' +
          d.getUTCFullYear() +
          ' às ' +
          hh +
          ':' +
          mm
        )
      }

      const rotuloAntecedencia = (minutos) => {
        const m = Number(minutos) || 0
        if (m <= 0) return ''
        if (m < 60) return m + ' minutos'
        if (m === 60) return '1 hora'
        if (m < 1440) return m / 60 + ' horas'
        if (m === 1440) return '1 dia'
        if (m < 10080) return m / 1440 + ' dias'
        if (m === 10080) return '1 semana'
        return Math.round(m / 10080) + ' semanas'
      }

      const remetente = () => {
        let rem = 'Agenda IA Diamond <onboarding@resend.dev>'
        try {
          const recs = app.findRecordsByFilter('config_email', 'ativo = true', '-created', 1)
          if (recs && recs.length > 0) {
            const nome = recs[0].getString('remetente_nome') || 'Agenda IA Diamond'
            const email = recs[0].getString('remetente_email') || 'onboarding@resend.dev'
            rem = nome + ' <' + email + '>'
          }
        } catch (_) {}
        return rem
      }

      const enviarEmail = (destinatarioEmail, assunto, html) => {
        if (!destinatarioEmail) return { ok: false, erro: 'sem e-mail do destinatário' }
        const from = remetente()
        try {
          const res = $connectors.executeAsOwner('RESEND_SEND_EMAIL', {
            from: from,
            to: destinatarioEmail,
            subject: assunto,
            html: html,
          })
          if (res && res.successful) return { ok: true, via: 'resend_owner' }
        } catch (errOwner) {
          console.log(
            '[Lembrete Evento] executeAsOwner Resend falhou:',
            errOwner && errOwner.message ? errOwner.message : errOwner,
          )
        }
        try {
          const senderAddress = app.settings().meta.senderAddress || 'noreply@agendadiamond.com'
          const senderName = app.settings().meta.senderName || 'Agenda IA Diamond'
          const msg = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: destinatarioEmail }],
            subject: assunto,
            html: html,
          })
          app.newMailClient().send(msg)
          return { ok: true, via: 'mailer' }
        } catch (errMailer) {
          return {
            ok: false,
            erro: errMailer && errMailer.message ? errMailer.message : String(errMailer),
          }
        }
      }

      const extrairListaNumeros = (raw) => {
        let lista = []
        if (Array.isArray(raw)) lista = raw
        else if (raw && Array.isArray(raw.data)) lista = raw.data
        else if (raw && Array.isArray(raw.phone_numbers)) lista = raw.phone_numbers
        return lista
      }

      const enviarWhatsApp = (userRecord, texto) => {
        if (!userRecord || !userRecord.id) return { ok: false, erro: 'sem usuário no evento' }
        let phoneNumberId = ''
        try {
          const cfg = app.findFirstRecordByData('configuracoes_whatsapp', 'usuario', userRecord.id)
          if (cfg) phoneNumberId = cfg.getString('phone_number_id') || ''
        } catch (_) {}

        let listaNumeros = []
        try {
          const resPhones = $connectors.execute(userRecord, 'WHATSAPP_GET_PHONE_NUMBERS', {})
          if (resPhones && resPhones.successful && resPhones.data) {
            listaNumeros = extrairListaNumeros(resPhones.data)
            if (listaNumeros.length > 0 && listaNumeros[0] && listaNumeros[0].id) {
              const idPrimeiro = String(listaNumeros[0].id)
              if (!phoneNumberId) phoneNumberId = idPrimeiro
              try {
                const cfg2 = app.findFirstRecordByData(
                  'configuracoes_whatsapp',
                  'usuario',
                  userRecord.id,
                )
                if (cfg2) {
                  cfg2.set('phone_number_id', idPrimeiro)
                  app.save(cfg2)
                }
              } catch (_) {}
            }
          }
        } catch (_) {}

        if (!phoneNumberId) {
          return { ok: false, erro: 'WhatsApp não conectado (sem phone_number_id) — canal pulado' }
        }

        let toNumber = ''
        if (listaNumeros.length > 0) {
          toNumber =
            String(listaNumeros[0].display_phone_number || listaNumeros[0].display_number || '') ||
            (listaNumeros[0].id ? String(listaNumeros[0].id) : '')
        }
        if (!toNumber) {
          try {
            const resP = $connectors.execute(userRecord, 'WHATSAPP_GET_PHONE_NUMBERS', {})
            if (resP && resP.successful && resP.data) {
              const lista = extrairListaNumeros(resP.data)
              if (lista.length > 0) {
                toNumber =
                  String(lista[0].display_phone_number || lista[0].display_number || '') ||
                  (lista[0].id ? String(lista[0].id) : '')
              }
            }
          } catch (_) {}
        }

        if (!toNumber) {
          return {
            ok: false,
            erro: 'Não foi possível identificar o número do próprio usuário — canal pulado',
          }
        }

        try {
          const res = $connectors.execute(userRecord, 'WHATSAPP_SEND_MESSAGE', {
            text: texto,
            to_number: toNumber,
            phone_number_id: phoneNumberId,
          })
          if (res && res.successful) return { ok: true, via: 'whatsapp_user' }
          return {
            ok: false,
            erro: res && res.error ? String(res.error) : 'Falha no conector WhatsApp',
          }
        } catch (errZap) {
          return {
            ok: false,
            erro: errZap && errZap.message ? errZap.message : String(errZap),
          }
        }
      }

      // ---------- fim dos helpers — execução ----------
      const agoraMs = Date.now()
      const quandoDemo = formatarMs(agoraMs + 60 * 60 * 1000)

      const tituloTeste = 'Evento de Teste (Lembretes)'
      const rotulo = rotuloAntecedencia(60)

      const assunto = 'Teste de lembrete: "' + tituloTeste + '" começa em ' + rotulo
      const htmlEmail =
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>' +
        '<body style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;background:#F4F2EE;margin:0;padding:24px;color:#1A1D21;">' +
        '<div style="max-width:560px;margin:0 auto;background:#FFF;border-radius:12px;border:1px solid #E5E1D8;overflow:hidden;">' +
        '<div style="background:#1A1D21;padding:20px 24px;text-align:center;border-bottom:3px solid #0F766E;">' +
        '<h1 style="color:#FFF;margin:0;font-size:18px;font-weight:700;">AGENDA IA DIAMOND</h1>' +
        '<p style="color:#9CA3AF;margin:4px 0 0 0;font-size:11px;">LEMBRETE DE EVENTO — TESTE</p></div>' +
        '<div style="padding:26px 24px;">' +
        '<p style="font-size:15px;color:#374151;margin:0 0 14px 0;">Este é um <strong>lembrete de teste</strong>. Eventos reais do calendário avisam assim:</p>' +
        '<div style="padding:16px 18px;background:#FAFAF9;border:1px solid #E5E1D8;border-radius:8px;font-size:14px;line-height:1.6;color:#374151;">' +
        '<p style="margin:0 0 8px 0;"><strong>📌 Evento:</strong> ' +
        tituloTeste +
        '</p>' +
        '<p style="margin:0 0 8px 0;"><strong>🕒 Quando:</strong> ' +
        quandoDemo +
        ' (exemplo: em 1 hora)</p>' +
        '<p style="margin:0;"><strong>🔗 Link da reunião:</strong> incluído quando o evento tem link</p>' +
        '</div></div>' +
        '<div style="background:#F4F2EE;padding:12px 20px;text-align:center;font-size:11px;color:#6B7280;">Enviado automaticamente pela Agenda IA Diamond &bull; Não responda a este e-mail.</div>' +
        '</div></body></html>'

      const textoZap =
        '🔔 *Lembrete de evento — Agenda IA Diamond* (TESTE)\n\n' +
        'Seu evento *' +
        tituloTeste +
        '* começa em ' +
        rotulo +
        '.\n\n' +
        '📅 ' +
        quandoDemo +
        '\n' +
        '_(Exemplo de como chegarão os lembretes dos seus eventos.)_'

      const resEmail = enviarEmail(authUser.getString('email'), assunto, htmlEmail)
      const resZap = enviarWhatsApp(authUser, textoZap)

      return e.json(200, {
        sucesso: true,
        email: { enviado: resEmail.ok, erro: resEmail.ok ? '' : resEmail.erro },
        whatsapp: { enviado: resZap.ok, erro: resZap.ok ? '' : resZap.erro },
      })
    } catch (err) {
      return e.json(500, {
        error: err && err.message ? err.message : 'Erro ao enviar lembrete de teste',
      })
    }
  },
  $apis.requireAuth(),
)
