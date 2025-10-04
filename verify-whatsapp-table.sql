-- Verificar se a tabela whatsapp_messages existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'whatsapp_messages';

-- Se não existir, criar a tabela
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

-- Habilitar RLS
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso
DROP POLICY IF EXISTS "Allow all" ON whatsapp_messages;
CREATE POLICY "Allow all" ON whatsapp_messages FOR ALL USING (true);

-- Verificar se foi criada
SELECT 'Tabela whatsapp_messages criada com sucesso!' as resultado;