const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'database.sqlite')

async function fixWhatsAppComplete() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ Erro ao conectar com SQLite:', err.message)
        reject(err)
        return
      }

      console.log('✅ Conectado ao banco SQLite')

      try {
        console.log('🔧 INICIANDO CORREÇÃO COMPLETA DO WHATSAPP')
        console.log('='.repeat(50))

        // 1. BACKUP DE DADOS EXISTENTES
        console.log('📦 1. Fazendo backup dos dados existentes...')

        let backupData = []
        try {
          backupData = await new Promise((resolve, reject) => {
            db.all(
              'SELECT * FROM whatsapp_messages ORDER BY timestamp DESC',
              (err, rows) => {
                if (err && !err.message.includes('no such table')) {
                  reject(err)
                } else {
                  resolve(rows || [])
                }
              }
            )
          })
          console.log(`✅ Backup realizado: ${backupData.length} mensagens`)
        } catch (error) {
          console.log('⚠️ Nenhum dado para backup ou tabela não existe')
        }

        // 2. RECRIAR TODAS AS TABELAS WHATSAPP
        console.log('🔄 2. Recriando estrutura das tabelas WhatsApp...')

        // Remover todas as tabelas WhatsApp
        const whatsappTables = [
          'whatsapp_messages',
          'whatsapp_qr',
          'whatsapp_interactions',
          'whatsapp_human_queue',
          'whatsapp_settings',
        ]

        for (const table of whatsappTables) {
          await new Promise((resolve) => {
            db.run(`DROP TABLE IF EXISTS ${table}`, (err) => {
              if (err) console.log(`⚠️ Erro ao remover ${table}:`, err.message)
              resolve()
            })
          })
        }

        // Criar tabela de mensagens com estrutura correta
        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE whatsapp_messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              cliente_id INTEGER,
              phone_number TEXT NOT NULL,
              contact_name TEXT,
              message_id TEXT UNIQUE,
              direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
              message_type TEXT NOT NULL DEFAULT 'text',
              message_body TEXT,
              timestamp DATETIME NOT NULL,
              is_forwarded BOOLEAN DEFAULT 0,
              has_media BOOLEAN DEFAULT 0,
              chat_name TEXT,
              read_at DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (cliente_id) REFERENCES clientes (id)
            )
          `,
            (err) => {
              if (err) reject(err)
              else resolve()
            }
          )
        })

        // Criar índices para performance
        await new Promise((resolve) => {
          db.run(
            `
            CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_timestamp 
            ON whatsapp_messages(phone_number, timestamp DESC)
          `,
            resolve
          )
        })

        await new Promise((resolve) => {
          db.run(
            `
            CREATE INDEX IF NOT EXISTS idx_whatsapp_message_id 
            ON whatsapp_messages(message_id)
          `,
            resolve
          )
        })

        // Criar outras tabelas WhatsApp
        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE whatsapp_qr (
              id INTEGER PRIMARY KEY,
              qr_code TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `,
            (err) => {
              if (err) reject(err)
              else resolve()
            }
          )
        })

        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE whatsapp_interactions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              phone_number TEXT NOT NULL,
              intent TEXT NOT NULL,
              response TEXT,
              confidence DECIMAL(3,2),
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `,
            (err) => {
              if (err) reject(err)
              else resolve()
            }
          )
        })

        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE whatsapp_human_queue (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              cliente_id INTEGER,
              phone_number TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'attending', 'resolved')),
              assigned_to TEXT,
              priority INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              attended_at DATETIME,
              resolved_at DATETIME,
              FOREIGN KEY (cliente_id) REFERENCES clientes (id)
            )
          `,
            (err) => {
              if (err) reject(err)
              else resolve()
            }
          )
        })

        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE whatsapp_settings (
              id INTEGER PRIMARY KEY,
              business_name TEXT DEFAULT 'Saymon Cell',
              business_phone TEXT DEFAULT '(37) 9 9999-9999',
              business_email TEXT DEFAULT 'contato@saymon-cell.com',
              business_address TEXT DEFAULT '[Endereço da loja]',
              auto_reply_enabled BOOLEAN DEFAULT 1,
              business_hours_start INTEGER DEFAULT 8,
              business_hours_end INTEGER DEFAULT 18,
              business_days TEXT DEFAULT '[1,2,3,4,5,6]',
              welcome_message TEXT DEFAULT 'Bem-vindo à Saymon Cell! Como posso ajudá-lo?',
              away_message TEXT DEFAULT 'No momento estamos fora do horário comercial. Retornaremos em breve!',
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `,
            (err) => {
              if (err) reject(err)
              else resolve()
            }
          )
        })

        console.log('✅ Estrutura das tabelas recriada com sucesso!')

        // 3. RESTAURAR E NORMALIZAR DADOS
        console.log('📂 3. Restaurando e normalizando dados...')

        if (backupData.length > 0) {
          // Função para normalizar números de telefone
          function normalizePhoneNumber(phoneNumber) {
            if (!phoneNumber) return null

            let normalized = phoneNumber.replace('@c.us', '')
            normalized = normalized.replace(/[^\d]/g, '')

            if (normalized.length === 11 && normalized.startsWith('0')) {
              normalized = '55' + normalized.substring(1)
            } else if (normalized.length === 10) {
              normalized = '55' + normalized
            } else if (
              normalized.length === 11 &&
              !normalized.startsWith('55')
            ) {
              normalized = '55' + normalized
            }

            return normalized
          }

          // Agrupar mensagens por número normalizado para evitar duplicatas
          const normalizedMessages = new Map()

          for (const msg of backupData) {
            const normalizedPhone = normalizePhoneNumber(msg.phone_number)
            if (!normalizedPhone) continue

            const key = `${normalizedPhone}_${msg.timestamp}_${msg.direction}`

            if (!normalizedMessages.has(key)) {
              normalizedMessages.set(key, {
                ...msg,
                phone_number: normalizedPhone,
              })
            }
          }

          console.log(
            `📱 Normalizando ${normalizedMessages.size} mensagens únicas...`
          )

          // Inserir mensagens normalizadas
          for (const [key, msg] of normalizedMessages) {
            try {
              await new Promise((resolve, reject) => {
                db.run(
                  `
                  INSERT INTO whatsapp_messages (
                    cliente_id, phone_number, contact_name, message_id,
                    direction, message_type, message_body, timestamp,
                    is_forwarded, has_media, chat_name, read_at, created_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                  [
                    msg.cliente_id || null,
                    msg.phone_number,
                    msg.contact_name || null,
                    msg.message_id ||
                      `${msg.phone_number}_${Date.now()}_${Math.random()}`,
                    msg.direction || 'received',
                    msg.message_type || 'text',
                    msg.message_body || '',
                    msg.timestamp,
                    msg.is_forwarded || 0,
                    msg.has_media || 0,
                    msg.chat_name || null,
                    msg.read_at || null,
                    msg.created_at || new Date().toISOString(),
                  ],
                  (err) => {
                    if (
                      err &&
                      !err.message.includes('UNIQUE constraint failed')
                    ) {
                      console.log('⚠️ Erro ao inserir mensagem:', err.message)
                    }
                    resolve()
                  }
                )
              })
            } catch (error) {
              console.log('⚠️ Erro ao processar mensagem:', error.message)
            }
          }

          console.log(
            `✅ ${normalizedMessages.size} mensagens restauradas e normalizadas`
          )
        }

        // 4. INSERIR CONFIGURAÇÕES PADRÃO
        console.log('⚙️ 4. Inserindo configurações padrão...')

        await new Promise((resolve) => {
          db.run(
            `
            INSERT OR REPLACE INTO whatsapp_settings (id) VALUES (1)
          `,
            resolve
          )
        })

        // 5. VERIFICAR INTEGRIDADE
        console.log('🔍 5. Verificando integridade dos dados...')

        const stats = await new Promise((resolve) => {
          db.get(
            `
            SELECT 
              COUNT(*) as total_messages,
              COUNT(DISTINCT phone_number) as unique_phones,
              COUNT(CASE WHEN direction = 'received' THEN 1 END) as received,
              COUNT(CASE WHEN direction = 'sent' THEN 1 END) as sent
            FROM whatsapp_messages
          `,
            (err, row) => {
              resolve(
                row || {
                  total_messages: 0,
                  unique_phones: 0,
                  received: 0,
                  sent: 0,
                }
              )
            }
          )
        })

        console.log('📊 Estatísticas finais:')
        console.log(`   📱 Total de mensagens: ${stats.total_messages}`)
        console.log(`   📞 Números únicos: ${stats.unique_phones}`)
        console.log(`   📨 Mensagens recebidas: ${stats.received}`)
        console.log(`   📤 Mensagens enviadas: ${stats.sent}`)

        console.log('='.repeat(50))
        console.log('✅ CORREÇÃO COMPLETA DO WHATSAPP FINALIZADA!')
        console.log('🎉 Sistema WhatsApp pronto para uso!')

        db.close()
        resolve({
          success: true,
          totalMessages: stats.total_messages,
          uniquePhones: stats.unique_phones,
          received: stats.received,
          sent: stats.sent,
        })
      } catch (error) {
        console.error('❌ Erro durante a correção:', error)
        db.close()
        reject(error)
      }
    })
  })
}

// Executar se chamado diretamente
if (require.main === module) {
  fixWhatsAppComplete()
    .then((result) => {
      console.log('🎉 Correção finalizada com sucesso!')
      console.log('Resultado:', result)
    })
    .catch((error) => {
      console.error('❌ Erro na correção:', error)
      process.exit(1)
    })
}

module.exports = { fixWhatsAppComplete }
