const { randomUUID } = require('crypto')
const { LoggerManager } = require('../utils/logger')

module.exports = function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id']
  const reqId = (typeof incoming === 'string' && incoming.trim()) || randomUUID()
  req.id = reqId
  res.setHeader('x-request-id', reqId)

  const headers = req.headers || {}
  const bodyKeys = !req.body || typeof req.body !== 'object'
    ? []
    : Array.isArray(req.body)
      ? req.body.map((_, i) => `[index:${i}]`)
      : Object.keys(req.body)

  req._startAt = process.hrtime.bigint()
  LoggerManager.info('[REQ-START]', {
    requestId: reqId,
    method: req.method,
    url: req.originalUrl,
    origin: headers.origin || null,
    contentType: headers['content-type'] || null,
    bodyKeys,
  })

  res.on('finish', () => {
    try {
      const end = process.hrtime.bigint()
      const durationMs = Number(end - (req._startAt || end)) / 1e6
      LoggerManager.info('[REQ-END]', {
        requestId: reqId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      })
    } catch (_) {}
  })

  next()
}

