#!/usr/bin/env node

// ===================================
// SCRIPT PARA CRIAR TABELAS NO SUPABASE
// ===================================

const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase
const SUPABASE_URL = 'https://siazsdgodjfmpenmukon.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk4MDU4NywiZXhwIjoyMDc0NTU2NTg3fQ.Y0kQ6t9TU1AmB9Av_rh-U60iN1iBiOP10iAUDWkOMzY';

// Criar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// SQL para criar tabelas básicas
const createTablesSQL = `
-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Serviços
CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id),
  equipamento VARCHAR(255) NOT NULL,
  problema TEXT,
  status VARCHAR(50) DEFAULT 'pendente',
  valor DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Estoque
CREATE TABLE IF NOT EXISTS estoque (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  quantidade INTEGER DEFAULT 0,
  preco_compra DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela Financeiro
CREATE TABLE IF NOT EXISTS financeiro (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  categoria VARCHAR(100),
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido')),
  servico_id INTEGER REFERENCES servicos(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela WhatsApp Messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  message_type VARCHAR(20),
  content TEXT,
  timestamp TIMESTAMP,
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela WhatsApp Contacts
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE,
  name VARCHAR(255),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

async function createTables() {
  console.log('🚀 Criando tabelas no Supabase...\n');

  try {
    // Dividir o SQL em comandos individuais
    const commands = createTablesSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📋 Executando ${commands.length} comandos SQL...\n`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.trim()) {
        try {
          console.log(`${i + 1}/${commands.length} Executando: ${command.substring(0, 50)}...`);
          
          // Usar query direta do Supabase
          const { data, error } = await supabase
            .rpc('exec_sql', { sql: command })
            .single();

          if (error) {
            // Se não tiver a função exec_sql, tentar método alternativo
            console.log(`⚠️ Comando ${i + 1} pode já existir ou precisa ser executado manualmente`);
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
          }
        } catch (err) {
          console.log(`⚠️ Comando ${i + 1} ignorado: ${err.message}`);
        }
      }
    }

    console.log('\n🎉 Processo concluído!');
    console.log('\n📋 Verificando tabelas criadas...');
    
    // Verificar se as tabelas foram criadas
    await verifyTables();

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('\n💡 SOLUÇÃO MANUAL:');
    console.log('1. Acesse: https://siazsdgodjfmpenmukon.supabase.co/project/default/sql');
    console.log('2. Cole e execute o SQL que está no arquivo PROXIMOS-PASSOS.md');
    console.log('3. Reinicie o backend após criar as tabelas');
  }
}

async function verifyTables() {
  const tables = ['clientes', 'servicos', 'estoque', 'financeiro', 'whatsapp_messages', 'whatsapp_contacts'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`);
      } else {
        console.log(`✅ Tabela ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ Tabela ${table}: ${err.message}`);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTables();
}

module.exports = { createTables };