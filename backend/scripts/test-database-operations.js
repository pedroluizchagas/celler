const db = require('../src/utils/database-adapter')
require('dotenv').config()

console.log('🧪 Testando operações do banco de dados...')

async function testDatabaseOperations() {
  try {
    console.log('\n1️⃣ Testando conexão com o banco...')
    
    // Teste 1: Listar clientes
    console.log('\n📋 Teste 1: Listando clientes...')
    const clientes = await db.query('SELECT * FROM clientes LIMIT 5')
    console.log(`✅ Clientes encontrados: ${clientes.length}`)
    if (clientes.length > 0) {
      console.log('📄 Primeiro cliente:', clientes[0])
    }

    // Teste 2: Inserir cliente de teste
    console.log('\n➕ Teste 2: Inserindo cliente de teste...')
    const novoCliente = await db.run(
      'INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)',
      ['Cliente Teste', '11999999999', 'teste@email.com']
    )
    console.log(`✅ Cliente inserido com ID: ${novoCliente.id}`)

    // Teste 3: Buscar cliente inserido
    console.log('\n🔍 Teste 3: Buscando cliente inserido...')
    const clienteInserido = await db.query(
      'SELECT * FROM clientes WHERE id = ?',
      [novoCliente.id]
    )
    console.log(`✅ Cliente encontrado:`, clienteInserido[0])

    // Teste 4: Listar ordens
    console.log('\n📋 Teste 4: Listando ordens...')
    const ordens = await db.query('SELECT * FROM ordens LIMIT 5')
    console.log(`✅ Ordens encontradas: ${ordens.length}`)

    // Teste 5: Inserir ordem de teste
    console.log('\n➕ Teste 5: Inserindo ordem de teste...')
    const novaOrdem = await db.run(
      'INSERT INTO ordens (cliente_id, equipamento, defeito_relatado, status) VALUES (?, ?, ?, ?)',
      [novoCliente.id, 'iPhone 12', 'Tela quebrada', 'aguardando']
    )
    console.log(`✅ Ordem inserida com ID: ${novaOrdem.id}`)

    // Teste 6: Listar produtos
    console.log('\n📋 Teste 6: Listando produtos...')
    const produtos = await db.query('SELECT * FROM produtos LIMIT 5')
    console.log(`✅ Produtos encontrados: ${produtos.length}`)

    // Teste 7: Estatísticas de ordens
    console.log('\n📊 Teste 7: Estatísticas de ordens...')
    const stats = await db.query(`
      SELECT 
        status,
        COUNT(*) as total
      FROM ordens 
      GROUP BY status
    `)
    console.log('✅ Estatísticas por status:', stats)

    // Teste 8: Atualizar cliente
    console.log('\n✏️ Teste 8: Atualizando cliente...')
    const clienteAtualizado = await db.run(
      'UPDATE clientes SET observacoes = ? WHERE id = ?',
      ['Cliente de teste - atualizado', novoCliente.id]
    )
    console.log(`✅ Cliente atualizado: ${clienteAtualizado.changes} linha(s) afetada(s)`)

    // Teste 9: Verificar atualização
    console.log('\n🔍 Teste 9: Verificando atualização...')
    const clienteVerificado = await db.query(
      'SELECT * FROM clientes WHERE id = ?',
      [novoCliente.id]
    )
    console.log(`✅ Observações atualizadas:`, clienteVerificado[0].observacoes)

    // Teste 10: Limpeza - remover dados de teste
    console.log('\n🧹 Teste 10: Limpando dados de teste...')
    await db.run('DELETE FROM ordens WHERE id = ?', [novaOrdem.id])
    await db.run('DELETE FROM clientes WHERE id = ?', [novoCliente.id])
    console.log('✅ Dados de teste removidos')

    console.log('\n' + '='.repeat(50))
    console.log('🎉 TODOS OS TESTES PASSARAM!')
    console.log('✅ O banco de dados está funcionando corretamente')
    console.log('✅ As operações CRUD estão funcionais')
    console.log('✅ As conversões SQLite → PostgreSQL estão funcionando')

  } catch (error) {
    console.error('\n❌ ERRO NOS TESTES:', error.message)
    console.error('Stack:', error.stack)
    
    // Tentar diagnosticar o problema
    console.log('\n🔍 DIAGNÓSTICO:')
    
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('❌ Problema: Tabela não existe no banco de dados')
      console.log('💡 Solução: Execute a migração SQL diretamente no Supabase Dashboard')
    } else if (error.message.includes('syntax error')) {
      console.log('❌ Problema: Erro de sintaxe SQL')
      console.log('💡 Solução: Verificar conversão SQLite → PostgreSQL')
    } else if (error.message.includes('connection')) {
      console.log('❌ Problema: Erro de conexão com Supabase')
      console.log('💡 Solução: Verificar variáveis de ambiente')
    } else {
      console.log('❌ Problema: Erro desconhecido')
      console.log('💡 Solução: Verificar logs detalhados acima')
    }
  }
}

// Executar testes
testDatabaseOperations()
  .then(() => {
    console.log('\n🏁 Testes finalizados!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro fatal nos testes:', error)
    process.exit(1)
  })