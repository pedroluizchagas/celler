const { Client, NoAuth, MessageMedia } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const QRCode = require('qrcode')
const cron = require('node-cron')
const fs = require('fs')
const path = require('path')
const db = require('../utils/database-adapter')
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
    // Para produção, usar NoAuth para evitar dependência SQLite
    // Em desenvolvimento, pode usar LocalAuth se SQLite estiver disponível
    const isProduction = process.env.NODE_ENV === 'production'
    
    const clientConfig = {
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
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--no-default-browser-check',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      },
    }

    // Em produção, usar NoAuth (requer QR a cada reinício)
    if (isProduction) {
      clientConfig.authStrategy = new NoAuth()
      LoggerManager.info('🔧 WhatsApp configurado para produção (NoAuth)')
    } else {
      // Em desenvolvimento, tentar LocalAuth se disponível
      try {
        const { LocalAuth } = require('whatsapp-web.js')
        clientConfig.authStrategy = new LocalAuth({
          clientId: 'saymon-cell-whatsapp',
          dataPath: this.sessionPath,
        })
        LoggerManager.info('🔧 WhatsApp configurado para desenvolvimento (LocalAuth)')
      } catch (error) {
        clientConfig.authStrategy = new NoAuth()
        LoggerManager.warn('⚠️ LocalAuth não disponível, usando NoAuth')
      }
    }

    this.client = new Client(clientConfig)
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
      LoggerManager.info('🔄 Gerando QR Code base64...')
      
      // Gerar QR Code como base64
      const qrBase64 = await QRCode.toDataURL(qr, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      LoggerManager.info(`✅ QR Code base64 gerado: ${qrBase64.substring(0, 50)}...`)

      // Verificar se já existe um registro
      const existing = await db.get('whatsapp_qr', 1)
      
      let result
      if (existing) {
        // Atualizar registro existente
        result = await db.update('whatsapp_qr', 1, {
          qr_code: qr,
          qr_base64: qrBase64,
          created_at: new Date().toISOString()
        })
      } else {
        // Inserir novo registro
        result = await db.insert('whatsapp_qr', {
          id: 1,
          qr_code: qr,
          qr_base64: qrBase64,
          created_at: new Date().toISOString()
        })
      }

      LoggerManager.info('✅ QR Code salvo no banco de dados com sucesso!')
      LoggerManager.info(`📊 Resultado: ${JSON.stringify(result)}`)
    } catch (error) {
      LoggerManager.error('❌ Erro ao salvar QR Code:', error)
    }
  }

  async getQRCode() {
    try {
      LoggerManager.info('🔍 Buscando QR Code no banco de dados...')
      LoggerManager.info('🔍 Tentando buscar com ID 1...')
      
      const result = await db.get(
        'SELECT qr_code, qr_base64 FROM whatsapp_qr WHERE id = 1'
      )
      
      LoggerManager.info(`📊 Resultado da consulta: ${JSON.stringify(result)}`)
      
      // Tentar buscar todos os registros para debug
      LoggerManager.info('🔍 Buscando todos os registros da tabela...')
      const allRecords = await db.all('SELECT * FROM whatsapp_qr')
      LoggerManager.info(`📊 Todos os registros: ${JSON.stringify(allRecords)}`)
      
      const response = {
        qr_code: result?.qr_code || null,
        qr_base64: result?.qr_base64 || null
      }
      
      LoggerManager.info(`📤 Retornando: ${JSON.stringify(response)}`)
      
      return response
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
      // Estatísticas de ordens (com fallback)
      let stats
      try {
        stats = await db.get(`
          SELECT 
            COUNT(*) as total_ordens,
            COUNT(CASE WHEN status = 'entregue' THEN 1 END) as entregues,
            COUNT(CASE WHEN status = 'pronto' THEN 1 END) as prontas,
            SUM(CASE WHEN status = 'entregue' THEN valor_final ELSE 0 END) as faturamento
          FROM ordens 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `) || { total_ordens: 0, entregues: 0, prontas: 0, faturamento: 0 }
      } catch (error) {
        LoggerManager.warn('Erro ao buscar estatísticas de ordens:', error.message)
        stats = { total_ordens: 0, entregues: 0, prontas: 0, faturamento: 0 }
      }

      // Estatísticas WhatsApp (com fallback)
      let whatsappStats
      try {
        whatsappStats = await db.get(`
          SELECT 
            COUNT(*) as total_mensagens,
            COUNT(CASE WHEN direction = 'received' THEN 1 END) as recebidas,
            COUNT(DISTINCT phone_number) as contatos_unicos
          FROM whatsapp_messages 
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `) || { total_mensagens: 0, recebidas: 0, contatos_unicos: 0 }
      } catch (error) {
        LoggerManager.warn('Erro ao buscar estatísticas WhatsApp:', error.message)
        whatsappStats = { total_mensagens: 0, recebidas: 0, contatos_unicos: 0 }
      }

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
