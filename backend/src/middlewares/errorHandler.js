const { LoggerManager } = require('../utils/logger')

/**
 * Middleware de tratamento de erros com requestId
 * Captura erros, loga detalhes no servidor e retorna resposta padronizada
 */
function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown'
  const method = req.method || 'UNKNOWN'
  const url = req.originalUrl || req.url || 'unknown'
  
  // Determinar status code
  let statusCode = 500
  if (err.status) {
    statusCode = err.status
  } else if (err.statusCode) {
    statusCode = err.statusCode
  } else if (err.code === 'ENOTFOUND') {
    statusCode = 503
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503
  } else if (err.name === 'ValidationError') {
    statusCode = 400
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403
  } else if (err.name === 'NotFoundError') {
    statusCode = 404
  }
  
  // Determinar mensagem pública (não expor detalhes internos)
  let publicMessage = 'Erro interno do servidor'
  
  if (statusCode < 500) {
    // Erros 4xx podem expor a mensagem
    publicMessage = err.message || err.publicMessage || 'Erro na requisição'
  } else if (err.publicMessage) {
    // Usar mensagem pública se fornecida
    publicMessage = err.publicMessage
  } else {
    // Para erros 5xx, usar mensagens genéricas baseadas no tipo
    switch (err.code) {
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
        publicMessage = 'Serviço temporariamente indisponível'
        break
      case 'ETIMEDOUT':
        publicMessage = 'Tempo limite da operação excedido'
        break
      default:
        if (err.message && err.message.includes('database')) {
          publicMessage = 'Erro de banco de dados'
        } else if (err.message && err.message.includes('network')) {
          publicMessage = 'Erro de conectividade'
        }
    }
  }
  
  // Log detalhado do erro no servidor
  const errorDetails = {
    requestId,
    method,
    url,
    statusCode,
    errorName: err.name,
    errorCode: err.code,
    errorMessage: err.message,
    stack: err.stack,
    query: req.query,
    params: req.params,
    body: sanitizeBody(req.body),
    headers: sanitizeHeaders(req.headers),
    timestamp: new Date().toISOString(),
  }
  
  // Log baseado na severidade
  if (statusCode >= 500) {
    LoggerManager.error('[ERROR-5XX]', errorDetails)
  } else if (statusCode >= 400) {
    LoggerManager.warn('[ERROR-4XX]', errorDetails)
  } else {
    LoggerManager.info('[ERROR-OTHER]', errorDetails)
  }
  
  // Resposta padronizada
  const response = {
    success: false,
    error: publicMessage,
    requestId,
    timestamp: new Date().toISOString(),
  }
  
  // Adicionar detalhes extras em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      name: err.name,
      code: err.code,
      message: err.message,
    }
    
    // Stack trace apenas em desenvolvimento
    if (statusCode >= 500) {
      response.stack = err.stack
    }
  }
  
  // Adicionar validação de erros se disponível
  if (err.validation) {
    response.validation = err.validation
  }
  
  res.status(statusCode).json(response)
}

/**
 * Middleware para capturar erros assíncronos
 * Wrapper para funções async que podem lançar erros
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Middleware para tratar rotas não encontradas
 */
function notFoundHandler(req, res, next) {
  const requestId = req.id || 'unknown'
  const error = new Error(`Rota não encontrada: ${req.method} ${req.originalUrl}`)
  error.status = 404
  error.name = 'NotFoundError'
  
  LoggerManager.warn('[NOT-FOUND]', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  })
  
  next(error)
}

/**
 * Sanitiza o body da requisição para logging
 * Remove campos sensíveis como senhas
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body
  
  const sensitiveFields = ['password', 'senha', 'token', 'secret', 'key', 'authorization']
  const sanitized = { ...body }
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  return sanitized
}

/**
 * Sanitiza headers para logging
 * Remove headers sensíveis
 */
function sanitizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return headers
  
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
  const sanitized = { ...headers }
  
  for (const header of sensitiveHeaders) {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]'
    }
  }
  
  return sanitized
}

/**
 * Cria um erro customizado com informações extras
 */
function createError(message, statusCode = 500, code = null, publicMessage = null) {
  const error = new Error(message)
  error.status = statusCode
  error.statusCode = statusCode
  error.code = code
  error.publicMessage = publicMessage
  return error
}

/**
 * Cria um erro de validação
 */
function createValidationError(message, validation = null) {
  const error = createError(message, 400, 'VALIDATION_ERROR', message)
  error.name = 'ValidationError'
  error.validation = validation
  return error
}

/**
 * Middleware para timeout de requisições
 */
function timeoutHandler(timeoutMs = 30000) {
  return (req, res, next) => {
    const requestId = req.id || 'unknown'
    
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        LoggerManager.warn('[TIMEOUT]', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          timeoutMs,
        })
        
        const error = createError(
          `Requisição excedeu tempo limite de ${timeoutMs}ms`,
          408,
          'TIMEOUT',
          'Tempo limite da operação excedido'
        )
        next(error)
      }
    }, timeoutMs)
    
    // Limpar timeout quando a resposta for enviada
    res.on('finish', () => {
      clearTimeout(timeout)
    })
    
    next()
  }
}

module.exports = {
  errorHandler,
  asyncErrorHandler,
  notFoundHandler,
  createError,
  createValidationError,
  timeoutHandler,
}