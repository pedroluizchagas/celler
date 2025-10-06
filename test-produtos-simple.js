#!/usr/bin/env node

const db = require('./backend/src/utils/database-adapter')

async function testProdutoSimple() {
  console.log('🔍 Teste simples de inserção de produto...\n')

  try {
    // Testar inserção exatamente como o controller faz
    console.log('1️⃣ Testando inserção como no controller...')
    
    const resultado = await db.run(`
      INSERT INTO produtos (
        nome, descricao, codigo_barras, codigo_interno,
        categoria_id, tipo, preco_custo, preco_venda,
        margem_lucro, estoque_atual, estoque_minimo, estoque_maximo,
        localizacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Produto Teste Controller',
      'Descrição teste',
      null,
      null,
      null,
      'peca',
      10.50,
      15.00,
      30.0,
      100,
      5,
      200,
      null
    ])
    
    console.log('✅ Inserção bem-sucedida! ID:', resultado.id)
    
    // Testar busca
    console.log('\n2️⃣ Testando busca do produto...')
    const produto = await db.get('produtos', resultado.id)
    console.log('✅ Produto encontrado:', produto.nome)
    
    // Testar listagem
    console.log('\n3️⃣ Testando listagem de produtos...')
    const produtos = await db.find('produtos', {})
    console.log('✅ Total de produtos:', produtos.length)
    
    // Limpar (usando ID)
    console.log('\n4️⃣ Limpando produto teste...')
    await db.run('DELETE FROM produtos WHERE id = ?', [resultado.id])
    console.log('✅ Produto removido')
    
    console.log('\n🎉 Teste concluído com sucesso!')
    console.log('✅ A inserção de produtos está funcionando corretamente!')

  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    console.error('🔍 Stack:', error.stack)
  }
}

testProdutoSimple()