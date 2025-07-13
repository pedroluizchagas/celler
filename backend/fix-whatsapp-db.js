const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'database.sqlite')

async function fixWhatsAppDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ Erro ao conectar com SQLite:', err.message)
        reject(err)
        return
      }

      console.log('✅ Conectado ao banco SQLite')

      try {
        // 1. Verificar se as tabelas WhatsApp existem
        console.log('🔍 Verificando tabelas WhatsApp...')

        const tables = await new Promise((resolve, reject) => {
          db.all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'whatsapp_%'",
            (err, rows) => {
              if (err) reject(err)
              else resolve(rows)
            }
          )
        })

        console.log(
          '📋 Tabelas WhatsApp encontradas:',
          tables.map((t) => t.name)
        )

        // 2. Recriar tabela whatsapp_messages se necessário
        console.log('🔄 Recriando tabela whatsapp_messages...')

        await new Promise((resolve, reject) => {
          db.run('DROP TABLE IF EXISTS whatsapp_messages_backup', (err) => {
            if (err && !err.message.includes('no such table')) {
              reject(err)
            } else {
              resolve()
            }
          })
        })

        // Fazer backup dos dados existentes
        await new Promise((resolve, reject) => {
          db.run(
            `CREATE TABLE whatsapp_messages_backup AS SELECT * FROM whatsapp_messages`,
            (err) => {
              if (err && !err.message.includes('no such table')) {
                console.log('⚠️ Não foi possível fazer backup:', err.message)
              }
              resolve()
            }
          )
        })

        // Recriar tabela com estrutura correta
        await new Promise((resolve, reject) => {
          db.run('DROP TABLE IF EXISTS whatsapp_messages', (err) => {
            if (err) reject(err)
            else resolve()
          })
        })

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
              message_type TEXT NOT NULL,
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

        // Restaurar dados do backup se existir
        try {
          await new Promise((resolve, reject) => {
            db.run(
              `
              INSERT INTO whatsapp_messages 
              SELECT * FROM whatsapp_messages_backup
            `,
              (err) => {
                if (err && !err.message.includes('no such table')) {
                  console.log('⚠️ Erro ao restaurar backup:', err.message)
                }
                resolve()
              }
            )
          })
          console.log('✅ Dados restaurados do backup')
        } catch (error) {
          console.log('⚠️ Sem dados para restaurar')
        }

        // 3. Criar outras tabelas WhatsApp se não existirem
        console.log('📝 Criando tabelas WhatsApp complementares...')

        // Tabela QR Code
        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE IF NOT EXISTS whatsapp_qr (
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

        // Tabela de Interações
        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE IF NOT EXISTS whatsapp_interactions (
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

        // Tabela de Fila de Atendimento
        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE IF NOT EXISTS whatsapp_human_queue (
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

        // Tabela de Configurações
        await new Promise((resolve, reject) => {
          db.run(
            `
            CREATE TABLE IF NOT EXISTS whatsapp_settings (
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

        // Inserir configurações padrão
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT OR IGNORE INTO whatsapp_settings (id) VALUES (1)`,
            (err) => {
              if (err) reject(err)
              else resolve()
            }
          )
        })

        // Limpar backup
        await new Promise((resolve, reject) => {
          db.run('DROP TABLE IF EXISTS whatsapp_messages_backup', (err) => {
            resolve() // Ignorar erros aqui
          })
        })

        console.log('✅ Banco de dados WhatsApp corrigido com sucesso!')

        db.close((err) => {
          if (err) {
            console.error('❌ Erro ao fechar banco:', err.message)
          } else {
            console.log('🔒 Conexão SQLite fechada')
          }
          resolve()
        })
      } catch (error) {
        console.error('❌ Erro durante correção:', error)
        db.close()
        reject(error)
      }
    })
  })
}

// Executar se chamado diretamente
if (require.main === module) {
  fixWhatsAppDatabase()
    .then(() => {
      console.log('🎉 Correção concluída!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error)
      process.exit(1)
    })
}

module.exports = { fixWhatsAppDatabase }
