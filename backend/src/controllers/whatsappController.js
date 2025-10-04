const db = require('../utils/database-adapter')
const { LoggerManager } = require('../utils/logger')

class WhatsAppController {
  constructor(whatsappService) {
    this.whatsappService = whatsappService
  }

  // Status da conexão WhatsApp
  async getStatus(req, res) {
    try {
      const status = await this.whatsappService.getConnectionStatus()

      res.json({
        success: true,
        data: {
          connected: status.connected,
          clientInfo: status.clientInfo,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao obter status WhatsApp:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Obter QR Code para conexão
  async getQRCode(req, res) {
    try {
      LoggerManager.info('🎯 Controller: Chamada para getQRCode recebida')
      
      const qrData = await this.whatsappService.getQRCode()
      
      LoggerManager.info(`🎯 Controller: Dados recebidos do service: ${JSON.stringify(qrData)}`)

      if (!qrData || !qrData.qr_base64) {
        LoggerManager.info('🎯 Controller: QR Code não disponível, retornando 404')
        return res.status(404).json({
          success: false,
          error: 'QR Code não disponível. WhatsApp pode já estar conectado.',
        })
      }

      LoggerManager.info('🎯 Controller: QR Code encontrado, retornando sucesso')
      res.json({
        success: true,
        data: {
          qrCode: qrData.qr_code,
          qrBase64: qrData.qr_base64,
          instruction: 'Escaneie este QR Code com seu WhatsApp Business',
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao obter QR Code:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Listar conversas/chats
  async getChats(req, res) {
    try {
      const chats = await this.whatsappService.getChats()

      res.json({
        success: true,
        data: chats,
      })
    } catch (error) {
      LoggerManager.error('Erro ao listar chats:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Histórico de mensagens
  async getMessages(req, res) {
    try {
      const {
        cliente_id,
        phone_number,
        limit = 100,
        offset = 0,
        conversation = false,
      } = req.query

      let sql = `
        SELECT 
          m.*, 
          c.nome as cliente_nome,
          c.email as cliente_email
        FROM whatsapp_messages m
        LEFT JOIN clientes c ON m.cliente_id = c.id
      `

      const params = []
      const conditions = []

      if (cliente_id) {
        conditions.push('m.cliente_id = ?')
        params.push(cliente_id)
      }

      if (phone_number) {
        conditions.push('m.phone_number = ?')
        params.push(phone_number)
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ')
      }

      // Se for uma conversa específica, ordenar por timestamp ASC para mostrar cronologicamente
      // Caso contrário, ordenar por timestamp DESC para mostrar as mais recentes primeiro
      if (conversation === 'true' || phone_number) {
        sql += ` ORDER BY m.timestamp ASC`
      } else {
        sql += ` ORDER BY m.timestamp DESC`
      }

      sql += ` LIMIT ? OFFSET ?`
      params.push(parseInt(limit), parseInt(offset))

      const messages = await db.all(sql, params)

      // Contar total de mensagens para paginação
      let countSql = `SELECT COUNT(*) as total FROM whatsapp_messages m`
      const countParams = []

      if (conditions.length > 0) {
        countSql += ' WHERE ' + conditions.join(' AND ')
        countParams.push(...params.slice(0, conditions.length))
      }

      const countResult = await db.get(countSql, countParams)

      res.json({
        success: true,
        data: messages,
        total: countResult.total,
        count: messages.length,
        hasMore: parseInt(offset) + messages.length < countResult.total,
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar mensagens:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Função para normalizar números de telefone
  normalizePhoneNumber(phoneNumber) {
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

  // Enviar mensagem manual
  async sendMessage(req, res) {
    try {
      const { to, message, type = 'text' } = req.body

      if (!to || !message) {
        return res.status(400).json({
          success: false,
          error: 'Destinatário e mensagem são obrigatórios',
        })
      }

      // Normalizar número de telefone
      const normalizedNumber = this.normalizePhoneNumber(to)
      const phoneNumber = `${normalizedNumber}@c.us`

      LoggerManager.info('📤 Enviando mensagem', {
        original: to,
        normalized: normalizedNumber,
        final: phoneNumber,
      })

      const sentMessage = await this.whatsappService.sendMessage(
        phoneNumber,
        message
      )

      res.json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: {
          messageId: sentMessage.id._serialized,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao enviar mensagem:', error)
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor',
      })
    }
  }

  // Marcar mensagens como lidas
  async markAsRead(req, res) {
    try {
      const { phone_number, message_ids } = req.body

      if (!phone_number && !message_ids) {
        return res.status(400).json({
          success: false,
          error: 'Número de telefone ou IDs das mensagens são obrigatórios',
        })
      }

      let sql = `UPDATE whatsapp_messages SET read_at = CURRENT_TIMESTAMP WHERE `
      const params = []

      if (phone_number) {
        sql += `phone_number = ? AND direction = 'received' AND read_at IS NULL`
        params.push(phone_number)
      } else if (message_ids && Array.isArray(message_ids)) {
        sql += `id IN (${message_ids
          .map(() => '?')
          .join(',')}) AND direction = 'received'`
        params.push(...message_ids)
      }

      const result = await db.run(sql, params)

      res.json({
        success: true,
        message: 'Mensagens marcadas como lidas',
        data: {
          affectedRows: result.changes,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao marcar mensagens como lidas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Obter estatísticas de uma conversa específica
  async getConversationStats(req, res) {
    try {
      const { phone_number } = req.params

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          error: 'Número de telefone é obrigatório',
        })
      }

      const stats = await db.get(
        `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN direction = 'received' THEN 1 END) as received_messages,
          COUNT(CASE WHEN direction = 'sent' THEN 1 END) as sent_messages,
          COUNT(CASE WHEN direction = 'received' AND read_at IS NULL THEN 1 END) as unread_messages,
          MIN(timestamp) as first_message,
          MAX(timestamp) as last_message
        FROM whatsapp_messages 
        WHERE phone_number = ?
      `,
        [phone_number]
      )

      res.json({
        success: true,
        data: stats,
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar estatísticas da conversa:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Estatísticas do WhatsApp
  async getStats(req, res) {
    try {
      const { periodo = '30' } = req.query

      // Total de mensagens por período (com fallback)
      let totalMessages
      try {
        totalMessages = await db.get(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN direction = 'received' THEN 1 END) as received,
            COUNT(CASE WHEN direction = 'sent' THEN 1 END) as sent
          FROM whatsapp_messages 
          WHERE created_at >= NOW() - INTERVAL '${parseInt(periodo)} days'
        `) || { total: 0, received: 0, sent: 0 }
      } catch (error) {
        LoggerManager.warn('Erro ao buscar mensagens WhatsApp:', error.message)
        totalMessages = { total: 0, received: 0, sent: 0 }
      }

      // Interações do bot (com fallback)
      let botStats
      try {
        botStats = await db.get(`
          SELECT 
            COUNT(*) as total_interactions,
            COUNT(DISTINCT phone_number) as unique_contacts,
            COUNT(DISTINCT intent) as different_intents
          FROM whatsapp_interactions 
          WHERE created_at >= NOW() - INTERVAL '${parseInt(periodo)} days'
        `) || { total_interactions: 0, unique_contacts: 0, different_intents: 0 }
      } catch (error) {
        LoggerManager.warn('Erro ao buscar interações WhatsApp:', error.message)
        botStats = { total_interactions: 0, unique_contacts: 0, different_intents: 0 }
      }

      // Top intents (com fallback)
      let topIntents
      try {
        topIntents = await db.all(`
          SELECT 
            intent, 
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM whatsapp_interactions WHERE created_at >= NOW() - INTERVAL '${parseInt(
              periodo
            )} days'), 0), 2) as percentage
          FROM whatsapp_interactions 
          WHERE created_at >= NOW() - INTERVAL '${parseInt(periodo)} days'
          GROUP BY intent 
          ORDER BY count DESC 
          LIMIT 10
        `) || []
      } catch (error) {
        LoggerManager.warn('Erro ao buscar top intents WhatsApp:', error.message)
        topIntents = []
      }

      // Atendimento humano (com fallback)
      let humanSupport
      try {
        humanSupport = await db.get(`
          SELECT 
            COUNT(*) as total_requests,
            COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
            COUNT(CASE WHEN status = 'attending' THEN 1 END) as attending,
            COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
          FROM whatsapp_human_queue 
          WHERE created_at >= NOW() - INTERVAL '${parseInt(periodo)} days'
        `) || { total_requests: 0, waiting: 0, attending: 0, resolved: 0 }
      } catch (error) {
        LoggerManager.warn('Erro ao buscar fila de atendimento WhatsApp:', error.message)
        humanSupport = { total_requests: 0, waiting: 0, attending: 0, resolved: 0 }
      }

      // Mensagens por dia (últimos 7 dias) (com fallback)
      let dailyMessages
      try {
        dailyMessages = await db.all(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as total,
            COUNT(CASE WHEN direction = 'received' THEN 1 END) as received,
            COUNT(CASE WHEN direction = 'sent' THEN 1 END) as sent
          FROM whatsapp_messages 
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `) || []
      } catch (error) {
        LoggerManager.warn('Erro ao buscar mensagens diárias WhatsApp:', error.message)
        dailyMessages = []
      }

      res.json({
        success: true,
        data: {
          period: `${periodo} dias`,
          messages: totalMessages,
          bot: botStats,
          topIntents,
          humanSupport,
          dailyMessages,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar estatísticas:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Fila de atendimento humano
  async getHumanQueue(req, res) {
    try {
      const { status = 'all' } = req.query

      let sql = `
        SELECT 
          h.*,
          c.nome as cliente_nome,
          c.email as cliente_email,
          COUNT(m.id) as total_messages
        FROM whatsapp_human_queue h
        LEFT JOIN clientes c ON h.cliente_id = c.id
        LEFT JOIN whatsapp_messages m ON h.phone_number = m.phone_number
      `

      const params = []

      if (status !== 'all') {
        sql += ' WHERE h.status = ?'
        params.push(status)
      }

      sql += `
        GROUP BY h.id
        ORDER BY h.priority DESC, h.created_at ASC
      `

      const queue = await db.all(sql, params)

      res.json({
        success: true,
        data: queue,
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar fila de atendimento:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Atualizar status da fila
  async updateQueueStatus(req, res) {
    try {
      const { id } = req.params
      const { status, assigned_to } = req.body

      const validStatuses = ['waiting', 'attending', 'resolved']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status inválido',
        })
      }

      const updateFields = ['status = ?']
      const params = [status]

      if (status === 'attending' && assigned_to) {
        updateFields.push('assigned_to = ?', 'attended_at = CURRENT_TIMESTAMP')
        params.push(assigned_to)
      }

      if (status === 'resolved') {
        updateFields.push('resolved_at = CURRENT_TIMESTAMP')
      }

      params.push(id)

      await db.run(
        `
        UPDATE whatsapp_human_queue 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `,
        params
      )

      res.json({
        success: true,
        message: 'Status atualizado com sucesso',
      })
    } catch (error) {
      LoggerManager.error('Erro ao atualizar fila:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Configurações do WhatsApp
  async getSettings(req, res) {
    try {
      const settings = await db.get(
        'SELECT * FROM whatsapp_settings WHERE id = 1'
      )

      if (!settings) {
        return res.status(404).json({
          success: false,
          error: 'Configurações não encontradas',
        })
      }

      res.json({
        success: true,
        data: settings,
      })
    } catch (error) {
      LoggerManager.error('Erro ao buscar configurações:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Atualizar configurações
  async updateSettings(req, res) {
    try {
      const {
        business_name,
        business_phone,
        business_email,
        business_address,
        auto_reply_enabled,
        business_hours_start,
        business_hours_end,
        business_days,
        welcome_message,
        away_message,
      } = req.body

      await db.run(
        `
        UPDATE whatsapp_settings SET
          business_name = COALESCE(?, business_name),
          business_phone = COALESCE(?, business_phone),
          business_email = COALESCE(?, business_email),
          business_address = COALESCE(?, business_address),
          auto_reply_enabled = COALESCE(?, auto_reply_enabled),
          business_hours_start = COALESCE(?, business_hours_start),
          business_hours_end = COALESCE(?, business_hours_end),
          business_days = COALESCE(?, business_days),
          welcome_message = COALESCE(?, welcome_message),
          away_message = COALESCE(?, away_message),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `,
        [
          business_name,
          business_phone,
          business_email,
          business_address,
          auto_reply_enabled,
          business_hours_start,
          business_hours_end,
          business_days,
          welcome_message,
          away_message,
        ]
      )

      res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
      })
    } catch (error) {
      LoggerManager.error('Erro ao atualizar configurações:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }

  // Relatório detalhado
  async getReport(req, res) {
    try {
      const { start_date, end_date } = req.query

      const conditions = []
      const params = []

      if (start_date) {
        conditions.push('created_at >= ?')
        params.push(start_date)
      }

      if (end_date) {
        conditions.push('created_at <= ?')
        params.push(end_date + ' 23:59:59')
      }

      const whereClause =
        conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      // Resumo de mensagens
      const messagesSummary = await db.get(
        `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT phone_number) as unique_contacts,
          COUNT(CASE WHEN direction = 'received' THEN 1 END) as received,
          COUNT(CASE WHEN direction = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN has_media = 1 THEN 1 END) as with_media
        FROM whatsapp_messages
        ${whereClause}
      `,
        params
      )

      // Resumo de interações do bot
      const botSummary = await db.get(
        `
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(DISTINCT phone_number) as unique_users,
          AVG(LENGTH(message_received)) as avg_message_length
        FROM whatsapp_interactions
        ${whereClause}
      `,
        params
      )

      // Intents mais utilizados
      const topIntents = await db.all(
        `
        SELECT 
          intent,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM whatsapp_interactions ${whereClause}), 2) as percentage
        FROM whatsapp_interactions
        ${whereClause}
        GROUP BY intent
        ORDER BY count DESC
        LIMIT 10
      `,
        [...params, ...params]
      )

      res.json({
        success: true,
        data: {
          period: {
            start: start_date || 'Início',
            end: end_date || 'Atual',
          },
          messages: messagesSummary,
          bot: botSummary,
          topIntents,
        },
      })
    } catch (error) {
      LoggerManager.error('Erro ao gerar relatório:', error)
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
      })
    }
  }
}

module.exports = WhatsAppController
