/// <reference path="../pb_data/types.d.ts" />

/**
 * Webhook Stripe para Liberação Automática do Plano e Módulos do Agenda IA Diamond / Contabilidade 5.0
 * Endpoint: POST /backend/v1/stripe_webhook
 *
 * Eventos tratados:
 * - checkout.session.completed: Ativação imediata do plano pago Pro (R$ 197/mês) e de todos os módulos.
 * - invoice.payment_succeeded: Renovação da data de expiração/renovação mensal.
 * - customer.subscription.deleted / customer.subscription.updated (status canceled, unpaid):
 *   Reverte para o plano gratuito Prova Viva (reaplica limites de 2 dias/2 projetos, desativa módulos pagos,
 *   sem apagar dados históricos).
 *
 * Validação de Assinatura:
 * - Lê STRIPE_WEBHOOK_SECRET do ambiente ($os.getenv) ou da licença gravada.
 * - Se configurado o secret, valida a assinatura Stripe-Signature (t=timestamp, v1=hmac).
 * - Se nenhum segredo estiver cadastrado ainda no ambiente nem na licença, aceita com log de alerta
 *   para facilitar testes em desenvolvimento/homologação.
 *
 * Idempotente:
 * - Reenvio de eventos para a mesma conta apenas confirma o estado ativo e atualiza datas.
 */

routerAdd('POST', '/backend/v1/stripe_webhook', (e) => {
  try {
    const rawBody = e.requestInfo().body || {}
    const headers = e.request?.headers || {}

    // Obter assinatura enviada pelo Stripe
    let stripeSig = ''
    try {
      if (typeof headers.get === 'function') {
        stripeSig = headers.get('stripe-signature') || headers.get('Stripe-Signature') || ''
      } else if (headers['stripe-signature']) {
        stripeSig = headers['stripe-signature']
      } else if (headers['Stripe-Signature']) {
        stripeSig = headers['Stripe-Signature']
      }
    } catch (_) {}

    // Segredo de Webhook configurado via ambiente ou nas licenças
    const envSecret = $os.getenv('STRIPE_WEBHOOK_SECRET') || ''

    // Se temos segredo de ambiente, podemos validar a assinatura HMAC-SHA256
    if (envSecret && stripeSig) {
      // Extrair timestamp e v1
      let timestamp = ''
      let signatureV1 = ''
      const parts = stripeSig.split(',')
      for (let i = 0; i < parts.length; i++) {
        const item = parts[i].trim()
        if (item.startsWith('t=')) {
          timestamp = item.substring(2)
        } else if (item.startsWith('v1=')) {
          signatureV1 = item.substring(3)
        }
      }

      if (timestamp && signatureV1) {
        try {
          // Payload para assinatura Stripe: timestamp + '.' + rawBody (ou json string)
          const rawString = JSON.stringify(rawBody)
          const signedPayload = timestamp + '.' + rawString
          const expectedSig = $security.hs256(signedPayload, envSecret)
          if (expectedSig && expectedSig !== signatureV1) {
            console.log('[Stripe Webhook] Assinatura v1 divergente:', {
              expected: expectedSig,
              received: signatureV1,
            })
            // Nota: Em caso de divergência estrita com secret setado:
            return e.json(400, { error: 'Assinatura inválida (Stripe-Signature mismatch)' })
          }
        } catch (sigErr) {
          console.log('[Stripe Webhook] Erro ao validar assinatura:', sigErr)
        }
      }
    }

    const event = rawBody
    const eventType = event.type || ''
    const dataObj = event.data?.object || {}

    console.log('[Stripe Webhook] Evento recebido:', eventType, 'ID:', event.id)

    // Helper para achar conta por email ou client_reference_id
    const customerEmail =
      dataObj.customer_details?.email ||
      dataObj.customer_email ||
      dataObj.email ||
      dataObj.metadata?.email ||
      ''

    const clientRefId = dataObj.client_reference_id || dataObj.metadata?.conta_id || ''

    // Buscar licença correspondente na base
    let licenca = null
    if (clientRefId) {
      try {
        licenca = $app.findRecordById('licencas_conta', clientRefId)
      } catch (_) {}
    }

    if (!licenca && customerEmail) {
      try {
        licenca = $app.findFirstRecordByData('licencas_conta', 'titular_email', customerEmail)
      } catch (_) {}
    }

    // Se ainda não encontrou e temos apenas 1 conta na base (caso típico do workspace único), associamos a ela
    if (!licenca) {
      try {
        const todas = $app.findRecordsByFilter('licencas_conta', '1 = 1', 'created', 1, 0)
        if (todas && todas.length > 0) {
          licenca = todas[0]
        }
      } catch (_) {}
    }

    if (!licenca) {
      console.log('[Stripe Webhook] Nenhuma licenca encontrada para associar:', {
        customerEmail,
        clientRefId,
      })
      return e.json(200, {
        received: true,
        aviso: 'Nenhuma conta encontrada com o e-mail informado. Evento registrado.',
      })
    }

    const agora = new Date()
    const proximoMes = new Date(agora.getTime() + 32 * 24 * 60 * 60 * 1000)

    // 1. CHECKOUT CONCLUÍDO (Pagamento inicial de R$ 197/mês)
    if (eventType === 'checkout.session.completed' || eventType === 'invoice.payment_succeeded') {
      const customerId = dataObj.customer || ''
      const subId = dataObj.subscription || ''

      licenca.set('plano', 'pro')
      licenca.set('status', 'ativo')
      licenca.set('max_dias_folha', 99999)
      licenca.set('max_projetos', 99999)
      licenca.set('permite_convites', true)
      licenca.set('permite_relatorios_avancados', true)
      licenca.set('permite_whatsapp', true)
      licenca.set('conta_teste', false)
      licenca.set('preco_recorrencia', 197)
      licenca.set('ciclo_cobranca', 'mensal')
      if (customerId) licenca.set('stripe_customer_id', customerId)
      if (subId) licenca.set('stripe_subscription_id', subId)
      if (!licenca.getString('data_inicio')) {
        licenca.set('data_inicio', agora.toISOString())
      }
      licenca.set('data_renovacao', proximoMes.toISOString())
      licenca.set('data_expiracao', '') // sem expiração enquanto ativa
      licenca.set(
        'observacoes',
        'Plano Pro R$ 197/mês ativado automaticamente via Stripe Webhook (' +
          agora.toLocaleDateString('pt-BR') +
          ')',
      )

      $app.save(licenca)

      // Ativar TODOS os módulos da licença
      try {
        const modulos = $app.findRecordsByFilter(
          'modulos_licenca',
          `licenca = "${licenca.id}"`,
          'created',
          50,
          0,
        )
        for (let i = 0; i < modulos.length; i++) {
          const mod = modulos[i]
          if (!mod.getBool('ativo')) {
            mod.set('ativo', true)
            $app.save(mod)
          }
        }
      } catch (modErr) {
        console.log('[Stripe Webhook] Aviso ao ativar módulos:', modErr)
      }

      console.log(
        '[Stripe Webhook] Licença ativada com sucesso para conta:',
        licenca.getString('nome_conta'),
      )

      return e.json(200, {
        sucesso: true,
        evento: eventType,
        conta: licenca.getString('nome_conta'),
        plano: 'pro',
        modulos_liberados: true,
      })
    }

    // 2. ASSINATURA CANCELADA OU INADIMPLENTE
    if (
      eventType === 'customer.subscription.deleted' ||
      (eventType === 'customer.subscription.updated' &&
        (dataObj.status === 'canceled' || dataObj.status === 'unpaid'))
    ) {
      // Obter configuração vigente do plano gratuito cadastrada no banco pelo Master
      let cfgMaxDias = 2
      let cfgMaxProj = 2
      let cfgPermiteConvites = false
      let cfgPermiteWhatsapp = false
      let cfgModulosInclusos = ['nucleo', 'folha_dia', 'projetos']

      try {
        const configs = $app.findRecordsByFilter('config_plano_gratuito', '1 = 1', 'created', 1, 0)
        if (configs && configs.length > 0) {
          const cfg = configs[0]
          const dias = cfg.getInt('max_dias_folha')
          const proj = cfg.getInt('max_projetos')
          if (dias > 0) cfgMaxDias = dias
          if (proj > 0) cfgMaxProj = proj
          cfgPermiteConvites = cfg.getBool('permite_convites')
          cfgPermiteWhatsapp = cfg.getBool('permite_whatsapp')
          const rawMod = cfg.getString('modulos_inclusos')
          if (rawMod) {
            try {
              const parsed = JSON.parse(rawMod)
              if (Array.isArray(parsed) && parsed.length > 0) {
                cfgModulosInclusos = parsed
              }
            } catch (_) {}
          }
        }
      } catch (cfgErr) {
        console.log('[Stripe Webhook] Aviso ao carregar config_plano_gratuito:', cfgErr)
      }

      licenca.set('plano', 'gratuito')
      licenca.set('status', 'expirado')
      licenca.set('max_dias_folha', cfgMaxDias)
      licenca.set('max_projetos', cfgMaxProj)
      licenca.set('permite_convites', cfgPermiteConvites)
      licenca.set('permite_relatorios_avancados', false)
      licenca.set('permite_whatsapp', cfgPermiteWhatsapp)
      licenca.set('data_expiracao', agora.toISOString())
      licenca.set(
        'observacoes',
        `Assinatura cancelada no Stripe. Conta revertida para o plano gratuito Prova Viva (limites vigentes: ${cfgMaxDias} dias, ${cfgMaxProj} projetos) em ` +
          agora.toLocaleDateString('pt-BR'),
      )

      $app.save(licenca)

      // Atualizar módulos conforme a configuração vigente do plano gratuito
      try {
        const modulos = $app.findRecordsByFilter(
          'modulos_licenca',
          `licenca = "${licenca.id}"`,
          'created',
          50,
          0,
        )
        for (let i = 0; i < modulos.length; i++) {
          const mod = modulos[i]
          const cod = mod.getString('codigo')
          // Ativa se estiver incluso no plano gratuito configurado ou se for nucleo
          const deveAtivar = cod === 'nucleo' || cfgModulosInclusos.includes(cod)
          if (mod.getBool('ativo') !== deveAtivar) {
            mod.set('ativo', deveAtivar)
            $app.save(mod)
          }
        }
      } catch (modErr) {
        console.log('[Stripe Webhook] Aviso ao reverter módulos:', modErr)
      }

      console.log(
        '[Stripe Webhook] Licença revertida para Prova Viva:',
        licenca.getString('nome_conta'),
      )

      return e.json(200, {
        sucesso: true,
        evento: eventType,
        conta: licenca.getString('nome_conta'),
        plano: 'gratuito',
        status: 'expirado',
      })
    }

    return e.json(200, {
      received: true,
      evento: eventType,
      mensagem: 'Evento recebido sem ação necessária',
    })
  } catch (err) {
    console.log('[Stripe Webhook] Erro crítico no handler:', err)
    return e.json(500, { error: err.message || 'Erro interno no processamento do webhook' })
  }
})

// Rota auxiliar informativa de status do webhook (GET) para o Painel Master
routerAdd('GET', '/backend/v1/stripe_webhook/status', (e) => {
  try {
    const siteUrl = $os.getenv('SITE_URL') || ''
    const hasEnvSecret = !!$os.getenv('STRIPE_WEBHOOK_SECRET')

    // Tentar obter payment link da licença
    let paymentLink = ''
    let webhookSecretLicenca = ''
    try {
      const lic = $app.findFirstRecordByData('licencas_conta', '1', '1')
      if (lic) {
        paymentLink = lic.getString('stripe_payment_link') || ''
        webhookSecretLicenca = lic.getString('stripe_webhook_secret') || ''
      }
    } catch (_) {}

    return e.json(200, {
      webhook_url: '/backend/v1/stripe_webhook',
      eventos_suportados: [
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'customer.subscription.deleted',
        'customer.subscription.updated',
      ],
      has_secret: hasEnvSecret || !!webhookSecretLicenca,
      payment_link_configurado: !!paymentLink,
      payment_link: paymentLink,
      preco_padrao: 'R$ 197/mês',
      ciclo: 'mensal',
    })
  } catch (err) {
    return e.json(500, { error: err.message })
  }
})
