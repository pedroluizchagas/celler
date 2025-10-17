const express = require('express')

const cors = require('cors')

const helmet = require('helmet')

const path = require('path')

require('dotenv').config()

// ForÃ§ando restart do nodemon para testar migraÃ§Ã£o SQLite -> PostgreSQL

// Importar sistema de logs

const { LoggerManager, requestLogger, errorLogger } = require('./utils/logger')

const mutationLogger = require('./middlewares/mutation-logger')

// Importar banco de dados

const db = require('./utils/database-adapter')

// Importar sistema de backup (comentado temporariamente para teste)

// const backupManager = require('./utils/backup')

// MigraÃ§Ã£o de nÃºmeros removida (WhatsApp desabilitado)

// Importar rotas

const clientesRoutes = require('./routes/clientes')

const ordensRoutes = require('./routes/ordens')

const backupRoutes = require('./routes/backup')

const produtosRoutes = require('./routes/produtos')

const categoriasRoutes = require('./routes/categorias')

const vendasRoutes = require('./routes/vendas')

const financeiroRoutes = require('./routes/financeiro')

// Importar middleware de normalização de query
const { normalizeQuery } = require('./middlewares/normalizeQuery')

const app = express()

const PORT = process.env.PORT || 3001

// WhatsApp completamente removido do sistema

const isProduction = process.env.NODE_ENV === 'production'

console.log('ðŸ“± WhatsApp removido do sistema - funcionalidades desabilitadas permanentemente')

// Middlewares

app.use(helmet())

// Middleware JSON antes de todas as rotas

app.use(express.json({ limit: "1mb", strict: true, type: "application/json" }))

app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Middleware CORS personalizado

app.use((req, res, next) => {

  const origin = req.headers.origin;

  // Se nÃ£o hÃ¡ origin, permitir com *

  if (!origin) {

    res.setHeader('Access-Control-Allow-Origin', '*');

  } else if (origin === 'https://assistencia-tecnica-mu.vercel.app') {

    // Em produÃ§Ã£o, permitir apenas o domÃ­nio especÃ­fico

    res.setHeader('Access-Control-Allow-Origin', origin);

  } else {

    // Para outros origins (desenvolvimento, etc), permitir com *

    res.setHeader('Access-Control-Allow-Origin', '*');

  }

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Origin');

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.setHeader('Access-Control-Max-Age', '86400');

  // Responder OPTIONS com 204 e finalizar

  if (req.method === 'OPTIONS') {

    return res.status(204).end();

  }

  next();

});

// Sistema de logs

const requestIdMiddleware = require('./middlewares/request-id')

  app.use(requestIdMiddleware)

  app.use(requestLogger)

// Middleware para registrar mutaÃ§Ãµes via logger estruturado

app.use(mutationLogger)

// Aplicar normalização de query globalmente
app.use(normalizeQuery)

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

    // Verificar conexÃ£o com banco de dados

    try {

      if (db.isReady && db.isReady()) {

        healthStatus.services.database = 'connected'

      } else {

        healthStatus.services.database = 'error'

        healthStatus.status = 'DEGRADED'

      }

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

// Healthchecks e rotas raiz (Render health-check HEAD /)
app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok', service: 'assistencia-tecnica-backend' }))
app.get('/readyz', (_req, res) => res.status(200).json({ ready: true }))
app.get('/', (_req, res) => res.status(200).send('Assistência Técnica API'))
app.head('/', (_req, res) => res.sendStatus(200))

// WhatsApp removido - todas as rotas desabilitadas
app.all('/api/whatsapp/*', (req, res) => {
  res.status(410).json({
    success: false,
    error: 'WhatsApp foi removido do sistema',
    code: 'WHATSAPP_REMOVED',
    message: 'As funcionalidades do WhatsApp foram permanentemente desabilitadas'
  })
})

// Importar middleware de tratamento de erros aprimorado

const { errorHandler, notFoundHandler, timeoutHandler } = require('./middlewares/errorHandler')

// Middleware de timeout para requisições longas

app.use(timeoutHandler(30000))

// Handler 404 aprimorado

app.use(notFoundHandler)

// Logger de erros estruturado (mantido para compatibilidade)

app.use(errorLogger)

// Handler global de erros aprimorado com requestId

app.use(errorHandler)

// Graceful shutdown

process.on('SIGINT', async () => {

  LoggerManager.info('ðŸ”„ Encerrando servidor...')

  await whatsappService.stop()

  await db.close()

  process.exit(0)

})

// FunÃ§Ã£o para inicializar tudo de forma ordenada

async function inicializarSistema() {

  LoggerManager.info('ðŸš€ Inicializando sistema...')

  const initResults = {

    database: false,

    backup: false

  }

  // 1. Verificar conexÃ£o com banco de dados

  try {

    LoggerManager.info('ðŸ” Verificando conexÃ£o com banco de dados...')

    if (db.isReady && db.isReady()) {

      LoggerManager.info('âœ… Banco de dados conectado!')

      initResults.database = true

    } else {

      LoggerManager.error('âŒ Banco de dados nÃ£o estÃ¡ configurado')

      LoggerManager.warn('âš ï¸ Sistema funcionarÃ¡ com limitaÃ§Ãµes no banco de dados')

    }

  } catch (error) {

    LoggerManager.error('âŒ Erro na conexÃ£o com banco de dados:', error.message)

    LoggerManager.warn('âš ï¸ Sistema funcionarÃ¡ com limitaÃ§Ãµes no banco de dados')

  }

  // 2. Inicializar sistema de backup automÃ¡tico

  try {

    LoggerManager.info('ðŸ’¾ Inicializando sistema de backup...')

    backupManager.agendarBackups()

    LoggerManager.info('âœ… Sistema de backup inicializado!')

    initResults.backup = true

  } catch (error) {

    LoggerManager.warn('âš ï¸ Sistema de backup nÃ£o pÃ´de ser inicializado:', error.message)

    LoggerManager.info('ðŸ’¾ Backups nÃ£o estarÃ£o disponÃ­veis')

  }

  // 3. WhatsApp removido do sistema

  LoggerManager.info('ðŸ“± WhatsApp removido permanentemente do sistema')

  // RelatÃ³rio de inicializaÃ§Ã£o

  LoggerManager.info('ðŸ“Š RelatÃ³rio de inicializaÃ§Ã£o:')

  LoggerManager.info(`   Database: ${initResults.database ? 'âœ…' : 'âŒ'}`)

  LoggerManager.info(`   WhatsApp: ðŸ—‘ï¸ Removido`)

  LoggerManager.info(`   Backup: ${initResults.backup ? 'âœ…' : 'âŒ'}`)

  if (initResults.database) {

    LoggerManager.info('ðŸŽ‰ Sistema inicializado com sucesso!')

  } else {

    LoggerManager.warn('âš ï¸ Sistema iniciado com limitaÃ§Ãµes - problemas no banco de dados')

  }

}

app.listen(PORT, '0.0.0.0', async () => {

  LoggerManager.info(`ðŸš€ Servidor iniciado na porta ${PORT}`)

  LoggerManager.info(`ðŸ“± Acesse no computador: http://localhost:${PORT}`)

  LoggerManager.info(`ðŸ“± Acesse no smartphone: http://[IP_DA_MAQUINA]:${PORT}`)

  LoggerManager.info(`ðŸ”— Teste a API: http://localhost:${PORT}/api/health`)

  LoggerManager.info('âœ… Sistema de logs e backup inicializados')

  // Inicializar sistema apÃ³s servidor estar rodando (comentado temporariamente para teste)

  // await inicializarSistema()

  LoggerManager.info('ðŸŽ‰ Servidor pronto para receber requisiÃ§Ãµes!')

})



