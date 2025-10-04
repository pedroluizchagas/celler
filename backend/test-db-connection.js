const db = require('./src/utils/database-adapter')

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com o banco de dados...\n')

    // 1. Testar conexão básica
    console.log('1. Testando query simples...')
    const result = await db.query('SELECT 1 as test')
    console.log('✅ Conexão OK:', result)

    // 2. Verificar se a tabela clientes existe
    console.log('\n2. Verificando se a tabela clientes existe...')
    try {
      const clientesCount = await db.query('SELECT COUNT(*) as total FROM clientes')
      console.log('✅ Tabela clientes existe! Total de registros:', clientesCount[0].total)
    } catch (error) {
      console.log('❌ Tabela clientes não existe ou erro:', error.message)
    }

    // 3. Testar método all
    console.log('\n3. Testando método all...')
    try {
      const clientes = await db.all('clientes')
      console.log('✅ Método all funcionando! Registros encontrados:', clientes.length)
      if (clientes.length > 0) {
        console.log('Primeiro cliente:', clientes[0])
      }
    } catch (error) {
      console.log('❌ Erro no método all:', error.message)
    }

    // 4. Listar todas as tabelas
    console.log('\n4. Listando todas as tabelas...')
    try {
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)
      console.log('✅ Tabelas encontradas:')
      tables.forEach(table => console.log('  -', table.table_name))
    } catch (error) {
      console.log('❌ Erro ao listar tabelas:', error.message)
    }

  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    console.log('\n🏁 Teste finalizado.')
    process.exit(0)
  }
}

testConnection()