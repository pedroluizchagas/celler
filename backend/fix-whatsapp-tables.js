const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './.env.production' })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!')
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ Não definida')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Definida' : '❌ Não definida')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndCreateWhatsAppTables() {
  console.log('🔍 Verificando tabelas WhatsApp no Supabase...')

  try {
    // Verificar se as tabelas existem
    const tables = ['whatsapp_messages', 'whatsapp_interactions', 'whatsapp_human_queue', 'whatsapp_settings', 'whatsapp_qr']
    
    for (const table of tables) {
      console.log(`\n📋 Verificando tabela: ${table}`)
      
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
      
      if (error) {
        console.log(`❌ Tabela ${table} não existe ou tem erro:`, error.message)
        
        // Tentar criar a tabela
        await createTable(table)
      } else {
        console.log(`✅ Tabela ${table} existe e tem ${data?.length || 0} registros`)
      }
    }

    console.log('\n🎉 Verificação concluída!')
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error)
  }
}

async function createTable(tableName) {
  console.log(`📝 Tentando criar tabela: ${tableName}`)
  
  const tableSQL = {
    whatsapp_messages: `
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255) UNIQUE,
        from_number VARCHAR(20),
        to_number VARCHAR(20),
        message_type VARCHAR(20),
        content TEXT,
        media_url TEXT,
        timestamp TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20),
        direction VARCHAR(10) CHECK (direction IN ('received', 'sent')),
        cliente_id INTEGER REFERENCES clientes(id),
        ordem_id INTEGER REFERENCES ordens(id),
        phone_number VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);
    `,
    
    whatsapp_interactions: `
      CREATE TABLE IF NOT EXISTS whatsapp_interactions (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        intent VARCHAR(100),
        command VARCHAR(100),
        response TEXT,
        context JSONB,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_phone ON whatsapp_interactions(phone_number);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_intent ON whatsapp_interactions(intent);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_interactions_created_at ON whatsapp_interactions(created_at);
    `,
    
    whatsapp_human_queue: `
      CREATE TABLE IF NOT EXISTS whatsapp_human_queue (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        contact_name VARCHAR(255),
        reason TEXT,
        priority INTEGER DEFAULT 1,
        status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'attending', 'resolved')),
        assigned_to VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_human_queue(status);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_phone ON whatsapp_human_queue(phone_number);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_created_at ON whatsapp_human_queue(created_at);
    `,
    
    whatsapp_settings: `
      CREATE TABLE IF NOT EXISTS whatsapp_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Inserir configurações padrão
      INSERT INTO whatsapp_settings (key, value, description) VALUES
      ('welcome_message', 'Olá! Bem-vindo ao *Saymon Cell*! 📱\n\nEu sou o assistente virtual e estou aqui para ajudá-lo.\n\nDigite *menu* para ver as opções disponíveis.', 'Mensagem de boas-vindas do bot'),
      ('business_hours', '08:00-18:00', 'Horário de funcionamento (formato HH:MM-HH:MM)'),
      ('auto_response_enabled', 'true', 'Habilitar respostas automáticas fora do horário'),
      ('human_handoff_enabled', 'true', 'Permitir transferência para atendimento humano')
      ON CONFLICT (key) DO NOTHING;
    `,
    
    whatsapp_qr: `
      CREATE TABLE IF NOT EXISTS whatsapp_qr (
        id SERIAL PRIMARY KEY,
        qr_code TEXT,
        status VARCHAR(20) DEFAULT 'disconnected',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Inserir registro inicial
      INSERT INTO whatsapp_qr (id, status) VALUES (1, 'disconnected') ON CONFLICT (id) DO NOTHING;
    `
  }

  if (tableSQL[tableName]) {
    try {
      const { error } = await supabase.rpc('execute_sql', {
        query: tableSQL[tableName]
      })
      
      if (error) {
        console.log(`⚠️ Erro ao criar tabela ${tableName} via RPC:`, error.message)
        console.log(`📋 SQL para executar manualmente no Supabase Dashboard:`)
        console.log(`\n${tableSQL[tableName]}\n`)
      } else {
        console.log(`✅ Tabela ${tableName} criada com sucesso!`)
      }
    } catch (error) {
      console.log(`⚠️ Erro ao criar tabela ${tableName}:`, error.message)
      console.log(`📋 SQL para executar manualmente no Supabase Dashboard:`)
      console.log(`\n${tableSQL[tableName]}\n`)
    }
  }
}

// Executar verificação
checkAndCreateWhatsAppTables()
  .then(() => {
    console.log('\n✅ Script concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no script:', error)
    process.exit(1)
  })