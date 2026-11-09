/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração 0031: Licenciamento Modular, Configuração Stripe e Checkout R$ 197/mês
 * - Adiciona campos de pagamento e checkout em 'licencas_conta':
 *   - stripe_payment_link: URL do Stripe Payment Link configurado pelo Master
 *   - preco_recorrencia: valor mensal padrão ('R$ 197/mês' / número 197)
 *   - ciclo_cobranca: select ('mensal' | 'anual')
 *   - stripe_customer_id: id do cliente no Stripe
 *   - stripe_subscription_id: id da assinatura no Stripe
 *   - data_renovacao: data da próxima renovação mensal
 *   - webhook_secret_configured: indicador de segredo de webhook ativo
 * - Padroniza e garante os módulos modulares nucleares e ativáveis em 'modulos_licenca':
 *   - 'nucleo': Núcleo Básico (sempre ativo)
 *   - 'whatsapp': Módulo Radar WhatsApp & Sementes
 *   - 'ia': Módulo Agente IA & Segundo Cérebro
 *   - 'financas': Módulo Finanças & Gestão Orçamentária
 * - Idempotente: atualiza licenças existentes e sincroniza módulos.
 */
migrate(
  (app) => {
    // 1. Atualizar coleção licencas_conta
    try {
      const col = app.findCollectionByNameOrId('licencas_conta')

      if (!col.fields.getByName('stripe_payment_link')) {
        col.fields.add(new URLField({ name: 'stripe_payment_link' }))
      }
      if (!col.fields.getByName('preco_recorrencia')) {
        col.fields.add(new NumberField({ name: 'preco_recorrencia' }))
      }
      if (!col.fields.getByName('ciclo_cobranca')) {
        col.fields.add(
          new SelectField({
            name: 'ciclo_cobranca',
            values: ['mensal', 'anual', 'vitalicio'],
            maxSelect: 1,
          }),
        )
      }
      if (!col.fields.getByName('stripe_customer_id')) {
        col.fields.add(new TextField({ name: 'stripe_customer_id' }))
      }
      if (!col.fields.getByName('stripe_subscription_id')) {
        col.fields.add(new TextField({ name: 'stripe_subscription_id' }))
      }
      if (!col.fields.getByName('data_renovacao')) {
        col.fields.add(new DateField({ name: 'data_renovacao' }))
      }
      if (!col.fields.getByName('stripe_webhook_secret')) {
        col.fields.add(new TextField({ name: 'stripe_webhook_secret' }))
      }

      app.save(col)
    } catch (err) {
      console.log('Aviso ao atualizar schema licencas_conta:', err)
    }

    // 2. Atualizar ou semear módulos padronizados em cada licença
    try {
      const modulosCol = app.findCollectionByNameOrId('modulos_licenca')
      const licencas = app.findRecordsByFilter('licencas_conta', '1 = 1', 'created', 100, 0)

      // Módulos padrões replicáveis (Agenda IA Diamond & Contabilidade 5.0)
      const modulosPadrao = [
        {
          codigo: 'nucleo',
          nome: 'Núcleo do Sistema',
          descricao: 'Navegação, dashboard, contatos e folha básica',
          sempreAtivo: true,
        },
        {
          codigo: 'whatsapp',
          nome: 'Módulo WhatsApp',
          descricao: 'Sincronização e radar comercial via WhatsApp',
          sempreAtivo: false,
        },
        {
          codigo: 'ia',
          nome: 'Módulo Agente IA',
          descricao: 'Segundo cérebro executivo, organização e chat com agente',
          sempreAtivo: false,
        },
        {
          codigo: 'financas',
          nome: 'Módulo Finanças',
          descricao: 'Gestão financeira, orçamentos, entradas e desembolsos',
          sempreAtivo: false,
        },
      ]

      for (const lic of licencas) {
        // Garantir dados de preço e ciclo
        let licMudou = false
        if (!lic.getInt('preco_recorrencia')) {
          lic.set('preco_recorrencia', 197)
          licMudou = true
        }
        if (!lic.getString('ciclo_cobranca')) {
          lic.set('ciclo_cobranca', 'mensal')
          licMudou = true
        }
        if (licMudou) {
          app.save(lic)
        }

        const isPago =
          lic.getString('plano') === 'pro' || lic.getString('plano') === 'diamond_executive'
        const licId = lic.id

        for (const mp of modulosPadrao) {
          let modRec = null
          try {
            const existentes = app.findRecordsByFilter(
              'modulos_licenca',
              `licenca = "${licId}" && codigo = "${mp.codigo}"`,
              'created',
              1,
              0,
            )
            if (existentes && existentes.length > 0) {
              modRec = existentes[0]
            }
          } catch (_) {}

          if (!modRec) {
            modRec = new Record(modulosCol)
            modRec.set('licenca', licId)
            modRec.set('codigo', mp.codigo)
            modRec.set('nome', mp.nome)
            modRec.set('descricao', mp.descricao)
            modRec.set('ativo', mp.sempreAtivo || isPago)
            app.save(modRec)
          } else {
            // Se plano for pago, ativa todos
            if (isPago && !modRec.getBool('ativo')) {
              modRec.set('ativo', true)
              app.save(modRec)
            }
          }
        }
      }
    } catch (err) {
      console.log('Aviso ao semear módulos da licença:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('licencas_conta')
      const campos = [
        'stripe_payment_link',
        'preco_recorrencia',
        'ciclo_cobranca',
        'stripe_customer_id',
        'stripe_subscription_id',
        'data_renovacao',
        'stripe_webhook_secret',
      ]
      for (const campo of campos) {
        if (col.fields.getByName(campo)) {
          col.fields.removeByName(campo)
        }
      }
      app.save(col)
    } catch (_) {}
  },
)
