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

// Migração de números removida (WhatsApp desabilitado)

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

// WhatsApp completamente removido do sistema
const isProduction = process.env.NODE_ENV === 'production'

console.log('📱 WhatsApp removido do sistema - funcionalidades desabilitadas permanentemente')

// Middlewares
app.use(helmet())

// Configuração CORS padronizada
const PROD_ORIGIN = process.env.FRONTEND_URL || "https://assistencia-tecnica-mu.vercel.app"

// Permitir *.vercel.app (pré-visualizações)
const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i

const corsOptions = {
  origin: function (origin, callback) {
    // Requests sem origin (ex: curl, apps nativas)
    if (!origin) {
      console.log('✅ CORS: Permitindo requisição sem origin')
      return callback(null, true)
    }

    const allowed = 
      origin === PROD_ORIGIN || 
      vercelPreviewRegex.test(origin) ||
      // Permitir localhost em desenvolvimento
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')

    if (allowed) {
      console.log('✅ CORS: Permitindo origem:', origin)
      return callback(null, true)
    }
    
    console.log('❌ CORS: Bloqueando origem:', origin)
    return callback(new Error("Not allowed by CORS: " + origin))
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization", 
    "Cache-Control",
    "X-Requested-With",
    "Accept",
    "Origin"
  ],
  exposedHeaders: [
    "Content-Length",
    "X-Total-Count"
  ],
  credentials: true,
  maxAge: 86400 // 24h
}

// CORS antes de tudo
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin") // importante p/ cache
  next()
})

app.use(cors(corsOptions))

// Responder preflight imediatamente
app.options("*", cors(corsOptions))

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
         whatsapp: 'removed'
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

// WhatsApp removido - todas as rotas desabilitadas
app.all('/api/whatsapp/*', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'WhatsApp foi removido do sistema',
    code: 'WHATSAPP_REMOVED',
    message: 'As funcionalidades do WhatsApp foram permanentemente desabilitadas'
  })
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
    backup: false
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

  // 3. WhatsApp removido do sistema
  LoggerManager.info('📱 WhatsApp removido permanentemente do sistema')
  
  // Relatório de inicialização
  LoggerManager.info('📊 Relatório de inicialização:')
  LoggerManager.info(`   Database: ${initResults.database ? '✅' : '❌'}`)
  LoggerManager.info(`   WhatsApp: 🗑️ Removido`)
  LoggerManager.info(`   Backup: ${initResults.backup ? '✅' : '❌'}`)
  
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
