const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Carregar variáveis de ambiente
require('dotenv').config({ path: './.env.production' })

const supabaseUrl = process.env.SUPABASE_URL || 'https://siazsdgodjfmpenmukon.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpYXpzZGdvZGpmbXBlbm11a29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk4MDU4NywiZXhwIjoyMDc0NTU2NTg3fQ.Y0kQ6t9TU1AmB9Av_rh-U60iN1iBiOP10iAUDWkOMzY'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!')
  console.log('SUPABASE_URL:', supabaseUrl ? 'Configurado' : 'Não encontrado')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Configurado' : 'Não encontrado')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createWhatsAppTable() {
  try {
    console.log('🔍 Verificando se a tabela whatsapp_messages existe...')
    
    // Tentar acessar a tabela para ver se existe
    const { data: testData, error: testError } = await supabase
      .from('whatsapp_messages')
      .select('count', { count: 'exact', head: true })

    if (!testError) {
      console.log('✅ Tabela whatsapp_messages já existe!')
      return
    }

    console.log('📝 A tabela não existe. Vamos criá-la...')
    console.log('⚠️ IMPORTANTE: Você precisa executar o SQL manualmente no Supabase Dashboard')
    console.log('')
    console.log('🔗 Acesse: https://siazsdgodjfmpenmukon.supabase.co/project/siazsdgodjfmpenmukon/sql')
    console.log('')
    console.log('📋 Execute o seguinte SQL:')
    console.log('=' * 80)
    
    const createTableSQL = `-- Criar tabela whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  from_number VARCHAR(20),
  to_number VARCHAR(20),
  message TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  type VARCHAR(20) DEFAULT 'text',
  status VARCHAR(20) DEFAULT 'sent',
  direction VARCHAR(10) DEFAULT 'outbound',
  cliente_id INTEGER REFERENCES clientes(id),
  ordem_id INTEGER REFERENCES ordens(id),
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to ON whatsapp_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_phone_timestamp ON whatsapp_messages(from_number, timestamp);
CREATE INDEX IF NOT EXISTS idx_direction_read ON whatsapp_messages(direction, read_at);

-- Configurar RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON whatsapp_messages;
CREATE POLICY "Allow all" ON whatsapp_messages FOR ALL USING (true);`

    console.log(createTableSQL)
    console.log('=' * 80)
    console.log('')
    console.log('📌 Após executar o SQL, execute este script novamente para verificar.')

  } catch (error) {
    console.error('❌ Erro geral:', error)
  }
}

// Executar
createWhatsAppTable()
  .then(() => {
    console.log('🏁 Script concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })