/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const adminEmail = 'marcoschagasdiamond@icloud.com'
    const adminPassword = 'Mac318180'

    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
      adminUser.setPassword(adminPassword)
      adminUser.setVerified(true)
      app.save(adminUser)
    } catch (err) {
      // Se não encontrar por email, tenta buscar por id direto
      try {
        const adminUserById = app.findFirstRecordByData('users', 'id', 'nfpp2apyp5g9af3')
        adminUserById.setPassword(adminPassword)
        adminUserById.setVerified(true)
        app.save(adminUserById)
      } catch (innerErr) {
        throw new Error('Não foi possível localizar o usuário administrador: ' + err)
      }
    }
  },
  (app) => {
    // Reversão defensiva (no-op ou manter registro intacto)
  },
)
