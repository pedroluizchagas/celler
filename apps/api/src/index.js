import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pino from 'pino'
import path from 'node:path'

import { router as clientesRouter } from './routes/clientes.js'
import { router as ordensRouter } from './routes/ordens.js'
import { router as produtosRouter } from './routes/produtos.js'
import { router as categoriasRouter } from './routes/categorias.js'
import { router as vendasRouter } from './routes/vendas.js'
import { router as financeiroRouter } from './routes/financeiro.js'
import { router as backupRouter } from './routes/backup.js'
import { router as billingRouter } from './routes/billing.js'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
const app = express()

// Config básica
app.use(helmet())
app.use(express.json({ limit: '2mb' }))

// CORS
const origins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (origins.length === 0 || origins.includes(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)

// Servir uploads estáticos
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'api', time: new Date().toISOString() })
})

// Routers (skeleton)
app.use('/api/clientes', clientesRouter)
app.use('/api/ordens', ordensRouter)
app.use('/api/produtos', produtosRouter)
app.use('/api/categorias', categoriasRouter)
app.use('/api/vendas', vendasRouter)
app.use('/api/financeiro', financeiroRouter)
app.use('/api/backup', backupRouter)
app.use('/api/billing', billingRouter)

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path })
})

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error')
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal Server Error' })
})

const port = parseInt(process.env.PORT || '3001', 10)
app.listen(port, () => {
  logger.info({ port }, 'API listening')
})
