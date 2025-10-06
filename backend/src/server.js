const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
require('dotenv').config()

// Forçando restart do nodemon para testar migração SQLite -> PostgreSQL

// Importar sistema de logs
const { LoggerManager, requestLogger, errorLogger } = require('./utils/logger')

// Importar banco de dados
const db = require('./utils/database-adapter')

// Importar sistema de backup
const backupManager = require('./utils/backup')

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

const app = express()
const PORT = process.env.PORT || 3001

// Inicializar WhatsApp Service condicionalmente
let whatsappService = null
let whatsappController = null

// Verificar se WhatsApp está habilitado
const whatsappEnabled = process.env.WHATSAPP_ENABLED === 'true'
const isProduction = process.env.NODE_ENV === 'production'

// Estado do WhatsApp service
let whatsappInitializing = false
let whatsappInitialized = false

// Função para inicializar WhatsApp de forma assíncrona
async function initializeWhatsApp() {
  if (!whatsappEnabled || whatsappInitializing || whatsappInitialized) {
    return
  }

  whatsappInitializing = true
  console.log('🔄 Iniciando WhatsApp service de forma assíncrona...')

  try {
    // Verificar se os módulos existem antes de tentar carregá-los
    const WhatsAppService = require('./services/whatsappService')
    const WhatsAppController = require('./controllers/whatsappController')
    
    whatsappService = new WhatsAppService()
    whatsappController = new WhatsAppController(whatsappService)
    
    console.log('🔧 WhatsApp Controller instanciado:', !!whatsappController)
    console.log('🔧 Método getQRCode disponível:', typeof whatsappController.getQRCode)
    
    // Tentar inicializar o service com timeout
    const initPromise = whatsappService.start()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout na inicialização do WhatsApp')), 30000)
    )
    
    await Promise.race([initPromise, timeoutPromise])
    whatsappInitialized = true
    console.log('✅ WhatsApp service inicializado com sucesso!')
    
  } catch (error) {
    console.warn('⚠️ WhatsApp service falhou na inicialização:', error.message)
    console.log('📱 Sistema funcionará sem WhatsApp - isso não afeta outras funcionalidades')
    whatsappService = null
    whatsappController = null
    whatsappInitialized = false
  } finally {
    whatsappInitializing = false
  }
}

if (whatsappEnabled) {
  console.log('📱 WhatsApp habilitado - inicialização será feita de forma assíncrona')
} else {
  console.log('📱 WhatsApp desabilitado via configuração')
}

// Middlewares
app.use(helmet())

// Configuração CORS mais robusta e permissiva para produção
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:49242',
      'http://localhost:51740',
      'http://127.0.0.1:5173',
      'https://assistencia-tecnica-mu.vercel.app',
      'https://assistencia-tecnica-frontend.vercel.app',
      'https://assistencia-tecnica-saytech.vercel.app',
    ]
    
    // Permitir requisições sem origin (ex: Postman, curl, mobile apps)
    if (!origin) {
      console.log('✅ CORS: Permitindo requisição sem origin')
      return callback(null, true)
    }
    
    // Em produção, ser mais permissivo com domínios Vercel
    if (isProduction && origin.match(/^https:\/\/.*\.vercel\.app$/)) {
      console.log('✅ CORS: Permitindo domínio Vercel em produção:', origin)
      return callback(null, true)
    }
    
    // Verificar lista de origens permitidas
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Permitindo origem conhecida:', origin)
      return callback(null, true)
    }
    
    // Em desenvolvimento, ser mais permissivo
    if (!isProduction) {
      console.log('✅ CORS: Permitindo origem em desenvolvimento:', origin)
      return callback(null, true)
    }
    
    console.log('❌ CORS: Bloqueando origem:', origin)
    callback(new Error('Não permitido pelo CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin', 
    'Accept',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods'
  ],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}

app.use(cors(corsOptions))

// Middleware para adicionar headers CORS manualmente como fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Origin, Accept')
  res.header('Access-Control-Allow-Credentials', 'true')
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// Sistema de logs
app.use(requestLogger)

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Pasta de uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check endpoint melhorado
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'checking...',
        whatsapp: whatsappEnabled ? (whatsappInitialized ? 'ready' : 'initializing') : 'disabled'
      }
    }

    // Verificar conexão com banco de dados
    try {
      await db.query('SELECT 1 as test')
      healthStatus.services.database = 'connected'
    } catch (dbError) {
      healthStatus.services.database = 'error'
      healthStatus.status = 'DEGRADED'
    }

    res.json(healthStatus)
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// Rotas principais
app.use('/api/clientes', clientesRoutes)
app.use('/api/ordens', ordensRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/produtos', produtosRoutes)
app.use('/api/categorias', categoriasRoutes)
app.use('/api/vendas', vendasRoutes)
app.use('/api/financeiro', financeiroRoutes)

// Configurar rotas do WhatsApp condicionalmente
// Middleware para garantir que WhatsApp está inicializado
async function ensureWhatsAppInitialized(req, res, next) {
  if (!whatsappEnabled) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp não está habilitado neste servidor',
      code: 'WHATSAPP_DISABLED'
    })
  }

  if (whatsappInitializing) {
    return res.status(503).json({
      success: false,
      error: 'WhatsApp ainda está inicializando. Tente novamente em alguns segundos.',
      code: 'WHATSAPP_INITIALIZING'
    })
  }

  if (!whatsappInitialized || !whatsappService || !whatsappController) {
    // Tentar inicializar novamente apenas se não estiver em processo
    if (!whatsappInitializing) {
      try {
        console.log('🔄 Tentando reinicializar WhatsApp...')
        await initializeWhatsApp()
        if (!whatsappInitialized) {
          throw new Error('Falha na reinicialização')
        }
      } catch (error) {
        console.warn('⚠️ Falha na reinicialização do WhatsApp:', error.message)
        return res.status(503).json({
          success: false,
          error: 'WhatsApp service não está disponível no momento',
          code: 'WHATSAPP_UNAVAILABLE',
          details: error.message
        })
      }
    } else {
      return res.status(503).json({
        success: false,
        error: 'WhatsApp está sendo reinicializado. Tente novamente em alguns segundos.',
        code: 'WHATSAPP_REINITIALIZING'
      })
    }
  }

  next()
}

// Rotas do WhatsApp com inicialização sob demanda
app.get('/api/whatsapp/status', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getStatus(req, res)
})

app.get('/api/whatsapp/qr', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getQRCode(req, res)
})

app.get('/api/whatsapp/chats', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getChats(req, res)
})

app.get('/api/whatsapp/messages', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getMessages(req, res)
})

app.post('/api/whatsapp/send', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.sendMessage(req, res)
})

app.put('/api/whatsapp/read', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.markAsRead(req, res)
})

app.get('/api/whatsapp/conversation/:phone_number/stats', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getConversationStats(req, res)
})

app.get('/api/whatsapp/stats', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getStats(req, res)
})

app.get('/api/whatsapp/queue', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getHumanQueue(req, res)
})

app.put('/api/whatsapp/queue/:id', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.updateQueueStatus(req, res)
})

app.get('/api/whatsapp/settings', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getSettings(req, res)
})

app.put('/api/whatsapp/settings', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.updateSettings(req, res)
})

app.get('/api/whatsapp/report', ensureWhatsAppInitialized, (req, res) => {
  whatsappController.getReport(req, res)
})

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
  LoggerManager.info('🚀 Inicializando sistema...')
  
  const initResults = {
    database: false,
    whatsapp: false,
    backup: false,
    migration: false
  }
  
  // 1. Verificar conexão com banco de dados
  try {
    LoggerManager.info('🔍 Verificando conexão com banco de dados...')
    await db.query('SELECT 1 as test')
    LoggerManager.info('✅ Banco de dados conectado!')
    initResults.database = true
  } catch (error) {
    LoggerManager.error('❌ Erro na conexão com banco de dados:', error.message)
    LoggerManager.warn('⚠️ Sistema funcionará com limitações no banco de dados')
  }
  
  // 2. Inicializar sistema de backup automático
  try {
    LoggerManager.info('💾 Inicializando sistema de backup...')
    backupManager.agendarBackups()
    LoggerManager.info('✅ Sistema de backup inicializado!')
    initResults.backup = true
  } catch (error) {
    LoggerManager.warn('⚠️ Sistema de backup não pôde ser inicializado:', error.message)
    LoggerManager.info('💾 Backups não estarão disponíveis')
  }

  // 3. Aguardar que o banco esteja completamente pronto (apenas se conectado)
  if (initResults.database) {
    try {
      LoggerManager.info('⏳ Aguardando inicialização completa do banco...')
      await new Promise((resolve) => setTimeout(resolve, 3000)) // Aguarda 3 segundos

      // Verificar se as tabelas WhatsApp existem
      await db.get('SELECT COUNT(*) FROM whatsapp_settings')
      LoggerManager.info('✅ Tabelas WhatsApp verificadas e prontas')
      
      // 4. Executar migração de números de telefone
      try {
        LoggerManager.info('🔄 Verificando necessidade de migração de números...')
        const migrationResult = await migratePhoneNumbers()
        if (migrationResult.success && migrationResult.migratedCount > 0) {
          LoggerManager.info(
            `✅ Migração concluída: ${migrationResult.migratedCount} mensagens normalizadas`
          )
        }
        initResults.migration = true
      } catch (error) {
        LoggerManager.error(
          '❌ Erro na migração de números (continuando):',
          error
        )
      }
    } catch (error) {
      LoggerManager.error('❌ Erro ao verificar tabelas WhatsApp:', error)
      LoggerManager.warn('⚠️ Funcionalidades WhatsApp podem não funcionar corretamente')
    }
  }

  // 5. WhatsApp será inicializado sob demanda quando necessário
  if (whatsappEnabled) {
    LoggerManager.info('📱 WhatsApp configurado para inicialização sob demanda')
    initResults.whatsapp = 'on-demand'
  } else {
    LoggerManager.info('📱 WhatsApp desabilitado')
    initResults.whatsapp = 'disabled'
  }
  
  // Relatório de inicialização
  LoggerManager.info('📊 Relatório de inicialização:')
  LoggerManager.info(`   Database: ${initResults.database ? '✅' : '❌'}`)
  LoggerManager.info(`   WhatsApp: ${initResults.whatsapp === 'disabled' ? '⏸️' : (initResults.whatsapp === 'on-demand' ? '🔄' : '❌')}`)
  LoggerManager.info(`   Backup: ${initResults.backup ? '✅' : '❌'}`)
  LoggerManager.info(`   Migration: ${initResults.migration ? '✅' : '❌'}`)
  
  if (initResults.database) {
    LoggerManager.info('🎉 Sistema inicializado com sucesso!')
  } else {
    LoggerManager.warn('⚠️ Sistema iniciado com limitações - problemas no banco de dados')
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
