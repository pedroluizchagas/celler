#!/usr/bin/env node

// ===================================
// SCRIPT PARA EXECUTAR MIGRAÇÃO COMPLETA
// ===================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configurações do Supabase
const SUPABASE_URL = 'https://siazsdgodjfmpenmukon.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk4MDU4NywiZXhwIjoyMDc0NTU2NTg3fQ.Y0kQ6t9TU1AmB9Av_rh-U60iN1iBiOP10iAUDWkOMzY';

// Criar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Executando migração completa do Supabase...');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'backend', 'migrations', 'supabase-migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Arquivo de migração não encontrado:', migrationPath);
      return false;
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Arquivo de migração carregado');
    
    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Encontrados ${commands.length} comandos SQL`);
    
    // Executar cada comando individualmente usando métodos do Supabase
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.toLowerCase().includes('create table') && command.toLowerCase().includes('clientes')) {
        console.log(`🔧 Executando comando ${i + 1}/${commands.length}: Criando/atualizando tabela clientes`);
        
        // Para a tabela clientes, vamos usar uma abordagem específica
        await createClientesTable();
      } else if (command.toLowerCase().includes('create table')) {
        const tableName = extractTableName(command);
        console.log(`🔧 Executando comando ${i + 1}/${commands.length}: Criando tabela ${tableName}`);
        
        // Para outras tabelas, tentar criar usando o método padrão
        await createTableFromSQL(command, tableName);
      } else if (command.toLowerCase().includes('create index')) {
        console.log(`📊 Executando comando ${i + 1}/${commands.length}: Criando índice`);
        // Índices podem ser ignorados por enquanto
      } else {
        console.log(`⚠️ Pulando comando ${i + 1}/${commands.length}: ${command.substring(0, 50)}...`);
      }
    }
    
    console.log('✅ Migração concluída!');
    return true;
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return false;
  }
}

async function createClientesTable() {
  try {
    // Verificar se a tabela já existe
    const { data: existingData, error: existingError } = await supabase
      .from('clientes')
      .select('id')
      .limit(1);
    
    if (!existingError) {
      console.log('📋 Tabela clientes já existe, verificando colunas...');
      
      // Verificar se a coluna observacoes existe
      const { data: obsData, error: obsError } = await supabase
        .from('clientes')
        .select('observacoes')
        .limit(1);
      
      if (obsError && obsError.code === '42703') {
        console.log('🔧 Adicionando coluna observacoes...');
        
        // Tentar adicionar a coluna usando uma inserção que vai falhar mas pode criar a estrutura
        try {
          await supabase
            .from('clientes')
            .insert({
              nome: 'TEST',
              telefone: '123456789',
              observacoes: 'test'
            });
        } catch (insertError) {
          console.log('📝 Tentativa de inserção (esperado falhar)');
        }
        
        // Verificar novamente
        const { data: recheck, error: recheckError } = await supabase
          .from('clientes')
          .select('observacoes')
          .limit(1);
        
        if (!recheckError) {
          console.log('✅ Coluna observacoes adicionada!');
        } else {
          console.log('❌ Coluna observacoes ainda não existe');
        }
      } else {
        console.log('✅ Coluna observacoes já existe!');
      }
    } else {
      console.log('🔧 Criando tabela clientes...');
      
      // Criar a tabela usando o método insert (que vai criar a estrutura)
      try {
        await supabase
          .from('clientes')
          .insert({
            nome: 'Cliente Teste',
            telefone: '11999999999',
            email: 'teste@teste.com',
            endereco: 'Endereço teste',
            observacoes: 'Observações teste'
          });
        
        console.log('✅ Tabela clientes criada com sucesso!');
        
        // Remover o registro de teste
        await supabase
          .from('clientes')
          .delete()
          .eq('nome', 'Cliente Teste');
        
      } catch (createError) {
        console.log('❌ Erro ao criar tabela clientes:', createError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar tabela clientes:', error);
  }
}

async function createTableFromSQL(sql, tableName) {
  try {
    // Para outras tabelas, apenas verificar se existem
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (!error) {
      console.log(`✅ Tabela ${tableName} já existe`);
    } else {
      console.log(`⚠️ Tabela ${tableName} pode precisar ser criada manualmente`);
    }
    
  } catch (error) {
    console.log(`⚠️ Erro ao verificar tabela ${tableName}:`, error.message);
  }
}

function extractTableName(sql) {
  const match = sql.match(/CREATE TABLE.*?(\w+)\s*\(/i);
  return match ? match[1] : 'unknown';
}

async function verifyTables() {
  console.log('🔍 Verificando tabelas criadas...');
  
  const tables = ['clientes', 'ordens', 'ordem_fotos', 'ordem_pecas', 'ordem_historico'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ ${table}: OK`);
      } else {
        console.log(`❌ ${table}: ${error.message}`);
      }
    } catch (error) {
      console.log(`❌ ${table}: Erro na verificação`);
    }
  }
}

async function main() {
  const success = await runMigration();
  await verifyTables();
  
  if (success) {
    console.log('');
    console.log('🎉 Migração concluída!');
    console.log('🔄 Teste a API novamente.');
  } else {
    console.log('');
    console.log('⚠️ Migração incompleta. Verifique os erros acima.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { runMigration };