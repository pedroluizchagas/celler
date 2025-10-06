const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAlertasTable() {
  console.log('🔍 Verificando estrutura da tabela alertas_estoque...\n');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Tentar fazer uma query simples na tabela
    console.log('📋 Tentando acessar tabela alertas_estoque...');
    
    const { data, error } = await supabase
      .from('alertas_estoque')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Erro ao acessar tabela:', error.message);
      console.log('🔍 Detalhes do erro:', error);
      
      // Se a tabela não existe, vamos tentar criar
      if (error.message.includes('relation "alertas_estoque" does not exist')) {
        console.log('\n🔧 Tabela não existe. Criando tabela alertas_estoque...');
        
        const { error: createError } = await supabase.rpc('create_alertas_estoque_table');
        
        if (createError) {
          console.log('❌ Erro ao criar tabela via RPC:', createError.message);
          
          // Tentar criar diretamente via SQL
          console.log('🔧 Tentando criar tabela diretamente...');
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS alertas_estoque (
              id SERIAL PRIMARY KEY,
              produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
              tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('estoque_baixo', 'estoque_zerado', 'produto_vencido')),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              resolvido_at TIMESTAMP WITH TIME ZONE
            );
          `;
          
          const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
          
          if (sqlError) {
            console.log('❌ Erro ao executar SQL:', sqlError.message);
          } else {
            console.log('✅ Tabela criada com sucesso!');
          }
        }
      }
    } else {
      console.log('✅ Tabela alertas_estoque existe e é acessível');
      console.log('📊 Dados encontrados:', data.length, 'registros');
      
      if (data.length > 0) {
        console.log('📄 Primeiro registro:', JSON.stringify(data[0], null, 2));
      }
    }

    // Tentar inserir um registro de teste para verificar a estrutura
    console.log('\n🧪 Testando inserção na tabela...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('alertas_estoque')
      .insert({
        produto_id: 1,
        tipo: 'estoque_baixo'
      })
      .select();

    if (insertError) {
      console.log('❌ Erro na inserção:', insertError.message);
      console.log('🔍 Detalhes:', insertError);
    } else {
      console.log('✅ Inserção bem-sucedida:', insertData);
      
      // Remover o registro de teste
      await supabase
        .from('alertas_estoque')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Registro de teste removido');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkAlertasTable();