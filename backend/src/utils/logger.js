const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const path = require('path')
const fs = require('fs')

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '../../logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Configuração de formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
)

// Formato para console (mais limpo)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaStr}`
  })
)

// Configuração de transports
const transports = [
  // Console para desenvolvimento
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: consoleFormat,
    handleExceptions: true,
  }),

  // Arquivo de logs gerais com rotação diária
  new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    level: 'info',
    format: customFormat,
    handleExceptions: true,
  }),

  // Arquivo apenas para erros
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '90d',
    level: 'error',
    format: customFormat,
    handleExceptions: true,
  }),

  // Arquivo para auditoria (ações críticas)
  new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '365d',
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),

  // Arquivo para debug em desenvolvimento
  ...(process.env.NODE_ENV !== 'production'
    ? [
        new DailyRotateFile({
          filename: path.join(logsDir, 'debug-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '7d',
          level: 'debug',
          format: customFormat,
        }),
      ]
    : []),
]

// Criar logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
  exitOnError: false,
})

// Logger especializado para auditoria
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '365d',
    }),
  ],
})

// Logger para requests HTTP
const httpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
})

// Logger para performance
const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '7d',
    }),
  ],
})

// Métodos auxiliares para logs estruturados
class LoggerManager {
  // Log de auditoria para ações críticas
  static audit(action, userId, details = {}) {
    auditLogger.info('AUDIT', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ip: details.ip,
      userAgent: details.userAgent,
      details,
    })
  }

  // Log de requests HTTP
  static http(req, res, responseTime) {
    httpLogger.info('HTTP_REQUEST', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime,
      requestId: req.headers['x-request-id'] || req.id,
      timestamp: new Date().toISOString(),
    })
  }

  // Log de performance
  static performance(operation, duration, details = {}) {
    performanceLogger.info('PERFORMANCE', {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    })
  }

  // Log de erro estruturado
  static error(message, error, context = {}) {
    logger.error(message, {
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      },
      context,
      timestamp: new Date().toISOString(),
    })
  }

  // Log de warning estruturado
  static warn(message, context = {}) {
    logger.warn(message, {
      context,
      timestamp: new Date().toISOString(),
    })
  }

  // Log de info estruturado
  static info(message, context = {}) {
    logger.info(message, {
      context,
      timestamp: new Date().toISOString(),
    })
  }

  // Log de debug estruturado
  static debug(message, context = {}) {
    logger.debug(message, {
      context,
      timestamp: new Date().toISOString(),
    })
  }

  // Log de login/logout
  static authLog(action, userId, success, details = {}) {
    auditLogger.info('AUTH', {
      action, // 'LOGIN', 'LOGOUT', 'FAILED_LOGIN'
      userId,
      success,
      ip: details.ip,
      userAgent: details.userAgent,
      timestamp: new Date().toISOString(),
      details,
    })
  }

  // Log de mudanças em dados críticos
  static dataChange(table, recordId, action, changes, userId) {
    auditLogger.info('DATA_CHANGE', {
      table,
      recordId,
      action, // 'CREATE', 'UPDATE', 'DELETE'
      changes,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  // Log de backup
  static backup(action, success, details = {}) {
    logger.info('BACKUP', {
      action, // 'CREATE', 'RESTORE', 'DELETE'
      success,
      timestamp: new Date().toISOString(),
      ...details,
    })
  }

  // Obter estatísticas de logs
  static async getLogStats() {
    try {
      const logFiles = fs.readdirSync(logsDir)
      const stats = {}

      for (const file of logFiles) {
        const filePath = path.join(logsDir, file)
        const fileStat = fs.statSync(filePath)

        const category = file.split('-')[0]
        if (!stats[category]) {
          stats[category] = {
            files: 0,
            totalSize: 0,
            lastModified: null,
          }
        }

        stats[category].files++
        stats[category].totalSize += fileStat.size

        if (
          !stats[category].lastModified ||
          fileStat.mtime > stats[category].lastModified
        ) {
          stats[category].lastModified = fileStat.mtime
        }
      }

      return stats
    } catch (error) {
      logger.error('Erro ao obter estatísticas de logs:', error)
      return {}
    }
  }

  // Limpar logs antigos manualmente
  static async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const logFiles = fs.readdirSync(logsDir)
      let removedCount = 0

      for (const file of logFiles) {
        const filePath = path.join(logsDir, file)
        const fileStat = fs.statSync(filePath)

        if (fileStat.mtime < cutoffDate) {
          fs.unlinkSync(filePath)
          removedCount++
          logger.info(`Log antigo removido: ${file}`)
        }
      }

      logger.info(
        `Limpeza de logs concluída. ${removedCount} arquivos removidos.`
      )
      return removedCount
    } catch (error) {
      logger.error('Erro ao limpar logs antigos:', error)
      return 0
    }
  }
}

// Middleware para capturar logs de requests
const requestLogger = (req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    LoggerManager.http(req, res, duration)

    // Log de performance para requests lentos
    if (duration > 1000) {
      LoggerManager.performance('SLOW_REQUEST', duration, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      })
    }
  })

  next()
}

// Middleware para capturar erros
const errorLogger = (err, req, res, next) => {
  LoggerManager.error('Unhandled error in request', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'] || req.id,
  })

  next(err)
}

// Configurar handlers para uncaught exceptions
process.on('uncaughtException', (error) => {
  LoggerManager.error('Uncaught Exception', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  LoggerManager.error('Unhandled Rejection', new Error(reason), {
    promise: promise.toString(),
  })
})

// Exportar logger e utilitários
module.exports = {
  logger,
  LoggerManager,
  requestLogger,
  errorLogger,
  // Compatibilidade com uso direto
  info: LoggerManager.info,
  error: LoggerManager.error,
  warn: LoggerManager.warn,
  debug: LoggerManager.debug,
  audit: LoggerManager.audit,
}
