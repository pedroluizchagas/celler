const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
require('dotenv').config()

// Importar sistema de logs
const { LoggerManager, requestLogger, errorLogger } = require('./utils/logger')

// Importar banco de dados
const db = require('./utils/database')

// Importar sistema de backup
const backupManager = require('./utils/backup')

// Importar WhatsApp Service
const WhatsAppService = require('./services/whatsappService')
const WhatsAppController = require('./controllers/whatsappController')

// Importar migração de números
const { migratePhoneNumbers } = require('./utils/migratePhoneNumbers')

// Importar rotas
const clientesRoutes = require('./routes/clientes')
const ordensRoutes = require('./routes/ordens')
const backupRoutes = require('./routes/backup')
const produtosRoutes = require('./routes/produtos')
const categoriasRoutes = require('./routes/categorias')
const vendasRoutes = require('./routes/vendas')
const financeiroRoutes = require('./routes/financeiro')
const whatsappRoutes = require('./routes/whatsapp')

const app = express()
const PORT = process.env.PORT || 3001

// Inicializar WhatsApp Service
const whatsappService = new WhatsAppService()
const whatsappController = new WhatsAppController(whatsappService)

// Middlewares
app.use(helmet())
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://192.168.1.*',
    ], // Permite acesso local e da rede
    credentials: true,
  })
)

// Sistema de logs
app.use(requestLogger)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Sistema de Assistência Técnica - API funcionando!',
    timestamp: new Date().toISOString(),
    database: 'Connected',
  })
})

// Rotas principais
app.use('/api/clientes', clientesRoutes)
app.use('/api/ordens', ordensRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/produtos', produtosRoutes)
app.use('/api/categorias', categoriasRoutes)
app.use('/api/vendas', vendasRoutes)
app.use('/api/financeiro', financeiroRoutes)

// Configurar rotas do WhatsApp dinamicamente
app.get(
  '/api/whatsapp/status',
  whatsappController.getStatus.bind(whatsappController)
)
app.get(
  '/api/whatsapp/qr',
  whatsappController.getQRCode.bind(whatsappController)
)
app.get(
  '/api/whatsapp/chats',
  whatsappController.getChats.bind(whatsappController)
)
app.get(
  '/api/whatsapp/messages',
  whatsappController.getMessages.bind(whatsappController)
)
app.post(
  '/api/whatsapp/send',
  whatsappController.sendMessage.bind(whatsappController)
)
app.put(
  '/api/whatsapp/read',
  whatsappController.markAsRead.bind(whatsappController)
)
app.get(
  '/api/whatsapp/conversation/:phone_number/stats',
  whatsappController.getConversationStats.bind(whatsappController)
)
app.get(
  '/api/whatsapp/stats',
  whatsappController.getStats.bind(whatsappController)
)
app.get(
  '/api/whatsapp/queue',
  whatsappController.getHumanQueue.bind(whatsappController)
)
app.put(
  '/api/whatsapp/queue/:id',
  whatsappController.updateQueueStatus.bind(whatsappController)
)
app.get(
  '/api/whatsapp/settings',
  whatsappController.getSettings.bind(whatsappController)
)
app.put(
  '/api/whatsapp/settings',
  whatsappController.updateSettings.bind(whatsappController)
)
app.get(
  '/api/whatsapp/report',
  whatsappController.getReport.bind(whatsappController)
)

// Rota para testar migração de números manualmente
app.post('/api/whatsapp/migrate-numbers', async (req, res) => {
  try {
    LoggerManager.info('🔄 Executando migração manual de números...')
    const result = await migratePhoneNumbers()

    res.json({
      success: result.success,
      message: result.success
        ? `Migração concluída: ${result.migratedCount} mensagens normalizadas`
        : `Erro na migração: ${result.error}`,
      data: result,
    })
  } catch (error) {
    LoggerManager.error('❌ Erro na migração manual:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Middleware de erro com logging
app.use(errorLogger)
app.use((err, req, res, next) => {
  LoggerManager.error('Erro não tratado na aplicação', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
  })

  res.status(500).json({
    error: 'Algo deu errado!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Erro interno do servidor',
  })
})

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  LoggerManager.info('🔄 Encerrando servidor...')
  await whatsappService.stop()
  await db.close()
  process.exit(0)
})

// Função para inicializar tudo de forma ordenada
async function inicializarSistema() {
  try {
    // 1. Inicializar sistema de backup automático
    backupManager.agendarBackups()

    // 2. Aguardar que o banco esteja completamente pronto
    LoggerManager.info('⏳ Aguardando inicialização completa do banco...')
    await new Promise((resolve) => setTimeout(resolve, 3000)) // Aguarda 3 segundos

    // 3. Verificar se as tabelas WhatsApp existem
    try {
      await db.get('SELECT COUNT(*) FROM whatsapp_settings')
      LoggerManager.info('✅ Tabelas WhatsApp verificadas e prontas')
    } catch (error) {
      LoggerManager.error('❌ Erro ao verificar tabelas WhatsApp:', error)
      return
    }

    // 4. Executar migração de números de telefone
    try {
      LoggerManager.info('🔄 Verificando necessidade de migração de números...')
      const migrationResult = await migratePhoneNumbers()
      if (migrationResult.success && migrationResult.migratedCount > 0) {
        LoggerManager.info(
          `✅ Migração concluída: ${migrationResult.migratedCount} mensagens normalizadas`
        )
      }
    } catch (error) {
      LoggerManager.error(
        '❌ Erro na migração de números (continuando):',
        error
      )
    }

    // 5. Inicializar WhatsApp Service
    LoggerManager.info('🔄 Iniciando WhatsApp Service...')
    await whatsappService.start()
    LoggerManager.info('✅ WhatsApp Service inicializado com sucesso!')
  } catch (error) {
    LoggerManager.error('❌ Erro ao inicializar sistema:', error)
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  LoggerManager.info(`🚀 Servidor iniciado na porta ${PORT}`)
  LoggerManager.info(`📱 Acesse no computador: http://localhost:${PORT}`)
  LoggerManager.info(`📱 Acesse no smartphone: http://[IP_DA_MAQUINA]:${PORT}`)
  LoggerManager.info(`🔗 Teste a API: http://localhost:${PORT}/api/health`)
  LoggerManager.info('✅ Sistema de logs e backup inicializados')

  // Inicializar WhatsApp após servidor estar rodando
  await inicializarSistema()
})
