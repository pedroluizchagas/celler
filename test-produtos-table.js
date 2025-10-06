#!/usr/bin/env node

const db = require('./backend/src/utils/database-adapter')

async function testProdutosTable() {
  console.log('🔍 Testando estrutura da tabela produtos...\n')

  try {
    // 1. Verificar se a tabela existe
    console.log('1️⃣ Verificando se a tabela produtos existe...')
    const tableExists = await db.get(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'produtos'
    `)
    
    if (!tableExists) {
      console.log('❌ Tabela produtos NÃO EXISTE!')
      console.log('🔧 Executando criação da tabela...')
      
      // Criar tabela produtos
      await db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          descricao TEXT,
          codigo_barras VARCHAR(255) UNIQUE,
          codigo_interno VARCHAR(255) UNIQUE,
          categoria_id INTEGER,
          tipo VARCHAR(50) DEFAULT 'peca' CHECK (tipo IN ('peca', 'acessorio', 'servico')),
          preco_custo DECIMAL(10,2) DEFAULT 0,
          preco_venda DECIMAL(10,2) DEFAULT 0,
          margem_lucro DECIMAL(5,2) DEFAULT 0,
          estoque_atual INTEGER DEFAULT 0,
          estoque_minimo INTEGER DEFAULT 0,
          estoque_maximo INTEGER DEFAULT 0,
          localizacao VARCHAR(255),
          ativo BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)
      console.log('✅ Tabela produtos criada!')
    } else {
      console.log('✅ Tabela produtos existe!')
    }

    // 2. Verificar estrutura da tabela
    console.log('\n2️⃣ Verificando estrutura da tabela...')
    const columns = await db.all(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'produtos'
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Colunas encontradas:')
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`)
    })

    // 3. Testar inserção
    console.log('\n3️⃣ Testando inserção de produto...')
    try {
      const resultado = await db.run(`
        INSERT INTO produtos (
          nome, descricao, tipo, preco_custo, preco_venda,
          estoque_atual, estoque_minimo, estoque_maximo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Produto Teste',
        'Descrição do produto teste',
        'peca',
        10.50,
        15.00,
        100,
        5,
        200
      ])
      
      console.log('✅ Inserção bem-sucedida! ID:', resultado.id)
      
      // Limpar o produto teste
      await db.run('DELETE FROM produtos WHERE nome = ?', ['Produto Teste'])
      console.log('🧹 Produto teste removido')
      
    } catch (insertError) {
      console.log('❌ Erro na inserção:', insertError.message)
      console.log('🔍 Stack:', insertError.stack)
    }

    console.log('\n🎉 Teste concluído!')

  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    console.error('🔍 Stack:', error.stack)
  }
}

testProdutosTable()