/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de Inicialização de Licença para Novas Contas / Usuários
 *
 * Garante que qualquer conta ou usuário recém-criado que ainda não possua registro em 'licencas_conta'
 * receba automaticamente a configuração vigente de plano gratuito ('config_plano_gratuito')
 * definida pelo Administrador Master.
 */

onRecordCreate((e) => {
  try {
    const user = e.record
    if (!user) return

    const email = user.email() || user.getString('email')
    const nome = user.getString('name') || 'Nova Conta'

    // Checar se já existe licença para esse titular
    let licencaExistente = null
    try {
      licencaExistente = $app.findFirstRecordByData('licencas_conta', 'titular_email', email)
    } catch (_) {}

    if (licencaExistente) return

    // Buscar configuração vigente do plano gratuito
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
      console.log('[Nova Licença] Aviso ao ler config_plano_gratuito:', cfgErr)
    }

    const licencasCol = $app.findCollectionByNameOrId('licencas_conta')
    const modulosCol = $app.findCollectionByNameOrId('modulos_licenca')

    const novaLic = new Record(licencasCol)
    novaLic.set('nome_conta', `Conta ${nome}`)
    novaLic.set('plano', 'gratuito')
    novaLic.set('status', 'ativo')
    novaLic.set('max_dias_folha', cfgMaxDias)
    novaLic.set('max_projetos', cfgMaxProj)
    novaLic.set('permite_convites', cfgPermiteConvites)
    novaLic.set('permite_whatsapp', cfgPermiteWhatsapp)
    novaLic.set('permite_relatorios_avancados', false)
    novaLic.set('titular_email', email)
    novaLic.set('titular_nome', nome)
    novaLic.set(
      'observacoes',
      `Plano gratuito Prova Viva inicial configurado pelo Master (${cfgMaxDias} dias folha, ${cfgMaxProj} projetos)`,
    )

    $app.save(novaLic)

    // Criar módulos da licença alinhados com a configuração vigente
    const listaModulos = [
      {
        codigo: 'nucleo',
        nome: 'Núcleo do Sistema',
        descricao: 'Navegação, dashboard, contatos e folha básica',
        ativo: true,
      },
      {
        codigo: 'folha_dia',
        nome: 'Folha do Dia',
        descricao: 'Registro e rascunho de demandas diárias',
        ativo: cfgModulosInclusos.includes('folha_dia'),
      },
      {
        codigo: 'projetos',
        nome: 'Gestão de Projetos',
        descricao: 'Controle de projetos, marcos e equipe',
        ativo: cfgModulosInclusos.includes('projetos'),
      },
      {
        codigo: 'equipe_convites',
        nome: 'Convites de Equipe',
        descricao: 'Envio de convites com escopo granular',
        ativo: cfgPermiteConvites || cfgModulosInclusos.includes('equipe_convites'),
      },
      {
        codigo: 'whatsapp',
        nome: 'Módulo WhatsApp',
        descricao: 'Sincronização e radar comercial via WhatsApp',
        ativo: cfgPermiteWhatsapp || cfgModulosInclusos.includes('whatsapp'),
      },
      {
        codigo: 'whatsapp_radar',
        nome: 'Radar WhatsApp & Sementes',
        descricao: 'Reativação automática de negócios via WhatsApp',
        ativo: cfgPermiteWhatsapp || cfgModulosInclusos.includes('whatsapp_radar'),
      },
      {
        codigo: 'ia',
        nome: 'Módulo Agente IA',
        descricao: 'Segundo cérebro executivo, organização e chat com agente',
        ativo: cfgModulosInclusos.includes('ia'),
      },
      {
        codigo: 'financas',
        nome: 'Módulo Finanças',
        descricao: 'Gestão financeira, orçamentos, entradas e desembolsos',
        ativo: cfgModulosInclusos.includes('financas'),
      },
      {
        codigo: 'contabilidade_5_0',
        nome: 'Módulo Contabilidade 5.0',
        descricao: 'Integração com portfólio contábil e financeiro',
        ativo: cfgModulosInclusos.includes('contabilidade_5_0'),
      },
    ]

    for (let i = 0; i < listaModulos.length; i++) {
      const m = listaModulos[i]
      try {
        const modRec = new Record(modulosCol)
        modRec.set('licenca', novaLic.id)
        modRec.set('codigo', m.codigo)
        modRec.set('nome', m.nome)
        modRec.set('descricao', m.descricao)
        modRec.set('ativo', m.ativo)
        $app.save(modRec)
      } catch (_) {}
    }

    console.log('[Nova Licença] Licença gratuita inicial criada para:', email)
  } catch (err) {
    console.log('[Nova Licença] Erro ao inicializar licença gratuita:', err)
  }
}, 'users')
