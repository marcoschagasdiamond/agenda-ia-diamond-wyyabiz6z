/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const adminEmail = 'marcoschagasdiamond@icloud.com'
    const newPassword = 'Mac318180'

    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
      adminUser.setPassword(newPassword)
      adminUser.setVerified(true)
      if (!adminUser.getString('name')) {
        adminUser.set('name', 'Marcos Chagas Diamond')
      }
      app.save(adminUser)
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail(adminEmail)
      adminUser.setPassword(newPassword)
      adminUser.setVerified(true)
      adminUser.set('name', 'Marcos Chagas Diamond')
      app.save(adminUser)
    }

    // Ensure profile exists for the admin user
    const profilesCol = app.findCollectionByNameOrId('profiles')
    try {
      app.findFirstRecordByData('profiles', 'user', adminUser.id)
    } catch (_) {
      const profile = new Record(profilesCol)
      profile.set('user', adminUser.id)
      profile.set(
        'respostas_onboarding',
        JSON.stringify({
          quem_e_voce: 'Marcos Chagas, estrategista de negócios e fundador da Diamond Consultoria.',
          o_que_faz:
            'Desenvolvo estratégias de posicionamento de alto valor, precificação e implementação de projetos digitais/devices para marcas e clientes seletos.',
          quais_projetos:
            'Expansão de franquias digitais, e-commerce Loja Y, consultoria de precificação para agências e mentoria freelance.',
          quais_objetivos:
            'Consolidar o segundo cérebro da empresa, manter histórico impecável de decisões com cada cliente e acelerar execução diária.',
        }),
      )
      profile.set('posicionamento', 'Consultor Premium de Estratégia, Tecnologia e Posicionamento')
      profile.set(
        'precos',
        'Consultoria estratégica R$ 15.000/mês; Projetos pontuais R$ 25k - R$ 60k',
      )
      profile.set(
        'objetivos',
        'Escalar operação para 10 clientes de alta retenção com satisfação máxima.',
      )
      profile.set(
        'preferencias',
        'Decisões orientadas a dados e execução rápida; foco em entregas com prazo rígido.',
      )
      app.save(profile)
    }
  },
  (app) => {
    // Revert logic if needed: restore previous password if possible
    try {
      const adminUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'marcoschagasdiamond@icloud.com',
      )
      adminUser.setPassword('Skip@Pass')
      app.save(adminUser)
    } catch (_) {}
  },
)
