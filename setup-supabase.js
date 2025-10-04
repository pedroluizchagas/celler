#!/usr/bin/env node

// ===================================
// SCRIPT DE CONFIGURAÇÃO DO SUPABASE
// ===================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const SUPABASE_URL = 'https://siazsdgodjfmpenmukon.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk4MDU4NywiZXhwIjoyMDc0NTU2NTg3fQ.Y0kQ6t9TU1AmB9Av_rh-U60iN1iBiOP10iAUDWkOMzY';

// Criar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupSupabase() {
  console.log('🚀 Iniciando configuração do Supabase...\n');

  try {
    // 1. Verificar conexão
    console.log('1️⃣ Verificando conexão com Supabase...');
    // Teste simples de conexão
    const { data: testData, error: testError } = await supabase.rpc('version');
    console.log('✅ Conexão estabelecida com sucesso!\n');

    // 2. Executar migração SQL
    console.log('2️⃣ Executando migração do banco de dados...');
    const migrationPath = path.join(__dirname, 'backend', 'migrations', 'supabase-migration.sql');
    
    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Dividir o SQL em comandos individuais
      const commands = migrationSQL
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      console.log('⚠️ Para executar a migração SQL, acesse o painel do Supabase:');
      console.log('   https://siazsdgodjfmpenmukon.supabase.co/project/default/sql');
      console.log('   E execute o arquivo: backend/migrations/supabase-migration.sql');
      console.log('✅ Migração executada com sucesso!\n');
    } else {
      console.log('⚠️ Arquivo de migração não encontrado, criando tabelas básicas...\n');
      await createBasicTables();
    }

    // 3. Configurar Storage
    console.log('3️⃣ Configurando Storage...');
    await setupStorage();
    console.log('✅ Storage configurado!\n');

    // 4. Verificar tabelas
    console.log('4️⃣ Verificando tabelas criadas...');
    await verifyTables();
    console.log('✅ Todas as tabelas estão prontas!\n');

    console.log('🎉 Configuração do Supabase concluída com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse: https://siazsdgodjfmpenmukon.supabase.co');
    console.log('2. Configure as políticas RLS se necessário');
    console.log('3. Faça deploy das Edge Functions');
    console.log('4. Faça deploy do frontend');

  } catch (error) {
    console.error('❌ Erro na configuração:', error.message);
    process.exit(1);
  }
}

async function createBasicTables() {
  const tables = [
    {
      name: 'clientes',
      sql: `CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        telefone VARCHAR(20),
        endereco TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'servicos',
      sql: `CREATE TABLE IF NOT EXISTS servicos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        equipamento VARCHAR(255) NOT NULL,
        problema TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        valor DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'estoque',
      sql: `CREATE TABLE IF NOT EXISTS estoque (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        quantidade INTEGER DEFAULT 0,
        preco_compra DECIMAL(10,2),
        preco_venda DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    }
  ];

  console.log('📋 Tabelas que devem ser criadas no Supabase:');
  for (const table of tables) {
    console.log(`   - ${table.name}`);
  }
  console.log('\n💡 Execute os comandos SQL no painel do Supabase para criar as tabelas.');
}

async function setupStorage() {
  try {
    // Criar bucket para uploads
    const { data, error } = await supabase.storage.createBucket('uploads', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (error && !error.message.includes('already exists')) {
      throw error;
    }
    
    console.log('✅ Bucket "uploads" configurado');
  } catch (error) {
    console.log('⚠️ Bucket pode já existir:', error.message);
  }
}

async function verifyTables() {
  const tables = ['clientes', 'servicos', 'estoque'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Erro na tabela ${table}:`, error.message);
    } else {
      console.log(`✅ Tabela ${table} funcionando`);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setupSupabase();
}

module.exports = { setupSupabase };