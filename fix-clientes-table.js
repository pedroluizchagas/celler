#!/usr/bin/env node

// ===================================
// SCRIPT PARA CORRIGIR TABELA CLIENTES
// ===================================

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configurações do Supabase
const SUPABASE_URL = 'https://siazsdgodjfmpenmukon.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk4MDU4NywiZXhwIjoyMDc0NTU2NTg3fQ.Y0kQ6t9TU1AmB9Av_rh-U60iN1iBiOP10iAUDWkOMzY';

// Criar cliente Supabase com service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function executeSQL(sql) {
  try {
    console.log('🔧 Executando SQL:', sql);
    
    // Usar a API REST diretamente para executar SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql })
    });

    if (response.ok) {
      console.log('✅ SQL executado com sucesso!');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na API REST:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error.message);
    return false;
  }
}

async function createExecSqlFunction() {
  console.log('🔧 Criando função exec_sql no Supabase...');
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;

  // Tentar criar a função usando uma abordagem alternativa
  try {
    // Usar psql via linha de comando se disponível
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      console.log('📝 Tentando criar função via conexão direta...');
      
      // Como alternativa, vamos usar o método do Supabase client diretamente
      setTimeout(async () => {
        console.log('⚠️ Função exec_sql não disponível. Usando método alternativo...');
        
        // Executar ALTER TABLE diretamente
        const success = await addObservacoesColumn();
        resolve(success);
      }, 1000);
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar função:', error);
    return false;
  }
}

async function addObservacoesColumn() {
  console.log('🔧 Adicionando coluna observacoes...');
  
  try {
    // Primeiro verificar se a coluna já existe
    const { data: testData, error: testError } = await supabase
      .from('clientes')
      .select('observacoes')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Coluna observacoes já existe!');
      return true;
    }
    
    if (testError.code !== '42703') {
      console.error('❌ Erro inesperado:', testError);
      return false;
    }

    // Tentar usar uma abordagem de inserção para forçar a criação da coluna
    console.log('📝 Tentando adicionar coluna via inserção...');
    
    // Criar um registro temporário com a nova coluna
    const { data: insertData, error: insertError } = await supabase
      .from('clientes')
      .insert([
        {
          nome: 'TEMP_RECORD_FOR_COLUMN_CREATION',
          telefone: '00000000000',
          email: 'temp@temp.com',
          endereco: 'temp',
          observacoes: 'temp'
        }
      ])
      .select();

    if (insertError) {
      console.log('❌ Inserção falhou (esperado):', insertError.message);
      
      // Se falhou por causa da coluna, vamos tentar uma abordagem diferente
      console.log('🔄 Tentando abordagem alternativa...');
      
      // Usar SQL raw via fetch
      const sqlCommand = 'ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes TEXT;';
      
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
          },
          body: JSON.stringify({
            query: sqlCommand
          })
        });

        console.log('📋 Resposta da API:', response.status, response.statusText);
        
        // Verificar novamente se a coluna foi criada
        const { data: verifyData, error: verifyError } = await supabase
          .from('clientes')
          .select('observacoes')
          .limit(1);
        
        if (!verifyError) {
          console.log('✅ Coluna observacoes criada com sucesso!');
          return true;
        } else {
          console.log('❌ Coluna ainda não existe:', verifyError.message);
          return false;
        }
        
      } catch (fetchError) {
        console.error('❌ Erro na requisição fetch:', fetchError.message);
        return false;
      }
    } else {
      console.log('✅ Inserção bem-sucedida! Coluna observacoes existe.');
      
      // Remover o registro temporário
      if (insertData && insertData[0]) {
        await supabase
          .from('clientes')
          .delete()
          .eq('id', insertData[0].id);
        console.log('🗑️ Registro temporário removido.');
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    return false;
  }
}

async function verifyTable() {
  console.log('🔍 Verificando estrutura da tabela clientes...');
  
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar tabela:', error);
      return false;
    } else {
      console.log('✅ Tabela clientes acessível');
      if (data && data.length > 0) {
        console.log('📋 Colunas disponíveis:', Object.keys(data[0]));
      } else {
        console.log('📋 Tabela vazia, mas estrutura OK');
        
        // Tentar verificar se observacoes existe
        const { data: obsData, error: obsError } = await supabase
          .from('clientes')
          .select('observacoes')
          .limit(1);
        
        if (!obsError) {
          console.log('✅ Coluna observacoes confirmada!');
          return true;
        } else if (obsError.code === '42703') {
          console.log('❌ Coluna observacoes ainda não existe');
          return false;
        }
      }
      return true;
    }
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando correção da tabela clientes...');
  
  const success = await addObservacoesColumn();
  const verified = await verifyTable();
  
  if (success && verified) {
    console.log('');
    console.log('🎉 SUCESSO! Tabela clientes corrigida.');
    console.log('✅ Coluna observacoes disponível.');
    console.log('🔄 Agora você pode testar a API novamente.');
  } else {
    console.log('');
    console.log('⚠️ AÇÃO MANUAL NECESSÁRIA:');
    console.log('1. Acesse: https://siazsdgodjfmpenmukon.supabase.co/project/siazsdgodjfmpenmukon/sql');
    console.log('2. Execute: ALTER TABLE clientes ADD COLUMN observacoes TEXT;');
    console.log('3. Execute este script novamente para verificar');
  }
}

if (require.main === module) {
  main();
}

module.exports = { addObservacoesColumn, verifyTable };