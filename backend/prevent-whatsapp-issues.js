const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const { LoggerManager } = require('./src/utils/logger')

const dbPath = path.join(__dirname, 'database.sqlite')

class WhatsAppHealthChecker {
  constructor() {
    this.db = null
    this.issues = []
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  async disconnect() {
    if (this.db) {
      this.db.close()
    }
  }

  async checkTableStructure() {
    console.log('🔍 Verificando estrutura das tabelas WhatsApp...')

    const requiredTables = [
      'whatsapp_messages',
      'whatsapp_qr',
      'whatsapp_interactions',
      'whatsapp_human_queue',
      'whatsapp_settings',
    ]

    for (const tableName of requiredTables) {
      try {
        const tableInfo = await new Promise((resolve, reject) => {
          this.db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
          })
        })

        if (tableInfo.length === 0) {
          this.issues.push({
            type: 'missing_table',
            message: `❌ Tabela '${tableName}' não existe`,
            severity: 'critical',
            fix: `Executar script de correção para recriar tabela ${tableName}`,
          })
        } else {
          console.log(
            `✅ Tabela '${tableName}' OK (${tableInfo.length} colunas)`
          )
        }
      } catch (error) {
        this.issues.push({
          type: 'table_error',
          message: `❌ Erro ao verificar tabela '${tableName}': ${error.message}`,
          severity: 'critical',
        })
      }
    }
  }

  async checkDataIntegrity() {
    console.log('🔍 Verificando integridade dos dados...')

    try {
      // Verificar mensagens órfãs
      const orphanMessages = await new Promise((resolve, reject) => {
        this.db.all(
          `
          SELECT COUNT(*) as count 
          FROM whatsapp_messages 
          WHERE phone_number IS NULL OR phone_number = ''
        `,
          (err, rows) => {
            if (err) reject(err)
            else resolve(rows[0]?.count || 0)
          }
        )
      })

      if (orphanMessages > 0) {
        this.issues.push({
          type: 'orphan_messages',
          message: `⚠️ ${orphanMessages} mensagens sem número de telefone`,
          severity: 'warning',
          fix: 'Executar limpeza de dados órfãos',
        })
      }

      // Verificar números duplicados (conversas separadas)
      const duplicateNumbers = await new Promise((resolve, reject) => {
        this.db.all(
          `
          SELECT 
            CASE 
              WHEN phone_number LIKE '%@c.us' THEN REPLACE(phone_number, '@c.us', '')
              ELSE phone_number 
            END as normalized_phone,
            COUNT(DISTINCT phone_number) as conversation_count,
            COUNT(*) as message_count
          FROM whatsapp_messages 
          GROUP BY normalized_phone
          HAVING conversation_count > 1
        `,
          (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
          }
        )
      })

      if (duplicateNumbers.length > 0) {
        for (const dup of duplicateNumbers) {
          this.issues.push({
            type: 'duplicate_conversations',
            message: `⚠️ Número ${dup.normalized_phone} tem ${dup.conversation_count} conversas separadas`,
            severity: 'warning',
            fix: 'Executar script de normalização de números',
          })
        }
      }

      // Verificar mensagens sem timestamp
      const invalidTimestamps = await new Promise((resolve, reject) => {
        this.db.all(
          `
          SELECT COUNT(*) as count 
          FROM whatsapp_messages 
          WHERE timestamp IS NULL OR timestamp = ''
        `,
          (err, rows) => {
            if (err) reject(err)
            else resolve(rows[0]?.count || 0)
          }
        )
      })

      if (invalidTimestamps > 0) {
        this.issues.push({
          type: 'invalid_timestamps',
          message: `⚠️ ${invalidTimestamps} mensagens sem timestamp válido`,
          severity: 'warning',
        })
      }
    } catch (error) {
      this.issues.push({
        type: 'integrity_check_failed',
        message: `❌ Erro ao verificar integridade: ${error.message}`,
        severity: 'critical',
      })
    }
  }

  async checkPerformance() {
    console.log('🔍 Verificando performance...')

    try {
      // Verificar índices
      const indexes = await new Promise((resolve, reject) => {
        this.db.all(
          `
          SELECT name FROM sqlite_master 
          WHERE type='index' AND name LIKE '%whatsapp%'
        `,
          (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
          }
        )
      })

      const requiredIndexes = [
        'idx_whatsapp_phone_timestamp',
        'idx_whatsapp_message_id',
      ]

      for (const requiredIndex of requiredIndexes) {
        if (!indexes.find((idx) => idx.name === requiredIndex)) {
          this.issues.push({
            type: 'missing_index',
            message: `⚠️ Índice '${requiredIndex}' não encontrado`,
            severity: 'warning',
            fix: `CREATE INDEX IF NOT EXISTS ${requiredIndex}`,
          })
        }
      }

      // Verificar tamanho da base de dados
      const dbStats = await new Promise((resolve, reject) => {
        this.db.get(
          `
          SELECT 
            COUNT(*) as total_messages,
            COUNT(DISTINCT phone_number) as unique_phones
          FROM whatsapp_messages
        `,
          (err, row) => {
            if (err) reject(err)
            else resolve(row)
          }
        )
      })

      console.log(
        `📊 Base de dados: ${dbStats.total_messages} mensagens, ${dbStats.unique_phones} números únicos`
      )

      if (dbStats.total_messages > 10000) {
        this.issues.push({
          type: 'large_database',
          message: `⚠️ Base de dados grande (${dbStats.total_messages} mensagens)`,
          severity: 'info',
          fix: 'Considerar arquivamento de mensagens antigas',
        })
      }
    } catch (error) {
      this.issues.push({
        type: 'performance_check_failed',
        message: `❌ Erro ao verificar performance: ${error.message}`,
        severity: 'warning',
      })
    }
  }

  async checkSettings() {
    console.log('🔍 Verificando configurações...')

    try {
      const settings = await new Promise((resolve, reject) => {
        this.db.get(
          'SELECT * FROM whatsapp_settings WHERE id = 1',
          (err, row) => {
            if (err) reject(err)
            else resolve(row)
          }
        )
      })

      if (!settings) {
        this.issues.push({
          type: 'missing_settings',
          message: '⚠️ Configurações do WhatsApp não encontradas',
          severity: 'warning',
          fix: 'Inserir configurações padrão',
        })
      } else {
        console.log('✅ Configurações WhatsApp OK')
      }
    } catch (error) {
      this.issues.push({
        type: 'settings_check_failed',
        message: `❌ Erro ao verificar configurações: ${error.message}`,
        severity: 'warning',
      })
    }
  }

  async runHealthCheck() {
    console.log('🏥 INICIANDO VERIFICAÇÃO DE SAÚDE DO WHATSAPP')
    console.log('='.repeat(50))

    try {
      await this.connect()

      await this.checkTableStructure()
      await this.checkDataIntegrity()
      await this.checkPerformance()
      await this.checkSettings()

      console.log('\n📋 RELATÓRIO DE SAÚDE')
      console.log('='.repeat(30))

      if (this.issues.length === 0) {
        console.log(
          '✅ Sistema WhatsApp saudável - nenhum problema encontrado!'
        )
        return { healthy: true, issues: [] }
      }

      const critical = this.issues.filter((i) => i.severity === 'critical')
      const warnings = this.issues.filter((i) => i.severity === 'warning')
      const info = this.issues.filter((i) => i.severity === 'info')

      if (critical.length > 0) {
        console.log(`🚨 ${critical.length} PROBLEMAS CRÍTICOS:`)
        critical.forEach((issue) => console.log(`   ${issue.message}`))
      }

      if (warnings.length > 0) {
        console.log(`⚠️ ${warnings.length} AVISOS:`)
        warnings.forEach((issue) => console.log(`   ${issue.message}`))
      }

      if (info.length > 0) {
        console.log(`ℹ️ ${info.length} INFORMAÇÕES:`)
        info.forEach((issue) => console.log(`   ${issue.message}`))
      }

      // Recomendações
      if (critical.length > 0) {
        console.log('\n🔧 AÇÃO REQUERIDA:')
        console.log('Execute: node fix-whatsapp-complete.js')
      } else if (warnings.length > 0) {
        console.log('\n💡 RECOMENDAÇÕES:')
        warnings.forEach((issue) => {
          if (issue.fix) console.log(`   - ${issue.fix}`)
        })
      }

      return {
        healthy: critical.length === 0,
        issues: this.issues,
        summary: {
          critical: critical.length,
          warnings: warnings.length,
          info: info.length,
        },
      }
    } catch (error) {
      console.error('❌ Erro durante verificação:', error)
      return { healthy: false, error: error.message }
    } finally {
      await this.disconnect()
      console.log('\n' + '='.repeat(50))
      console.log('✅ Verificação de saúde concluída')
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const checker = new WhatsAppHealthChecker()

  checker
    .runHealthCheck()
    .then((result) => {
      if (!result.healthy) {
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Erro na verificação:', error)
      process.exit(1)
    })
}

module.exports = { WhatsAppHealthChecker }
