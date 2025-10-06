const { LoggerManager } = require('../utils/logger')

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const getBodyKeys = (body) => {
  if (!body || typeof body !== 'object') {
    return []
  }

  if (Array.isArray(body)) {
    return body.map((_, index) => `[index:${index}]`)
  }

  if (body instanceof Buffer) {
    return ['<buffer>']
  }

  return Object.keys(body)
}

const mutationLogger = (req, _res, next) => {
  if (!MUTATION_METHODS.has(req.method)) {
    return next()
  }

  const headers = req.headers || {}

  const metadata = {
    origin: headers.origin || null,
    contentType: headers['content-type'] || null,
    bodyKeys: getBodyKeys(req.body),
  }

  try {
    LoggerManager.info(`[REQ] ${req.method} ${req.originalUrl}`, metadata)
  } catch (error) {
    LoggerManager.error('Failed to log mutation request', error, {
      route: req.originalUrl,
      method: req.method,
    })
  }

  next()
}

module.exports = mutationLogger
