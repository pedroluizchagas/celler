const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const cron = require('node-cron')
const fs = require('fs')
const path = require('path')
const db = require('../utils/database')
const { LoggerManager } = require('../utils/logger')
const WhatsAppBot = require('./whatsappBot')

class WhatsAppService {
  constructor() {
    this.client = null
    this.isReady = false
    this.bot = new WhatsAppBot()
    this.sessionPath = path.join(__dirname, '../..', '.wwebjs_auth')

    this.initializeClient()
    this.setupCronJobs()
  }

  initializeClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'saymon-cell-whatsapp',
        dataPath: this.sessionPath,
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      },
    })

    this.setupEventListeners()
  }

  setupEventListeners() {
    // QR Code para autenticação
    this.client.on('qr', (qr) => {
      LoggerManager.info('📱 QR Code do WhatsApp gerado')
      console.log('\n🔗 Escaneie o QR Code abaixo com seu WhatsApp Business:\n')
      qrcode.generate(qr, { small: true })

      // Salvar QR code para interface web
      this.saveQRCode(qr)
    })

    // Cliente autenticado
    this.client.on('authenticated', () => {
      LoggerManager.info('✅ WhatsApp autenticado com sucesso')
      console.log('✅ WhatsApp conectado!')
    })

    // Cliente pronto
    this.client.on('ready', async () => {
      this.isReady = true
      LoggerManager.info('🚀 WhatsApp Service iniciado e pronto para uso')
      console.log('🚀 WhatsApp Service ativo!')

      // Sincronizar contatos
      await this.syncContacts()
    })

    // Novas mensagens
    this.client.on('message', async (message) => {
      await this.handleMessage(message)
    })

    // Desconectado
    this.client.on('disconnected', (reason) => {
      LoggerManager.warn('⚠️ WhatsApp desconectado:', reason)
      console.log('⚠️ WhatsApp desconectado:', reason)
      this.isReady = false
    })

    // Erros
    this.client.on('auth_failure', (msg) => {
      LoggerManager.error('❌ Falha na autenticação WhatsApp:', msg)
      console.error('❌ Falha na autenticação:', msg)
    })
  }

  async start() {
    try {
      LoggerManager.info('🔄 Iniciando WhatsApp Service...')
      await this.client.initialize()
    } catch (error) {
      LoggerManager.error('❌ Erro ao iniciar WhatsApp Service:', error)
      throw error
    }
  }

  async stop() {
    if (this.client) {
      await this.client.destroy()
      this.isReady = false
      LoggerManager.info('🛑 WhatsApp Service parado')
    }
  }

  async handleMessage(message) {
    try {
      // Ignorar mensagens próprias
      if (message.fromMe) return

      // Ignorar mensagens de grupos (opcional)
      const chat = await message.getChat()
      if (chat.isGroup) return

      // Log da mensagem recebida
      LoggerManager.info('📨 Mensagem recebida', {
        from: message.from,
        body: message.body,
        type: message.type,
      })

      // Salvar mensagem no banco
      await this.saveMessage(message, 'received')

      // Processar com o bot
      const response = await this.bot.processMessage(message)

      if (response) {
        await this.sendMessage(message.from, response)
      }
    } catch (error) {
      LoggerManager.error('❌ Erro ao processar mensagem:', error)
    }
  }

  async sendMessage(to, message, options = {}) {
    try {
      if (!this.isReady) {
        throw new Error('WhatsApp não está conectado')
      }

      const sentMessage = await this.client.sendMessage(to, message, options)

      // Salvar mensagem enviada no banco
      await this.saveMessage(sentMessage, 'sent')

      LoggerManager.info('📤 Mensagem enviada', {
        to,
        message: typeof message === 'string' ? message : 'Mídia',
      })

      return sentMessage
    } catch (error) {
      LoggerManager.error('❌ Erro ao enviar mensagem:', error)
      throw error
    }
  }

  async sendMedia(to, media, caption = '') {
    try {
      const messageMedia = MessageMedia.fromFilePath(media)
      return await this.sendMessage(to, messageMedia, { caption })
    } catch (error) {
      LoggerManager.error('❌ Erro ao enviar mídia:', error)
      throw error
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

  async saveMessage(message, direction) {
    try {
      const contact = await message.getContact()
      const chat = await message.getChat()

      // Normalizar número de telefone para garantir consistência
      const normalizedPhone = this.normalizePhoneNumber(contact.number)

      if (!normalizedPhone) {
        LoggerManager.warn(
          '❌ Número de telefone inválido, não salvando mensagem'
        )
        return
      }

      // Verificar se o contato existe como cliente
      let cliente = await db.get(
        'SELECT id FROM clientes WHERE telefone LIKE ?',
        [`%${normalizedPhone}%`]
      )

      await db.run(
        `
        INSERT INTO whatsapp_messages (
          cliente_id, phone_number, contact_name, message_id, 
          direction, message_type, message_body, timestamp,
          is_forwarded, has_media, chat_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          cliente?.id || null,
          normalizedPhone, // Usar número normalizado
          contact.pushname || contact.name || '',
          message.id._serialized,
          direction,
          message.type,
          message.body || '',
          new Date(message.timestamp * 1000).toISOString(),
          message.isForwarded || false,
          message.hasMedia || false,
          chat.name || '',
        ]
      )

      LoggerManager.debug('💾 Mensagem salva', {
        direction,
        phone: normalizedPhone,
        contact: contact.pushname || contact.name || 'Sem nome',
      })
    } catch (error) {
      LoggerManager.error('❌ Erro ao salvar mensagem:', error)
    }
  }

  async syncContacts() {
    try {
      LoggerManager.info('🔄 Sincronizando contatos do WhatsApp...')

      const contacts = await this.client.getContacts()
      let syncCount = 0

      for (const contact of contacts) {
        if (contact.isMyContact && contact.number) {
          // Verificar se já existe no sistema
          const existingCliente = await db.get(
            'SELECT id FROM clientes WHERE telefone LIKE ?',
            [`%${contact.number}%`]
          )

          if (!existingCliente && contact.pushname) {
            // Criar cliente automaticamente
            await db.run(
              `
              INSERT INTO clientes (nome, telefone, created_at, updated_at)
              VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `,
              [contact.pushname, contact.number]
            )
            syncCount++
          }
        }
      }

      LoggerManager.info(
        `✅ Sincronização concluída: ${syncCount} novos contatos`
      )
    } catch (error) {
      LoggerManager.error('❌ Erro na sincronização de contatos:', error)
    }
  }

  async saveQRCode(qr) {
    try {
      await db.run(
        `
        INSERT OR REPLACE INTO whatsapp_qr (id, qr_code, created_at)
        VALUES (1, ?, CURRENT_TIMESTAMP)
      `,
        [qr]
      )
    } catch (error) {
      LoggerManager.error('❌ Erro ao salvar QR Code:', error)
    }
  }

  async getQRCode() {
    try {
      const result = await db.get(
        'SELECT qr_code FROM whatsapp_qr WHERE id = 1'
      )
      return result?.qr_code || null
    } catch (error) {
      LoggerManager.error('❌ Erro ao buscar QR Code:', error)
      return null
    }
  }

  setupCronJobs() {
    // Lembrete de coleta - todo dia às 9h
    cron.schedule('0 9 * * *', async () => {
      await this.sendCollectionReminders()
    })

    // Lembrete de entrega - todo dia às 15h
    cron.schedule('0 15 * * *', async () => {
      await this.sendDeliveryReminders()
    })

    // Status de backup - todo domingo às 8h
    cron.schedule('0 8 * * 0', async () => {
      await this.sendWeeklyReport()
    })
  }

  async sendCollectionReminders() {
    try {
      const ordens = await db.all(`
        SELECT o.id, o.equipamento, c.nome, c.telefone
        FROM ordens o
        JOIN clientes c ON o.cliente_id = c.id
        WHERE o.status = 'pronto' 
        AND DATE(o.data_finalizacao) <= DATE('now', '-1 day')
        AND o.cliente_id IN (
          SELECT cliente_id FROM whatsapp_messages 
          WHERE cliente_id IS NOT NULL
        )
      `)

      for (const ordem of ordens) {
        const message = `🔧 *Saymon Cell*\n\nOlá ${ordem.nome}! 👋\n\nSeu ${ordem.equipamento} está pronto para retirada!\n\n📋 *Ordem:* #${ordem.id}\n⏰ *Horário:* 8h às 18h\n📍 *Local:* Nossa loja\n\nAguardamos você! 😊`

        await this.sendMessage(`${ordem.telefone}@c.us`, message)
      }

      if (ordens.length > 0) {
        LoggerManager.info(`📬 Enviados ${ordens.length} lembretes de coleta`)
      }
    } catch (error) {
      LoggerManager.error('❌ Erro ao enviar lembretes de coleta:', error)
    }
  }

  async sendDeliveryReminders() {
    try {
      const ordens = await db.all(`
        SELECT o.id, o.equipamento, c.nome, c.telefone
        FROM ordens o
        JOIN clientes c ON o.cliente_id = c.id
        WHERE o.status = 'entregue' 
        AND DATE(o.data_entrega) = DATE('now', '-1 day')
        AND o.cliente_id IN (
          SELECT cliente_id FROM whatsapp_messages 
          WHERE cliente_id IS NOT NULL
        )
      `)

      for (const ordem of ordens) {
        const message = `🔧 *Saymon Cell*\n\nOlá ${ordem.nome}! 👋\n\nObrigado por escolher nossos serviços!\n\n📋 *Ordem:* #${ordem.id}\n📱 *Equipamento:* ${ordem.equipamento}\n\n⭐ Como foi nossa experiência?\nSua opinião é muito importante!\n\n🛡️ *Garantia:* 90 dias\n📞 *Suporte:* Sempre disponível`

        await this.sendMessage(`${ordem.telefone}@c.us`, message)
      }

      if (ordens.length > 0) {
        LoggerManager.info(`📬 Enviados ${ordens.length} lembretes de entrega`)
      }
    } catch (error) {
      LoggerManager.error('❌ Erro ao enviar lembretes de entrega:', error)
    }
  }

  async sendWeeklyReport() {
    try {
      // Buscar proprietário/admin do sistema
      const admin = await db.get(`
        SELECT telefone FROM clientes 
        WHERE nome LIKE '%Saymon%' OR nome LIKE '%Admin%' 
        ORDER BY id ASC LIMIT 1
      `)

      if (!admin) {
        LoggerManager.info('📊 Admin não encontrado para relatório semanal')
        return
      }

      // Estatísticas da semana
      const stats = await db.get(`
        SELECT 
          COUNT(*) as total_ordens,
          COUNT(CASE WHEN status = 'entregue' THEN 1 END) as entregues,
          COUNT(CASE WHEN status = 'pronto' THEN 1 END) as prontas,
          SUM(CASE WHEN status = 'entregue' THEN valor_final ELSE 0 END) as faturamento
        FROM ordens 
        WHERE created_at >= date('now', '-7 days')
      `)

      const whatsappStats = await db.get(`
        SELECT 
          COUNT(*) as total_mensagens,
          COUNT(CASE WHEN direction = 'received' THEN 1 END) as recebidas,
          COUNT(DISTINCT phone_number) as contatos_unicos
        FROM whatsapp_messages 
        WHERE created_at >= datetime('now', '-7 days')
      `)

      const message = `📊 *Relatório Semanal - Saymon Cell*\n\n📋 *Ordens de Serviço:*\n• Total: ${
        stats.total_ordens
      }\n• Entregues: ${stats.entregues}\n• Prontas: ${
        stats.prontas
      }\n\n💰 *Faturamento:* R$ ${(stats.faturamento || 0).toFixed(
        2
      )}\n\n📱 *WhatsApp:*\n• Mensagens: ${
        whatsappStats.total_mensagens
      }\n• Recebidas: ${whatsappStats.recebidas}\n• Contatos únicos: ${
        whatsappStats.contatos_unicos
      }\n\n🗓️ *Período:* Últimos 7 dias\n📅 *Gerado em:* ${new Date().toLocaleDateString(
        'pt-BR'
      )}`

      await this.sendMessage(`${admin.telefone}@c.us`, message)
      LoggerManager.info('📊 Relatório semanal enviado para admin')
    } catch (error) {
      LoggerManager.error('❌ Erro ao enviar relatório semanal:', error)
    }
  }

  // Métodos para integração com o sistema
  async getConnectionStatus() {
    return {
      connected: this.isReady,
      clientInfo: this.isReady ? await this.client.info : null,
    }
  }

  async getChats() {
    if (!this.isReady) return []

    try {
      const chats = await this.client.getChats()
      return chats.map((chat) => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage?.body || '',
        timestamp: chat.timestamp,
      }))
    } catch (error) {
      LoggerManager.error('❌ Erro ao buscar chats:', error)
      return []
    }
  }
}

module.exports = WhatsAppService
