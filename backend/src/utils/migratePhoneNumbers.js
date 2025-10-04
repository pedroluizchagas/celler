const db = require('./database-adapter')
const { LoggerManager } = require('./logger')

// Função para normalizar números de telefone
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return null

  // Remover @c.us se existir
  let normalized = phoneNumber.replace('@c.us', '')

  // Remover caracteres especiais e espaços
  normalized = normalized.replace(/[^\d]/g, '')

  // Garantir que tenha código do país (55 para Brasil)
  if (normalized.length === 11 && normalized.startsWith('0')) {
    normalized = '55' + normalized.substring(1) // Remove o 0 e adiciona 55
  } else if (normalized.length === 10) {
    normalized = '55' + normalized // Adiciona código do país
  } else if (normalized.length === 11 && !normalized.startsWith('55')) {
    normalized = '55' + normalized // Adiciona código do país
  }

  return normalized
}

async function migratePhoneNumbers() {
  try {
    LoggerManager.info('🔄 Iniciando migração de números de telefone...')

    // Verificar se a tabela existe primeiro (compatível com Supabase)
    try {
      // Tentar fazer uma consulta simples na tabela para verificar se existe
      await db.query('SELECT 1 FROM whatsapp_messages LIMIT 1', [])
      LoggerManager.info('✅ Tabela whatsapp_messages encontrada!')
    } catch (error) {
      // Se der erro, a tabela não existe
      if (error.message && (error.message.includes('does not exist') || error.message.includes('não existe'))) {
        LoggerManager.warn(
          '⚠️ Tabela whatsapp_messages não existe. Aguardando criação...'
        )
      } else {
        LoggerManager.warn(
          '⚠️ Erro ao verificar tabela whatsapp_messages. Continuando sem migração...'
        )
      }
      return {
        success: false,
        error: 'Tabela whatsapp_messages não encontrada',
      }
    }

    // Buscar todas as mensagens com números diferentes
    const messages = await db.query(`
      SELECT DISTINCT phone_number 
      FROM whatsapp_messages 
      WHERE phone_number IS NOT NULL
    `, [])

    if (!messages || !Array.isArray(messages)) {
      LoggerManager.info('📱 Nenhuma mensagem encontrada para migração')
      return {
        success: true,
        message: 'Nenhuma mensagem para migrar',
        migratedCount: 0
      }
    }

    LoggerManager.info(
      `📱 Encontrados ${messages.length} números únicos para normalizar`
    )

    let migratedCount = 0
    const phoneMapping = new Map()

    // Criar mapeamento de números antigos para novos
    for (const msg of messages) {
      const oldNumber = msg.phone_number
      const newNumber = normalizePhoneNumber(oldNumber)

      if (oldNumber !== newNumber) {
        phoneMapping.set(oldNumber, newNumber)
        LoggerManager.debug(`🔄 ${oldNumber} -> ${newNumber}`)
      }
    }

    LoggerManager.info(
      `📝 ${phoneMapping.size} números precisam ser normalizados`
    )

    // Atualizar mensagens
    for (const [oldNumber, newNumber] of phoneMapping) {
      try {
        await db.run(
          `
          UPDATE whatsapp_messages 
          SET phone_number = $1 
          WHERE phone_number = $2
        `,
          [newNumber, oldNumber]
        )

        // Contar quantas mensagens foram atualizadas
        const countResult = await db.query(
          'SELECT COUNT(*) as count FROM whatsapp_messages WHERE phone_number = $1',
          [newNumber]
        )
        
        const updatedCount = countResult[0]?.count || 0
        migratedCount += updatedCount
        LoggerManager.debug(
          `✅ Atualizadas ${updatedCount} mensagens para ${newNumber}`
        )
      } catch (error) {
        LoggerManager.error(`❌ Erro ao atualizar ${oldNumber}:`, error)
      }
    }

    LoggerManager.info(
      `✅ Migração concluída: ${migratedCount} mensagens atualizadas`
    )

    // Verificar se há duplicatas agora
    const duplicates = await db.query(`
      SELECT phone_number, COUNT(*) as count
      FROM (
        SELECT DISTINCT phone_number, contact_name, message_id
        FROM whatsapp_messages
        WHERE phone_number IS NOT NULL
      ) 
      GROUP BY phone_number 
      HAVING COUNT(*) > 1
    `, [])

    if (duplicates.length === 0) {
      LoggerManager.info('🎉 Nenhuma duplicata encontrada após migração!')
    } else {
      LoggerManager.info(
        `⚠️ ${duplicates.length} números ainda têm conversas separadas`
      )
      duplicates.forEach((dup) => {
        LoggerManager.info(`   ${dup.phone_number}: ${dup.count} conversas`)
      })
    }

    return {
      success: true,
      migratedCount,
      uniqueNumbers: phoneMapping.size,
    }
  } catch (error) {
    LoggerManager.error('❌ Erro na migração de números:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  migratePhoneNumbers()
    .then((result) => {
      if (result.success) {
        console.log(
          `✅ Migração concluída: ${result.migratedCount} mensagens atualizadas`
        )
      } else {
        console.error(`❌ Erro na migração: ${result.error}`)
      }
      process.exit(result.success ? 0 : 1)
    })
    .catch((error) => {
      console.error('❌ Erro fatal na migração:', error)
      process.exit(1)
    })
}

module.exports = { migratePhoneNumbers, normalizePhoneNumber }
