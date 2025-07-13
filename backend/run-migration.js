const { migratePhoneNumbers } = require('./src/utils/migratePhoneNumbers')

async function runMigration() {
  try {
    console.log('Iniciando migração de números de telefone...')
    const result = await migratePhoneNumbers()
    console.log('Migração concluída:', result)
  } catch (error) {
    console.error('Erro na migração:', error)
  }
}

runMigration()
